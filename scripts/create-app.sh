#!/bin/bash
# Creates a macOS .app bundle for Slack Aggregator.
# Usage: create-app.sh [output-dir]
#   output-dir defaults to /Applications

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
LAUNCH_SCRIPT="$DIR/scripts/launch.sh"
APP_NAME="Slack Aggregator"
OUTPUT_DIR="${1:-/Applications}"
APP_DIR="${OUTPUT_DIR}/${APP_NAME}.app"

# Create the .app using osacompile (runs without terminal window)
# launch.sh sets up PATH itself — no login shell needed (avoids
# Finder's broken cwd crashing Volta/brew during profile sourcing).
SCRIPT=$(cat <<APPLESCRIPT
do shell script "bash '${LAUNCH_SCRIPT}' > /tmp/slack-aggregator-launch.log 2>&1"
APPLESCRIPT
)

mkdir -p "$OUTPUT_DIR"
rm -rf "$APP_DIR"
echo "$SCRIPT" | osacompile -o "$APP_DIR"

# Generate .icns icon from the PNG
ICONSET_DIR=$(mktemp -d)/AppIcon.iconset
mkdir -p "$ICONSET_DIR"

SRC_ICON="$DIR/public/icon-512.png"
if [ -f "$SRC_ICON" ]; then
  sips -z 16 16     "$SRC_ICON" --out "$ICONSET_DIR/icon_16x16.png"      >/dev/null 2>&1
  sips -z 32 32     "$SRC_ICON" --out "$ICONSET_DIR/icon_16x16@2x.png"   >/dev/null 2>&1
  sips -z 32 32     "$SRC_ICON" --out "$ICONSET_DIR/icon_32x32.png"      >/dev/null 2>&1
  sips -z 64 64     "$SRC_ICON" --out "$ICONSET_DIR/icon_32x32@2x.png"   >/dev/null 2>&1
  sips -z 128 128   "$SRC_ICON" --out "$ICONSET_DIR/icon_128x128.png"    >/dev/null 2>&1
  sips -z 256 256   "$SRC_ICON" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null 2>&1
  sips -z 256 256   "$SRC_ICON" --out "$ICONSET_DIR/icon_256x256.png"    >/dev/null 2>&1
  sips -z 512 512   "$SRC_ICON" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null 2>&1
  cp "$SRC_ICON"               "$ICONSET_DIR/icon_512x512.png"
  cp "$SRC_ICON"               "$ICONSET_DIR/icon_512x512@2x.png"

  iconutil -c icns "$ICONSET_DIR" -o "$APP_DIR/Contents/Resources/applet.icns"
fi

# Update Info.plist with better metadata
/usr/libexec/PlistBuddy -c "Set :CFBundleName '${APP_NAME}'" "$APP_DIR/Contents/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier 'com.local.slack-aggregator'" "$APP_DIR/Contents/Info.plist" 2>/dev/null || true

echo "$APP_DIR"
