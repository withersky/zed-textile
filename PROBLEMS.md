# Проблемы расширения Textile для Zed

> **Статус: все проблемы решены** ✅

## 1. Критичные проблемы

### 1.1. `repository` в `extension.toml` невалиден ✅
Заменён на `https://github.com/withersky/textile-zed`

### 1.2. Грамматика не парсит inline-разметку ✅
`grammar.js` расширен правилами для:
- `*strong*` — жирный
- `_emphasis_` — курсив
- `*_bold_italic_*` — жирный+курсив
- `@inline_code@` — код
- `+inserted+` — вставлено
- `-deleted-` — удалено
- `^superscript^` — верхний индекс
- `~subscript~` — нижний индекс
- `"link text":url` — ссылки
- `!image.png!` — картинки

Также `code_block` расширен на `bc.` и `pre.` (помимо `<pre>...</pre>`).

Грамматика сгенерирована (`tree-sitter generate`), WASM собран (`tree-sitter build --wasm`).

## 2. Подсветка (highlighting) ✅

Оба `highlights.scm` обновлены с использованием стандартных имён захватов Zed:
- `@markup.heading.1` … `@markup.heading.6`
- `@punctuation.special` — маркеры заголовков/списков
- `@markup.raw` — блоки кода
- `@markup.strong`, `@markup.italic`
- `@markup.raw.inline` — инлайн-код
- `@markup.inserted`, `@markup.deleted`
- `@markup.superscript`, `@markup.subscript`
- `@markup.link`, `@markup.link.url`, `@markup.link.image`
- `@punctuation.definition` — разделители разметки

## 3. Прочие косяки ✅

- `vendor/` удалён (дублировал `grammars/textile/`)
- Мусорные бэкапы `Makefile.back`, `grammar.js.back` удалены
- Добавлен `LICENSE` (MIT) и `README.md`
- `outline.scm` обновлён под новую структуру дерева

## 4. План действий — выполнен

1. [x] Исправить `repository` в `extension.toml`
2. [x] Причесать `highlights.scm` на стандартные имена
3. [x] Дописать inline-разметку в `grammar.js` + пересобрать `textile.wasm`
4. [x] Расширить `code_block` на `bc.`/`pre.`
5. [x] Удалить `vendor/`, `*.back`, добавить `LICENSE`/`README.md`
6. [x] Проверить `outline.scm` на реальном файле
