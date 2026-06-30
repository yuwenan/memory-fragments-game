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
    desc: "墙上钉着一张褪色的守则：\n1. Silence　保持安静\n2. Obey　　 服从\n3. Record　记录\n4. Forget　遗忘\n前三条你认。可第四条「遗忘」——\n谁会把忘记，写成一条要人遵守的规定？"
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
    desc: "墙上钉着一张蓝图，线条像建筑，又像某种神经接线。\n角落印着小字：「镜像计划 · 意识备份流程」。\n你盯着它一阵心悸，却想不起为什么。"
  },
  chart: {
    name: "病历夹", x: 1140, y: 278, w: 75, h: 95, lore: true,
    desc: "墙上挂着一块夹板，夹着一页脆黄的病历。\n姓名被人用力划掉，只剩一个编号。\n状态栏写着两个字——「待提取」。"
  },
};

// ===== 游戏状态 =====
const state = {
  clues: new Set(),
  fragments: 0,
  hasKey: false,
  cabinetSolved: false,
  input: "",
  wrong: 0,
  memories: [],      // 已拾起的记忆碎片 id
  pendingMemory: null, // 关闭柜门弹窗后触发的闪回
  finished: false,   // 是否已通关（开门）
};

// ===== 本地存档（localStorage，零后端）=====
const SAVE_KEY = "mf_save_v1";
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, clues: [...state.clues], fragments: state.fragments,
      hasKey: state.hasKey, cabinetSolved: state.cabinetSolved,
      memories: state.memories, finished: state.finished,
    }));
  } catch (e) {}
}
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function hasSave() {
  const s = loadSave();
  return !!(s && !s.finished && ((s.clues && s.clues.length) || s.cabinetSolved || s.fragments));
}
function resetState() {
  state.clues = new Set(); state.fragments = 0; state.hasKey = false;
  state.cabinetSolved = false; state.input = ""; state.wrong = 0;
  state.memories = []; state.pendingMemory = null; state.finished = false;
}
function applySave(s) {
  if (!s) return;
  state.clues = new Set(s.clues || []);
  state.fragments = s.fragments || 0;
  state.hasKey = !!s.hasKey;
  state.cabinetSolved = !!s.cabinetSolved;
  state.memories = s.memories || [];
  state.finished = !!s.finished;
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
function continueGame() { applySave(loadSave()); enterRoom(false); }
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
    if (state.cabinetSolved) {
      if (!state.hasKey) {
        state.hasKey = true; state.fragments++;
        state.memories.push("frag1");
        state.pendingMemory = "frag1"; // 关闭弹窗后触发闪回
        updateHUD(); saveGame();
        playSfx("clunk");
        showToast("获得：黄铜钥匙　+　第一段记忆碎片", 3200);
        showPopup(OBJ + "cabinet_open.jpg", "金属柜 — 已打开",
          "柜门缓缓滑开。里面躺着一把黄铜钥匙，和一张褪色的照片——\n照片上的日期，竟然是明天。这怎么可能？");
      } else {
        // 已取走钥匙：空柜子（同角度侧光版，空挂钩对上"钥匙已拿走"）
        playSfx("click");
        showPopup(OBJ + "cabinet_empty.jpg", "金属柜 — 已空",
          "柜子空了。\n钥匙和那张照片，都被你拿走了。\n只剩锈迹，和一圈落灰的印子。");
      }
    } else {
      playSfx("keytap");
      showKeypad();
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
  if (state.pendingMemory) {
    const id = state.pendingMemory; state.pendingMemory = null;
    setTimeout(() => showMemory(MEMORIES[id]), 320);
  }
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
function closeMemory() {
  clearInterval(memTimer);
  memFlash.classList.remove("show");
  setTimeout(() => memFlash.classList.add("hidden"), 520);
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
  state.finished = true; saveGame();
  playSfx("door");
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
