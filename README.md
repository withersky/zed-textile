# Textile for Zed

[Textile](https://textile-lang.org/) markup language support for the [Zed](https://zed.dev/) editor.

## Features

- Syntax highlighting for headings (`h1.` – `h6.`), lists, paragraphs, and code blocks (`<pre>`, `bc.`, `pre.`)
- Inline markup support:
  - `*strong*` / `**bold**`
  - `_emphasis_` / `__italic__`
  - `@inline code@`
  - `+inserted+`
  - `-deleted-`
  - `^superscript^`
  - `~subscript~`
  - `"link text":url`
  - `!image.png!`
- Tree-sitter based outline (document symbols) via headings
- Code action: "Insert Table of Contents" (requires the bundled LSP)

## Installation

### From Zed extensions

Open Zed → Extensions → search for **Textile** → Install.

### Local development

1. Clone this repository
2. Open the `zed-textile` folder in Zed
3. Run `zed: install dev extension` from the command palette

## LSP (Optional)

A minimal LSP server (`tools/textile_lsp.py`) provides a **Insert Table of Contents** code action.

Configure in your Zed settings:

```json
{
  "lsp": {
    "textile-lsp": {
      "binary": {
        "path": "/usr/bin/python3",
        "arguments": ["/absolute/path/to/tools/textile_lsp.py"]
      }
    }
  }
}
```

## Rebuilding the grammar

```sh
cd grammars/textile
npm install
./node_modules/.bin/tree-sitter generate
./node_modules/.bin/tree-sitter build-wasm
cp tree-sitter-textile.wasm ../textile.wasm
```

## License

MIT
