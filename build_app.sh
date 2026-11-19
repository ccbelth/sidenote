#!/bin/bash
# 不用打包器，直接把应用代码塞进现成的 Electron 框架，适合本机已有 Electron.app 或没有网络时。
set -e
APP="$(cd "$(dirname "$0")" && pwd)"
SRC="${ELECTRON_APP:-$HOME/.cache/electron-frameworks/Electron-arm64.app}"
DST="$APP/dist/SideNote.app"
PLIST="$DST/Contents/Info.plist"

if [ ! -d "$SRC" ]; then
  echo "找不到 Electron 框架：$SRC"
  echo "可以先用 npx @electron/packager electron Electron --platform=darwin --arch=arm64 取一份，再用 ELECTRON_APP 指过去"
  exit 1
fi

echo "[1] 复制框架"
rm -rf "$APP/dist"
mkdir -p "$APP/dist"
cp -R "$SRC" "$DST"

echo "[2] 放入应用代码"
mkdir -p "$DST/Contents/Resources/app/assets"
cp "$APP/index.html" "$DST/Contents/Resources/app/"
cp "$APP/main.js" "$DST/Contents/Resources/app/"
if [ -d "$APP/assets" ]; then cp -R "$APP/assets/." "$DST/Contents/Resources/app/assets/"; fi
cat > "$DST/Contents/Resources/app/package.json" <<'EOF'
{ "name": "sidenote", "version": "1.0.0", "main": "main.js" }
EOF
rm -f "$DST/Contents/Resources/default_app.asar"

echo "[3] 生成图标"
ICONSET=/tmp/sn.iconset
rm -rf "$ICONSET"; mkdir -p "$ICONSET"
DP="$APP/assets/dock.png"
for s in 16 32 64 128 256 512; do
  sips -z $s $s "$DP" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null 2>&1 || true
done
iconutil --convert icns "$ICONSET" -o "$DST/Contents/Resources/electron.icns" 2>/dev/null || echo "  图标跳过"
rm -rf "$ICONSET"

echo "[4] 写 Info.plist"
PB=/usr/libexec/PlistBuddy
$PB -c "Set :CFBundleName SideNote" "$PLIST" 2>/dev/null || $PB -c "Add :CFBundleName string SideNote" "$PLIST"
$PB -c "Set :CFBundleDisplayName SideNote" "$PLIST" 2>/dev/null || true
$PB -c "Set :CFBundleIdentifier com.sidenote.app" "$PLIST"
$PB -c "Set :CFBundleIconFile electron.icns" "$PLIST"
$PB -c "Add :NSMicrophoneUsageDescription string 录音备忘需要访问麦克风" "$PLIST" 2>/dev/null || $PB -c "Set :NSMicrophoneUsageDescription 录音备忘需要访问麦克风" "$PLIST"

echo "[5] 去隔离与签名"
xattr -dr com.apple.quarantine "$DST" 2>/dev/null || true
if codesign --force --deep --sign - "$DST" >/dev/null 2>&1; then echo "  本地签名完成"; else echo "  签名跳过，首次打开用右键打开"; fi

echo "完成：$DST"
