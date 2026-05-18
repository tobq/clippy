#!/usr/bin/env sh
set -eu

APP_DIR="${BOARDCLIP_APP_DIR:-$HOME/.local/share/boardclip}"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "BoardClip is not installed at $APP_DIR." >&2
  echo "Install it with:" >&2
  echo "  curl -fsSL https://boardclip.sh/install.sh | sh" >&2
  exit 1
fi

cd "$APP_DIR"
export BOARDCLIP_UPDATE_ALLOW_DIRTY="${BOARDCLIP_UPDATE_ALLOW_DIRTY:-1}"
exec ./update.sh
