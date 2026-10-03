#!/usr/bin/env bash
# Clones (or updates) the Magic UI source (MIT) as a read-only reference for the design agents.
# Usage: bash fetch-magicui.sh [target dir]   (default: ~/.cache/design-bake-off/magicui)
set -euo pipefail
TARGET="${1:-$HOME/.cache/design-bake-off/magicui}"
if [ -d "$TARGET/.git" ]; then
  git -C "$TARGET" pull --ff-only
else
  git clone --depth 1 https://github.com/magicuidesign/magicui.git "$TARGET"
fi
echo "Magic UI source: $TARGET"
