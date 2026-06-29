extends Control

# 记忆碎片 — 电影级标题画面 + 图片交互版
# 启动：全屏封面 → 点击开始 → 淡入房间

# ========== UI 节点引用 ==========
@onready var room_bg = $RoomBackground
@onready var desc_panel = $DescriptionPanel
@onready var desc_label = $DescriptionPanel/DescText
@onready var desc_close_btn = $DescriptionPanel/CloseBtn
@onready var clue_label = $HUD/ClueLabel
@onready var fragment_label = $HUD/FragmentLabel
@onready var msg_label = $HUD/MsgLabel
@onready var msg_timer = $HUD/MsgTimer
@onready var inventory_bar = $HUD/InventoryBar
@onready var puzzle_panel = $PuzzlePanel
@onready var tutorial_panel = $TutorialPanel

# ========== 物件数据（位置对照 1280×720 背景图精确校准）==========
var interactables = {
	"wall_scratches": {
		"name": "墙上刻痕",
		"desc": "有人用利器在墙上深深刻下四个数字，比墙面那些褪色的旧编号清晰得多。\n\n可它们歪歪斜斜地散落着，看不出先后顺序。\n\n纸条说过——「光知道方向」。也许该顺着灯光扫过的方向来读？",
		"pos": Vector2(530, 105),
		"size": Vector2(310, 300),
		"image": "res://assets/objects/wall_scratches.png",
		"clue": "wall_numbers",
		"clue_data": {"name": "墙上刻痕", "desc": "四个散落的刻痕数字，顺序未知"},
	},
	"desk": {
		"name": "桌子",
		"desc": "桌上压着一张褪色的纸条：\n\n「从你看到的地方开始。光知道方向。」\n\n看来，线索和光照的方向有关。",
		"pos": Vector2(415, 425),
		"size": Vector2(355, 210),
		"image": "res://assets/objects/desk_note.png",
		"clue": "desk_note",
		"clue_data": {"name": "桌上纸条", "desc": "「从你看到的地方开始。光知道方向。」"},
	},
	"lamp": {
		"name": "台灯",
		"desc": "你拨亮了台灯。\n\n暖黄的光从右侧打来，斜斜扫过整面墙，再没入左边的黑暗——光，是从右往左走的。\n\n墙上那些刻痕，会不会也该顺着光，从右往左读？",
		"pos": Vector2(475, 275),
		"size": Vector2(100, 155),
		"image": "res://assets/objects/lamp.png",
		"clue": "lamp_direction",
		"clue_data": {"name": "灯光方向", "desc": "光从右往左扫过墙面"},
	},
	"cabinet": {
		"name": "金属柜",
		"desc": "一个锈迹斑斑的金属柜，柜门上嵌着四位数字密码锁。\n\n密码会是什么呢？也许这房间里的某处，就藏着答案。\n\n点这里输入密码。",
		"pos": Vector2(45, 95),
		"size": Vector2(210, 430),
		"image": "res://assets/objects/cabinet_closed.png",
		"image_open": "res://assets/objects/cabinet_open.png",
		"triggers_puzzle": "cabinet_code",
	},
	"door": {
		"name": "出口门",
		"desc": "厚重的铁门，需要钥匙才能打开。\n钥匙在金属柜里！\n先找到密码打开金属柜。",
		"pos": Vector2(1080, 90),
		"size": Vector2(140, 440),
		"image": "res://assets/objects/door.png",
	},
	"bed": {
		"name": "床铺",
		"desc": "你醒来时躺在这里。\n枕头下有一个镜子符号\n可能是「镜像计划」的暗示……",
		"pos": Vector2(805, 380),
		"size": Vector2(370, 320),
		"image": "res://assets/objects/bed.png",
		"clue": "bed_detail",
		"clue_data": {"name": "镜子符号", "desc": "枕头下的镜子符号"},
	},
}

var correct_code: String = "7931"
var input_code: String = ""
var clicked_ids: Dictionary = {}
var _wrong_attempts: int = 0

# ========== 悬浮光标标签（高级交互提示）==========
var _hover_label: Label = null  # 浮动在鼠标旁的物件名称标签

# 封面和弹窗
var _title_screen: Control = null
var _img_popup: Control = null
var _game_started: bool = false

func _ready():
	call_deferred("_step0_title_screen")

# ==================== 第0步：电影级封面 ====================

func _step0_title_screen():
	# 隐藏所有游戏UI
	if is_instance_valid(room_bg):
		room_bg.visible = false
	if is_instance_valid(tutorial_panel):
		tutorial_panel.visible = false
	if is_instance_valid(desc_panel):
		desc_panel.visible = false
	if is_instance_valid(puzzle_panel):
		puzzle_panel.visible = false
	if is_instance_valid(msg_label):
		msg_label.visible = false
	if is_instance_valid(clue_label):
		clue_label.visible = false
	if is_instance_valid(fragment_label):
		fragment_label.visible = false
	if is_instance_valid(inventory_bar):
		inventory_bar.visible = false

	# 创建全屏封面容器
	_title_screen = Panel.new()
	_title_screen.name = "TitleScreen"
	_title_screen.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_title_screen)

	var ts_style = StyleBoxFlat.new()
	ts_style.bg_color = Color(0, 0, 0)
	_title_screen.add_theme_stylebox_override("panel", ts_style)

	# 加载封面背景图（如果有的话）
	var title_tex = load("res://assets/backgrounds/title_screen.png")
	if title_tex:
		var bg_img = TextureRect.new()
		bg_img.name = "TitleBG"
		bg_img.texture = title_tex
		bg_img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		bg_img.set_anchors_preset(Control.PRESET_FULL_RECT)
		bg_img.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_title_screen.add_child(bg_img)

	# 暗色渐变遮罩（全屏微暗，让文字更清晰）
	var overlay_top = ColorRect.new()
	overlay_top.color = Color(0, 0, 0, 0.35)
	overlay_top.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay_top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_title_screen.add_child(overlay_top)

	# 底部渐变遮罩（纯黑色，给文字留出清晰的深色区域）
	var gradient_overlay = ColorRect.new()
	gradient_overlay.color = Color(0, 0, 0, 0.65)
	gradient_overlay.anchor_left = 0.0
	gradient_overlay.anchor_top = 0.55
	gradient_overlay.anchor_right = 1.0
	gradient_overlay.anchor_bottom = 1.0
	gradient_overlay.offset_left = 0
	gradient_overlay.offset_top = 0
	gradient_overlay.offset_right = 0
	gradient_overlay.offset_bottom = 0
	gradient_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_title_screen.add_child(gradient_overlay)

	# ===== 用 HBoxContainer 包裹 VBoxContainer 实现完美居中 =====
	var outer = HBoxContainer.new()
	outer.name = "OuterCenter"
	outer.set_anchors_preset(Control.PRESET_FULL_RECT)
	outer.alignment = BoxContainer.ALIGNMENT_CENTER
	outer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_title_screen.add_child(outer)

	var center_container = VBoxContainer.new()
	center_container.name = "CenterContent"
	center_container.alignment = BoxContainer.ALIGNMENT_CENTER
	center_container.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	center_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	outer.add_child(center_container)

	# 空白占位（把内容推到屏幕偏下位置，留出图片展示空间）
	var spacer_top = Control.new()
	spacer_top.custom_minimum_size = Vector2(0, 280)
	center_container.add_child(spacer_top)

	# 标题文字（金色大字）
	var game_title = Label.new()
	game_title.name = "GameTitle"
	game_title.text = "记 忆 碎 片"
	game_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	game_title.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	game_title.add_theme_font_size_override("font_size", 52)
	game_title.add_theme_color_override("font_color", Color(0.96, 0.78, 0.45))
	center_container.add_child(game_title)

	# 副标题
	var subtitle = Label.new()
	subtitle.name = "Subtitle"
	subtitle.text = "M E M O R Y   F R A G M E N T S"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	subtitle.add_theme_font_size_override("font_size", 18)
	subtitle.add_theme_color_override("font_color", Color(0.55, 0.5, 0.6))
	center_container.add_child(subtitle)

	# 一行描述（固定宽度防止竖排）
	var tagline = Label.new()
	tagline.name = "Tagline"
	tagline.text = "在一个废弃研究所醒来，你的记忆是唯一的钥匙。"
	tagline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tagline.custom_minimum_size = Vector2(600, 0)  # 足够宽度，不会竖排
	tagline.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	tagline.add_theme_font_size_override("font_size", 15)
	tagline.add_theme_color_override("font_color", Color(0.62, 0.6, 0.68))
	center_container.add_child(tagline)

	# 间隔
	var spacer_btn = Control.new()
	spacer_btn.custom_minimum_size = Vector2(0, 22)
	center_container.add_child(spacer_btn)

	# ===== 开始按钮（固定宽度，居中不拉伸）=====
	var start_btn = Button.new()
	start_btn.name = "StartButton"
	start_btn.text = "开 始 游 戏"
	start_btn.custom_minimum_size = Vector2(240, 50)
	start_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	start_btn.add_theme_font_size_override("font_size", 20)

	var btn_normal = StyleBoxFlat.new()
	btn_normal.bg_color = Color(0.96, 0.78, 0.45, 0.15)
	btn_normal.set_corner_radius_all(12)
	btn_normal.set_border_width_all(2)
	btn_normal.border_color = Color(0.96, 0.78, 0.45, 0.8)

	var btn_hover = StyleBoxFlat.new()
	btn_hover.bg_color = Color(0.96, 0.78, 0.45, 0.3)
	btn_hover.set_corner_radius_all(12)
	btn_hover.set_border_width_all(3)
	btn_hover.border_color = Color(1, 0.88, 0.45, 1.0)

	start_btn.add_theme_stylebox_override("normal", btn_normal)
	start_btn.add_theme_stylebox_override("hover", btn_hover)
	start_btn.add_theme_stylebox_override("pressed", btn_hover)
	start_btn.add_theme_stylebox_override("focus", btn_hover)
	start_btn.add_theme_color_override("font_color", Color(0.96, 0.78, 0.45))
	start_btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	start_btn.pressed.connect(_on_start_game)
	center_container.add_child(start_btn)

	# 版本号（左下角锚点定位）
	var version_lbl = Label.new()
	version_lbl.text = "v0.1 — Room 01: 觉醒室"
	version_lbl.anchor_left = 0.0
	version_lbl.anchor_top = 1.0
	version_lbl.anchor_right = 0.0
	version_lbl.anchor_bottom = 1.0
	version_lbl.offset_left = 15
	version_lbl.offset_top = -25
	version_lbl.add_theme_font_size_override("font_size", 11)
	version_lbl.add_theme_color_override("font_color", Color(0.35, 0.33, 0.38))
	_title_screen.add_child(version_lbl)

	# 创建图片弹窗（初始隐藏）
	_create_image_popup()

# ==================== 开始游戏：淡入房间 ====================

func _on_start_game():
	if not is_instance_valid(_title_screen):
		return
	_game_started = true

	# 淡出封面动画（用 tween）
	var tween = create_tween()
	tween.tween_property(_title_screen, "modulate:a", 0.0, 0.8).set_ease(Tween.EASE_IN)
	tween.tween_callback(func():
		if is_instance_valid(_title_screen):
			_title_screen.queue_free()
			_title_screen = null
		_show_room()
	)

func _show_room():
	# 显示游戏 UI
	if is_instance_valid(room_bg):
		room_bg.visible = true
	if is_instance_valid(clue_label):
		clue_label.visible = true
	if is_instance_valid(fragment_label):
		fragment_label.visible = true
	if is_instance_valid(inventory_bar):
		inventory_bar.visible = true

	# 统一 HUD 视觉风格（暖黄琥珀 + 深墨背板，贴合美术氛围）
	_style_hud()

	# 构建房间内容
	call_deferred("_step1_build_room")

# ==================== HUD 视觉风格化 ====================

const ACCENT := Color(0.96, 0.78, 0.45)        # 琥珀金（与灯光一致）
const INK := Color(0.04, 0.05, 0.07, 0.92)     # 深墨背板

func _style_hud():
	var hud = get_node_or_null("HUD")
	if hud == null:
		return

	# 顶部状态背板：让漂浮的文字落在一块半透明深色牌子上，提升可读性与质感
	if hud.get_node_or_null("StatusPlate") == null:
		var plate = Panel.new()
		plate.name = "StatusPlate"
		plate.offset_left = 12
		plate.offset_top = 4
		plate.offset_right = 236
		plate.offset_bottom = 86
		var ps = StyleBoxFlat.new()
		ps.bg_color = INK
		ps.set_corner_radius_all(10)
		ps.set_border_width_all(1)
		ps.border_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, 0.22)
		ps.shadow_color = Color(0, 0, 0, 0.5)
		ps.shadow_size = 8
		plate.add_theme_stylebox_override("panel", ps)
		hud.add_child(plate)
		hud.move_child(plate, 0)  # 置于所有文字之下

	# 房间标题：加一道琥珀色细分隔线下划感
	var room_title = hud.get_node_or_null("RoomTitle")
	if is_instance_valid(room_title):
		room_title.add_theme_color_override("font_color", ACCENT)

	# 进度文字统一为低调暖灰
	for lbl_name in ["ClueLabel", "FragmentLabel"]:
		var lbl = hud.get_node_or_null(lbl_name)
		if is_instance_valid(lbl):
			lbl.add_theme_color_override("font_color", Color(0.78, 0.72, 0.58, 0.85))
			lbl.add_theme_font_size_override("font_size", 14)

	# 消息条：改为屏幕底部的电影字幕式 pill（深底琥珀边，自动淡入淡出）
	if is_instance_valid(msg_label):
		msg_label.offset_left = 290
		msg_label.offset_top = 622
		msg_label.offset_right = 990
		msg_label.offset_bottom = 678
		msg_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		msg_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		msg_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		msg_label.add_theme_color_override("font_color", Color(0.97, 0.90, 0.74))
		msg_label.add_theme_font_size_override("font_size", 17)
		var ms = StyleBoxFlat.new()
		ms.bg_color = Color(0.03, 0.04, 0.06, 0.9)
		ms.set_corner_radius_all(22)
		ms.set_border_width_all(1)
		ms.border_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, 0.3)
		ms.content_margin_left = 26
		ms.content_margin_right = 26
		ms.content_margin_top = 8
		ms.content_margin_bottom = 8
		ms.shadow_color = Color(0, 0, 0, 0.55)
		ms.shadow_size = 10
		msg_label.add_theme_stylebox_override("normal", ms)

# ==================== 房间构建（分步延迟）====================

func _step1_build_room():
	if not is_instance_valid(room_bg):
		call_deferred("_step1_build_room")
		return

	room_bg.color = Color(0, 0, 0)
	room_bg.size = Vector2(1280, 720)
	room_bg.modulate.a = 0.0  # 从透明开始，做淡入效果

	# 全景背景图
	var bg_tex = load("res://assets/backgrounds/room01_bg.png")
	if bg_tex:
		var bg_img = TextureRect.new()
		bg_img.name = "BackgroundImage"
		bg_img.texture = bg_tex
		bg_img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		bg_img.set_anchors_preset(Control.PRESET_FULL_RECT)
		bg_img.mouse_filter = Control.MOUSE_FILTER_IGNORE
		room_bg.add_child(bg_img)

	# 透明点击热点
	for id in interactables:
		var data = interactables[id]
		var hotspot = _make_hotspot(id, data)
		if hotspot:
			room_bg.add_child(hotspot)

	call_deferred("_step2_connect_signals")

func _step2_connect_signals():
	if is_instance_valid(desc_close_btn):
		desc_close_btn.pressed.connect(_on_close_desc)
	# 修复：消息计时器从未接线 → 提示条永远不会自动消失
	if is_instance_valid(msg_timer) and not msg_timer.timeout.is_connected(_on_msg_timer_timeout):
		msg_timer.timeout.connect(_on_msg_timer_timeout)
	call_deferred("_step3_build_panels")

func _step3_build_panels():
	_build_puzzle_panel()

	if is_instance_valid(desc_panel):
		desc_panel.visible = false
	if is_instance_valid(puzzle_panel):
		puzzle_panel.visible = false

	call_deferred("_step4_final_init")

func _step4_final_init():
	# 淡入房间
	var tween = create_tween()
	tween.tween_property(room_bg, "modulate:a", 1.0, 1.2).set_ease(Tween.EASE_OUT)
	tween.tween_callback(func():
		_update_hud()
		show_msg("你在一间陌生的房间醒来……没有记忆。", 4.0)
	)

# ==================== 热点创建（高级光晕效果）====================

func _make_hotspot(id: String, data: Dictionary) -> Button:
	var btn = Button.new()
	btn.name = id
	btn.position = data["pos"]
	btn.size = data["size"]
	btn.text = ""

	# 所有状态完全透明，零可见反馈 —— 只靠浮动标签提示
	var invisible = StyleBoxEmpty.new()
	btn.add_theme_stylebox_override("normal", invisible)
	btn.add_theme_stylebox_override("hover", invisible)
	btn.add_theme_stylebox_override("pressed", invisible)
	btn.add_theme_stylebox_override("focus", invisible)

	btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND

	# 连接鼠标进出信号，用于显示/隐藏浮动标签
	btn.mouse_entered.connect(_on_hotspot_hover.bind(id, data.get("name", "")))
	btn.mouse_exited.connect(_on_hotspot_unhover)

	if is_instance_valid(btn):
		btn.pressed.connect(_on_hotspot_clicked.bind(id))
	return btn


# ========== 浮动标签系统 ==========

func _create_hover_label():
	"""创建全局浮动名称标签（鼠标悬停时显示物件名称）"""
	if _hover_label != null:
		return
	_hover_label = Label.new()
	_hover_label.name = "HoverLabel"
	_hover_label.text = ""
	_hover_label.visible = false
	_hover_label.z_index = 100
	_hover_label.add_theme_font_size_override("font_size", 14)
	_hover_label.add_theme_color_override("font_color", Color(0.96, 0.85, 0.55))
	# 标签背景
	var label_bg = StyleBoxFlat.new()
	label_bg.bg_color = Color(0.05, 0.05, 0.08, 0.9)
	label_bg.set_border_width_all(1)
	label_bg.border_color = Color(0.96, 0.78, 0.45, 0.3)
	label_bg.set_corner_radius_all(6)
	label_bg.content_margin_left = 12
	label_bg.content_margin_right = 12
	label_bg.content_margin_top = 5
	label_bg.content_margin_bottom = 5
	_hover_label.add_theme_stylebox_override("normal", label_bg)
	add_child(_hover_label)


func _on_hotspot_hover(hotspot_id: String, hotspot_name: String):
	"""鼠标进入热点区域 → 显示浮动名称标签"""
	if not is_instance_valid(_hover_label):
		_create_hover_label()
	_hover_label.text = hotspot_name
	_hover_label.visible = true
	# 标签跟随鼠标位置（略微偏移避免遮挡）
	_update_hover_label_position()


func _on_hotspot_unhover():
	"""鼠标离开热点区域 → 隐藏标签"""
	if is_instance_valid(_hover_label):
		_hover_label.visible = false


func _update_hover_label_position():
	"""让浮动标签跟随鼠标位置"""
	if not is_instance_valid(_hover_label) or not _hover_label.visible:
		return
	var mouse_pos = get_local_mouse_position()
	# 标签出现在鼠标右下方，带一点偏移
	_hover_label.position = mouse_pos + Vector2(16, 20)

# ==================== 图片弹窗（全屏遮罩+居中图片）====================

func _create_image_popup():
	# 全屏半透明黑色遮罩
	_img_popup = ColorRect.new()
	_img_popup.name = "ImagePopup"
	_img_popup.visible = false
	_img_popup.z_index = 50
	_img_popup.color = Color(0, 0, 0, 0.88)
	_img_popup.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_img_popup)

func show_image_popup(image_path: String, title_text: String, desc_text: String):
	if not is_instance_valid(_img_popup):
		return

	# 隐藏悬浮标签
	_on_hotspot_unhover()

	# 弹窗为模态：暂时隐藏 HUD，避免左上角状态牌压住卡片
	var hud = get_node_or_null("HUD")
	if hud != null:
		hud.visible = false

	# 清除旧内容
	for child in _img_popup.get_children():
		child.queue_free()

	# === 点击遮罩任意位置也可关闭（防重复连接，否则第二次开弹窗会报错）===
	if not _img_popup.gui_input.is_connected(_on_popup_gui_input):
		_img_popup.gui_input.connect(_on_popup_gui_input)

	# === 居中内容区域 ===
	var outer = HBoxContainer.new()
	outer.name = "PopupOuter"
	outer.set_anchors_preset(Control.PRESET_FULL_RECT)
	outer.alignment = BoxContainer.ALIGNMENT_CENTER
	outer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_img_popup.add_child(outer)

	# 描边卡片：把内容收进一张深墨琥珀边的卡片里，整体更有质感
	var card = PanelContainer.new()
	card.name = "PopupCard"
	card.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var card_style = StyleBoxFlat.new()
	card_style.bg_color = Color(0.045, 0.05, 0.07, 0.985)
	card_style.set_corner_radius_all(16)
	card_style.set_border_width_all(1)
	card_style.border_color = Color(0.96, 0.78, 0.45, 0.28)
	card_style.content_margin_left = 30
	card_style.content_margin_right = 30
	card_style.content_margin_top = 26
	card_style.content_margin_bottom = 26
	card_style.shadow_color = Color(0, 0, 0, 0.6)
	card_style.shadow_size = 18
	card.add_theme_stylebox_override("panel", card_style)
	outer.add_child(card)

	var inner = VBoxContainer.new()
	inner.name = "PopupInner"
	inner.alignment = BoxContainer.ALIGNMENT_CENTER
	inner.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	inner.add_theme_constant_override("separation", 14)
	card.add_child(inner)

	# 标题文字
	var title = Label.new()
	title.name = "PopupTitle"
	title.text = title_text
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color(0.96, 0.78, 0.45))
	inner.add_child(title)

	# 图片（按比例自适应，不裁切任何内容）
	var tex = load(image_path)
	if tex:
		var img_rect = TextureRect.new()
		img_rect.name = "PopupImage"
		img_rect.texture = tex
		# 关键：默认 KEEP_SIZE 会按图片原生像素（上千像素）渲染，撑爆屏幕、把按钮挤到屏外。
		# IGNORE_SIZE 让它老老实实用下面这个固定尺寸，并按比例完整居中显示。
		img_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		img_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		img_rect.custom_minimum_size = Vector2(620, 360)
		img_rect.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		inner.add_child(img_rect)

	# 描述文字（包含线索信息，加大字体）
	var desc_lbl = Label.new()
	desc_lbl.name = "PopupDesc"
	desc_lbl.text = desc_text
	desc_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc_lbl.custom_minimum_size = Vector2(620, 0)
	desc_lbl.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_lbl.add_theme_font_size_override("font_size", 18)
	desc_lbl.add_theme_color_override("font_color", Color(0.9, 0.88, 0.82))
	inner.add_child(desc_lbl)

	# 间距
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 20)
	inner.add_child(spacer)

	# === 返回按钮（在内容流内，紧跟描述下方）===
	var close_btn = Button.new()
	close_btn.text = "[ 返回房间 ]"
	close_btn.name = "ImgCloseBtn"
	close_btn.custom_minimum_size = Vector2(200, 44)
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var cs = StyleBoxFlat.new()
	cs.bg_color = Color(0.96, 0.78, 0.45)
	cs.set_corner_radius_all(10)
	cs.content_margin_left = 22
	cs.content_margin_right = 22
	cs.content_margin_top = 10
	cs.content_margin_bottom = 10
	close_btn.add_theme_stylebox_override("normal", cs)
	var csh = StyleBoxFlat.new()
	csh.bg_color = Color(1, 0.9, 0.55)
	csh.set_corner_radius_all(10)
	csh.content_margin_left = 22
	csh.content_margin_right = 22
	csh.content_margin_top = 10
	csh.content_margin_bottom = 10
	close_btn.add_theme_stylebox_override("hover", csh)
	close_btn.add_theme_font_size_override("font_size", 17)
	close_btn.add_theme_color_override("font_color", Color(0.08, 0.08, 0.12))
	close_btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	close_btn.pressed.connect(hide_image_popup)
	inner.add_child(close_btn)

	# 底部提示文字
	var hint_lbl = Label.new()
	hint_lbl.name = "PopupHint"
	hint_lbl.text = "( 按 ESC 或点击空白处关闭 )"
	hint_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_lbl.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	hint_lbl.add_theme_font_size_override("font_size", 12)
	hint_lbl.add_theme_color_override("font_color", Color(0.4, 0.38, 0.44))
	inner.add_child(hint_lbl)

	_img_popup.visible = true
	# 淡入
	_img_popup.modulate.a = 0.0
	var t = create_tween()
	t.tween_property(_img_popup, "modulate:a", 1.0, 0.22)


func _on_popup_gui_input(event: InputEvent):
	"""点击弹窗遮罩的空白处关闭弹窗"""
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		hide_image_popup()

func hide_image_popup():
	if is_instance_valid(_img_popup):
		_img_popup.visible = false
	# 恢复 HUD
	var hud = get_node_or_null("HUD")
	if hud != null:
		hud.visible = true

func _input(event):
	# ESC 键关闭图片弹窗
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		if is_instance_valid(_img_popup) and _img_popup.visible:
			hide_image_popup()
			get_viewport().set_input_as_handled()

# ==================== 每帧更新 ====================

func _process(_delta):
	# 让浮动标签持续跟随鼠标
	_update_hover_label_position()

# ==================== 交互逻辑 ====================

func _on_hotspot_clicked(id: String):
	var data = interactables[id]

	hide_image_popup()

	# 柜子已解开
	if id == "cabinet" and GameManager.is_puzzle_solved("cabinet_code"):
		if not GameManager.has_inventory_item("room_key"):
			GameManager.add_inventory_item("room_key")
			GameManager.add_memory_fragment("fragment_01", {
				"name": "第一段记忆",
				"desc": "一张褪色的照片……日期是明天。"
			})
			_update_hud()
			show_msg("获得：钥匙 + 记忆碎片！", 3.0)
		show_image_popup(
			data.get("image_open", "res://assets/objects/cabinet_open.png"),
			"金属柜 — 已打开",
			"柜子里有一把黄铜钥匙和一张褪色的照片……\n照片上的日期竟然是明天！这怎么可能？"
		)
		return

	# 门
	if id == "door":
		if GameManager.has_inventory_item("room_key"):
			show_image_popup(data["image"], "门打开了！！", "恭喜通关第一关 —— 觉醒室！\n但外面的走廊似乎还有更多秘密等待发现……")
		else:
			show_image_popup(data["image"], "出口门", "铁门锁着。\n你需要一把钥匙（在金属柜里）。\n先找到密码打开金属柜！")
		return

	# 柜子 → 弹出密码面板
	if id == "cabinet":
		if is_instance_valid(desc_panel):
			desc_panel.visible = false
		if is_instance_valid(puzzle_panel):
			puzzle_panel.visible = true
			input_code = ""
			_update_code_display()
			show_msg("输入四位数字密码。", 2.5)
		return

	# 其他物件 → 收集线索 + 显示图片
	if data.has("clue") and not clicked_ids.has(id):
		GameManager.add_clue(data["clue"], data["clue_data"])
		clicked_ids[id] = true
		_update_hud()

	show_image_popup(data["image"], data["name"], data["desc"])

func _show_desc(text: String):
	if is_instance_valid(desc_label) and is_instance_valid(desc_panel):
		desc_label.text = text
		desc_panel.visible = true

func _on_close_desc():
	if is_instance_valid(desc_panel):
		desc_panel.visible = false

# ==================== 密码面板 ====================

func _build_puzzle_panel():
	if not is_instance_valid(puzzle_panel):
		return

	# 清空旧内容
	for child in puzzle_panel.get_children():
		child.queue_free()

	puzzle_panel.position = Vector2(380, 140)
	puzzle_panel.size = Vector2(280, 400)

	# 面板外观：深色金属质感，带阴影，像嵌入式电子锁
	var ps = StyleBoxFlat.new()
	ps.bg_color = Color(0.08, 0.10, 0.14, 0.97)
	ps.set_border_width_all(1)
	ps.border_color = Color(0.25, 0.28, 0.35)
	ps.set_corner_radius_all(16)
	puzzle_panel.add_theme_stylebox_override("panel", ps)

	# ===== 主容器（垂直居中排列）=====
	var main_vbox = VBoxContainer.new()
	main_vbox.name = "PuzzleVBox"
	main_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	main_vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	puzzle_panel.add_child(main_vbox)

	# 顶部间距
	var top_sp = Control.new()
	top_sp.custom_minimum_size = Vector2(0, 18)
	main_vbox.add_child(top_sp)

	# 品牌标识（小字，增加真实感）
	var brand = Label.new()
	brand.text = "SECURE-LOCK v7"
	brand.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	brand.add_theme_font_size_override("font_size", 11)
	brand.add_theme_color_override("font_color", Color(0.32, 0.36, 0.44))
	main_vbox.add_child(brand)

	var sp1 = Control.new()
	sp1.custom_minimum_size = Vector2(0, 12)
	main_vbox.add_child(sp1)

	# ===== LED 密码显示区：4个独立数字格 =====
	var display_row = HBoxContainer.new()
	display_row.name = "DisplayRow"
	display_row.alignment = BoxContainer.ALIGNMENT_CENTER
	display_row.add_theme_constant_override("separation", 10)
	main_vbox.add_child(display_row)

	for idx in range(4):
		var cell = Panel.new()
		cell.name = "Digit_%d" % idx
		cell.custom_minimum_size = Vector2(46, 54)
		var cell_style = StyleBoxFlat.new()
		cell_style.bg_color = Color(0.02, 0.03, 0.06, 0.95)
		cell_style.set_border_width_all(1)
		cell_style.border_color = Color(0.22, 0.24, 0.30)
		cell_style.set_corner_radius_all(8)
		cell.add_theme_stylebox_override("panel", cell_style)

		var digit_lbl = Label.new()
		digit_lbl.name = "DigitLabel"
		digit_lbl.text = "_"
		digit_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		digit_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		digit_lbl.anchors_preset = Control.PRESET_FULL_RECT
		digit_lbl.add_theme_font_size_override("font_size", 28)
		digit_lbl.add_theme_color_override("font_color", Color(0.96, 0.78, 0.45))
		cell.add_child(digit_lbl)
		display_row.add_child(cell)

	# 存储数字格引用以便更新显示
	if not has_meta("_digit_cells"):
		set_meta("_digit_cells", [])
	get_meta("_digit_cells").clear()
	for c in display_row.get_children():
		get_meta("_digit_cells").append(c.get_node_or_null("DigitLabel"))

	# 提示文字
	var hint = Label.new()
	hint.name = "PuzzleHint"
	hint.text = "输入密码"
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_font_size_override("font_size", 13)
	hint.add_theme_color_override("font_color", Color(0.38, 0.42, 0.50))
	main_vbox.add_child(hint)

	var sp2 = Control.new()
	sp2.custom_minimum_size = Vector2(0, 14)
	main_vbox.add_child(sp2)

	# ===== 数字键盘 (3×4 网格) =====
	var grid = GridContainer.new()
	grid.name = "KeypadGrid"
	grid.columns = 3
	main_vbox.add_child(grid)

	var key_data = [
		["1", "digit"], ["2", "digit"], ["3", "digit"],
		["4", "digit"], ["5", "digit"], ["6", "digit"],
		["7", "digit"], ["8", "digit"], ["9", "digit"],
		["C", "clear"], ["0", "digit"], [">", "confirm"],
	]

	for kd in key_data:
		var ktext = kd[0]
		var ktype = kd[1]
		var kbtn = Button.new()
		kbtn.text = ktext
		kbtn.custom_minimum_size = Vector2(70, 50)
		kbtn.add_theme_font_size_override("font_size", 20)

		var kn = StyleBoxFlat.new()
		kn.bg_color = Color(0.15, 0.17, 0.22)
		kn.set_corner_radius_all(10)
		kn.content_margin_top = 6
		kn.content_margin_bottom = 6

		var kh = StyleBoxFlat.new()
		kh.bg_color = Color(0.22, 0.24, 0.30)
		kh.set_corner_radius_all(10)
		kh.content_margin_top = 6
		kh.content_margin_bottom = 6

		if ktype == "confirm":
			kn.bg_color = Color(0.75, 0.55, 0.12)
			kh.bg_color = Color(0.92, 0.76, 0.28)
			kbtn.add_theme_color_override("font_color", Color(0.95, 0.90, 0.70))
		elif ktype == "clear":
			kn.bg_color = Color(0.28, 0.12, 0.12)
			kh.bg_color = Color(0.45, 0.18, 0.18)
			kbtn.add_theme_color_override("font_color", Color(0.80, 0.55, 0.55))
		else:
			kbtn.add_theme_color_override("font_color", Color(0.82, 0.84, 0.88))

		kbtn.add_theme_stylebox_override("normal", kn)
		kbtn.add_theme_stylebox_override("hover", kh)
		kbtn.add_theme_stylebox_override("pressed", kh)
		kbtn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND

		if ktype == "digit":
			kbtn.pressed.connect(_on_digit_pressed.bind(int(ktext)))
		elif ktype == "clear":
			kbtn.pressed.connect(_on_clear_code)
		elif ktype == "confirm":
			kbtn.pressed.connect(_on_confirm_code)

		grid.add_child(kbtn)

	# 底部关闭按钮
	var bottom_sp = Control.new()
	bottom_sp.custom_minimum_size = Vector2(0, 8)
	main_vbox.add_child(bottom_sp)

	var close_btn = Button.new()
	close_btn.text = "[ 关闭 ]"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	close_btn.add_theme_font_size_override("font_size", 11)
	close_btn.add_theme_color_override("font_color", Color(0.38, 0.40, 0.48))
	var cs_empty = StyleBoxEmpty.new()
	close_btn.add_theme_stylebox_override("normal", cs_empty)
	close_btn.add_theme_stylebox_override("hover", cs_empty)
	close_btn.pressed.connect(func():
		if is_instance_valid(puzzle_panel):
			puzzle_panel.visible = false
		input_code = ""
		_update_code_display()
	)
	main_vbox.add_child(close_btn)

func _on_digit_pressed(digit: int):
	if input_code.length() < 4:
		input_code += str(digit)
		_update_code_display()

func _on_clear_code():
	input_code = ""
	_update_code_display()

func _update_code_display():
	# 使用新的 4 格 LED 数字显示
	var cells = get_meta("_digit_cells") if has_meta("_digit_cells") else []
	if cells.size() < 4:
		return
	for i in range(4):
		var lbl = cells[i]
		if is_instance_valid(lbl):
			lbl.text = input_code[i] if i < input_code.length() else "_"

func _on_confirm_code():
	if input_code == correct_code:
		GameManager.mark_puzzle_solved("cabinet_code")
		if is_instance_valid(puzzle_panel):
			puzzle_panel.visible = false
		show_msg("咔哒——锁开了。柜门缓缓滑开，里面似乎有东西……", 4.0)
	else:
		_wrong_attempts += 1
		input_code = ""
		_update_code_display()
		if _wrong_attempts >= 3:
			show_msg("密码错误。提示：顺着灯光的方向，从右往左读墙上刻的四个数字。", 4.5)
		else:
			show_msg("密码错误。再看看墙上的刻痕和灯光的方向。", 2.5)

func _on_cancel_puzzle():
	if is_instance_valid(puzzle_panel):
		puzzle_panel.visible = false
	input_code = ""

# ==================== HUD ====================

func _update_hud():
	if not is_instance_valid(clue_label) or not is_instance_valid(fragment_label):
		return
	clue_label.text = "线索  %d / 4" % GameManager.collected_clues.size()
	fragment_label.text = "碎片  %d / 5" % GameManager.collected_fragments.size()
	if is_instance_valid(inventory_bar):
		for child in inventory_bar.get_children():
			child.queue_free()
		for item_id in GameManager.inventory_items:
			var slot = Panel.new()
			slot.custom_minimum_size = Vector2(90, 36)
			var ss = StyleBoxFlat.new()
			ss.bg_color = Color(0.96, 0.78, 0.45, 0.2)
			ss.set_corner_radius_all(6)
			ss.border_color = Color(0.96, 0.78, 0.45, 0.5)
			ss.set_border_width_all(1)
			slot.add_theme_stylebox_override("panel", ss)
			var il = Label.new()
			il.text = "钥匙" if item_id == "room_key" else item_id
			il.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			il.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			il.anchors_preset = Control.PRESET_FULL_RECT
			il.add_theme_color_override("font_color", Color(0.96, 0.78, 0.45))
			il.add_theme_font_size_override("font_size", 14)
			slot.add_child(il)
			inventory_bar.add_child(slot)

func show_msg(text: String, duration: float = 3.0):
	if not is_instance_valid(msg_label) or not is_instance_valid(msg_timer):
		return
	msg_label.text = text
	msg_label.visible = true
	# 淡入
	msg_label.modulate.a = 0.0
	var t = create_tween()
	t.tween_property(msg_label, "modulate:a", 1.0, 0.25)
	msg_timer.wait_time = duration
	msg_timer.start()

func _on_msg_timer_timeout():
	if not is_instance_valid(msg_label):
		return
	# 淡出后隐藏
	var t = create_tween()
	t.tween_property(msg_label, "modulate:a", 0.0, 0.4)
	t.tween_callback(func():
		if is_instance_valid(msg_label):
			msg_label.visible = false
	)
