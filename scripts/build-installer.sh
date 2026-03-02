#!/bin/bash
# Compiles the installer AppleScript into Install Slack Aggregator.app
# Run after cloning or pulling to regenerate the installer .app.

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$DIR/Install Slack Aggregator.app"
SRC_ICON="$DIR/public/icon-512.png"

# Compile AppleScript into .app (strip xattrs first to avoid codesign conflicts)
xattr -cr "$APP_DIR" 2>/dev/null || true
rm -rf "$APP_DIR"
osacompile -o "$APP_DIR" "$DIR/scripts/installer.applescript"

# Generate .icns icon from the app icon
if [ -f "$SRC_ICON" ]; then
  ICONSET_DIR=$(mktemp -d)/AppIcon.iconset
  mkdir -p "$ICONSET_DIR"

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

  # Remove compiled asset catalog — it contains a default icon that
  # overrides applet.icns on modern macOS.
  rm -f "$APP_DIR/Contents/Resources/Assets.car"
fi

# Update Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleName 'Install Slack Aggregator'" "$APP_DIR/Contents/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string 'com.local.slack-aggregator-installer'" "$APP_DIR/Contents/Info.plist" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier 'com.local.slack-aggregator-installer'" "$APP_DIR/Contents/Info.plist" 2>/dev/null || true

# Strip resource forks and re-sign after modifying resources
xattr -cr "$APP_DIR"
codesign --force --sign - "$APP_DIR"

echo "Built: $APP_DIR"
