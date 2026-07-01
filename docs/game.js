"use strict";

// ===== 记忆碎片 · 网页原生版 =====
// 1280×720 舞台等比缩放；中文浏览器原生渲染；Canvas 粒子 + CSS 特效堆出氛围。

const STAGE_W = 1280, STAGE_H = 720;
const CODE = "7931"; // 顺着灯光从右往左读墙上四个刻痕

const OBJ = "assets/objects/";
const BG = "assets/backgrounds/";

// ===== 记忆碎片文案（见 STORY.md）。玩家以为在「找回」，实则被录进镜像并删除 =====
// 注意：必须放在 OBJ 声明之后，否则 const 暂时性死区会让整个脚本崩溃
const MEMORIES = {
  frag1: {
    kicker: "记 忆 碎 片 · 01　觉醒室",
    img: OBJ + "memory_fragment_01.jpg",
    text: "照片从柜子深处滑出来。\n相纸边角写着「研究区 B」，还有一个日期。\n照片里的人穿着白大褂，对着镜头淡淡地笑——\n那是你的脸。\n可你不记得，自己曾经站在那里。"
  },
};

// 交互物件（坐标对齐 1280×720）
const ITEMS = {
  wall: {
    name: "墙上刻痕", x: 525, y: 120, w: 310, h: 290,
    img: OBJ + "wall_scratches.jpg", clue: "wall",
    desc: "有人在墙上刻了四个数字，散落各处。\n台灯斜照，最亮的清晰刺眼，越往黑暗越模糊。\n纸条说「光知道方向」——从最亮处起，顺光读进黑暗。"
  },
  desk: {
    name: "桌子", x: 375, y: 415, w: 365, h: 215,
    img: OBJ + "desk_note.jpg", clue: "desk",
    desc: "桌上压着一张褪色的纸条：\n「从你看到的地方开始。光知道方向。」\n线索，和光照的方向有关。"
  },
  lamp: {
    name: "台灯", x: 440, y: 280, w: 120, h: 165,
    img: OBJ + "lamp.jpg", clue: "lamp",
    desc: "你拨亮了台灯。\n暖光斜斜烧在墙上，再没入另一头的黑暗。\n墙上那些刻痕——从最亮处起，顺光读进黑暗？"
  },
  bed: {
    name: "床铺", x: 730, y: 370, w: 285, h: 215,
    img: OBJ + "bed.jpg", clue: "bed",
    desc: "你醒来时就躺在这里。\n枕头下压着一个褪色的镜子符号——像「镜像计划」的标记。"
  },
  cabinet: { name: "金属柜", x: 30, y: 90, w: 240, h: 450 }, // 点击弹密码盘
  door: { name: "出口门", x: 1120, y: 95, w: 160, h: 460 },

  // ===== 可检视物：纯环境叙事，不计线索/碎片，处处复读 7931，埋镜像计划的种子 =====
  rules: {
    name: "守则牌", x: 300, y: 185, w: 90, h: 130, lore: true,
    img: OBJ + "rules_board.jpg",
    desc: "墙上钉着一张守则，四条规矩。\n前三条你认。可第四条「遗忘」是用暗红写的，墨还在往下淌——\n谁会把『忘记』，立成一条必须遵守的规定？"
  },
  chisel: {
    name: "刻刀", x: 500, y: 398, w: 125, h: 32, lore: true,
    desc: "纸间压着一片磨亮的金属，刃口卷了，还沾着墙屑。\n墙上那串刻痕，就是用它刻进石头的。\n笔迹是你的——可你不记得何时、为何刻下。"
  },
  mug: {
    name: "搪瓷杯", x: 350, y: 375, w: 62, h: 55, lore: true,
    desc: "一只缺口的搪瓷杯，杯底结着干透的褐色残渍。\n杯壁用记号笔写着个编号——\n和墙上那串一样，也和你的一样。"
  },
  blueprint: {
    name: "墙上蓝图", x: 685, y: 185, w: 120, h: 115, lore: true,
    img: OBJ + "blueprint.jpg",
    desc: "一张泛黄的蓝图，正中是一颗大脑，接满神经般的线路。\n底下排着一长列舱体，编号一个接一个。\n角落印着小字：「镜像计划 · 意识备份流程」。\n你盯着它一阵心悸，却想不起为什么。"
  },
  chart: {
    name: "病历夹", x: 960, y: 252, w: 68, h: 118, lore: true,
    img: OBJ + "medical_record.jpg",
    desc: "墙上挂着一块夹板，夹着一页脆黄的病历——「患者病历档案」。\n姓名被人用力划掉，只剩编号 A-017；可这不是你的编号。\n状态栏盖着一枚红印：「待提取」。\n原来流水线上等着的，不止你一个。"
  },
};

// ===== 游戏状态 =====
const state = {
  clues: new Set(),
  fragments: 0,
  hasKey: false,
  cabinetSolved: false,
  photoSeen: false,  // 柜子开后：先看照片，再拿钥匙，最后空
  input: "",
  wrong: 0,
  memories: [],      // 已拾起的记忆碎片 id
  pendingMemory: null, // 关闭柜门弹窗后触发的闪回
  finished: false,   // 是否已通关（开门）
  reachedCorridor: false, // 已走出觉醒室、进入走廊中枢
};

// ===== 本地存档（localStorage，零后端）=====
const SAVE_KEY = "mf_save_v1";
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, clues: [...state.clues], fragments: state.fragments,
      hasKey: state.hasKey, cabinetSolved: state.cabinetSolved,
      photoSeen: state.photoSeen,
      memories: state.memories, finished: state.finished,
      reachedCorridor: state.reachedCorridor,
    }));
  } catch (e) {}
}
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function hasSave() {
  const s = loadSave();
  return !!(s && !s.finished && ((s.clues && s.clues.length) || s.cabinetSolved || s.fragments || s.reachedCorridor));
}
function resetState() {
  state.clues = new Set(); state.fragments = 0; state.hasKey = false;
  state.cabinetSolved = false; state.input = ""; state.wrong = 0;
  state.photoSeen = false;
  state.memories = []; state.pendingMemory = null; state.finished = false;
  state.reachedCorridor = false;
}
function applySave(s) {
  if (!s) return;
  state.clues = new Set(s.clues || []);
  state.fragments = s.fragments || 0;
  state.hasKey = !!s.hasKey;
  state.cabinetSolved = !!s.cabinetSolved;
  state.photoSeen = !!s.photoSeen;
  state.memories = s.memories || [];
  state.finished = !!s.finished;
  state.reachedCorridor = !!s.reachedCorridor;
  state.input = ""; state.wrong = 0; state.pendingMemory = null;
}

// ===== DOM =====
const $ = s => document.querySelector(s);
const stage = $("#stage"), room = $("#room"), bgLayer = $("#bgLayer");
const hotspots = $("#hotspots"), hoverLabel = $("#hoverLabel");
const toast = $("#toast"), clueStat = $("#clueStat"), fragStat = $("#fragStat");
const titleEl = $("#title"), lampGlow = $("#lampGlow");
const popup = $("#popup"), popupImg = $("#popupImg"), popupTitle = $("#popupTitle"), popupDesc = $("#popupDesc");
const keypad = $("#keypad"), digitsEl = $("#digits"), keysEl = $("#keys"), kpHint = $("#kpHint");
const memFlash = $("#memFlash"), mfText = $("#mfText"), mfKicker = $("#mfKicker"), mfClose = $("#mfClose"), mfImg = $("#mfImg");
const memArchive = $("#memArchive"), maList = $("#maList"), muteBtn = $("#muteBtn");
const imgZoom = $("#imgZoom"), imgZoomImg = $("#imgZoomImg");
const confirmBox = $("#confirmBox");
const doorSeq = $("#doorSeq"), dsDoorImg = $("#dsDoorImg"), keySlot = $("#keySlot");
const exitSeq = $("#exitSeq"), corridor = $("#corridor"), corrHotspots = $("#corrHotspots"),
      hero = $("#hero"), corrHint = $("#corrHint"), roomStub = $("#roomStub"), stubText = $("#stubText");
const doorPrompt = $("#doorPrompt"), corrLeftBtn = $("#corrLeft"), corrRightBtn = $("#corrRight");
const heroShadow = $("#heroShadow"), heroReflect = $("#heroReflect");

// ===== 舞台缩放（等比铺满、居中、留黑边）=====
let scale = 1, rect = null;
function resize() {
  scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.transform = `scale(${scale})`;
  rect = stage.getBoundingClientRect();
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 100));

// client 坐标 → 舞台坐标
function toStage(cx, cy) {
  if (!rect) rect = stage.getBoundingClientRect();
  return { x: (cx - rect.left) / scale, y: (cy - rect.top) / scale };
}

// ===== 启动 =====
function init() {
  $("#titleBg").style.backgroundImage = `url("${BG}title_screen.jpg")`; // 直接设,别用CSS变量(相对url被子元素var()取用解析不到)
  updateRoomBg();
  resize();
  buildHotspots();
  buildKeypad();
  initFX();
  initTitleFX();

  // 首页：有存档才显示「继续游戏」；新游戏覆盖前先确认
  if (hasSave()) $("#continueBtn").classList.remove("hidden");
  $("#continueBtn").addEventListener("click", continueGame);
  $("#newBtn").addEventListener("click", () => {
    if (hasSave()) showConfirm("已有存档——新游戏会覆盖上次的进度。\n确定重新开始？", newGame);
    else newGame();
  });
  $("#dsBackBtn").addEventListener("click", () => location.reload());
  $("#confirmYes").addEventListener("click", () => { const cb = confirmCb; hideConfirm(); if (cb) cb(); });
  $("#confirmNo").addEventListener("click", hideConfirm);
  confirmBox.addEventListener("click", e => { if (e.target === confirmBox) hideConfirm(); });
  popup.addEventListener("click", e => { if (e.target === popup) hidePopup(); });
  $("#kpClose").addEventListener("click", hideKeypad);
  keypad.addEventListener("click", e => { if (e.target === keypad) hideKeypad(); });
  mfClose.addEventListener("click", closeMemory);
  muteBtn.addEventListener("click", toggleMute);
  fragStat.addEventListener("click", openArchive);
  $("#maClose").addEventListener("click", closeArchive);
  memArchive.addEventListener("click", e => { if (e.target === memArchive) closeArchive(); });
  popupImg.addEventListener("click", openZoom);
  imgZoom.addEventListener("click", closeZoom);
  $("#stubBack").addEventListener("click", backToCorridor);
  // 走廊操控：键盘 ← → / A D 走动，E / 回车 / 空格进门
  document.addEventListener("keydown", corrKeyDown);
  document.addEventListener("keyup", corrKeyUp);
  // 点头顶的「按 E 进入」提示 = 进门
  doorPrompt.addEventListener("click", tryEnterDoor);
  // 触屏 / 无键盘：按住左右按钮走动
  const holdBtn = (btn, side) => {
    const down = e => { e.preventDefault(); if (corr.on) { corr[side] = true; corr.target = null; } };
    const up = e => { e.preventDefault(); corr[side] = false; };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
    btn.addEventListener("pointercancel", up);
  };
  holdBtn(corrLeftBtn, "left");
  holdBtn(corrRightBtn, "right");
  corridor.addEventListener("mousemove", e => {
    if (hoverLabel.style.display === "block") {
      const p = toStage(e.clientX, e.clientY);
      hoverLabel.style.left = (p.x + 16) + "px";
      hoverLabel.style.top = (p.y + 20) + "px";
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!confirmBox.classList.contains("hidden")) { hideConfirm(); return; }
      if (!imgZoom.classList.contains("hidden")) { closeZoom(); return; } // 先关放大
      hidePopup(); hideKeypad(); closeArchive();
    }
    if (keypad.classList.contains("show")) {
      if (e.key >= "0" && e.key <= "9") pressDigit(+e.key);
      else if (e.key === "Enter") confirmCode();
      else if (e.key === "Backspace") clearCode();
    }
  });
}

// 房间状态背景：解开柜子后切到开柜版
function updateRoomBg() {
  const img = state.cabinetSolved ? "room01_bg_open.jpg" : "room01_bg.jpg";
  bgLayer.style.backgroundImage = `url("${BG}${img}")`;
}
function newGame() { clearSave(); resetState(); enterRoom(true); }
function continueGame() {
  applySave(loadSave());
  if (state.reachedCorridor) { initAmbient(); titleEl.style.opacity = "0"; stopTitleFX();
    setTimeout(() => { titleEl.classList.add("hidden"); enterCorridor(); }, 800); }
  else enterRoom(false);
}
function enterRoom(isNew) {
  initAmbient(); // 必须在点击手势内创建 AudioContext
  titleEl.style.opacity = "0";
  stopTitleFX();
  setTimeout(() => {
    titleEl.classList.add("hidden");
    room.classList.remove("hidden");
    room.style.opacity = "0";
    room.style.transition = "opacity 1.1s ease";
    requestAnimationFrame(() => { room.style.opacity = "1"; });
    updateHUD(); updateRoomBg(); // 继续游戏时反映柜子是否已开
    const msg = isNew ? "你在一间陌生的房间醒来……没有记忆。" : "你又回到了这里。";
    setTimeout(() => showToast(msg, 4200), 700);
  }, 800);
}

// 自写确认弹窗
let confirmCb = null;
function showConfirm(text, onYes) {
  $("#confirmText").textContent = text;
  confirmCb = onYes;
  confirmBox.classList.remove("hidden");
  requestAnimationFrame(() => confirmBox.classList.add("show"));
}
function hideConfirm() {
  confirmBox.classList.remove("show");
  setTimeout(() => confirmBox.classList.add("hidden"), 220);
}

// ===== 热点 =====
function buildHotspots() {
  for (const id in ITEMS) {
    const it = ITEMS[id];
    const el = document.createElement("div");
    el.className = "hotspot";
    el.style.left = it.x + "px"; el.style.top = it.y + "px";
    el.style.width = it.w + "px"; el.style.height = it.h + "px";
    el.dataset.id = id;
    el.addEventListener("mouseenter", () => { hoverLabel.textContent = it.name; hoverLabel.style.display = "block"; });
    el.addEventListener("mouseleave", () => { hoverLabel.style.display = "none"; });
    el.addEventListener("click", () => clickItem(id));
    hotspots.appendChild(el);
  }
  // 悬浮标签精确跟随鼠标（舞台坐标）
  room.addEventListener("mousemove", e => {
    if (hoverLabel.style.display === "block") {
      const p = toStage(e.clientX, e.clientY);
      hoverLabel.style.left = (p.x + 16) + "px";
      hoverLabel.style.top = (p.y + 20) + "px";
    }
  });
}

// 每个物件的音色
const SFX_BY_ID = {
  lamp: "lamp", chisel: "metal", rules: "paper", blueprint: "paper",
  chart: "paper", desk: "paper", bed: "cloth", wall: "click", mug: "click",
};

function clickItem(id) {
  const it = ITEMS[id];

  if (id === "cabinet") {
    if (!state.cabinetSolved) {          // ① 还没解锁：弹密码盘
      playSfx("keytap");
      showKeypad();
    } else if (!state.photoSeen) {        // ② 解锁后先看那张照片
      state.photoSeen = true;
      if (!state.memories.includes("frag1")) { state.memories.push("frag1"); state.fragments++; }
      updateHUD(); saveGame();
      playSfx("paper");
      pendingKeyHint = true;              // 闪回关掉后，提示去拿钥匙
      showMemory(MEMORIES.frag1);
    } else if (!state.hasKey) {           // ③ 看过照片：拿走钥匙
      state.hasKey = true;
      updateHUD(); saveGame();
      playSfx("clunk");
      showToast("你伸手取下挂钩上的黄铜钥匙。柜子，空了。", 3200);
    } else {                              // ④ 已空：照片随时回「记忆档案」重看
      playSfx("click");
      showToast("柜子空了。照片和钥匙，都在你身上了。", 2600);
    }
    return;
  }

  if (id === "door") {
    if (state.hasKey) winGame();
    else { playSfx("click"); showPopup(OBJ + "door.jpg", "出口门",
      "厚重的铁门锁着。\n你需要一把钥匙——也许，就在那个金属柜里。"); }
    return;
  }

  // 线索物件
  if (it.clue && !state.clues.has(it.clue)) {
    state.clues.add(it.clue);
    updateHUD(); saveGame();
  }
  playSfx(SFX_BY_ID[id] || "click");
  showPopup(it.img, it.name, it.desc);
}

// ===== HUD / Toast =====
function updateHUD() {
  clueStat.textContent = `线索　${state.clues.size} / 4`;
  fragStat.textContent = `碎片　${state.fragments} / 5`;
  keySlot.classList.toggle("hidden", !state.hasKey);
}
let toastTimer = null;
function showToast(text, dur = 3000) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), dur);
}

// ===== 弹窗 =====
function showPopup(img, title, desc) {
  hoverLabel.style.display = "none";
  const wrap = popupImg.parentElement; // .popup-img-wrap
  if (img) { popupImg.src = img; wrap.style.display = ""; }
  else { popupImg.removeAttribute("src"); wrap.style.display = "none"; } // 检视物纯文字
  popupTitle.textContent = title;
  popupDesc.textContent = desc;
  popup.classList.remove("hidden");
  requestAnimationFrame(() => popup.classList.add("show"));
}
function hidePopup() {
  popup.classList.remove("show");
  setTimeout(() => popup.classList.add("hidden"), 220);
}

// ===== 记忆闪回 + 记忆档案 =====
let memTimer = null;
function showMemory(mem) {
  if (!mem) return;
  hoverLabel.style.display = "none";
  mfKicker.textContent = mem.kicker;
  if (mem.img) { mfImg.src = mem.img; mfImg.classList.add("show"); }
  else { mfImg.classList.remove("show"); mfImg.removeAttribute("src"); }
  mfText.textContent = "";
  mfClose.classList.remove("ready");
  memFlash.classList.remove("hidden");
  memFlash.classList.add("flashin");
  requestAnimationFrame(() => memFlash.classList.add("show"));
  setTimeout(() => memFlash.classList.remove("flashin"), 1100);
  // 洗白冲击后再打字
  clearInterval(memTimer);
  setTimeout(() => {
    let i = 0; const txt = mem.text;
    memTimer = setInterval(() => {
      i++;
      mfText.textContent = txt.slice(0, i);
      if (i >= txt.length) {
        clearInterval(memTimer);
        setTimeout(() => mfClose.classList.add("ready"), 600);
      }
    }, 52);
  }, 950);
}
let pendingKeyHint = false;
function closeMemory() {
  clearInterval(memTimer);
  memFlash.classList.remove("show");
  setTimeout(() => memFlash.classList.add("hidden"), 520);
  if (pendingKeyHint) {   // 看完照片：暗示柜子里还有钥匙
    pendingKeyHint = false;
    setTimeout(() => showToast("照片背后的挂钩上，还垂着一把黄铜钥匙——再点一下柜子，取走它。", 4500), 700);
  }
}
function openArchive() {
  maList.innerHTML = "";
  if (!state.memories.length) {
    maList.innerHTML = '<div class="ma-empty">还没有拾起任何记忆碎片。</div>';
  } else {
    for (const id of state.memories) {
      const m = MEMORIES[id]; if (!m) continue;
      const d = document.createElement("div");
      d.className = "ma-item";
      const t = document.createElement("div"); t.className = "ma-t"; t.textContent = m.kicker;
      const c = document.createElement("div"); c.className = "ma-c"; c.textContent = m.text;
      d.appendChild(t); d.appendChild(c); maList.appendChild(d);
    }
  }
  memArchive.classList.remove("hidden");
  requestAnimationFrame(() => memArchive.classList.add("show"));
}
function closeArchive() {
  if (memArchive.classList.contains("hidden")) return;
  memArchive.classList.remove("show");
  setTimeout(() => memArchive.classList.add("hidden"), 220);
}

// ===== 线索图放大查看 =====
function openZoom() {
  if (!popupImg.getAttribute("src")) return;
  imgZoomImg.src = popupImg.src;
  imgZoom.classList.remove("hidden");
  requestAnimationFrame(() => imgZoom.classList.add("show"));
  playSfx("click");
}
function closeZoom() {
  if (imgZoom.classList.contains("hidden")) return;
  imgZoom.classList.remove("show");
  setTimeout(() => imgZoom.classList.add("hidden"), 250);
}

// ===== 密码键盘 =====
function buildKeypad() {
  for (let i = 0; i < 4; i++) {
    const d = document.createElement("div");
    d.className = "digit"; d.textContent = "—";
    digitsEl.appendChild(d);
  }
  const layout = [["1"],["2"],["3"],["4"],["5"],["6"],["7"],["8"],["9"],
    ["C","clear"],["0"],[">","confirm"]];
  for (const [label, type] of layout) {
    const b = document.createElement("button");
    b.className = "key" + (type ? " " + type : "");
    b.textContent = label;
    if (type === "clear") b.addEventListener("click", clearCode);
    else if (type === "confirm") b.addEventListener("click", confirmCode);
    else b.addEventListener("click", () => pressDigit(+label));
    keysEl.appendChild(b);
  }
}
function showKeypad() {
  state.input = ""; state.wrong = 0;
  kpHint.textContent = "输入四位密码"; kpHint.classList.remove("err");
  renderDigits();
  keypad.classList.remove("hidden");
  requestAnimationFrame(() => keypad.classList.add("show"));
}
function hideKeypad() {
  keypad.classList.remove("show");
  setTimeout(() => keypad.classList.add("hidden"), 200);
}
function renderDigits() {
  const cells = digitsEl.children;
  for (let i = 0; i < 4; i++) {
    const ch = state.input[i];
    cells[i].textContent = ch || "—";
    cells[i].classList.toggle("filled", !!ch);
  }
}
function pressDigit(n) {
  if (state.input.length < 4) { state.input += n; renderDigits(); playSfx("keytap"); }
}
function clearCode() { state.input = ""; renderDigits(); kpHint.textContent = "输入四位密码"; kpHint.classList.remove("err"); playSfx("keytap"); }
function confirmCode() {
  if (state.input === CODE) {
    state.cabinetSolved = true;
    saveGame();
    updateRoomBg(); // 柜门打开，房间底图切到开柜版
    playSfx("clunk");
    hideKeypad();
    showToast("咔哒——锁开了。柜门缓缓滑开，里面似乎有东西……", 4000);
  } else {
    state.wrong++;
    playSfx("buzz");
    state.input = ""; renderDigits();
    kpHint.classList.add("err");
    kpHint.textContent = state.wrong >= 3
      ? "提示：从墙上最亮的那个数字开始，顺着光一路读进黑暗"
      : "密码错误。再看看墙上的刻痕和灯光的方向";
  }
}

// ===== 通关 =====
function winGame() {
  state.reachedCorridor = true; saveGame();
  playExit();
}

// ===== 出门过场 → 走廊中枢 =====
// 定格「门开」房间图 → 镜头推进右侧开着的门 → 收黑 → 走廊
function playExit() {
  playSfx("door");
  exitSeq.classList.remove("hidden");
  requestAnimationFrame(() => exitSeq.classList.add("go"));
  setTimeout(() => playSfx("clunk"), 2300); // 铁门在身后合拢
  setTimeout(enterCorridor, 2850);
}

// 走廊三扇亮门（颜色暗示门后世界；房间内容待建）。热点矩形（点击）+ 地面坐标(u,v) + 进门占位文案
// u：0=贴左墙 → 1=贴右墙；v：0=最近（画面底、最大）→ 1=最远（灭点、最小）。对齐底图上三处门缝地面光晕
const CORR_DOORS = {
  warm:  { name: "透着暖光的门", rect: { x: 78, y: 86, w: 214, h: 356 }, u: 0.02, v: 0.35,
    stub: "门缝下透出暖黄的光，像谁家亮着的客厅。\n你伸手推开它——\n\n（这扇门后的房间，还在建造中……）" },
  pixel: { name: "透着幽蓝的门", rect: { x: 420, y: 198, w: 84, h: 246 }, u: 0.03, v: 0.84,
    stub: "门缝下渗出幽蓝的光，一闪一闪，像老式屏幕。\n你伸手推开它——\n\n（这扇门后的房间，还在建造中……）" },
  cold:  { name: "透着冷光的门", rect: { x: 805, y: 202, w: 88, h: 238 }, u: 0.97, v: 0.84,
    stub: "门缝下淌出一线惨白的冷光，让人脊背发凉。\n你伸手推开它——\n\n（这扇门后的房间，还在建造中……）" },
};

// ===== 2.5D 地面：手绘走廊图里的一块透视梯形。(u,v) → 脚点屏幕坐标(x,y)+缩放 s =====
const FLOOR = {
  yNear: 692, yFar: 430,        // 近（画面底）/ 远（灭点）的脚点 y
  nearL: 140, nearR: 1140,      // 近处地面左右边（宽）
  farL: 560,  farR: 726,        // 远处地面左右边（窄，收向灭点）
  sNear: 0.60, sFar: 0.16,      // 近大远小
};
const HERO_BASE_X = 553 + 175 / 2, HERO_BASE_Y = 392 + 300; // .hero-clip 脚点 (640.5, 692)
const U_SPEED = 0.52, V_SPEED = 0.42;   // 每秒走过的 u / v
const clamp01 = n => Math.max(0, Math.min(1, n));

function floorPos(u, v) {
  u = clamp01(u); v = clamp01(v);
  const y = FLOOR.yNear + (FLOOR.yFar - FLOOR.yNear) * v;
  const lx = FLOOR.nearL + (FLOOR.farL - FLOOR.nearL) * v;
  const rx = FLOOR.nearR + (FLOOR.farR - FLOOR.nearR) * v;
  const x = lx + (rx - lx) * u;
  const s = FLOOR.sNear + (FLOOR.sFar - FLOOR.sNear) * v;
  return { x, y, s };
}
function screenToFloor(sx, sy) {   // 屏幕（舞台坐标）→ 地面(u,v)，给点地面走
  let v = clamp01((sy - FLOOR.yNear) / (FLOOR.yFar - FLOOR.yNear));
  const lx = FLOOR.nearL + (FLOOR.farL - FLOOR.nearL) * v;
  const rx = FLOOR.nearR + (FLOOR.farR - FLOOR.nearR) * v;
  return { u: clamp01((sx - lx) / (rx - lx)), v };
}
function nearestDoor(u, v) {
  let best = null, bd = 0.17;
  for (const id in CORR_DOORS) {
    const d = CORR_DOORS[id];
    const dist = Math.hypot((u - d.u) * 0.85, (v - d.v) * 1.15); // v 方向更敏感些
    if (dist < bd) { bd = dist; best = { id, d }; }
  }
  return best;
}
// 背影精灵：往深处（背对镜头）为正；dir 只做左右镜像的姿态提示
// 把人物「焊」进场景光：脚下阴影 + 按位置重打光（走廊中央被吊灯照亮，贴墙成剪影）+ 湿地面倒影
function placeHero(x, y, s, dir, u = 0.5, v = 0) {
  const tf = `translate(${x - HERO_BASE_X}px,${y - HERO_BASE_Y}px) scale(${s}) scaleX(${dir})`;
  // 场景打光：越靠走廊中央越亮（灯在中轴），越贴墙越暗成黑影
  const lit = Math.max(0, 1 - Math.abs(u - 0.5) * 1.75);
  const b = 0.24 + 0.52 * lit;         // 亮度：侧墙 0.24（近剪影）→ 中央 0.76
  const warm = 0.28 * lit;             // 暖光染色
  hero.style.transform = tf;
  hero.style.filter =
    `brightness(${b.toFixed(3)}) contrast(1.12) saturate(${(0.7 + 0.2 * lit).toFixed(2)}) ` +
    `sepia(${warm.toFixed(3)}) drop-shadow(0 3px 8px rgba(0,0,0,.55))`;
  // 脚下接触阴影
  const sw = 175 * s * 1.15, sh = 60 * s;
  heroShadow.style.left = (x - sw / 2) + "px";
  heroShadow.style.top = (y - sh * 0.62) + "px";
  heroShadow.style.width = sw + "px";
  heroShadow.style.height = sh + "px";
  heroShadow.style.opacity = (0.34 + 0.22 * (1 - v)).toFixed(2);
  // 湿地面倒影（竖直翻转，脚点对齐）
  heroReflect.style.transform = tf + " scaleY(-1)";
  heroReflect.style.opacity = (0.16 * (0.5 + 0.5 * lit)).toFixed(3);
}

// 走廊操控状态：u/v = 地面坐标；up/down/left/right = 按键；target = 点地面/点门自动走
const corr = { on: false, u: 0.5, v: 0.10, dir: 1, up: false, down: false, left: false, right: false,
  target: null, raf: null, last: 0, atDoor: null, entering: false, boundClick: false };

function enterCorridor() {
  initAmbient();
  room.classList.add("hidden");
  exitSeq.classList.add("hidden"); exitSeq.classList.remove("go");
  titleEl.classList.add("hidden");
  if (corr.raf) cancelAnimationFrame(corr.raf);
  Object.assign(corr, { on: false, u: 0.5, v: 0.10, dir: 1, up: false, down: false, left: false, right: false,
    target: null, raf: null, last: 0, atDoor: null, entering: false, boundClick: corr.boundClick });
  corridor.classList.remove("walking");
  roomStub.classList.remove("show"); roomStub.classList.add("hidden");
  hideDoorPrompt();
  buildCorridorDoors();
  // 点地面走（触屏 & 桌面都可）——只绑一次
  if (!corr.boundClick) {
    corr.boundClick = true;
    corridor.addEventListener("click", e => {
      if (!corr.on || corr.entering) return;
      const p = toStage(e.clientX, e.clientY);
      corr.target = screenToFloor(p.x, p.y);
    });
  }
  // 起手：站在走廊口的大特写
  hero.style.transition = "none";
  placeHero(HERO_BASE_X, HERO_BASE_Y, 1, 1, 0.5, 0);
  void hero.offsetWidth;
  corrHint.textContent = "走廊尽头一片黑。亮着光的门后，各有一个世界——走过去，推开一扇。";
  corrHint.style.opacity = "";
  corridor.classList.remove("hidden");
  corridor.style.opacity = "0"; corridor.style.transition = "opacity 1.4s ease";
  requestAnimationFrame(() => { corridor.style.opacity = "1"; });
  // 走进走廊 → 交出操控
  setTimeout(() => {
    hero.style.transition = "transform 1.15s ease";
    corridor.classList.add("walking");
    const c = floorPos(corr.u, corr.v); placeHero(c.x, c.y, c.s, 1, corr.u, corr.v);
    playSfx("cloth");
    setTimeout(() => {
      corridor.classList.remove("walking");
      hero.style.transition = "none";
      corrHint.textContent = "WASD / 方向键 上下左右走动（或点地面/点门）· 走到发光的门前按 E 进入";
      corr.on = true; corr.last = 0;
      corr.raf = requestAnimationFrame(corrTick);
    }, 1200);
  }, 1500);
}

function buildCorridorDoors() {
  corrHotspots.innerHTML = "";
  for (const id in CORR_DOORS) {
    const r = CORR_DOORS[id].rect;
    const el = document.createElement("div");
    el.className = "hotspot";
    el.style.left = r.x + "px"; el.style.top = r.y + "px";
    el.style.width = r.w + "px"; el.style.height = r.h + "px";
    el.addEventListener("mouseenter", () => { hoverLabel.textContent = CORR_DOORS[id].name; hoverLabel.style.display = "block"; });
    el.addEventListener("mouseleave", () => { hoverLabel.style.display = "none"; });
    el.addEventListener("click", e => {          // 点门=走到门口（触屏友好），到位再按 E / 点提示进入
      e.stopPropagation();
      if (!corr.on || corr.entering) return;
      corr.target = { u: CORR_DOORS[id].u, v: CORR_DOORS[id].v };
    });
    corrHotspots.appendChild(el);
  }
}

// 每帧推进：读操控 → 在地面上移动 u/v → 摆放角色 → 门口检测
function corrTick(ts) {
  corr.raf = requestAnimationFrame(corrTick);
  if (!corr.on) return;
  if (!corr.last) corr.last = ts;
  const dt = Math.min(0.05, (ts - corr.last) / 1000); corr.last = ts;

  let mu = 0, mv = 0;
  if (corr.target) {
    mu = corr.target.u - corr.u; mv = corr.target.v - corr.v;
    if (Math.hypot(mu, mv) < 0.02) corr.target = null;
  } else {
    if (corr.left) mu -= 1;
    if (corr.right) mu += 1;
    if (corr.up) mv += 1;    // ↑/W = 往走廊深处（背对镜头）
    if (corr.down) mv -= 1;  // ↓/S = 往镜头方向
  }
  const mag = Math.hypot(mu, mv);
  const moving = mag > 0.001 && !corr.entering;

  if (moving) {
    mu /= mag; mv /= mag;
    corr.u = clamp01(corr.u + mu * U_SPEED * dt);
    corr.v = clamp01(corr.v + mv * V_SPEED * dt);
    if (Math.abs(mu) > 0.2) corr.dir = mu > 0 ? 1 : -1;  // 明显左右移动才翻转姿态
    corridor.classList.add("walking");
  } else {
    corridor.classList.remove("walking");
  }

  const c = floorPos(corr.u, corr.v);
  placeHero(c.x, c.y, c.s, corr.dir, corr.u, corr.v);

  // 门口检测
  const nd = nearestDoor(corr.u, corr.v);
  if ((nd && nd.id) !== (corr.atDoor && corr.atDoor.id)) {
    corr.atDoor = nd;
    if (nd && !corr.entering) showDoorPrompt(nd, c); else hideDoorPrompt();
  } else if (nd) {
    positionDoorPrompt(c);
  }
}

function showDoorPrompt(nd, c) {
  doorPrompt.textContent = "按 E 进入 · " + nd.d.name;
  doorPrompt.dataset.door = nd.id;
  positionDoorPrompt(c || floorPos(corr.u, corr.v));
  doorPrompt.classList.add("show");
}
function positionDoorPrompt(c) {
  doorPrompt.style.left = c.x + "px";
  doorPrompt.style.top = (c.y - c.s * 300 - 16) + "px";
}
function hideDoorPrompt() {
  doorPrompt.classList.remove("show");
  delete doorPrompt.dataset.door;
}
function tryEnterDoor() {
  if (!corr.on || corr.entering) return;
  if (corr.atDoor) enterDoor(corr.atDoor.id);
}
function enterDoor(id) {
  corr.entering = true;
  corr.up = corr.down = corr.left = corr.right = false; corr.target = null;
  corridor.classList.remove("walking");
  hideDoorPrompt();
  playSfx("door");
  stubText.textContent = CORR_DOORS[id].stub;
  roomStub.classList.remove("hidden");
  requestAnimationFrame(() => roomStub.classList.add("show"));
}
function backToCorridor() {
  roomStub.classList.remove("show");
  setTimeout(() => roomStub.classList.add("hidden"), 700);
  setTimeout(() => { corr.entering = false; corr.last = 0; corr.atDoor = null; }, 500);
}

// 键盘操控（走廊里生效）：WASD / 方向键 上下左右
function corrKeyDown(e) {
  if (corridor.classList.contains("hidden") || !corr.on) return;
  const k = e.key;
  if (k === "ArrowLeft" || k === "a" || k === "A") { corr.left = true; corr.target = null; e.preventDefault(); }
  else if (k === "ArrowRight" || k === "d" || k === "D") { corr.right = true; corr.target = null; e.preventDefault(); }
  else if (k === "ArrowUp" || k === "w" || k === "W") { corr.up = true; corr.target = null; e.preventDefault(); }
  else if (k === "ArrowDown" || k === "s" || k === "S") { corr.down = true; corr.target = null; e.preventDefault(); }
  else if (k === "e" || k === "E" || k === "Enter" || k === " ") { tryEnterDoor(); e.preventDefault(); }
}
function corrKeyUp(e) {
  const k = e.key;
  if (k === "ArrowLeft" || k === "a" || k === "A") corr.left = false;
  else if (k === "ArrowRight" || k === "d" || k === "D") corr.right = false;
  else if (k === "ArrowUp" || k === "w" || k === "W") corr.up = false;
  else if (k === "ArrowDown" || k === "s" || k === "S") corr.down = false;
}
// 开门推门过场：插钥匙→转动→推门露出黑暗走廊→通关字幕
function playDoorSeq() {
  dsDoorImg.src = OBJ + "door.jpg";
  doorSeq.classList.remove("hidden", "turn", "swing", "ended");
  requestAnimationFrame(() => doorSeq.classList.add("show"));
  setTimeout(() => { doorSeq.classList.add("turn"); playSfx("keytap"); }, 800);   // 钥匙转动
  setTimeout(() => playSfx("clunk"), 1450);                                        // 锁开
  setTimeout(() => { doorSeq.classList.add("swing"); playSfx("door"); }, 1750);    // 推门
  setTimeout(() => doorSeq.classList.add("ended"), 3700);                          // 通关字幕
}

// ===== 首屏电影级特效：浮尘 + 吊灯明灭 =====
let titleRAF = null, titleFlick = null;
function initTitleFX() {
  const cv = $("#titleDust"), ctx = cv.getContext("2d");
  cv.width = STAGE_W; cv.height = STAGE_H;
  const motes = [];
  const mk = spawn => ({
    x: Math.random() * STAGE_W,
    y: spawn ? Math.random() * STAGE_H : STAGE_H + 8,
    r: 0.5 + Math.random() * 2.0,
    vy: -(0.05 + Math.random() * 0.22),
    vx: (Math.random() - 0.5) * 0.25,
    a: 0.06 + Math.random() * 0.3,
    tw: Math.random() * Math.PI * 2,
  });
  for (let i = 0; i < 60; i++) motes.push(mk(true));
  function loop() {
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    for (const m of motes) {
      m.y += m.vy; m.x += m.vx + Math.sin(m.tw) * 0.12; m.tw += 0.015;
      if (m.y < -8) Object.assign(m, mk(false));
      const a = m.a * (0.5 + 0.5 * Math.sin(m.tw));
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,200,170,${a})`;
      ctx.fill();
    }
    titleRAF = requestAnimationFrame(loop);
  }
  loop();
  // 走廊吊灯明灭
  let f = 1;
  titleFlick = setInterval(() => {
    const dip = Math.random() < 0.1 ? 0.5 + Math.random() * 0.25 : 0.88 + Math.random() * 0.2;
    f += (dip - f) * 0.45;
    titleEl.style.setProperty("--tflick", f.toFixed(3));
  }, 100);
}
function stopTitleFX() {
  if (titleRAF) cancelAnimationFrame(titleRAF), titleRAF = null;
  if (titleFlick) clearInterval(titleFlick), titleFlick = null;
}

// ===== 程序化氛围音（零音频文件：低频drone + 棕噪房间底噪 + 远处偶发闷响）=====
let audioCtx = null, ambGain = null, sfxGain = null, muted = false;
const AMB_VOL = 0.13;

// ===== 程序化音效（点击物件/拨灯/刻刀铮鸣/纸张/密码键/开锁/答错/开门）=====
function sfxTone(freq, type, dur, vol, decayTo) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = audioCtx.createGain(); const t = audioCtx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(decayTo || 0.0008, t + dur);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.03);
}
function sfxNoise(dur, vol, filtType, filtFreq, q) {
  if (!audioCtx) return;
  const n = Math.floor(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = filtType; f.frequency.value = filtFreq; if (q) f.Q.value = q;
  const g = audioCtx.createGain(); const t = audioCtx.currentTime;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
  src.connect(f); f.connect(g); g.connect(sfxGain); src.start(t); src.stop(t + dur + 0.03);
}
function playSfx(type) {
  if (!audioCtx || muted) return;
  switch (type) {
    case "lamp":  sfxNoise(0.03, 0.3, "highpass", 1500); sfxTone(68, "sine", 0.55, 0.12); sfxTone(120, "sawtooth", 0.5, 0.04); break;
    case "metal": sfxTone(1850, "sine", 0.55, 0.13); sfxTone(2760, "sine", 0.5, 0.07); sfxTone(3500, "sine", 0.45, 0.04); sfxNoise(0.09, 0.1, "bandpass", 4200, 2); break;
    case "paper": sfxNoise(0.2, 0.13, "bandpass", 4200, 0.7); break;
    case "cloth": sfxNoise(0.22, 0.1, "lowpass", 900, 0.5); break;
    case "keytap":sfxTone(175, "square", 0.05, 0.12, 0.002); sfxNoise(0.03, 0.12, "lowpass", 1200); break;
    case "clunk": sfxTone(80, "sine", 0.4, 0.32); sfxNoise(0.14, 0.2, "lowpass", 380); break;
    case "buzz":  sfxTone(110, "sawtooth", 0.38, 0.18); sfxTone(117, "sawtooth", 0.35, 0.11); break;
    case "door":  playDoorCreak(); break;
    default:      sfxNoise(0.045, 0.16, "bandpass", 2200, 1); // click
  }
}
// 生锈铰链吱嘎呻吟 + 门到位闷响（中频，喇叭放得出来）
function playDoorCreak() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(260, t);
  o.frequency.exponentialRampToValueAtTime(95, t + 1.1);
  const f = audioCtx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 520; f.Q.value = 5;
  const lfo = audioCtx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 12;
  const lg = audioCtx.createGain(); lg.gain.value = 70;
  lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 1.2);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.002, t + 1.15);
  o.connect(f); f.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 1.2);
  // 收尾：门撞到位的闷响
  const t2 = t + 1.0;
  const th = audioCtx.createOscillator(); th.type = "sine"; th.frequency.value = 72;
  const tg = audioCtx.createGain();
  tg.gain.setValueAtTime(0.0001, t2);
  tg.gain.linearRampToValueAtTime(0.3, t2 + 0.02);
  tg.gain.exponentialRampToValueAtTime(0.001, t2 + 0.45);
  th.connect(tg); tg.connect(sfxGain); th.start(t2); th.stop(t2 + 0.5);
}
function initAmbient() {
  if (audioCtx) { if (audioCtx.state === "suspended") audioCtx.resume(); return; }
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  catch (e) { return; }
  ambGain = audioCtx.createGain();
  ambGain.gain.value = muted ? 0 : AMB_VOL;
  ambGain.connect(audioCtx.destination);
  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = muted ? 0 : 0.5;
  sfxGain.connect(audioCtx.destination);

  // 低频 drone：失谐振荡 + 缓慢 LFO 呼吸
  const droneFilter = audioCtx.createBiquadFilter();
  droneFilter.type = "lowpass"; droneFilter.frequency.value = 220;
  droneFilter.connect(ambGain);
  [55, 55.4, 82.5].forEach((f, idx) => {
    const o = audioCtx.createOscillator();
    o.type = idx === 2 ? "sine" : "triangle"; o.frequency.value = f;
    const g = audioCtx.createGain(); g.gain.value = idx === 2 ? 0.22 : 0.5;
    o.connect(g); g.connect(droneFilter); o.start();
    const lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.05 + idx * 0.02;
    const lg = audioCtx.createGain(); lg.gain.value = 0.18;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
  });

  // 棕噪房间底噪
  const n = audioCtx.sampleRate * 2;
  const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5; }
  const noise = audioCtx.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const nf = audioCtx.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 600;
  const ng = audioCtx.createGain(); ng.gain.value = 0.12;
  noise.connect(nf); nf.connect(ng); ng.connect(ambGain); noise.start();

  scheduleCreak();
}
function scheduleCreak() {
  if (!audioCtx) return;
  setTimeout(() => {
    if (audioCtx && !muted) playCreak();
    scheduleCreak();
  }, 7000 + Math.random() * 14000);
}
function playCreak() {
  const dur = 0.6 + Math.random() * 0.9;
  const o = audioCtx.createOscillator(); o.type = "sawtooth";
  o.frequency.value = 38 + Math.random() * 46;
  const f = audioCtx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 280;
  const g = audioCtx.createGain(); g.gain.value = 0;
  o.connect(f); f.connect(g); g.connect(ambGain);
  const t = audioCtx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
}
function toggleMute() {
  muted = !muted;
  if (ambGain) ambGain.gain.value = muted ? 0 : AMB_VOL;
  if (sfxGain) sfxGain.gain.value = muted ? 0 : 0.5;
  muteBtn.classList.toggle("muted", muted);
}

// ===== 特效：鼠标视差 + 灯光闪烁 + 灰尘粒子 =====
function initFX() {
  // 视差
  let px = 0, py = 0;
  room.addEventListener("mousemove", e => {
    const p = toStage(e.clientX, e.clientY);
    px = (p.x / STAGE_W - 0.5) * -22;
    py = (p.y / STAGE_H - 0.5) * -14;
    bgLayer.style.transform = `translate(${px}px,${py}px)`;
  });

  // 灯光闪烁
  let flick = 1;
  setInterval(() => {
    const dip = Math.random() < 0.12 ? 0.55 + Math.random() * 0.2 : 0.9 + Math.random() * 0.18;
    flick += (dip - flick) * 0.5;
    lampGlow.style.setProperty("--flick", flick.toFixed(3));
  }, 90);

  // 灰尘粒子
  const cv = $("#fxCanvas"), ctx = cv.getContext("2d");
  cv.width = STAGE_W; cv.height = STAGE_H;
  const motes = [];
  for (let i = 0; i < 48; i++) motes.push(newMote(true));
  function newMote(spawn) {
    return {
      x: Math.random() * STAGE_W,
      y: spawn ? Math.random() * STAGE_H : STAGE_H + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: -(0.08 + Math.random() * 0.25),
      vx: (Math.random() - 0.5) * 0.2,
      a: 0.1 + Math.random() * 0.4,
      tw: Math.random() * Math.PI * 2,
    };
  }
  function loop() {
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    for (const m of motes) {
      m.y += m.vy; m.x += m.vx + Math.sin(m.tw) * 0.15; m.tw += 0.02;
      if (m.y < -10) Object.assign(m, newMote(false));
      const a = m.a * (0.6 + 0.4 * Math.sin(m.tw));
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,210,150,${a})`;
      ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  loop();
}

init();
