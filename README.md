# Textile для Zed

Поддержка языка разметки [Textile](https://textile-lang.org/) для редактора [Zed](https://zed.dev/).

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

> **Примечание:** Генерация оглавления вынесена в отдельное расширение — [Auto TOC](https://github.com/withersky/zed-auto-toc).

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