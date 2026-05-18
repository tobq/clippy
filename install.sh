#!/bin/bash
echo "Installing BoardClip (Electron)..."
cd "$(dirname "$0")"
npm install
echo ""
sh scripts/create-macos-launcher.sh "$(pwd)" 2>/dev/null || true
echo ""
echo "Done! Run ./start.sh to launch, or ./update.sh to pull latest and relaunch."
echo "Auto-start can be toggled in Settings within the app."
