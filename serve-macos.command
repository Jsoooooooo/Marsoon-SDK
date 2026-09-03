#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required: https://nodejs.org/"
  read -r "?Press Enter to close..."
  exit 1
fi
exec node ./serve-sdk.mjs
