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
need npm

if [ -d "$APP_DIR/.git" ]; then
  echo "Updating existing BoardClip install in $APP_DIR"
  cd "$APP_DIR"
  git pull --rebase --autostash
else
  echo "Installing BoardClip to $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

npm install
chmod +x install.sh update.sh start.sh kill.sh 2>/dev/null || true
./start.sh

echo ""
echo "BoardClip is running."
echo "Update later with:"
echo "  curl -fsSL https://boardclip.sh/update.sh | sh"
