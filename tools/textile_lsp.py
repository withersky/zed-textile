#!/usr/bin/env python3
"""Minimal LSP server for Zed that provides an "Insert Table of Contents"
code action for Textile and Markdown documents.

Run: python3 textile_lsp.py

Configure in Zed settings:

  "lsp": {
    "textile-lsp": {
      "binary": {
        "path": "/usr/bin/python3",
        "arguments": ["/absolute/path/to/textile_lsp.py"]
      }
    }
  },
  "languages": {
    "Textile":  { "language_servers": ["textile-lsp", "..."] },
    "Markdown": { "language_servers": ["textile-lsp", "..."] }
  }

Then trigger with `zed: code actions`.
"""

import json
import re
import sys

TEXTILE_HEADING_RE = re.compile(r"^h([1-6])\.\s+(.+)$")
MARKDOWN_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")
TEXTILE_LIST_RE = re.compile(r"^[*#]+\s")
MARKDOWN_LIST_RE = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+")
TOC_TITLE = "Table of Contents"


def read_message():
    headers = {}
    while True:
        line = sys.stdin.buffer.readline()
        if not line:
            return None
        if line in (b"\r\n", b"\n"):
            break
        key, _, value = line.decode("utf-8", "replace").partition(":")
        headers[key.strip().lower()] = value.strip()
    length = int(headers.get("content-length", "0"))
    body = sys.stdin.buffer.read(length)
    return json.loads(body) if body else None


def send_message(msg):
    data = json.dumps(msg, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(b"Content-Length: " + str(len(data)).encode("utf-8") + b"\r\n\r\n")
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def respond(req, result):
    send_message({"jsonrpc": "2.0", "id": req.get("id"), "result": result})


def slugify_textile(text):
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower())
    return slug.strip("-")


def slugify_markdown(text):
    slug = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE).strip().lower()
    slug = re.sub(r"[\s_]+", "-", slug)
    return slug


def make_slugs(texts, fmt):
    counters = {}
    slugs = []
    for text in texts:
        base = slugify_textile(text) if fmt == "textile" else slugify_markdown(text)
        if not base:
            base = "section"
        count = counters.get(base, 0)
        counters[base] = count + 1
        slugs.append(base if count == 0 else f"{base}-{count}")
    return slugs


def parse_headings(fmt, lines):
    headings = []
    for line_no, line in enumerate(lines):
        if fmt == "textile":
            match = TEXTILE_HEADING_RE.match(line)
            if match:
                level = int(match.group(1))
                text = match.group(2).strip()
            else:
                continue
        else:
            match = MARKDOWN_HEADING_RE.match(line)
            if match:
                level = len(match.group(1))
                text = match.group(2).strip()
            else:
                continue
        if text:
            headings.append((line_no, level, text))
    return headings


def build_toc_block(fmt, headings):
    if not headings:
        return None
    min_level = min(level for _, level, _ in headings)
    texts = [text for _, _, text in headings]
    slugs = make_slugs(texts, fmt)
    lines = ["h2. Table of Contents" if fmt == "textile" else "## Table of Contents"]
    for (_, level, text), slug in zip(headings, slugs):
        depth = level - min_level + 1
        if fmt == "textile":
            lines.append(("*" * depth) + " \"" + text + "\":#" + slug)
        else:
            link_text = text.replace("\\", "").replace("`", "").replace("[", "\\[").replace("]", "\\]")
            lines.append(("  " * (depth - 1)) + "- [" + link_text + "](#" + slug + ")")
    return "\n".join(lines)


def find_toc_block(fmt, lines, headings):
    for line_no, _, text in headings:
        if text.lower() == TOC_TITLE.lower():
            list_re = TEXTILE_LIST_RE if fmt == "textile" else MARKDOWN_LIST_RE
            last = line_no
            j = line_no + 1
            while j < len(lines) and lines[j].strip() and list_re.match(lines[j]):
                last = j
                j += 1
            return line_no, last
    return None


def build_toc_actions(uri, text, fmt):
    lines = text.split("\n")
    headings = parse_headings(fmt, lines)
    if not headings:
        return []

    toc_range = find_toc_block(fmt, lines, headings)
    if toc_range is not None:
        toc_start, toc_end = toc_range
        headings = [h for h in headings if h[0] < toc_start or h[0] > toc_end]
        start = {"line": toc_start, "character": 0}
        end = {"line": toc_end, "character": len(lines[toc_end])}
    else:
        headings = [h for h in headings if h[2].lower() != TOC_TITLE.lower()]
        if not headings:
            return []
        insert_line = headings[0][0] + 1
        next_line = lines[insert_line] if insert_line < len(lines) else None
        start = end = {"line": insert_line, "character": 0}

    block = build_toc_block(fmt, headings)
    if block is None:
        return []

    if toc_range is not None:
        new_text = block
    else:
        next_line = lines[insert_line] if insert_line < len(lines) else None
        if next_line is not None and next_line.strip() == "":
            new_text = "\n" + block + "\n"
        else:
            new_text = "\n" + block + "\n\n"

    edit = {
        "range": {"start": start, "end": end},
        "newText": new_text,
    }
    action = {
        "title": "Insert Table of Contents",
        "kind": "source",
        "isPreferred": True,
        "edit": {"changes": {uri: [edit]}},
    }
    return [action]


def handle_code_action(req, params, docs):
    uri = params["textDocument"]["uri"]
    entry = docs.get(uri)
    if entry is None:
        respond(req, [])
        return
    language_id, text = entry
    context = params.get("context") or {}
    only = context.get("only") or []
    if only and "source" not in only:
        respond(req, [])
        return
    lang = (language_id or "").lower()
    if lang == "textile":
        fmt = "textile"
    elif lang == "markdown":
        fmt = "markdown"
    else:
        respond(req, [])
        return
    respond(req, build_toc_actions(uri, text, fmt))


def main():
    documents = {}
    while True:
        msg = read_message()
        if msg is None:
            break
        method = msg.get("method")
        params = msg.get("params") or {}

        if method == "initialize":
            respond(msg, {
                "capabilities": {
                    "textDocumentSync": {"openClose": True, "change": 1},
                    "codeActionProvider": {"codeActionKinds": ["source"]},
                },
                "serverInfo": {"name": "textile-lsp", "version": "0.1.0"},
            })
        elif method == "initialized":
            pass
        elif method == "textDocument/didOpen":
            text_document = params["textDocument"]
            documents[text_document["uri"]] = (
                text_document.get("languageId", ""),
                text_document.get("text", ""),
            )
        elif method == "textDocument/didChange":
            text_document = params["textDocument"]
            uri = text_document["uri"]
            language_id, _ = documents.get(uri, ("", ""))
            documents[uri] = (language_id, params["contentChanges"][0]["text"])
        elif method == "textDocument/didSave":
            text_document = params["textDocument"]
            uri = text_document["uri"]
            language_id, _ = documents.get(uri, ("", ""))
            if params.get("text") is not None:
                documents[uri] = (language_id, params["text"])
        elif method == "textDocument/didClose":
            documents.pop(params["textDocument"]["uri"], None)
        elif method == "textDocument/codeAction":
            handle_code_action(msg, params, documents)
        elif method == "shutdown":
            respond(msg, None)
        elif method == "exit":
            break
        elif method and (method.startswith("$/") or method == "workspace/didChangeConfiguration"):
            pass
        elif "id" in msg:
            respond(msg, None)


if __name__ == "__main__":
    main()
