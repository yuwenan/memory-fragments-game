"use strict";

// ===== 记忆碎片 · 网页原生版 =====
// 1280×720 舞台等比缩放；中文浏览器原生渲染；Canvas 粒子 + CSS 特效堆出氛围。

const STAGE_W = 1280, STAGE_H = 720;
const CODE = "7931"; // 顺着灯光从右往左读墙上四个刻痕

const OBJ = "assets/objects/";
const BG = "assets/backgrounds/";

// 交互物件（坐标对齐 1280×720）
const ITEMS = {
  wall: {
    name: "墙上刻痕", x: 525, y: 120, w: 310, h: 290,
    img: OBJ + "wall_scratches.jpg", clue: "wall",
    desc: "有人用利器在墙上刻下四个数字，散落在墙面各处。\n\n台灯的光斜照过来，最亮的那个数字清晰刺眼，越往黑暗里去越模糊难辨。\n\n纸条说过——「光知道方向」。也许，该从最亮的那个开始，顺着光一路读进黑暗里？"
  },
  desk: {
    name: "桌子", x: 375, y: 415, w: 365, h: 215,
    img: OBJ + "desk_note.jpg", clue: "desk",
    desc: "桌上压着一张褪色的纸条：\n\n「从你看到的地方开始。光知道方向。」\n\n看来，线索和光照的方向有关。"
  },
  lamp: {
    name: "台灯", x: 440, y: 280, w: 120, h: 165,
    img: OBJ + "lamp.jpg", clue: "lamp",
    desc: "你拨亮了台灯。\n\n暖黄的光斜斜打在墙上，烧出一片最亮的光斑，再渐渐没入另一头的黑暗。\n\n墙上那些刻痕——会不会该从最亮的那个开始，顺着光一路读进黑暗里？"
  },
  bed: {
    name: "床铺", x: 730, y: 370, w: 285, h: 215,
    img: OBJ + "bed.jpg", clue: "bed",
    desc: "你醒来时就躺在这里。\n\n枕头下压着一个褪色的镜子符号，像是「镜像计划」的标记……"
  },
  cabinet: { name: "金属柜", x: 30, y: 90, w: 240, h: 450 }, // 点击弹密码盘
  door: { name: "出口门", x: 1120, y: 95, w: 160, h: 460 },
};

// ===== 游戏状态 =====
const state = {
  clues: new Set(),
  fragments: 0,
  hasKey: false,
  cabinetSolved: false,
  input: "",
  wrong: 0,
};

// ===== DOM =====
const $ = s => document.querySelector(s);
const stage = $("#stage"), room = $("#room"), bgLayer = $("#bgLayer");
const hotspots = $("#hotspots"), hoverLabel = $("#hoverLabel");
const toast = $("#toast"), clueStat = $("#clueStat"), fragStat = $("#fragStat");
const titleEl = $("#title"), lampGlow = $("#lampGlow");
const popup = $("#popup"), popupImg = $("#popupImg"), popupTitle = $("#popupTitle"), popupDesc = $("#popupDesc");
const keypad = $("#keypad"), digitsEl = $("#digits"), keysEl = $("#keys"), kpHint = $("#kpHint");

// ===== 舞台缩放（等比铺满、居中、留黑边）=====
let scale = 1, rect = null;
function resize() {
  scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.transform = `scale(${scale})`;
  rect = stage.getBoundingClientRect();
}
window.addEventListener("resize", resize);

// client 坐标 → 舞台坐标
function toStage(cx, cy) {
  if (!rect) rect = stage.getBoundingClientRect();
  return { x: (cx - rect.left) / scale, y: (cy - rect.top) / scale };
}

// ===== 启动 =====
function init() {
  titleEl.style.setProperty("--titlebg", `url("${BG}title_screen.jpg")`);
  bgLayer.style.backgroundImage = `url("${BG}room01_bg.jpg")`;
  resize();
  buildHotspots();
  buildKeypad();
  initFX();
  initTitleFX();

  $("#startBtn").addEventListener("click", startGame);
  $("#popupClose").addEventListener("click", hidePopup);
  $("#popupCornerClose").addEventListener("click", hidePopup);
  popup.addEventListener("click", e => { if (e.target === popup) hidePopup(); });
  $("#kpClose").addEventListener("click", hideKeypad);
  keypad.addEventListener("click", e => { if (e.target === keypad) hideKeypad(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { hidePopup(); hideKeypad(); }
    if (keypad.classList.contains("show")) {
      if (e.key >= "0" && e.key <= "9") pressDigit(+e.key);
      else if (e.key === "Enter") confirmCode();
      else if (e.key === "Backspace") clearCode();
    }
  });
}

function startGame() {
  titleEl.style.opacity = "0";
  stopTitleFX();
  setTimeout(() => {
    titleEl.classList.add("hidden");
    room.classList.remove("hidden");
    room.style.opacity = "0";
    room.style.transition = "opacity 1.1s ease";
    requestAnimationFrame(() => { room.style.opacity = "1"; });
    updateHUD();
    setTimeout(() => showToast("你在一间陌生的房间醒来……没有记忆。", 4200), 700);
  }, 800);
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

function clickItem(id) {
  const it = ITEMS[id];

  if (id === "cabinet") {
    if (state.cabinetSolved) {
      if (!state.hasKey) {
        state.hasKey = true; state.fragments++;
        updateHUD();
        showToast("获得：黄铜钥匙　+　第一段记忆碎片", 3200);
      }
      showPopup(OBJ + "cabinet_open.jpg", "金属柜 — 已打开",
        "柜门缓缓滑开。里面躺着一把黄铜钥匙，和一张褪色的照片——\n照片上的日期，竟然是明天。这怎么可能？");
    } else {
      showKeypad();
    }
    return;
  }

  if (id === "door") {
    if (state.hasKey) winGame();
    else showPopup(OBJ + "door.jpg", "出口门",
      "厚重的铁门锁着。\n\n你需要一把钥匙——也许，就在那个金属柜里。");
    return;
  }

  // 线索物件
  if (it.clue && !state.clues.has(it.clue)) {
    state.clues.add(it.clue);
    updateHUD();
  }
  showPopup(it.img, it.name, it.desc);
}

// ===== HUD / Toast =====
function updateHUD() {
  clueStat.textContent = `线索　${state.clues.size} / 4`;
  fragStat.textContent = `碎片　${state.fragments} / 5`;
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
  popupImg.src = img;
  popupTitle.textContent = title;
  popupDesc.textContent = desc;
  popup.classList.remove("hidden");
  requestAnimationFrame(() => popup.classList.add("show"));
}
function hidePopup() {
  popup.classList.remove("show");
  setTimeout(() => popup.classList.add("hidden"), 220);
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
  if (state.input.length < 4) { state.input += n; renderDigits(); }
}
function clearCode() { state.input = ""; renderDigits(); kpHint.textContent = "输入四位密码"; kpHint.classList.remove("err"); }
function confirmCode() {
  if (state.input === CODE) {
    state.cabinetSolved = true;
    hideKeypad();
    showToast("咔哒——锁开了。柜门缓缓滑开，里面似乎有东西……", 4000);
  } else {
    state.wrong++;
    state.input = ""; renderDigits();
    kpHint.classList.add("err");
    kpHint.textContent = state.wrong >= 3
      ? "提示：从墙上最亮的那个数字开始，顺着光一路读进黑暗"
      : "密码错误。再看看墙上的刻痕和灯光的方向";
  }
}

// ===== 通关 =====
function winGame() {
  const flash = document.createElement("div");
  flash.id = "flash"; room.appendChild(flash);
  requestAnimationFrame(() => { flash.style.opacity = "0.9"; });
  setTimeout(() => { flash.style.opacity = "0"; }, 220);
  setTimeout(() => {
    showPopup(OBJ + "door.jpg", "门，开了",
      "钥匙转动，铁门沉重地打开了。\n\n走廊里弥漫着同样的尘味，更深的黑暗在前方等待……\n\n—— 第一关「觉醒室」通关 ——");
    flash.remove();
  }, 360);
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
