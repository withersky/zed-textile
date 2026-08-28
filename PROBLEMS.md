# Проблемы расширения Textile для Zed

> Статус: черновик. Расширение едва покрывает базу Textile и **не поддерживает
> inline-разметку** (`*жирный*`, `_курсив_`, `@код@`, ссылки, картинки).
> Поэтому «жирно и т.п. как в Markdown» в редакторе сейчас не работает.

## 1. Критичные проблемы

### 1.1. `repository` в `extension.toml` невалиден
```toml
repository = "file:///home/n.voroshilov@corp.nt.ru/textile-zed/vendor/tree-sitter-textile"
```
Это локальный путь — для опубликованного расширения не годится.

**Решение:** заменить на реальный https-URL репозитория расширения, например:
```toml
repository = "https://github.com/withersky/textile-zed"
```
(подставить свой реальный репозиторий).

### 1.2. Грамматика не парсит inline-разметку
Файл `grammars/textile/grammar.js` (и дубликат в `vendor/tree-sitter-textile/`)
содержит только:
- заголовки `h1.`–`h6.`
- параграфы
- списки (`*`, `**`, …)
- блок `<pre>…</pre>`
- подсекции `p(.`

В дереве разбора **нет узлов** для `*strong*`, `_emphasis_`, `@code@`,
`+insert+`, `-delete-`, `^sup^`, `~sub~`, `"ссылка":url`, `!картинка!`.
Без узлов `highlights.scm` не может их подсветить.

**Почему это блокирует «жирный/курсив»:** Zed подсвечивает через tree-sitter
запросы, которым нужны именованные узлы. Их нет → подсветка невозможна,
пока грамматика не дописана и `textile.wasm` не пересобран.

**Решение (тяжёлое):** расширить `grammar.js` inline-правилами, сгенерировать
`src/parser.c`/`src/node-types.json` и пересобрать wasm:
```sh
cd grammars/textile
npm install            # ставит tree-sitter-cli (нужен postinstall-скрипт!)
./node_modules/.bin/tree-sitter generate
./node_modules/.bin/tree-sitter parse ../../test/sample.textile   # проверка
./node_modules/.bin/tree-sitter build-wasm                       # Docker
cp tree-sitter-textile.wasm ../../grammars/textile.wasm
```

## 2. Подсветка (highlighting)

Две несогласованные `highlights.scm`:
- `languages/textile/highlights.scm`
- `grammars/textile/queries/highlights.scm`

В `languages/textile/highlights.scm` используются нестандартные имена захвата:
`@title.markup`, `@text`, `@punctuation.list_marker.markup`.

**Решение:** привести к стандарту Zed/themes:
- заголовки → `@markup.heading` (+ `.1`…`.6`)
- маркеры заголовков/списков → `@punctuation.definition` / `@punctuation.special`
- блок кода → `@markup.raw`
- после появления inline-узлов:
  - `*strong*`/`**strong**` → `@markup.strong`
  - `_emphasis_`/`__emphasis__` → `@markup.italic`
  - `@code@` → `@markup.raw.inline`
  - `+insert+` → `@markup.inserted`
  - `-delete-` → `@markup.deleted`
  - `^sup^` → `@markup.superscript`
  - `~sub~` → `@markup.subscript`
  - `"text":url` → `@markup.link` + `@markup.link.url`
  - `!img!` → `@markup.link.image`

## 3. Прочие косяки

- `code_block` ловит только `<pre>…</pre>`, а не реальный синтаксис Textile
  (`bc.`, `pre.`, `bc..` и т.д.).
- Дублируется исходник грамматики: `grammars/textile/` и
  `vendor/tree-sitter-textile/` идентичны — `vendor/` лишний, удалить.
- Остались мусорные бэкапы: `Makefile.back`, `grammar.js.back`.
- Нет `LICENSE` и `README.md`.
- `outline.scm` опирается на узел `section`, который есть, но выглядит
  хрупко — проверить после пересборки грамматики.
- LSP (`tools/textile_lsp.py`) только вставляет оглавление — не критично,
  но стоит документировать в README.

## 4. План действий (по приоритету)

1. [ ] Исправить `repository` в `extension.toml` (см. 1.1). — быстро
2. [ ] Причесать `languages/textile/highlights.scm` на стандартные имена. — быстро
3. [ ] Дописать inline-разметку в `grammar.js` + пересобрать `textile.wasm`. — тяжело
4. [ ] Расширить `code_block` на `bc.`/`pre.`. — средне
5. [ ] Удалить `vendor/`, `*.back`, добавить `LICENSE`/`README.md`. — быстро
6. [ ] Проверить `outline.scm` на реальном файле. — быстро

## 5. Как проверять

После правок грамматики/подсветки открыть `test/sample.textile` в Zed и
убедиться, что заголовки, списки и (после п.3) жирный/курсив/код внутри строк
подсвечиваются. Для локальной отладки грамматики:
```sh
cd grammars/textile
./node_modules/.bin/tree-sitter parse ../../test/sample.textile
```
