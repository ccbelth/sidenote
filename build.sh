#!/bin/bash
# 打包 SideNote.app。需要本机已装 Node，打包器与 Electron 由 npx 自动取。
set -e
cd "$(dirname "$0")"
npx --yes @electron/packager . SideNote \
  --platform=darwin --arch=arm64 --overwrite \
  --out dist \
  --icon assets/dock.png \
  --extra-resource assets
echo "完成，输出在 dist/SideNote.app"
