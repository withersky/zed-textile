# Textile для Zed

Единое расширение для редактора [Zed](https://zed.dev/): поддержка языка разметки [Textile](https://textile-lang.org/) + умные действия с кодом для **Markdown** и **Textile**.

## Возможности

- Подсветка синтаксиса для заголовков (`h1.` – `h6.`), списков, параграфов и блоков кода (`<pre>`, `bc.`, `pre.`)
- Поддержка строчной разметки:
  - `*strong*` / `**bold**`
  - `_emphasis_` / `__italic__`
  - `@inline code@`
  - `+inserted+`
  - `-deleted-`
  - `^superscript^`
  - `~subscript~`
  - `"link text":url`
  - `!image.png!`
- Структура документа (символы) через tree-sitter на основе заголовков
- **Действия с кодом** (ПКМ → *Показать действия с кодом*) для файлов `.md` и `.textile`:
  - **Вставить оглавление** — генерирует вложенное оглавление из заголовков
  - **Выровнять таблицы** — выравнивает колонки таблиц по ширине

## Установка

### Из магазина расширений Zed

Откройте Zed → Extensions → найдите **Textile** → Установите.

### Локальная разработка

1. Клонируйте репозиторий в директорию расширений Zed:

   ```sh
   git clone https://github.com/withersky/zed-textile.git ~/.local/zed.app/extensions/zed-textile
   ```

2. Откройте папку в Zed:

   ```sh
   zed ~/.local/zed.app/extensions/zed-textile
   ```

3. Выполните команду `zed: install dev extension` из палитры команд

> **Примечание:** Исходники расширения хранятся в `~/.local/zed.app/extensions/`. Команда `install dev extension` создаёт симлинк из стандартной директории расширений Zed (`~/.local/share/zed/extensions/installed/`) на эту папку.

### Действия с кодом (LSP)

Действия с кодом предоставляет встроенный LSP-сервер (скрипт `tools/auto_lsp.py`), который расширение регистрирует само через WASM-адаптер (`extension.wasm`) — **никаких правок в `settings.json` не требуется**.

После установки/перезапуска Zed откройте `.md` или `.textile` файл, нажмите правой кнопкой мыши → **Показать действия с кодом** и выберите нужное действие.

## Пересборка WASM-адаптера

Если меняли Rust-код адаптера (`src/lib.rs`):

```sh
cargo build --release --target wasm32-wasip2
cp target/wasm32-wasip2/release/zed_textile.wasm extension.wasm
```

## Пересборка грамматики

```sh
cd grammars/textile
npm install
./node_modules/.bin/tree-sitter generate
./node_modules/.bin/tree-sitter build-wasm
cp tree-sitter-textile.wasm ../textile.wasm
```

## Лицензия

MIT