#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  exit 0
fi

APP_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
LAUNCHER_DIR="$HOME/Applications/BoardClip.app"
MACOS_DIR="$LAUNCHER_DIR/Contents/MacOS"
RESOURCES_DIR="$LAUNCHER_DIR/Contents/Resources"

xml_escape() {
  printf '%s' "$1" | sed \
    -e 's/&/\&amp;/g' \
    -e 's/</\&lt;/g' \
    -e 's/>/\&gt;/g' \
    -e 's/"/\&quot;/g'
}

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

APP_DIR_SH="$(shell_quote "$APP_DIR")"
cat > "$MACOS_DIR/BoardClip" <<EOF
#!/bin/sh
cd $APP_DIR_SH
./start.sh >/dev/null 2>&1 &
exit 0
EOF
chmod +x "$MACOS_DIR/BoardClip"

if [ -f "$APP_DIR/icon.png" ]; then
  cp "$APP_DIR/icon.png" "$RESOURCES_DIR/icon.png" 2>/dev/null || true
fi

APP_DIR_XML="$(xml_escape "$APP_DIR")"
cat > "$LAUNCHER_DIR/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>BoardClip</string>
  <key>CFBundleExecutable</key>
  <string>BoardClip</string>
  <key>CFBundleIdentifier</key>
  <string>app.boardclip.source-launcher</string>
  <key>CFBundleName</key>
  <string>BoardClip</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>BoardClipSourceDirectory</key>
  <string>$APP_DIR_XML</string>
</dict>
</plist>
EOF

echo "Created Applications launcher: $LAUNCHER_DIR"
