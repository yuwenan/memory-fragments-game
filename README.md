# 记忆碎片 Memory Fragments

第一人称密室逃脱解谜小游戏（Godot 4.7）。在废弃研究所的「觉醒室」醒来，借助线索推理出柜子密码，找到钥匙逃出房间。

## 在线试玩

https://yuwenan.github.io/memory-fragments-game/

（用 Chrome/Edge/Safari 打开即可，无需安装。）

## 第一关谜题

观察墙上四个刻痕数字，结合台灯的光照方向（光从右往左扫过墙面），顺着光从右往左读 → 得到柜子密码。

## 本地开发

用 Godot 4.7 打开本目录，运行 `scenes/main.tscn`。

## 重新部署

改完代码后执行：

```bash
./deploy.sh
```

会自动导出 Web 版、提交并推送，GitHub Pages 约 1 分钟后生效。
