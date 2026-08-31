#!/usr/bin/env python3
"""Тест LSP: initialize -> didOpen (.md и .textile) -> codeAction.

Запуск из корня проекта:
    python3 tools/test_lsp.py
"""
import json
import subprocess
import sys

PROC = None


def send(msg):
    payload = json.dumps(msg, ensure_ascii=False)
    data = payload.encode("utf-8")
    header = f"Content-Length: {len(data)}\r\n\r\n"
    PROC.stdin.write(header.encode("ascii") + data)
    PROC.stdin.flush()


def recv():
    # читаем один LSP-ответ (Content-Length framing)
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = PROC.stdout.read(1)
        if not chunk:
            return None
        buf += chunk
    header, rest = buf.split(b"\r\n\r\n", 1)
    cl = 0
    for line in header.decode().split("\r\n"):
        if line.lower().startswith("content-length:"):
            cl = int(line.split(":")[1].strip())
    while len(rest) < cl:
        rest += PROC.stdout.read(1)
    body = rest[:cl].decode("utf-8")
    return json.loads(body)


def show(tag, resp):
    print(f"\n=== {tag} ===")
    for a in resp["result"]:
        print(" -", a["title"], "| kind:", a["kind"])
        edit = a["edit"]["changes"]
        for uri, ed in edit.items():
            print("   uri:", uri)
            print("   newText:")
            print(repr(ed[0]["newText"]))


def main():
    global PROC
    PROC = subprocess.Popen(
        [sys.executable, "tools/auto_lsp.py"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )

    send({"jsonrpc": "2.0", "id": 1, "method": "initialize",
          "params": {"processId": None, "rootUri": None, "capabilities": {}}})
    init = recv()
    print("INIT capabilities:", json.dumps(init["result"]["capabilities"], ensure_ascii=False))
    send({"jsonrpc": "2.0", "method": "initialized", "params": {}})

    # ── Markdown: заголовки + НЕровная таблица + текст после ──
    md = """# Заголовок один

Немного текста.

| Имя | Рост | Город |
| --- | ---: | --- |
| Ваня | 180 | Москва |
| Петя | 170 | Тверь |

## Второй заголовок

текст
"""
    send({"jsonrpc": "2.0", "method": "textDocument/didOpen", "params": {
        "textDocument": {"uri": "file:///tmp/test.md", "languageId": "markdown", "version": 1, "text": md}}})
    send({"jsonrpc": "2.0", "id": 2, "method": "textDocument/codeAction", "params": {
        "textDocument": {"uri": "file:///tmp/test.md"},
        "range": {"start": {"line": 0, "character": 0}, "end": {"line": 0, "character": 0}},
        "context": {"diagnostics": []}}})
    show("MD actions", recv())

    # ── Textile: заголовки + НЕровная таблица + текст после ──
    tl = """h1. Привет

|Имя|Рост|Город|
|Ваня|180|Москва|
|Петя|170|Тверь|

h2. Раздел два
"""
    send({"jsonrpc": "2.0", "method": "textDocument/didOpen", "params": {
        "textDocument": {"uri": "file:///tmp/test.textile", "languageId": "textile", "version": 1, "text": tl}}})
    send({"jsonrpc": "2.0", "id": 3, "method": "textDocument/codeAction", "params": {
        "textDocument": {"uri": "file:///tmp/test.textile"},
        "range": {"start": {"line": 0, "character": 0}, "end": {"line": 0, "character": 0}},
        "context": {"diagnostics": []}}})
    show("TEXTILE actions", recv())

    send({"jsonrpc": "2.0", "id": 4, "method": "shutdown", "params": {}})
    recv()
    send({"jsonrpc": "2.0", "method": "exit", "params": {}})
    PROC.wait(timeout=5)

    err = PROC.stderr.read().decode()
    if err.strip():
        print("\n=== STDERR ===")
        print(err)
    print("\nOK: exit code", PROC.returncode)


if __name__ == "__main__":
    main()
