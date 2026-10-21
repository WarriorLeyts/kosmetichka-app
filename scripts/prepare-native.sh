#!/usr/bin/env bash
# Builds the web bundle and (re)generates the native project for one platform.
# Usage: scripts/prepare-native.sh android|ios
set -euo pipefail
PLATFORM="$1"

npm run build
[ -d "$PLATFORM" ] || npx cap add "$PLATFORM"
npx capacitor-assets generate --"$PLATFORM" \
  --iconBackgroundColor '#8b3dff' --iconBackgroundColorDark '#8b3dff' \
  --splashBackgroundColor '#ffffff' --splashBackgroundColorDark '#111118'
npx cap sync "$PLATFORM"

# Version: 1.0.<run number> so every CI build can be uploaded to the stores
BUILD_NUMBER="${GITHUB_RUN_NUMBER:-1}"
if [ "$PLATFORM" = "android" ]; then
  sed -i.bak -E "s/versionCode [0-9]+/versionCode ${BUILD_NUMBER}/; s/versionName \"[^\"]+\"/versionName \"1.0.${BUILD_NUMBER}\"/" android/app/build.gradle
  rm -f android/app/build.gradle.bak
else
  PLIST=ios/App/App/Info.plist
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 1.0.${BUILD_NUMBER}" "$PLIST" || true
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "$PLIST" || true
  # Only portrait on iPhone, like the site's mobile layout
  /usr/libexec/PlistBuddy -c "Delete :UISupportedInterfaceOrientations" "$PLIST" || true
  /usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST" || true
fi
