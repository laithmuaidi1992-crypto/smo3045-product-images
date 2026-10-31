#!/usr/bin/env bash
# Applies App Store settings to the generated Xcode project (run after `npx cap add ios`).
# usage: configure-ios.sh <marketing_version> <build_number>
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${1:-1.0.0}"; BUILD="${2:-1}"
PLIST=ios/App/App/Info.plist
pb() { /usr/libexec/PlistBuddy -c "$1" "$PLIST" 2>/dev/null || true; }
set_str() { pb "Delete :$1"; /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$PLIST"; }
set_bool() { pb "Delete :$1"; /usr/libexec/PlistBuddy -c "Add :$1 bool $2" "$PLIST"; }

set_str CFBundleDisplayName "3045"
set_str CFBundleDevelopmentRegion "ar"
pb "Delete :CFBundleLocalizations"
/usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations:0 string ar" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleLocalizations:1 string en" "$PLIST"
# location is used only to pin the delivery address on the map
set_str NSLocationWhenInUseUsageDescription "نستخدم موقعك لتحديد عنوان التوصيل على الخريطة بدقة حتى يصلك المندوب بسرعة."
set_bool ITSAppUsesNonExemptEncryption false
set_str UIUserInterfaceStyle "Light"
set_bool UIRequiresFullScreen true
# iPhone portrait only
pb "Delete :UISupportedInterfaceOrientations"
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST"
pb "Delete :UISupportedInterfaceOrientations~ipad"

PBX=ios/App/App.xcodeproj/project.pbxproj
sed -i '' -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = ${VERSION};/g" "$PBX"
sed -i '' -E "s/CURRENT_PROJECT_VERSION = [^;]+;/CURRENT_PROJECT_VERSION = ${BUILD};/g" "$PBX"
# iPhone only (no iPad screenshots needed for review)
sed -i '' -E 's/TARGETED_DEVICE_FAMILY = [^;]+;/TARGETED_DEVICE_FAMILY = 1;/g' "$PBX"
echo "configured v${VERSION} (${BUILD})"
