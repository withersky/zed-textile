#!/usr/bin/env sh
# =============================================================================
# package.sh — собирает «чистую» конечную версию расширения для пользователя.
#
# Из исходного репозитория берутся только файлы, нужные в рантайме:
#   extension.toml, extension.wasm, grammars/textile.wasm,
#   languages/textile/, tools/auto_lsp.py, README.md, LICENSE
# Весь dev-мусор (src/, Cargo.*, target/, исходники грамматики, tmp/, test/,
# dev-скрипты tools/) в пакет не попадает.
#
# Использование:
#   ./package.sh            # упаковать текущий собранный extension.wasm
#   ./package.sh --build    # сначала пересобрать extension.wasm (нужен cargo)
#   ./package.sh --no-archive  # только папка, без .tar.gz/.zip
#
# Результат: dist/zed-textile-<version>/  (+ .tar.gz и .zip при наличии инструментов)
# =============================================================================

set -eu

cd "$(dirname "$0")"

DO_BUILD=0
DO_ARCHIVE=1
for arg in "$@"; do
    case "$arg" in
        --build) DO_BUILD=1 ;;
        --no-archive) DO_ARCHIVE=0 ;;
        -h|--help)
            sed -n '1,14p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "Неизвестный аргумент: $arg" >&2
            exit 1
            ;;
    esac
done

# --- Версия из extension.toml ------------------------------------------------
if [ ! -f extension.toml ]; then
    echo "Ошибка: extension.toml не найден. Запускай из корня репозитория." >&2
    exit 1
fi
VERSION=$(sed -n 's/^version = "\(.*\)"/\1/p' extension.toml | head -n1)
if [ -z "$VERSION" ]; then
    echo "Ошибка: не удалось прочитать version из extension.toml" >&2
    exit 1
fi

# --- Необязательная пересборка WASM ------------------------------------------
if [ "$DO_BUILD" -eq 1 ]; then
    echo ">> Пересборка extension.wasm..."
    cargo build --release --target wasm32-wasip2
    cp target/wasm32-wasip2/release/zed_textile.wasm extension.wasm
else
    # Предупреждение, если wasm старше исходников Rust
    if [ -f src/lib.rs ] && [ extension.wasm -ot src/lib.rs ]; then
        echo "ВНИМАНИЕ: extension.wasm старше src/lib.rs — вероятно, собран из устаревшего кода." >&2
        echo "         Используй ./package.sh --build, чтобы пересобрать." >&2
    fi
fi

if [ ! -f extension.wasm ]; then
    echo "Ошибка: extension.wasm не существует. Сначала собери его (--build)." >&2
    exit 1
fi

# --- Сборка чистой папки ------------------------------------------------------
STAGE="dist/zed-textile"
rm -rf "$STAGE"
mkdir -p "$STAGE/grammars" "$STAGE/languages" "$STAGE/tools"

echo ">> Версия: $VERSION"
echo ">> Копирую файлы в $STAGE/"

copy_file() {
    if [ ! -f "$1" ]; then
        echo "Пропуск (нет файла): $1" >&2
        return 1
    fi
    mkdir -p "$(dirname "$STAGE/$1")"
    cp "$1" "$STAGE/$1"
    echo "  + $1"
}

copy_file extension.toml
copy_file extension.wasm
copy_file grammars/textile.wasm
copy_file languages/textile/config.toml
copy_file languages/textile/highlights.scm
copy_file languages/textile/outline.scm
copy_file tools/auto_lsp.py
copy_file README.md
copy_file LICENSE

# --- Архивы -------------------------------------------------------------------
if [ "$DO_ARCHIVE" -eq 1 ]; then
    (cd dist && tar -czf "zed-textile-$VERSION.tar.gz" "zed-textile")
    echo ">> Создан архив: dist/zed-textile-$VERSION.tar.gz"

    if command -v zip >/dev/null 2>&1; then
        (cd dist && zip -qr "zed-textile-$VERSION.zip" "zed-textile")
        echo ">> Создан архив: dist/zed-textile-$VERSION.zip"
    fi
fi

# --- Итоговая сводка -----------------------------------------------------------
echo
echo "Готово. В пакете:"
find "$STAGE" -type f | sort
echo
echo "Установка у пользователя (вариант «dev extension»):"
echo "  1. Распаковать/скопировать содержимое в ~/.local/zed.app/extensions/zed-textile/"
echo "     (см. README — именно этот путь ожидает LSP-адаптер)"
echo "  2. В Zed: палитра команд → 'zed: install dev extension' → выбрать папку"
echo
echo "ПРИМЕЧАНИЕ о LSP-пути:"
echo "  zed_extension_api 0.7.0 не даёт WASM узнать директорию установки, поэтому"
echo "  путь к tools/auto_lsp.py захардкожен как ~/.local/zed.app/extensions/"
echo "  zed-textile/tools/auto_lsp.py. Для публикации в магазине расширений этот"
echo "  механизм нужно будет заменить на download_file() (скачивание при первом"
echo "  запуске) — могу сделать отдельно."
