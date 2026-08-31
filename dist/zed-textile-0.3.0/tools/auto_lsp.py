#!/usr/bin/env python3
"""Auto Tools LSP — LSP server for Zed providing code actions.

Provides two code actions via right-click → Show Code Actions:
  - Insert Table of Contents (Markdown / Textile)
  - Format Table(s) (Markdown / Textile)

Speaks Language Server Protocol over stdio (Content-Length headers).
"""

import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote

VERSION = "0.1.0"


# ── Document store ──────────────────────────────────────────────────

_store: dict[str, str] = {}  # uri -> text


# ── TOC logic ───────────────────────────────────────────────────────

def slugify(title: str) -> str:
    slug = title.strip().lower()
    slug = re.sub(r"[^\w\s-]", "", slug, flags=re.UNICODE)
    slug = re.sub(r"\s+", "-", slug)
    return slug.strip("-")


def _dedupe(slug: str, seen: set) -> str:
    base = slug
    n = 1
    while slug in seen:
        slug = f"{base}-{n}"
        n += 1
    seen.add(slug)
    return slug


def _skip_fence_md(text: str):
    in_fence = None
    for line in text.splitlines():
        s = line.lstrip()
        if in_fence is not None:
            if s.startswith(in_fence):
                in_fence = None
            continue
        if s.startswith("```"):
            in_fence = "```"
            continue
        if s.startswith("~~~"):
            in_fence = "~~~"
            continue
        yield line


def _skip_fence_textile(text: str):
    in_html_pre = False
    in_verbatim = False
    for line in text.splitlines():
        s = line.strip()
        if in_html_pre:
            if "</pre>" in s:
                in_html_pre = False
            continue
        if in_verbatim:
            if s == "":
                in_verbatim = False
            continue
        if s.startswith("<pre"):
            in_html_pre = True
            continue
        if re.match(r"^(bc|pre|notextile)\.\s", s):
            in_verbatim = True
            continue
        yield line


def _headings_md(text: str) -> list[tuple[int, str, int]]:
    result = []
    for i, line in enumerate(_skip_fence_md(text)):
        m = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", line.lstrip())
        if m:
            result.append((len(m.group(1)), m.group(2).strip(), i))
    return result


def _headings_textile(text: str) -> list[tuple[int, str, int]]:
    result = []
    for i, line in enumerate(_skip_fence_textile(text)):
        m = re.match(r"^h([1-6])\.\s+(.+)$", line.strip())
        if m:
            result.append((int(m.group(1)), m.group(2).strip(), i))
    return result


def _build_toc_md(text: str) -> str | None:
    headings = _headings_md(text)
    if not headings:
        return None
    min_level = min(l for l, _, _ in headings)
    seen: set[str] = set()
    lines: list[str] = []
    for level, title, _ in headings:
        indent = "  " * (level - min_level)
        anchor = _dedupe(slugify(title), seen)
        lines.append(f"{indent}- [{title}](#{anchor})")
    return "\n".join(lines)


def _build_toc_textile(text: str) -> str | None:
    headings = _headings_textile(text)
    if not headings:
        return None
    seen: set[str] = set()
    lines: list[str] = []
    for level, title, _ in headings:
        anchor = _dedupe(slugify(title), seen)
        bullets = "*" * level
        lines.append(f'{bullets} "{title}":#{anchor}')
    return "\n".join(lines)


# ── Table alignment logic ───────────────────────────────────────────

def _split_md_row(line: str) -> list[str]:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    cells: list[str] = []
    cur: list[str] = []
    for ch in s:
        if ch == "|" and not (cur and cur[-1] == "\\"):
            cells.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    cells.append("".join(cur).strip())
    return cells


def _is_md_separator(cells: list[str]) -> bool:
    return bool(cells) and all(re.fullmatch(r":?-+:?", c.strip()) for c in cells)


def _cell_align(cell: str) -> str:
    c = cell.strip()
    if c.startswith(":") and c.endswith(":"):
        return "center"
    if c.endswith(":"):
        return "right"
    return "left"


def _pad(text: str, width: int, align: str) -> str:
    if align == "right":
        return text.rjust(width)
    if align == "center":
        return text.center(width)
    return text.ljust(width)


def _align_md(text: str) -> str:
    lines = text.splitlines()
    fences: set[int] = set()
    in_fence = None
    for i, line in enumerate(lines):
        s = line.lstrip()
        if in_fence is not None:
            if s.startswith(in_fence):
                in_fence = None
                fences.add(i)
            continue
        if s.startswith("```"):
            in_fence = "```"
            fences.add(i)
            continue
        if s.startswith("~~~"):
            in_fence = "~~~"
            fences.add(i)
            continue
    out = list(lines)
    i = 0
    while i < len(lines):
        if i in fences:
            i += 1
            continue
        # A table data row must contain "|" — skip headings, paragraphs, etc.
        if "|" not in lines[i]:
            i += 1
            continue
        cells = _split_md_row(lines[i])
        if not cells or _is_md_separator(cells):
            i += 1
            continue
        j = i + 1
        while j < len(lines) and not _is_md_separator(_split_md_row(lines[j])):
            j += 1
        if j >= len(lines):
            i += 1
            continue
        sep_cells = _split_md_row(lines[j])
        aligns = [_cell_align(c) for c in sep_cells]
        start = i
        end = j
        while end + 1 < len(lines) and end + 1 not in fences:
            next_cells = _split_md_row(lines[end + 1])
            if not next_cells or _is_md_separator(next_cells) or "|" not in lines[end + 1]:
                break
            end += 1
        table_rows = lines[start:end + 1]
        col_count = len(sep_cells)
        if col_count == 0:
            i = end + 1
            continue
        widths = [0] * col_count
        for row in table_rows:
            rc = _split_md_row(row)
            for ci in range(min(len(rc), col_count)):
                cell_text = rc[ci].strip()
                widths[ci] = max(widths[ci], len(cell_text))
        for ri, row in enumerate(table_rows):
            rc = _split_md_row(row)
            if _is_md_separator(rc):
                new_sep = []
                for ci in range(col_count):
                    a = _cell_align(rc[ci]) if ci < len(rc) else "left"
                    dashes = "-" * widths[ci]
                    if a == "center":
                        raw = ":" + dashes[1:-1] + ":"
                    elif a == "right":
                        raw = dashes[:-1] + ":"
                    else:
                        raw = dashes
                    new_sep.append(raw)
                out[start + ri] = "| " + " | ".join(new_sep) + " |"
            else:
                new_cells = []
                for ci in range(col_count):
                    cell_text = rc[ci].strip() if ci < len(rc) else ""
                    a = aligns[ci] if ci < len(aligns) else "left"
                    new_cells.append(_pad(cell_text, widths[ci], a))
                out[start + ri] = "| " + " | ".join(new_cells) + " |"
        i = end + 1
    result = "\n".join(out)
    if text.endswith("\n") and not result.endswith("\n"):
        result += "\n"
    return result


_MOD_RE = re.compile(r"^([<>_=]+\.\s+)?(.*)$", re.S)


def _split_textile_row(line: str) -> list[str]:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    cells: list[str] = []
    cur: list[str] = []
    for ch in s:
        if ch == "|" and not (cur and cur[-1] == "\\"):
            cells.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    cells.append("".join(cur).strip())
    return cells


def _parse_textile_cell(cell: str) -> tuple[str, str]:
    m = _MOD_RE.match(cell)
    mod = (m.group(1) or "").strip()
    content = (m.group(2) or "").strip()
    return mod, content


def _align_textile(text: str) -> str:
    lines = text.splitlines()
    out = list(lines)
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        # Only lines starting with "|" are table rows; skip headings, pre,
        # verbatim blocks and blank lines.
        if not s.startswith("|") or re.match(r"^(bc|pre|notextile)\.\s", s):
            i += 1
            continue
        j = i + 1
        while j < len(lines) and lines[j].strip().startswith("|"):
            j += 1
        if j == i + 1:
            i += 1
            continue
        block = lines[i:j]
        col_count = len(_split_textile_row(block[0]))
        if col_count == 0:
            i = j
            continue
        widths = [0] * col_count
        for row in block:
            rc = _split_textile_row(row)
            for ci in range(min(len(rc), col_count)):
                mod, content = _parse_textile_cell(rc[ci])
                total_len = len(mod) + len(content) if mod else len(content)
                widths[ci] = max(widths[ci], total_len)
        for ri, row in enumerate(block):
            rc = _split_textile_row(row)
            new_cells = []
            for ci in range(col_count):
                mod, content = _parse_textile_cell(rc[ci] if ci < len(rc) else "")
                if mod:
                    padded = content.ljust(max(0, widths[ci] - len(mod)))
                    new_cells.append(f"{mod} {padded}")
                else:
                    new_cells.append(content.ljust(widths[ci]))
            out[i + ri] = "| " + " | ".join(new_cells) + " |"
        i = j
    result = "\n".join(out)
    if text.endswith("\n") and not result.endswith("\n"):
        result += "\n"
    return result


# ── LSP helpers ─────────────────────────────────────────────────────

def _uri_to_path(uri: str) -> str:
    if uri.startswith("file://"):
        return unquote(uri[7:])
    return uri


def _send(msg: dict) -> None:
    payload = json.dumps(msg, ensure_ascii=False)
    data = payload.encode("utf-8")
    # Content-Length is the BODY length in bytes (not code points!) — non-ASCII
    # messages like TOC/table edits would otherwise be truncated.
    header = f"Content-Length: {len(data)}\r\n\r\n"
    sys.stdout.buffer.write(header.encode("ascii") + data)
    sys.stdout.buffer.flush()


# ── LSP handlers ────────────────────────────────────────────────────

def _handle_initialize(msg_id: int, _params: dict) -> dict:
    return {
        "id": msg_id,
        "result": {
            "capabilities": {
                "textDocumentSync": {
                    "openClose": True,
                    "change": 1,
                },
                "codeActionProvider": True,
            },
            "serverInfo": {"name": "auto-tools-lsp", "version": VERSION},
        },
        "jsonrpc": "2.0",
    }


def _handle_did_open(params: dict) -> None:
    td = params.get("textDocument", {})
    _store[td.get("uri", "")] = td.get("text", "")


def _handle_did_change(params: dict) -> None:
    uri = params.get("textDocument", {}).get("uri", "")
    changes = params.get("contentChanges", [])
    if changes:
        _store[uri] = changes[-1].get("text", "")


def _handle_did_close(params: dict) -> None:
    _store.pop(params.get("textDocument", {}).get("uri", ""), None)


def _handle_code_action(msg_id: int, params: dict) -> dict:
    uri = params.get("textDocument", {}).get("uri", "")
    text = _store.get(uri, "")
    if not text:
        return {"id": msg_id, "result": [], "jsonrpc": "2.0"}

    path = _uri_to_path(uri)
    suffix = Path(path).suffix.lower()
    is_md = suffix in (".md", ".markdown")
    is_textile = suffix == ".textile"
    actions: list[dict] = []

    # ── TOC action ──
    toc = None
    if is_md:
        toc = _build_toc_md(text)
    elif is_textile:
        toc = _build_toc_textile(text)
    if toc is None:
        toc = _build_toc_md(text) or _build_toc_textile(text)

    if toc:
        actions.append({
            "title": "Insert Table of Contents",
            "kind": "refactor.extract",
            "edit": {
                "changes": {
                    uri: [{
                        "range": {
                            "start": {"line": 0, "character": 0},
                            "end": {"line": 0, "character": 0},
                        },
                        "newText": toc + "\n\n",
                    }]
                }
            },
        })

    # ── Format table action ──
    try:
        if is_md:
            formatted = _align_md(text)
        elif is_textile:
            formatted = _align_textile(text)
        else:
            formatted = _align_md(text) or _align_textile(text)
        if formatted != text:
            actions.append({
                "title": "Format Table(s)",
                "kind": "refactor.rewrite",
                "edit": {
                    "changes": {
                        uri: [{
                            "range": {
                                "start": {"line": 0, "character": 0},
                                "end": {"line": len(text.splitlines()), "character": 0},
                            },
                            "newText": formatted,
                        }]
                    }
                },
            })
    except Exception:
        pass

    return {"id": msg_id, "result": actions, "jsonrpc": "2.0"}


# ── Main loop (LSP over stdio) ──────────────────────────────────────

def main():
    buf = b""
    content_length = None

    while True:
        # os.read returns whatever bytes are already available (as soon as at
        # least one arrives); sys.stdin.buffer.read(n) would block until n bytes
        # are buffered or EOF, which deadlocks LSP-over-stdio clients.
        chunk = os.read(0, 4096)
        if not chunk:
            break
        buf += chunk

        while True:
            if content_length is None:
                # look for \r\n\r\n
                idx = buf.find(b"\r\n\r\n")
                if idx == -1:
                    # try \n\n as fallback
                    idx = buf.find(b"\n\n")
                    if idx == -1:
                        break
                    header_end = idx + 2
                else:
                    header_end = idx + 4

                header_part = buf[:header_end].decode("utf-8", errors="replace")
                rest = buf[header_end:]
                # parse Content-Length
                cl_match = re.search(r"Content-Length:\s*(\d+)", header_part, re.IGNORECASE)
                if not cl_match:
                    buf = rest
                    content_length = None
                    continue
                content_length = int(cl_match.group(1))
                buf = rest

            if content_length is not None and len(buf) >= content_length:
                raw = buf[:content_length].decode("utf-8", errors="replace")
                buf = buf[content_length:]
                content_length = None

                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                method = msg.get("method", "")
                msg_id = msg.get("id")
                params = msg.get("params") or {}

                if method == "initialize":
                    _send(_handle_initialize(msg_id, params))
                elif method == "initialized":
                    pass
                elif method == "textDocument/didOpen":
                    _handle_did_open(params)
                elif method == "textDocument/didChange":
                    _handle_did_change(params)
                elif method == "textDocument/didClose":
                    _handle_did_close(params)
                elif method == "textDocument/codeAction":
                    _send(_handle_code_action(msg_id, params))
                elif method == "shutdown":
                    _send({"id": msg_id, "result": None, "jsonrpc": "2.0"})
                elif method == "exit":
                    return
                else:
                    if msg_id is not None:
                        _send({"id": msg_id, "result": None, "jsonrpc": "2.0"})
                continue
            break


if __name__ == "__main__":
    main()
