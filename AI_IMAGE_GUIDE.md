# 「记忆碎片」 — AI 图片生成指南

## 通用风格设定（每次生图都要带上）

所有图片使用统一风格，保持视觉一致性。在你的 AI 生图工具（Midjourney / Stable Diffusion / DALL-E 等）中，每次提示词都要包含以下风格关键词：

### 英文风格前缀（推荐用英文提示词生图效果更好）
```
Style: dark atmospheric illustration, hand-drawn texture, amber warm lighting, deep teal shadows, 2.5D slight perspective, mystery room escape game, dusty abandoned research facility, detailed textured objects, moody noir atmosphere, cinematic lighting, no characters visible, high quality game asset
```

### 中文风格前缀（如果你用中文生图工具）
```
风格：暗色氛围插画，手绘质感，琥珀暖光，深青阴影，2.5D微透视，密室逃脱游戏，废弃研究所，精细纹理物件，电影级光影，无人物，高质量游戏素材
```

---

## Room 01 — 觉醒室（Awakening Room）所需图片

### 1. 房间全景背景图（最重要！）

**用途**：整个房间的背景，玩家主要看到的画面

**尺寸建议**：1280 x 720 或 1920 x 1080

**英文提示词**：
```
Dark atmospheric illustration of a small dimly lit room in an abandoned research facility, single amber desk lamp casting warm light across dusty walls, a metal cot bed on the right side, a wooden desk with papers and lamp in the center, a locked metal cabinet on the left wall with a 4-digit code panel, a heavy door on the far right, faint scratches on the wall near the lamp, deep teal shadows in corners, hand-drawn texture, 2.5D slight perspective view, mystery room escape game background, cinematic noir lighting, no characters, high quality game asset, wide scene
```

### 2. 墙上刻痕（Wall Scratches）近距离图

**用途**：点击墙上刻痕时弹出的近距离查看图

**尺寸建议**：640 x 480

**英文提示词**：
```
Close-up of a concrete wall with numbers scratched into it: "1", "9", "3", "7" visible but scattered across the surface, illuminated by warm amber lamp light from the right side creating a directional shadow, dusty aged wall texture, dark teal shadow areas on left, hand-drawn illustration style, mystery clue detail, game asset
```

### 3. 桌上笔记（Desk Note）近距离图

**用途**：点击桌子时弹出，展示桌上纸张内容

**尺寸建议**：640 x 480

**英文提示词**：
```
Close-up of a handwritten note on aged yellowed paper lying on a wooden desk surface, text visible: "Start with what you see. The light knows the way.", warm amber desk lamp illumination from above, slight shadow, paper edges slightly curled, dust particles visible, hand-drawn illustration texture, mystery game clue asset
```

### 4. 台灯（Lamp）近距离图

**用途**：点击台灯时弹出，展示灯光方向线索

**尺寸建议**：640 x 480

**英文提示词**：
```
Close-up of a vintage brass desk lamp with warm amber light beam sweeping right-to-left across a dark wall surface, light cone visible creating directional illumination, deep teal shadows in unlit areas, dust particles in light beam, detailed metal lamp texture, hand-drawn illustration style, mystery game interactive object asset
```

### 5. 金属柜（Cabinet）近距离图 — 关闭状态

**用途**：点击柜子时弹出，展示密码锁面板

**尺寸建议**：640 x 480

**英文提示词**：
```
Close-up of a locked metal cabinet with a 4-digit mechanical code lock panel on its door, aged steel surface with slight rust and wear, small digital-style number display showing "____" (empty code slots), warm amber light from nearby lamp casting partial illumination, deep teal shadow on lower half, hand-drawn illustration texture, mystery escape game interactive object
```

### 6. 金属柜（Cabinet）近距离图 — 打开状态

**用途**：解开密码后，展示柜子内部

**尺寸建议**：640 x 480

**英文提示词**：
```
Close-up of an opened metal cabinet revealing interior: a brass key hanging on a hook inside, and a faded photograph tucked in a folder, warm amber light illuminating the inside, dust and aged metal texture, hand-drawn illustration style, mystery escape game reward scene
```

### 7. 门（Door）近距离图

**用途**：点击出口门时弹出

**尺寸建议**：640 x 480

**英文提示词**：
```
Close-up of a heavy industrial metal door with a key lock, reinforced frame, slight scratches around the lock area suggesting previous attempts to open it, warm amber light from room interior, deep teal shadow on the door surface, aged metal texture, hand-drawn illustration style, mystery escape game interactive object
```

### 8. 床铺（Bed）近距离图

**用途**：点击床时弹出

**尺寸建议**：640 x 480

**英文提示词**：
```
Close-up of a simple metal cot bed with thin gray mattress in a dim room, a small mirror symbol etched under the pillow edge visible, warm amber lamp light from nearby, deep teal shadows, dusty abandoned feel, hand-drawn illustration texture, mystery escape game interactive detail
```

### 9. 记忆碎片 — 照片

**用途**：柜子里找到的记忆碎片照片

**尺寸建议**：320 x 240

**英文提示词**：
```
A faded polaroid-style photograph showing a person standing in a dim research facility room smiling, but the date written on the back shows a date that is in the future, aged photo paper texture, slight discoloration, warm tones, hand-drawn illustration style, mystery game narrative asset
```

---

## 生图顺序建议

**先做最重要的那张**：Room 01 全景背景图 → 这是你整个第一个房间的基底

然后按交互优先级：
1. 墙上刻痕（核心谜题线索）
2. 桌上笔记（谜题提示）
3. 台灯（谜题关键）
4. 金属柜关闭（交互对象）
5. 金属柜打开（奖励反馈）
6. 门、床（次要交互）

**最后做**：记忆碎片照片

---

## 图片格式要求

- 格式：PNG（透明背景）用于单独物件，JPG/PNG 用于背景和场景
- 背景：全景背景不需要透明，物件近距离图最好透明背景方便叠加
- 分辨率：至少 1280x720（背景），640x480（物件特写）
- 不要在图片里放文字/水印（游戏内文字我们用 Godot UI 显示）

---

## 颜色参考

主色调：
- 琥珀暖光：#FAC775（亮部）→ #BA7517（中）→ #854F0B（暗部）
- 深青阴影：#1A2A3A（最暗）→ #2A3A4A（暗部）→ #3A5A6A（次暗）
- 中间色：#D3C7A7（灰尘/旧纸）→ #A09080（旧木/旧金属）
- 强调色：#7F77DD（紫色，用于记忆碎片/特殊物件发光效果）
