#!/bin/bash
echo "Installing Clippy (Electron)..."
cd "$(dirname "$0")"
npm install
echo ""
echo "Done! Run ./start.sh to launch, or ./update.sh to pull latest and relaunch."
echo "Auto-start can be toggled in Settings within the app."
