#!/bin/bash
# 一键部署：网页源码就在 docs/，GitHub Pages 直接托管，提交即上线
set -e
cd "$(dirname "$0")"
git add -A
git commit -m "更新 $(date '+%Y-%m-%d %H:%M')" || echo "（无改动）"
git push origin main
echo "已推送，约 1 分钟后刷新： https://yuwenan.github.io/memory-fragments-game/"
