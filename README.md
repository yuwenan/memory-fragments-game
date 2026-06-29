# 记忆碎片 Memory Fragments

第一人称密室逃脱解谜小游戏。网页原生（零依赖 HTML/CSS/Canvas），中文原生渲染、秒加载、带视差/灰尘/灯光闪烁等氛围特效。

## 在线试玩

https://yuwenan.github.io/memory-fragments-game/

Chrome / Edge / Safari 打开即可，无需安装。

## 第一关谜题

墙上四个刻痕数字顺序未知；台灯的光从右往左扫过墙面（纸条："光知道方向"）——顺着光从右往左读，即得柜子四位密码。

## 目录

- `docs/` —— 网页游戏本体（GitHub Pages 托管目录）
  - `index.html` / `style.css` / `game.js`
  - `assets/` —— 压缩后的运行用图（JPEG）
- `assets/` —— 美术母版（GPT 生成的原始 PNG，全分辨率）

## 重新部署

```bash
./deploy.sh
```

提交并推送，GitHub Pages 约 1 分钟后生效。
