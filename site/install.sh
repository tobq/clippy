#!/usr/bin/env sh
set -eu

REPO_URL="${BOARDCLIP_REPO_URL:-https://github.com/tobq/boardclip.git}"
APP_DIR="${BOARDCLIP_APP_DIR:-$HOME/.local/share/boardclip}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    echo "Install $1, then run this installer again." >&2
    exit 1
  fi
}

need git

if [ -d "$APP_DIR/.git" ]; then
  echo "BoardClip is already installed in $APP_DIR"
  echo "Running the standard update flow..."
  cd "$APP_DIR"
  export BOARDCLIP_UPDATE_ALLOW_DIRTY="${BOARDCLIP_UPDATE_ALLOW_DIRTY:-1}"
  exec ./update.sh
elif [ -e "$APP_DIR" ]; then
  echo "Cannot install BoardClip: $APP_DIR already exists but is not a git checkout." >&2
  echo "Move it aside or set BOARDCLIP_APP_DIR to another directory." >&2
  exit 1
else
  need npm
  echo "Installing BoardClip to $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

chmod +x install.sh update.sh start.sh kill.sh 2>/dev/null || true
./install.sh
./start.sh

echo ""
echo "BoardClip is running."
echo "Update later with:"
echo "  curl -fsSL https://boardclip.sh/update.sh | sh"
