#!/bin/bash
# 一键：导出 Web 版 → 推送 → GitHub Pages 自动更新
set -e
cd "$(dirname "$0")"
GODOT="/Applications/Godot.app/Contents/MacOS/Godot"
echo "导出 Web 版..."
"$GODOT" --headless --path . --export-release "Web" docs/index.html
touch docs/.nojekyll
git add -A
git commit -m "更新 Web 部署 $(date '+%Y-%m-%d %H:%M')" || echo "（无改动，跳过提交）"
git push origin main
echo "已推送，约 1 分钟后刷新： https://yuwenan.github.io/memory-fragments-game/"
