extends Node

# GameManager - 全局游戏状态管理器（Autoload，自动加载）
# 管理房间切换、线索收集、记忆碎片、库存和谜题进度

signal room_changed(room_name: String)
signal clue_collected(clue_id: String)
signal memory_fragment_found(fragment_id: String)
signal puzzle_solved(puzzle_id: String)
signal inventory_updated()

var current_room: String = "room_01"
var collected_clues: Dictionary = {}
var collected_fragments: Dictionary = {}
var solved_puzzles: Dictionary = {}
var inventory_items: Array = []

var room_order: Array = ["room_01", "room_02", "room_03", "room_04", "room_05"]

func _ready():
	print("[GameManager] 初始化完成")

func change_room(room_name: String):
	if room_order.has(room_name):
		current_room = room_name
		room_changed.emit(room_name)

func go_to_next_room():
	var idx = room_order.find(current_room)
	if idx >= 0 and idx < room_order.size() - 1:
		change_room(room_order[idx + 1])

func add_clue(clue_id: String, clue_data: Dictionary):
	if not collected_clues.has(clue_id):
		collected_clues[clue_id] = clue_data
		clue_collected.emit(clue_id)

func add_memory_fragment(fragment_id: String, fragment_data: Dictionary):
	if not collected_fragments.has(fragment_id):
		collected_fragments[fragment_id] = fragment_data
		memory_fragment_found.emit(fragment_id)

func mark_puzzle_solved(puzzle_id: String):
	if not solved_puzzles.has(puzzle_id):
		solved_puzzles[puzzle_id] = true
		puzzle_solved.emit(puzzle_id)

func is_puzzle_solved(puzzle_id: String) -> bool:
	return solved_puzzles.has(puzzle_id) and solved_puzzles[puzzle_id]

func add_inventory_item(item_id: String):
	if not inventory_items.has(item_id):
		inventory_items.append(item_id)
		inventory_updated.emit()

func has_inventory_item(item_id: String) -> bool:
	return inventory_items.has(item_id)
