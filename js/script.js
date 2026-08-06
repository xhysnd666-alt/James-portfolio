/* ============================================================
   谢涵羽 · 玩家档案 —— 交互脚本
   修改内容请看:
   1. CONFIG(联系方式 / 简历二维码地址)
   2. SKILLS(雷达图)
   3. WORKS(作品集)
   4. QUIZ(游戏人格测试)
   ============================================================ */

/* ---------- 1. 全局配置:改这里 ---------- */
const CONFIG = {
  // 部署后改成你的简历直链,二维码会自动更新。
  // 例如:https://你的用户名.github.io/你的仓库名/assets/resume.pdf
  RESUME_URL: "https://xhysnd666-alt.github.io/James-portfolio/assets/resume.pdf",
  EMAIL: "2207861396@qq.com",
  PHONE: "159-5957-6658",
  PHONE_TEL: "+8615959576658"
};

/* ---------- 工具函数 ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------- 2. 8-bit 音效(可选) ---------- */
let soundOn = localStorage.getItem("xyh-sound") !== "0";
let audioCtx = null;

function playBlip(freq = 440, dur = 0.09, type = "square", vol = 0.04) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {
    /* 忽略音频错误 */
  }
}

function initSound() {
  const btn = $("#soundToggle");
  if (!btn) return;
  const render = () => {
    btn.textContent = soundOn ? "♪ 音效:开" : "♪ 音效:关";
    btn.setAttribute("aria-pressed", String(soundOn));
  };
  render();
  btn.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem("xyh-sound", soundOn ? "1" : "0");
    render();
    if (soundOn) {
      playBlip(660, 0.12);
      startMusic();
    } else {
      stopMusic();
    }
  });
}

/* 给主要按钮加上小音效 */
function addButtonSounds() {
  $$("a.btn, button").forEach((el) => {
    el.addEventListener("mouseenter", () => playBlip(520, 0.05, "square", 0.02));
    el.addEventListener("click", () => playBlip(700, 0.07, "square", 0.025));
  });
}

/* ---------- 3. 星空背景 ---------- */
function drawSpriteOn(ctx, sprite, x, y, scale, sx = 1) {
  const rows = sprite.rows;
  const cols = rows[0].length;
  const half = (cols * (1 - sx)) / 2;
  rows.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      if (ch === ".") return;
      if (rx < half || rx >= cols - half) return;
      ctx.fillStyle = (sprite.colors && sprite.colors[ch]) || sprite.color || "#fff";
      ctx.fillRect(Math.floor(x + rx * scale), Math.floor(y + ry * scale), scale, scale);
    });
  });
}

const DROP_MUSHROOMS = {
  normal: {
    colors: { R: "#ff4b4b", W: "#ffffff", E: "#20243c", M: "#20243c" },
    rows: [
      "....RRRR....",
      "..RRRRRRRR..",
      ".RRRWRRWRRR.",
      ".RRRRRRRRRR.",
      "..RRRRRRRR..",
      "...WWWWWW...",
      "..WWWWWWWW..",
      "..WEWWWWEW..",
      "..WWWWMMWW..",
      "...WWWWWW...",
      "....WWWW...."
    ]
  },
  poison: {
    colors: { P: "#8e44ad", W: "#e6d9f2", E: "#20243c", M: "#20243c" },
    rows: [
      "....PPPP....",
      "..PPPPPPPP..",
      ".PPPWPPWPPP.",
      ".PPPPPPPPPP.",
      "..PPPPPPPP..",
      "...WWWWWW...",
      "..WWWWWWWW..",
      "..WEWWWWEW..",
      "..WWWWMMWW..",
      "...WWWWWW...",
      "....WWWW...."
    ]
  },
  gold: {
    colors: { G: "#f5b301", L: "#ffe6a0", W: "#ffffff", E: "#20243c", M: "#20243c" },
    rows: [
      "....GGGG....",
      "..GGGGGGGG..",
      ".GGGLGGLGGG.",
      ".GGGGGGGGGG.",
      "..GGGGGGGG..",
      "...WWWWWW...",
      "..WWWWWWWW..",
      "..WEWWWWEW..",
      "..WWWWMMWW..",
      "...WWWWWW...",
      "....WWWW...."
    ]
  }
};

function initStarfield() {
  const canvas = $("#starfield");
  if (!canvas) return;
  const hero = document.querySelector("#hero");
  const heroCard = document.querySelector(".hero-card");
  const ctx = canvas.getContext("2d");
  const itemCanvas = document.createElement("canvas");
  itemCanvas.id = "itemFx";
  document.body.appendChild(itemCanvas);
  const ctx2 = itemCanvas.getContext("2d");
  let clouds = [];
  let items = [];
  let bricks = [];
  let popups = [];
  let activeBlock = null;
  let blockCooldown = 90;
  let airships = [];
  let airshipTimer = 240;
  let airshipType = 0;
  let coinCount = 0;
  let mouseX = -9999;
  let mouseY = -9999;
  const coinEl = document.getElementById("coinCount");
  const TYPES = ["coin", "coin", "star"];

  function spriteFor(type) {
    if (type === "block") return BADGE_ICONS.question;
    if (type === "mushroom") return STICKER_SPRITES.mushroom;
    if (type === "star") return STICKER_SPRITES.star;
    return STICKER_SPRITES.coin;
  }

  function randomType() {
    return TYPES[Math.floor(Math.random() * TYPES.length)];
  }

  function coinBand() {
    const cardLeft = (canvas.width - 760) / 2;
    const cardRight = cardLeft + 760;
    const leftMax = cardLeft - 44;
    const rightMin = cardRight + 44;
    const bands = [];
    if (leftMax >= 40) bands.push([20, leftMax]);
    if (rightMin <= canvas.width - 20) bands.push([rightMin, canvas.width - 20]);
    if (!bands.length) return null;
    const b = bands[Math.floor(Math.random() * bands.length)];
    return b[0] + Math.random() * (b[1] - b[0]);
  }

  function fallSpeed(type) {
    if (type === "coin") return 1.2 + Math.random() * 0.8;
    return 0.9 + Math.random() * 0.6;
  }

  function spawnItem(fromTop) {
    const type = randomType();
    const x = coinBand();
    if (x === null) {
      return { type: type, x: 0, y: -40, vy: 1, phase: 0, amp: 0, swaySpeed: 0.02, timer: 60, bounce: 0 };
    }
    return {
      type: type,
      x: x,
      y: fromTop ? -40 : Math.random() * 200,
      vy: fallSpeed(type),
      phase: Math.random() * Math.PI * 2,
      amp: 6 + Math.random() * 10,
      swaySpeed: 0.012 + Math.random() * 0.014,
      timer: fromTop ? 0 : Math.floor(Math.random() * 300),
      bounce: 0
    };
  }

  function respawnTop(it) {
    const x = coinBand();
    if (x === null) {
      it.timer = 60;
      return;
    }
    it.type = randomType();
    it.x = x;
    it.y = -40;
    it.vy = fallSpeed(it.type);
    it.phase = Math.random() * Math.PI * 2;
    it.amp = 6 + Math.random() * 10;
    it.swaySpeed = 0.012 + Math.random() * 0.014;
    it.bounce = 0;
    it.timer = 0;
  }

  function blockPos() {
    if (!hero || !heroCard) return null;
    const hr = hero.getBoundingClientRect();
    const hc = heroCard.getBoundingClientRect();
    const w = canvas.width;
    const size = 36;
    const bands = [];
    const sideY0 = Math.max(hr.top + 10, 10);
    const sideY1 = Math.min(hc.bottom, hr.bottom) - size;
    if (hc.left - 44 > 48) {
      bands.push({ x0: 48, x1: hc.left - 44, y0: sideY0, y1: sideY1 });
    }
    if (hc.right + 44 < w - 48) {
      bands.push({ x0: hc.right + 44, x1: w - 48 - size, y0: sideY0, y1: sideY1 });
    }
    if (hc.top - 56 > hr.top + 8) {
      bands.push({ x0: 12, x1: w - 12 - size, y0: hr.top + 8, y1: hc.top - 56 });
    }
    if (hc.bottom + 56 < hr.bottom - 8) {
      bands.push({ x0: 12, x1: w - 12 - size, y0: hc.bottom + 56, y1: hr.bottom - 8 - size });
    }
    const valid = bands.filter((b) => b.x1 >= b.x0 && b.y1 >= b.y0);
    if (!valid.length) return null;
    const b = valid[Math.floor(Math.random() * valid.length)];
    return { x: b.x0 + Math.random() * (b.x1 - b.x0), y: b.y0 + Math.random() * (b.y1 - b.y0) };
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    itemCanvas.width = window.innerWidth;
    itemCanvas.height = window.innerHeight;
    const n = Math.max(6, Math.floor(window.innerWidth / 180));
    clouds = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.55 + 20,
      w: 40 + Math.random() * 60,
      phase: Math.random() * Math.PI * 2,
      v: 0.15 + Math.random() * 0.3,
      base: 0
    }));
    clouds.forEach((c) => { c.base = c.v; });
    const m = Math.max(5, Math.floor(window.innerWidth / 190) + Math.floor(Math.random() * 4));
    items = Array.from({ length: m }, () => spawnItem(false));
    const contentW = Math.min(canvas.width * 0.92, 1080);
    const contentLeft = (canvas.width - contentW) / 2;
    const contentRight = contentLeft + contentW;
    const leftMax = contentLeft - 44;
    const rightMin = contentRight + 44;
    bricks = [];
    const brickYs = [0.12, 0.26, 0.42, 0.58, 0.72];
    brickYs.forEach((fy, i) => {
      const y = canvas.height * fy;
      if (i % 2 === 0 && leftMax >= 60) {
        bricks.push({ x: 8 + Math.random() * (leftMax - 8), y: y });
      } else if (rightMin <= canvas.width - 8) {
        bricks.push({ x: rightMin + Math.random() * (canvas.width - 8 - rightMin), y: y });
      }
    });
  }

  function drawCloud(c, t) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    const w = c.w;
    const h = Math.max(8, Math.floor(w * 0.3));
    const x = c.x;
    const y = c.y + Math.sin(t * 0.3 + c.phase) * 3;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), h);
    ctx.fillRect(Math.floor(x + w * 0.18), Math.floor(y - h * 0.5), Math.floor(w * 0.3), Math.floor(h * 0.5));
    ctx.fillRect(Math.floor(x + w * 0.55), Math.floor(y - h * 0.45), Math.floor(w * 0.3), Math.floor(h * 0.45));
  }

  function drawBricks() {
    ctx.globalAlpha = 0.92;
    bricks.forEach((b) => {
      const x = b.x;
      const y = b.y;
      const s = 12;
      for (let r = 0; r < 2; r++) {
        for (let ci = 0; ci < 3; ci++) {
          ctx.fillStyle = "#c97b3f";
          ctx.fillRect(Math.floor(x + ci * s), Math.floor(y + r * s), s, s);
          ctx.fillStyle = "#8f5326";
          ctx.fillRect(Math.floor(x + ci * s), Math.floor(y + r * s), s, 2);
          ctx.fillRect(Math.floor(x + ci * s + s - 2), Math.floor(y + r * s), 2, s);
        }
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawItem(it, t) {
    const sprite = spriteFor(it.type);
    const scale = 2;
    const sway = Math.sin(t * it.swaySpeed + it.phase) * it.amp * 0.4;
    const sx = it.type === "coin" ? 0.25 + 0.75 * Math.abs(Math.cos(t * 0.08 + it.phase)) : 1;
    drawSpriteOn(
      ctx2,
      sprite,
      Math.floor(it.x + sway - (sprite.rows[0].length * scale) / 2),
      Math.floor(it.y - (sprite.rows.length * scale) / 2),
      scale,
      sx
    );
  }

  function drawBlock(t) {
    const sprite = BADGE_ICONS.question;
    let dy = 0;
    if (activeBlock.bounce > 0) {
      dy = -Math.sin(((12 - activeBlock.bounce) / 12) * Math.PI) * 10;
      activeBlock.bounce--;
    }
    drawSpriteOn(ctx2, sprite, Math.floor(activeBlock.x - 16), Math.floor(activeBlock.y - 16 + dy), 2);
  }

  function drawAirship(a, t) {
    const x = a.x;
    const y = a.y + Math.sin(t * 0.05 + a.phase) * 3;
    const p = Math.sin(t * 0.4 + a.phase) * 4;
    if (a.type === 1) {
      ctx.fillStyle = "#e60012";
      ctx.fillRect(Math.floor(x - 18), Math.floor(y - 8), 36, 10);
      ctx.fillRect(Math.floor(x - 13), Math.floor(y - 14), 26, 6);
      ctx.fillRect(Math.floor(x - 8), Math.floor(y - 18), 16, 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.floor(x - 10), Math.floor(y - 12), 5, 5);
      ctx.fillRect(Math.floor(x + 5), Math.floor(y - 10), 5, 5);
      ctx.fillStyle = "#d9a066";
      ctx.fillRect(Math.floor(x - 9), Math.floor(y + 2), 18, 8);
      ctx.fillStyle = "#8f5326";
      ctx.fillRect(Math.floor(x - 7), Math.floor(y + 10), 14, 6);
      ctx.fillStyle = "#1d2536";
      ctx.fillRect(Math.floor(x - 32 + p), Math.floor(y - 4), 4, 8);
      ctx.fillRect(Math.floor(x + 28 - p), Math.floor(y - 4), 4, 8);
      return;
    }
    if (a.type === 2) {
      ctx.fillStyle = "#1d2536";
      ctx.fillRect(Math.floor(x - 20), Math.floor(y - 10), 40, 24);
      ctx.fillStyle = "#f6a43b";
      ctx.fillRect(Math.floor(x - 17), Math.floor(y - 7), 34, 18);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.floor(x - 4), Math.floor(y - 5), 2, 6);
      ctx.fillRect(Math.floor(x - 2), Math.floor(y - 7), 6, 2);
      ctx.fillRect(Math.floor(x - 6), Math.floor(y - 2), 2, 2);
      ctx.fillRect(Math.floor(x + 4), Math.floor(y + 1), 2, 4);
      ctx.fillStyle = "#8f5326";
      ctx.fillRect(Math.floor(x - 7), Math.floor(y + 14), 14, 6);
      ctx.fillStyle = "#1d2536";
      ctx.fillRect(Math.floor(x - 32 + p), Math.floor(y - 2), 4, 8);
      ctx.fillRect(Math.floor(x + 28 - p), Math.floor(y - 2), 4, 8);
      return;
    }
    ctx.fillStyle = "#e60012";
    ctx.fillRect(Math.floor(x - 26), Math.floor(y - 10), 52, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.floor(x - 12), Math.floor(y - 8), 24, 14);
    ctx.fillStyle = "#c97b3f";
    ctx.fillRect(Math.floor(x - 8), Math.floor(y + 8), 16, 8);
    ctx.fillStyle = "#1d2536";
    ctx.fillRect(Math.floor(x - 4), Math.floor(y + 16), 8, 2);
    ctx.fillStyle = "#1d2536";
    ctx.fillRect(Math.floor(x - 32 + p), Math.floor(y - 4), 4, 8);
    ctx.fillRect(Math.floor(x + 28 - p), Math.floor(y - 4), 4, 8);
  }

  function drawPopups() {
    popups.forEach((p) => {
      p.vy += p.gravity || 0;
      p.y += p.vy;
      p.life--;
      if (p.text) {
        ctx2.globalAlpha = Math.min(1, p.life / 40);
        ctx2.font = '12px "Press Start 2P", monospace';
        ctx2.lineWidth = 3;
        ctx2.strokeStyle = "#1d2536";
        ctx2.strokeText(p.text, Math.floor(p.x), Math.floor(p.y));
        ctx2.fillStyle = "#f5b301";
        ctx2.fillText(p.text, Math.floor(p.x), Math.floor(p.y));
        ctx2.globalAlpha = 1;
      } else if (p.type === "mushroom") {
        const sprite = DROP_MUSHROOMS[p.drop] || DROP_MUSHROOMS.normal;
        drawSpriteOn(ctx2, sprite, Math.floor(p.x - 12), Math.floor(p.y - 12), 2);
      }
    });
    popups = popups.filter((p) => p.life > 0);
  }

  function collect(x, y) {
    coinCount++;
    if (coinEl) coinEl.textContent = coinCount;
    popups.push({ x: x, y: y, text: "+1", vy: -1.1, life: 50 });
    playBlip(880, 0.08, "square", 0.035);
  }

  function loop(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx2.clearRect(0, 0, itemCanvas.width, itemCanvas.height);
    drawBricks();
    clouds.forEach((c) => {
      if (mouseX >= c.x - 10 && mouseX <= c.x + c.w + 10 && mouseY >= c.y - 24 && mouseY <= c.y + 16) {
        c.v = Math.min(1.8, c.v + 0.08);
      } else {
        c.v = Math.max(c.base, c.v - 0.03);
      }
      c.x += c.v;
      if (c.x > canvas.width + c.w) c.x = -c.w;
      drawCloud(c, t);
    });
    const hr = hero ? hero.getBoundingClientRect() : null;
    const visible = hr && hr.bottom > 0 && hr.top < window.innerHeight;
    if (visible) {
      items.forEach((it) => {
        if (it.timer > 0) {
          it.timer--;
          if (it.timer === 0) respawnTop(it);
          return;
        }
        it.y += it.vy;
        if (it.y > hr.bottom + 60) {
          it.timer = 120 + Math.floor(Math.random() * 240);
          return;
        }
        drawItem(it, t);
      });
      if (!activeBlock && blockCooldown <= 0) {
        const pos = blockPos();
        if (pos) {
          activeBlock = { x: pos.x, y: pos.y, life: 180, bounce: 0, phase: Math.random() * Math.PI * 2 };
        } else {
          blockCooldown = 30;
        }
      }
      if (activeBlock) {
        activeBlock.life--;
        drawBlock(t);
        if (activeBlock.life <= 0) {
          activeBlock = null;
          blockCooldown = Math.floor(Math.random() * 120);
        }
      } else {
        blockCooldown--;
      }
      if (airships.length < 2 && airshipTimer <= 0) {
        airships.push({
          type: airshipType,
          x: Math.random() < 0.5 ? -60 : canvas.width + 60,
          y: 90 + Math.random() * canvas.height * 0.22,
          dir: Math.random() < 0.5 ? 1 : -1,
          v: 1.2 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2
        });
        airshipType = (airshipType + 1) % 3;
        airshipTimer = 300 + Math.floor(Math.random() * 300);
      }
      airships.forEach((a) => {
        a.x += a.v * a.dir;
        drawAirship(a, t);
      });
      airships = airships.filter((a) => !((a.dir === 1 && a.x > canvas.width + 80) || (a.dir === -1 && a.x < -80)));
      if (airships.length < 2) {
        airshipTimer--;
      }
      drawPopups();
    }
    if (!prefersReducedMotion()) requestAnimationFrame(loop);
  }

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("a, button, canvas, input, .modal, .stat-modal")) return;
    const px = e.clientX;
    const py = e.clientY;
    const hr = hero ? hero.getBoundingClientRect() : null;
    const visible = hr && hr.bottom > 0 && hr.top < window.innerHeight;
    if (!visible) return;
    for (const it of items) {
      if (it.timer > 0) continue;
      const sprite = spriteFor(it.type);
      const scale = 2;
      const w = sprite.rows[0].length * scale;
      const h = sprite.rows.length * scale;
      const sway = Math.sin(performance.now() * it.swaySpeed + it.phase) * it.amp * 0.4;
      const cx = it.x + sway;
      if (Math.abs(px - cx) <= w / 2 + 10 && Math.abs(py - it.y) <= h / 2 + 10) {
        e.preventDefault();
        e.stopPropagation();
        it.timer = 240;
        collect(px, py - 20);
        break;
      }
    }
    if (activeBlock && Math.abs(px - activeBlock.x) <= 26 && Math.abs(py - activeBlock.y) <= 26) {
      e.preventDefault();
      e.stopPropagation();
      activeBlock.bounce = 12;
      activeBlock.life = 18;
      const drops = ["normal", "poison", "gold"];
      popups.push({
        x: activeBlock.x,
        y: activeBlock.y - 20,
        vy: -2.4,
        gravity: 0.09,
        life: 110,
        type: "mushroom",
        drop: drops[Math.floor(Math.random() * drops.length)]
      });
      collect(px, py - 20);
    }
  }, true);

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(loop);
}

/* ---------- 4. 像素头像 ---------- */
const AVATAR_PALETTE = {
  H: "#3d3330",
  L: "#6d5a4d",
  S: "#ffe0c2",
  G: "#2d3a52",
  E: "#23202b",
  W: "#ffffff",
  B: "#ffb9a8",
  M: "#c96a78",
  T: "#e9edf2",
  A: "#f7c9a8",
  Y: "#ffd34d"
};

const AVATAR_BASE = [
  "................",
  "...HHHHHHHHHH...",
  "..HHLLHHHHLLHH..",
  "..HHHHHSSHHHHH..",
  "..HHSSSSSSSSHH..",
  ".HHSSSSSSSSSSHH.",
  ".HHGGGGGGGGGGHH.",
  ".HHGSWSGSWSGSHH.",
  ".HHGSESGSESGSHH.",
  ".HHGGGGGGGGGGHH.",
  "..HSSBSSSSBSSH..",
  "..HSSSMMMMSSSH..",
  "..SSSSSSSSSSSS..",
  "...TTTYYYTTTT...",
  "..AATTTTTTTTAA..",
  "...ATTTTTTTTA..."
];

function avatarWith(overrides) {
  return AVATAR_BASE.map((row, i) => overrides[i] || row);
}

const AVATAR_FRAMES = {
  normal: AVATAR_BASE,
  blink: avatarWith({
    7: ".HHGSSSGSSSGSHH.",
    8: ".HHGSSSGSSSGSHH."
  }),
  happy: avatarWith({
    8: ".HHGSWSGSWSGSHH.",
    11: "..HSSMMMMMMSSH.."
  }),
  laugh: avatarWith({
    7: ".HHGSSSGSSSGSHH.",
    8: ".HHGSSSGSSSGSHH.",
    11: "..HSSMMMMMMSSH..",
    12: "..SSSSWWWWWSSS.."
  }),
  wave: avatarWith({
    6: ".HHGGGGGGGGGGHHA",
    7: ".HHGSWSGSWSGSHHA",
    8: ".HHGSWSGSWSGSHHA",
    11: "..HSSMMMMMMSSH.."
  }),
  dizzy: avatarWith({
    0: "......Y..Y......",
    7: ".HHGKSKGKSKGSHH.",
    8: ".HHGKSKGKSKGSHH."
  }),
  lift: avatarWith({
    7: ".HHGSWSGSWSGSHH.",
    8: ".HHGSWSGSWSGSHH.",
    11: "..HSSSKKKKSSSH.."
  })
};

function withLook(rows, look) {
  if (!look) return rows;
  const copy = rows.slice();
  const r7 = copy[7].split("");
  const r8 = copy[8].split("");
  const eye8 = [copy[8][5], copy[8][9]];
  [5, 9].forEach((pos, i) => {
    r7[pos] = "S";
    r8[pos] = "S";
    const np = pos + look;
    r7[np] = "W";
    r8[np] = (eye8[i] === "W" || eye8[i] === "E") ? eye8[i] : "E";
  });
  copy[7] = r7.join("");
  copy[8] = r8.join("");
  return copy;
}

function drawPixelAvatar(canvas, frame = "normal", look = 0) {
  let rows = AVATAR_FRAMES[frame] || AVATAR_BASE;
  if (["normal", "happy", "wave"].includes(frame)) rows = withLook(rows, look);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const scale = canvas.width / rows[0].length;
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = AVATAR_PALETTE[ch] || "#fff";
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
}

/* ---------- 5. 打字机 ---------- */
function initTypewriter() {
  const el = $("#typewriter");
  if (!el) return;
  const lines = [
    "你好!我是谢涵羽 👋",
    "一个玩 10 年游戏的心理系玩家 🎮",
    "懂玩家、懂数据、也懂怎么把事讲明白 ✨",
    "正在秋招,想投身游戏领域 🚀"
  ];
  if (prefersReducedMotion()) {
    el.textContent = lines[0];
    return;
  }

  let lineIdx = 0;
  let charIdx = 0;
  let deleting = false;

  function tick() {
    const line = lines[lineIdx];
    if (!deleting) {
      charIdx++;
      el.textContent = line.slice(0, charIdx);
      if (charIdx === line.length) {
        deleting = true;
        setTimeout(tick, 1600);
        return;
      }
      setTimeout(tick, 55);
    } else {
      charIdx--;
      el.textContent = line.slice(0, charIdx);
      if (charIdx === 0) {
        deleting = false;
        lineIdx = (lineIdx + 1) % lines.length;
      }
      setTimeout(tick, 22);
    }
  }
  setTimeout(tick, 500);
}

/* ---------- 6. 导航 ---------- */
function initNav() {
  const toggle = $("#navToggle");
  const menu = $("#navMenu");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- 7. 滚动出现 + 数字动效 ---------- */
function initRevealAndCounters() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        countIO.unobserve(el);
        const target = Number(el.dataset.count || 0);
        const suffix = el.dataset.suffix || "";
        const dur = 1400;
        const start = performance.now();
        function step(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased).toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target.toLocaleString() + suffix;
        }
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.4 }
  );
  $$(".count").forEach((el) => countIO.observe(el));
}

/* ---------- 8. 技能雷达图 ---------- */
const SKILLS = [
  { name: "数据分析", value: 82, desc: "熟练使用 SPSS、Excel、JASP 完成数据清洗、可视化与统计分析。心理实验赛项目中负责全流程数据处理。" },
  { name: "问卷调研", value: 86, desc: "掌握问卷星、Credamo 等平台,独立完成从题目设计、信效度检验到施测回收的完整流程。" },
  { name: "内容创作", value: 88, desc: "8 篇原创心理科普推文累计阅读量 5000+,擅长把专业知识讲得有趣。" },
  { name: "沟通表达", value: 90, desc: "主讲 8+ 节心理课、访谈 50+ 位游戏行业从业者、日均有效沟通 18 人——从课堂到职场都能控场。" },
  { name: "AI 应用", value: 80, desc: "日常使用 ChatGPT / Claude / Gemini 等 AI 提效,自学 Vibe Coding,能独立用 AI 完成海报、文案与轻量编程。" },
  { name: "游戏认知", value: 92, desc: "10 年端手游双修,6000+ 小时、160+ 库存;作为猎头深度研究过米哈游、腾讯、鹰角的运营岗位与业务场景。" }
];

function initRadar() {
  const svg = $("#radarSvg");
  const titleEl = $("#radarTitle");
  const textEl = $("#radarText");
  if (!svg || !titleEl || !textEl) return;

  const W = 300;
  const CX = 150;
  const CY = 150;
  const R = 92;
  const NS = SKILLS.length;

  const ns = "http://www.w3.org/2000/svg";
  function polyPoints(scale) {
    return SKILLS.map((s, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / NS;
      const r = R * scale;
      return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
    }).join(" ");
  }

  // 网格
  for (let ring = 1; ring <= 4; ring++) {
    const poly = document.createElementNS(ns, "polygon");
    poly.setAttribute("points", polyPoints(ring / 4));
    poly.setAttribute("class", "grid-poly");
    svg.appendChild(poly);
  }

  // 轴线 + 标签
  SKILLS.forEach((s, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / NS;
    const x = CX + R * Math.cos(angle);
    const y = CY + R * Math.sin(angle);
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", CX);
    line.setAttribute("y1", CY);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.setAttribute("class", "axis-line");
    svg.appendChild(line);

    const lx = CX + (R + 24) * Math.cos(angle);
    const ly = CY + (R + 24) * Math.sin(angle);
    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", lx);
    label.setAttribute("y", ly + 5);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "axis-label");
    label.setAttribute("data-index", i);
    label.textContent = s.name;
    svg.appendChild(label);
  });

  // 数据区域
  const area = document.createElementNS(ns, "polygon");
  area.setAttribute("points", polyPoints(1));
  area.setAttribute("class", "radar-area");
  svg.appendChild(area);

  SKILLS.forEach((s, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / NS;
    const r = R * (s.value / 100);
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", CX + r * Math.cos(angle));
    dot.setAttribute("cy", CY + r * Math.sin(angle));
    dot.setAttribute("r", 4.5);
    dot.setAttribute("class", "radar-dot");
    svg.appendChild(dot);
  });

  // 点击标签显示详情
  const labels = $$("#radarSvg .axis-label");
  function showSkill(i) {
    const s = SKILLS[i];
    titleEl.textContent = `${s.name} · ${s.value}/100`;
    textEl.textContent = s.desc;
    labels.forEach((l) => l.classList.toggle("active", Number(l.dataset.index) === i));
    playBlip(600, 0.06, "square", 0.02);
  }
  labels.forEach((l) => l.addEventListener("click", () => showSkill(Number(l.dataset.index))));
  showSkill(0);
}

/* ---------- 9. ???? ---------- */
const TAGS = [
  { name: "ChatGPT", cat: "ai", lv: 5, desc: "文案、调研与工作流提效" },
  { name: "Claude", cat: "ai", lv: 4, desc: "长文写作与代码辅助" },
  { name: "Gemini", cat: "ai", lv: 4, desc: "多模态信息处理与检索" },
  { name: "Codex", cat: "ai", lv: 5, desc: "自主完成网站搭建与轻量编程任务" },
  { name: "Vibe Coding", cat: "ai", lv: 3, desc: "用 AI 自主完成轻量编程" },
  { name: "Midjourney", cat: "content", lv: 4, desc: "海报与视觉素材生成" },
  { name: "SPSS", cat: "data", lv: 4, desc: "实验赛数据清洗与统计分析" },
  { name: "Excel", cat: "data", lv: 4, desc: "数据整理、清洗与可视化" },
  { name: "JASP", cat: "data", lv: 3, desc: "统计检验与探索性分析" },
  { name: "问卷星", cat: "data", lv: 4, desc: "问卷设计与在线施测" },
  { name: "Credamo", cat: "data", lv: 3, desc: "在线实验与问卷回收" },
  { name: "Office 相关软件", cat: "office", lv: 4, desc: "Word / PPT / WPS 文档与演示" },
  { name: "剪影专业版", cat: "content", lv: 4, desc: "Vlog 剪辑与视频制作" }
];

function initTags() {
  const cloud = $("#tagCloud");
  if (!cloud) return;
  const loadout = $("#skillLoadout");
  const equipped = [];

  function renderLoadout() {
    if (!loadout) return;
    loadout.innerHTML = "";
    if (!equipped.length) {
      loadout.innerHTML = '<span class="loadout-empty">' + "点击下方技能进行装备" + '</span>';
      return;
    }
    equipped.forEach((name) => {
      const s = document.createElement("span");
      s.className = "loadout-item";
      s.textContent = name;
      s.addEventListener("click", () => {
        const idx = equipped.indexOf(name);
        if (idx > -1) equipped.splice(idx, 1);
        cloud.querySelectorAll(".skill-tag").forEach((tag) => {
          const ne = tag.querySelector(".skill-name");
          if (ne && ne.textContent === name) tag.classList.remove("equipped");
        });
        renderLoadout();
        playBlip(520, 0.06, "square", 0.02);
      });
      loadout.appendChild(s);
    });
  }

  function toggleEquip(tag) {
    const nameEl = tag.querySelector(".skill-name");
    if (!nameEl) return;
    const name = nameEl.textContent;
    const idx = equipped.indexOf(name);
    if (idx > -1) {
      equipped.splice(idx, 1);
      tag.classList.remove("equipped");
    } else {
      if (equipped.length >= 3) return;
      equipped.push(name);
      tag.classList.add("equipped");
    }
    renderLoadout();
    playBlip(760, 0.07, "square", 0.025);
  }

  TAGS.forEach((t, i) => {
    const span = document.createElement("span");
    span.className = `skill-tag cat-${t.cat}`;
    span.setAttribute("data-desc", t.desc);
    span.innerHTML = `<span class="skill-tip">${t.desc}</span><span class="skill-name">${t.name}</span><span class="skill-lv">${"<i></i>".repeat(5)}</span>`;
    const cells = span.querySelectorAll(".skill-lv i");
    cells.forEach((c, j) => {
      if (j < t.lv) c.classList.add("on");
    });
    span.addEventListener("click", () => toggleEquip(span));
    cloud.appendChild(span);
  });

  renderLoadout();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const tags = cloud.querySelectorAll(".skill-tag");
        tags.forEach((tag, i) => {
          setTimeout(() => {
            tag.classList.add("lit");
            playBlip(500 + i * 25, 0.05, "square", 0.02);
          }, 80 + i * 70);
        });
      });
    },
    { threshold: 0.3 }
  );
  io.observe(cloud);
}

/* ---------- 10. 作品集(占位卡片) ---------- */
const WORKS = [
  {
    icon: "📝",
    title: "心理健康科普推文",
    meta: "原创科普内容 · 8 篇",
    desc: "围绕情绪管理、亲子沟通、青少年心理等主题,输出 8 篇原创科普内容,累计阅读量 5000+,独立管理 200+ 人社群并持续互动。",
    note: "占位卡片:建议替换为推文长图截图或文章链接。"
  },
  {
    icon: "🎨",
    title: "AI 宣传海报设计",
    meta: "Midjourney 等 AI 工具 · 10+ 份",
    desc: "在心理辅导站实习期间,独立使用 ChatGPT + Midjourney 完成 10 余份宣传海报与文案设计,帮助机构扩大线上传播。",
    note: "占位卡片:建议替换为海报成品图(可放 2~3 张拼图)。"
  },
  {
    icon: "🧑‍🏫",
    title: "青少年心理课程",
    meta: "8+ 节 · 覆盖 30+ 青少年",
    desc: "独立设计并主讲情绪管理、团队协作等主题心理课,从课件制作、课堂互动到现场控场全流程负责,获家长与学生高度评价。",
    note: "占位卡片:建议替换为课件截图或授课现场照片。"
  },
  {
    icon: "🧪",
    title: "心理与行为实验赛项目",
    meta: "全国三等奖 · 问卷 + 数据分析",
    desc: "全国大学生心理与行为在线实验精英赛三等奖。团队 4 人,主题「个体动机与行为转化路径」;本人负责问卷设计与 SPSS / JASP 数据清洗、可视化与统计分析。",
    note: "占位卡片:建议替换为报告封面、问卷截图或数据图表。"
  }
];

function initPortfolio() {
  const grid = $("#portGrid");
  const modal = $("#workModal");
  const content = $("#modalContent");
  const closeBtn = $("#modalClose");
  if (!grid || !modal || !content || !closeBtn) return;

  WORKS.forEach((w, i) => {
    const card = document.createElement("article");
    card.className = "card port-card reveal";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看作品:${w.title}`);
    card.innerHTML = `
      <div class="port-cover" aria-hidden="true">${w.icon}</div>
      <h3>${w.title}</h3>
      <p class="port-meta">${w.meta}</p>
      <p class="port-desc">${w.desc}</p>
      <span class="port-badge">占位 · 待替换</span>
    `;
    const open = () => {
      content.innerHTML = `
        <div class="modal-cover" aria-hidden="true">${w.icon}</div>
        <h3>${w.title}</h3>
        <p class="modal-meta">${w.meta}</p>
        <p>${w.desc}</p>
        <p class="modal-note">${w.note}</p>
      `;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      closeBtn.focus();
      playBlip(640, 0.08);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    grid.appendChild(card);
  });

  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

/* ---------- 11. Stroop 效应测试 ---------- */
const STROOP_COLORS = [
  { name: "红", css: "#ff5c7a", cls: "c-red" },
  { name: "蓝", css: "#3f8dff", cls: "c-blue" },
  { name: "绿", css: "#3ddc84", cls: "c-green" },
  { name: "黄", css: "#ffd34d", cls: "c-yellow" }
];

function initStroop() {
  const intro = $("#stroopIntro");
  const game = $("#stroopGame");
  const stats = $("#stroopStats");
  const startBtn = $("#stroopStart");
  const restartBtn = $("#stroopRestart");
  const wordEl = $("#stroopWord");
  const progressEl = $("#stroopProgress");
  const btnsWrap = $("#stroopBtns");
  if (!intro || !game || !stats || !startBtn || !restartBtn || !wordEl || !progressEl || !btnsWrap) return;

  const TOTAL = 8;
  let round = 0;
  let correct = 0;
  let times = [];
  let currentColor = 0;
  let startAt = 0;
  let locked = false;

  // 生成 4 个颜色按钮
  STROOP_COLORS.forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `color-btn ${c.cls}`;
    btn.dataset.color = c.name;
    btn.textContent = c.name;
    btn.addEventListener("click", () => answer(c.name));
    btnsWrap.appendChild(btn);
  });

  function nextRound() {
    round++;
    locked = false;
    const wordIdx = Math.floor(Math.random() * STROOP_COLORS.length);
    let colorIdx = Math.floor(Math.random() * STROOP_COLORS.length);
    if (colorIdx === wordIdx) colorIdx = (colorIdx + 1) % STROOP_COLORS.length;
    currentColor = colorIdx;
    wordEl.textContent = STROOP_COLORS[wordIdx].name;
    wordEl.style.color = STROOP_COLORS[colorIdx].css;
    progressEl.textContent = `第 ${round} / ${TOTAL} 题`;
    startAt = performance.now();
  }

  function answer(chosen) {
    if (locked) return;
    locked = true;
    const rt = Math.round(performance.now() - startAt);
    times.push(rt);
    const isRight = chosen === STROOP_COLORS[currentColor].name;
    if (isRight) {
      correct++;
      playBlip(880, 0.08, "square", 0.035);
    } else {
      wordEl.classList.add("wrong");
      playBlip(180, 0.15, "sawtooth", 0.04);
      setTimeout(() => wordEl.classList.remove("wrong"), 320);
    }
    setTimeout(() => {
      if (round >= TOTAL) {
        finish();
      } else {
        nextRound();
      }
    }, 420);
  }

  function finish() {
    game.hidden = true;
    stats.hidden = false;
    const acc = Math.round((correct / TOTAL) * 100);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    $("#stroopAcc").textContent = `${acc}%`;
    $("#stroopTime").textContent = `${avg}ms`;
    let comment;
    if (acc >= 90) comment = "🎉 抗干扰能力超强!你基本没被字义带偏——心理学实验设计者狂喜。";
    else if (acc >= 70) comment = "👍 很不错!人脑果然会下意识读字,你能坚持到这个正确率已经很能打了。";
    else comment = "😄 被 Stroop 效应拿捏了吧?完全正常——这正是我在课堂上学到的经典认知现象。";
    $("#stroopComment").textContent = comment;
    playBlip(1040, 0.1, "square", 0.035);
  }

  function reset() {
    round = 0;
    correct = 0;
    times = [];
    locked = false;
    game.hidden = true;
    stats.hidden = true;
    intro.hidden = false;
  }

  startBtn.addEventListener("click", () => {
    intro.hidden = true;
    game.hidden = false;
    nextRound();
  });
  restartBtn.addEventListener("click", () => {
    reset();
    intro.hidden = true;
    game.hidden = false;
    nextRound();
  });
}

/* ---------- 12. 游戏人格测试 ---------- */
const QUIZ_TYPES = {
  insight: {
    icon: "🔍",
    title: "洞察型玩家",
    desc: "你擅长从玩家反馈和社群声音里找到真问题,能把「大家觉得不舒服」翻译成「哪里需要优化」。",
    match: "真实匹配:管理 200+ 人社群、访谈 50+ 位游戏行业从业者、输出 8 篇阅读量 5000+ 的科普内容。"
  },
  strategy: {
    icon: "🎪",
    title: "策略型玩家",
    desc: "你享受拆解机制、设计体验,善于把一个点子变成能落地的方案,并调动大家一起完成。",
    match: "真实匹配:策划落地 8+ 场宿舍活动(含 Switch 挑战赛、电竞观影),从需求洞察到现场执行全程主导。"
  },
  data: {
    icon: "📊",
    title: "数据型玩家",
    desc: "你习惯用数据说话,先看指标再下判断,擅长从数字里找到优化的方向。",
    match: "真实匹配:心理实验赛中用 SPSS / JASP 完成数据清洗与分析;猎头实习中构建 300+ 人才地图、推动 2 枚 offer。"
  }
};

const QUIZ = [
  {
    q: "一款新游戏上线首周,你会优先做哪件事?",
    options: [
      { text: "去玩家社区刷反馈,看看大家在聊什么", type: "insight" },
      { text: "把新手引导和首周活动完整玩一遍,拆解设计", type: "strategy" },
      { text: "拉出次日留存和付费数据,先看大盘", type: "data" }
    ]
  },
  {
    q: "玩家吐槽活动「太肝了」,你的第一反应是?",
    options: [
      { text: "访谈几个真实玩家,弄清楚「肝」具体指什么", type: "insight" },
      { text: "研究别的游戏怎么平衡肝度与奖励,找可借鉴方案", type: "strategy" },
      { text: "对比活动前后活跃与流失数据,定位问题节点", type: "data" }
    ]
  },
  {
    q: "你更享受哪一类工作?",
    options: [
      { text: "写文案、做内容、和用户聊天互动", type: "insight" },
      { text: "策划活动、设计玩法、协调各方落地", type: "strategy" },
      { text: "做报表、跑数据、写分析结论", type: "data" }
    ]
  },
  {
    q: "团队让你快速了解一款你没玩过的游戏,你会?",
    options: [
      { text: "找资深玩家深聊,再亲自上手体验", type: "insight" },
      { text: "查攻略、看机制拆解,快速建立框架", type: "strategy" },
      { text: "看它的榜单表现、用户画像和竞品对比", type: "data" }
    ]
  },
  {
    q: "周末的你会更可能出现在哪里?",
    options: [
      { text: "逛游戏社区、刷二创、和网友讨论剧情", type: "insight" },
      { text: "打新游戏、研究玩法、和朋友开黑", type: "strategy" },
      { text: "看行业报告、拆解热门产品的数据", type: "data" }
    ]
  }
];

function initQuiz() {
  const intro = $("#quizIntro");
  const box = $("#quizBox");
  const result = $("#quizResult");
  const startBtn = $("#quizStart");
  const restartBtn = $("#quizRestart");
  const qEl = $("#quizQuestion");
  const optWrap = $("#quizOptions");
  const progressEl = $("#quizProgress");
  if (!intro || !box || !result || !startBtn || !restartBtn || !qEl || !optWrap || !progressEl) return;

  let idx = 0;
  let scores = { insight: 0, strategy: 0, data: 0 };

  function renderQuestion() {
    const item = QUIZ[idx];
    progressEl.textContent = `Q${idx + 1} / ${QUIZ.length}`;
    qEl.textContent = item.q;
    optWrap.innerHTML = "";
    item.options.forEach((opt, oi) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = `${"ABC"[oi]} · ${opt.text}`;
      btn.addEventListener("click", () => choose(btn, opt));
      optWrap.appendChild(btn);
    });
  }

  function choose(btn, opt) {
    $$(".quiz-option").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    scores[opt.type]++;
    playBlip(760, 0.07, "square", 0.03);
    setTimeout(() => {
      idx++;
      if (idx < QUIZ.length) {
        renderQuestion();
      } else {
        showResult();
      }
    }, 380);
  }

  function showResult() {
    box.hidden = true;
    result.hidden = false;
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const primary = QUIZ_TYPES[sorted[0][0]];
    $("#quizResultTitle").textContent = `${primary.icon} 你是「${primary.title}」`;
    $("#quizResultDesc").textContent = primary.desc;
    $("#quizResultMatch").textContent = primary.match;
    playBlip(1040, 0.12, "square", 0.04);
  }

  function reset() {
    idx = 0;
    scores = { insight: 0, strategy: 0, data: 0 };
    box.hidden = true;
    result.hidden = true;
    intro.hidden = false;
  }

  startBtn.addEventListener("click", () => {
    intro.hidden = true;
    box.hidden = false;
    renderQuestion();
  });
  restartBtn.addEventListener("click", reset);
}

/* ---------- 13. 简历二维码 ---------- */
function initQR() {
  const box = $("#qrBox");
  if (!box) return;
  if (typeof QRCode !== "undefined") {
    new QRCode(box, {
      text: CONFIG.RESUME_URL,
      width: 150,
      height: 150,
      colorDark: "#0c0e1e",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    box.textContent = "二维码组件未加载";
  }
}

/* ---------- 14. 复制联系方式 ---------- */
function initCopy() {
  const copyEmail = $("#copyEmail");
  const copyPhone = $("#copyPhone");

  async function copy(text, btn, label) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        ok = true;
      } catch (e2) {
        ok = false;
      }
      ta.remove();
    }
    const old = btn.textContent;
    btn.textContent = ok ? "已复制 ✓" : "复制失败,请手动复制";
    btn.classList.add("btn-primary");
    playBlip(880, 0.08);
    setTimeout(() => {
      btn.textContent = old;
      btn.classList.remove("btn-primary");
    }, 1600);
  }

  if (copyEmail) copyEmail.addEventListener("click", () => copy(CONFIG.EMAIL, copyEmail));
  if (copyPhone) copyPhone.addEventListener("click", () => copy(CONFIG.PHONE, copyPhone));
}

/* ---------- 15. 首页贴纸与动效 ---------- */
const STICKER_SPRITES = {
  gamepad: {
    color: "#ff4b4b",
    colors: { B: "#00d9ff", J: "#20243c", D: "#20243c" },
    rows: [
      "..RRR..BBB..",
      "..RJR..BDB..",
      "..RRR..BBB..",
      "..RRR..BDB..",
      "..RRR..BDB..",
      "..RRR..BBB..",
      "..RRR..BBB..",
      "..RRR..BBB..",
      "..RRR..BBB..",
      "..RRR..BBB..",
      "..RRR..BBB..",
      "..RRR..BBB.."
    ]
  },
  star: {
    color: "#ffd34d",
    colors: { E: "#20243c", M: "#20243c" },
    rows: [
      "......Y.....",
      ".....YYY....",
      "....YYYYY...",
      "...YYYYYYY..",
      "..YYYYYYYYY.",
      ".YYYEYYEYYY.",
      "..YYYYMMYY..",
      "...YYYYYYY..",
      "....YYYYY...",
      ".....YYY....",
      "......Y....."
    ]
  },
  heart: {
    color: "#ff4fa3",
    colors: { W: "#ffffff" },
    rows: [
      "....RR..RR..",
      "...RRRRRRRR.",
      "..RRWWWRRRR.",
      "..RRRRRRRRRR",
      "..RRRRRRRRRR",
      "...RRRRRRRR.",
      "....RRRRRR..",
      ".....RRRR...",
      "......RR...."
    ]
  },
  coin: {
    color: "#ffd34d",
    colors: { W: "#fff2b0" },
    rows: [
      "....CCCC....",
      "..CCCCCCCC..",
      ".CCCCCCCCCC.",
      ".CCCCWWCCCC.",
      ".CCCCWWCCCC.",
      ".CCCCCCCCCC.",
      "..CCCCCCCC..",
      "....CCCC...."
    ]
  },
  mushroom: {
    color: "#ff4b4b",
    colors: { W: "#ffffff", E: "#20243c", M: "#20243c" },
    rows: [
      "....RRRR....",
      "..RRRRRRRR..",
      ".RRRWRRWRRR.",
      ".RRRRRRRRRR.",
      "..RRRRRRRR..",
      "...WWWWWW...",
      "..WWWWWWWW..",
      "..WEWWWWEW..",
      "..WWWWMMWW..",
      "...WWWWWW...",
      "....WWWW...."
    ]
  }
};
function paintSticker(canvas, sprite) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  sprite.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = (sprite.colors && sprite.colors[ch]) || sprite.color || "#fff";
      ctx.fillRect(x, y, 1, 1);
    });
  });
}
function initStickers() {
  const items = [
    { sel: ".f1", key: "gamepad" },
    { sel: ".f2", key: "star" },
    { sel: ".f3", key: "heart" },
    { sel: ".f4", key: "coin" },
    { sel: ".f5", key: "mushroom" }
  ];
  items.forEach((it) => {
    const span = document.querySelector(it.sel);
    const sprite = STICKER_SPRITES[it.key];
    if (!span || !sprite) return;
    span.textContent = "";
    const c = document.createElement("canvas");
    c.width = 12;
    c.height = 12;
    paintSticker(c, sprite);
    span.appendChild(c);
  });
}

function initHeroFx() {
  const canvas = $("#heroFx");
  const hero = document.querySelector("#hero");
  if (!canvas || !hero || prefersReducedMotion()) return;
  const ctx = canvas.getContext("2d");
  const colors = ["#e60012", "#1f7fe8", "#f5b301", "#2f9e44", "#f25fa5"];
  let parts = [];

  function spawn(anywhere) {
    return {
      x: Math.random() * canvas.width,
      y: anywhere ? Math.random() * canvas.height : canvas.height + 12,
      s: Math.random() * 3 + 2,
      vy: -(Math.random() * 0.55 + 0.25),
      vx: (Math.random() - 0.5) * 0.25,
      c: colors[Math.floor(Math.random() * colors.length)],
      a: Math.random() * 0.45 + 0.25
    };
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.min(60, Math.max(28, Math.floor((canvas.width * canvas.height) / 32000)));
    parts = Array.from({ length: count }, () => spawn(true));
  }

  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -12) Object.assign(p, spawn(false));
      if (p.x < -12) p.x = canvas.width + 6;
      if (p.x > canvas.width + 12) p.x = -6;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.round(p.s), Math.round(p.s));
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(step);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(step);
}

/* ---------- 17. 各板块任天堂贴纸 ---------- */
function initSectionStickers() {
  const sections = document.querySelectorAll("section:not(#hero)");
  const keys = ["gamepad", "star", "heart", "coin", "mushroom"];
  const positions = ["pos1", "pos2", "pos3", "pos4", "pos5"];
  sections.forEach((section) => {
    const decor = document.createElement("div");
    decor.className = "section-decor";
    decor.setAttribute("aria-hidden", "true");
    keys.forEach((key, i) => {
      const span = document.createElement("span");
      span.className = `sticker ${positions[i]}`;
      const c = document.createElement("canvas");
      c.width = 12;
      c.height = 12;
      paintSticker(c, STICKER_SPRITES[key]);
      span.appendChild(c);
      decor.appendChild(span);
    });
    section.appendChild(decor);
  });
}

/* ---------- 16. 鼠标像素拖尾 ---------- */
function initTrail() {
  if (prefersReducedMotion()) return;
  const canvas = document.createElement("canvas");
  canvas.id = "trailFx";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const colors = ["#e60012", "#1f7fe8", "#f5b301", "#2f9e44", "#f25fa5"];
  let parts = [];
  let lastX = null;
  let lastY = null;
  let running = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function spawn(x, y) {
    parts.push({
      x: x + (Math.random() * 4 - 2),
      y: y + (Math.random() * 4 - 2),
      vx: (Math.random() - 0.5) * 1.6,
      vy: (Math.random() - 0.5) * 1.6 - 0.4,
      s: Math.random() * 4 + 2,
      life: 1,
      decay: 0.016 + Math.random() * 0.012,
      c: colors[Math.floor(Math.random() * colors.length)]
    });
    if (parts.length > 140) parts.shift();
  }

  document.addEventListener("mousemove", (e) => {
    if (lastX === null || Math.hypot(e.clientX - lastX, e.clientY - lastY) >= 7) {
      spawn(e.clientX, e.clientY);
      lastX = e.clientX;
      lastY = e.clientY;
      if (!running) {
        running = true;
        requestAnimationFrame(step);
      }
    }
  });

  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
    });
    parts = parts.filter((p) => p.life > 0);
    parts.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life) * 0.75;
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.round(p.s), Math.round(p.s));
    });
    ctx.globalAlpha = 1;
    if (parts.length) {
      requestAnimationFrame(step);
    } else {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

/* ---------- 18. 呀哈哈彩蛋 ---------- */
const KOROK_SPRITE = {
  colors: {
    L: "#58b94e",
    D: "#2f7d38",
    M: "#e0b27e",
    E: "#1d1b22",
    K: "#8a5a33",
    B: "#86c85a",
    S: "#5d9c3d"
  },
  rows: [
    ".......L........",
    "......LLL.......",
    ".....LLLLL......",
    "....LLLLLLD.....",
    "..MMMMMMMMMMM...",
    "..MMMMMMMMMMMM..",
    "..MMEMMMMMMEMM..",
    "..MMEMMMMMMEMM..",
    "..MMMMMMMMMMMM..",
    "..MMMMMKKMMMMM..",
    "....BBBBBBBB....",
    "..SBBBBBBBBBBS..",
    "..SBBBBBBBBBBS..",
    "...BBBBBBBBBB...",
    "....BBB..BBB...."
  ]
};

function playYahaha() {
  if (!soundOn) return;
  playBlip(720, 0.09, "square", 0.05);
  setTimeout(() => playBlip(1080, 0.16, "square", 0.05), 110);
}
function initKorok() {
  if (prefersReducedMotion()) return;
  const sections = Array.from(document.querySelectorAll("section"));
  if (!sections.length) return;

  const korok = document.createElement("div");
  korok.id = "korok";
  korok.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  paintSticker(canvas, KOROK_SPRITE);
  const bubble = document.createElement("span");
  bubble.className = "korok-bubble";
  korok.appendChild(canvas);
  korok.appendChild(bubble);
  document.body.appendChild(korok);

  const EDGES = ["left", "right", "top", "bottom"];
  const LINES = ["呀哈哈!", "嘿!", "找到了!", "藏起来啦!"];
  const SIZE = 56;
  let timer = null;

  function schedule() {
    const wait = 8000 + Math.random() * 17000;
    timer = setTimeout(appear, wait);
  }

  function appear() {
    for (let tries = 0; tries < 12; tries++) {
      const section = sections[Math.floor(Math.random() * sections.length)];
      const r = section.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const edge = EDGES[Math.floor(Math.random() * EDGES.length)];
      let left;
      let top;
      if (edge === "left") {
        left = r.left;
        top = r.top + Math.random() * Math.max(20, r.height - SIZE);
      } else if (edge === "right") {
        left = r.right - SIZE;
        top = r.top + Math.random() * Math.max(20, r.height - SIZE);
      } else if (edge === "top") {
        left = r.left + Math.random() * Math.max(20, r.width - SIZE);
        top = r.top;
      } else {
        left = r.left + Math.random() * Math.max(20, r.width - SIZE);
        top = r.bottom - SIZE;
      }
      const visible = left > -SIZE && left < vw && top > -SIZE && top < vh;
      if (!visible) continue;

      korok.style.left = Math.round(left) + "px";
      korok.style.top = Math.round(top) + "px";
      korok.dataset.edge = edge;
      bubble.textContent = LINES[Math.floor(Math.random() * LINES.length)];
      const hold = 2000 + Math.random() * 2000;
      korok.style.setProperty("--peek-dur", hold / 1000 + "s");
      korok.classList.remove("peek");
      void korok.offsetWidth;
      korok.classList.add("peek");
      playYahaha();
      setTimeout(() => {
        korok.classList.remove("peek");
        schedule();
      }, hold);
      return;
    }
    schedule();
  }

  schedule();
}

/* ---------- 19. 成就徽章像素图标 ---------- */
const BADGE_ICONS = {
  question: {
    colors: { G: "#f6a43b", L: "#ffd778", D: "#6d3f1c", K: "#22202b" },
    rows: [
      "..DDDDDDDDDDDD..",
      ".DGGGGGGGGGGGGD.",
      ".DGGGGGGGGGGGGD.",
      ".DGLLGGGGGGLLGD.",
      ".DGLLGGGGGGLLGD.",
      ".DGGGGGGGGGGGGD.",
      ".DGGGGGGGGGGGGD.",
      ".DGGGGKKKKGGGGD.",
      ".DGGGKGGGGKGGGD.",
      ".DGGGGGGKKGGGGD.",
      ".DGGGGGGKKGGGGD.",
      ".DGGGGGGGGGGGGD.",
      ".DGGGGGGGGGGGGD.",
      ".DGGGGGGGGGGGGD.",
      ".DGGGGGGGGGGGGD.",
      "..DDDDDDDDDDDD.."
    ]
  },
  map: {
    colors: { M: "#e8d9b0", D: "#9a865c", X: "#d94b4b" },
    rows: [
      "................",
      "................",
      "..DDDDDDDDDDDD..",
      "..DMMMMMMMMMMD..",
      "..DMMMMMMMMMMD..",
      "..DMMXXMMXXMMD..",
      "..DMMXMMMMXMMD..",
      "..DMMXMMMMXMMD..",
      "..DMMXXMMXXMMD..",
      "..DMMMMMMMMMMD..",
      "..DMMMMMMMMMMD..",
      "..DMMMMMMMMMMD..",
      "..DDDDDDDDDDDD..",
      "................",
      "................",
      "................"
    ]
  },
  leaf: {
    colors: { G: "#5dbb63", L: "#9fe49b", D: "#2f7d38" },
    rows: [
      "................",
      "G...............",
      "GG..............",
      "GGG.............",
      "GLGG............",
      "GGLGG...........",
      "GGGLGG..........",
      "GGGGLGG.........",
      "GGGGGLGG........",
      "GGGGGGLG........",
      "GGGGGG..........",
      "GGGGG...........",
      "GGG.............",
      "G...............",
      "................",
      "................",
    ]
  },
  shield: {
    colors: { G: "#3fa34d", Y: "#ffd34d" },
    rows: [
      "................",
      "......GGGG......",
      "....GGGGGGGG....",
      "...GGGGGGGGGG...",
      "..GGGGGGGGGGGG..",
      "..GGGGGGGGGGGG..",
      "..GGGGGGGGGGGG..",
      "..GGGYYYYYGGG...",
      "..GGGYYYYYGGG...",
      "..GGGGYYYYGGG...",
      "..GGGGGYYGGGG...",
      "..GGGGGGGGGGG...",
      "...GGGGGGGGG....",
      "....GGGGGGG.....",
      ".....GGGGG......",
      "......GGG......."
    ]
  },
  pokeball: {
    colors: { R: "#e04444", W: "#f2f2f2", K: "#22202b" },
    rows: [
      "......RRRR......",
      "....RRRRRRRR....",
      "...RRWRRRRRRR...",
      "..RRRRRRRRRRRR..",
      "..RRRRRRRRRRRR..",
      ".RRRRRKKKKKRRRR.",
      ".RRRRRKKKKKRRRR.",
      ".KKKKKKWWKKKKKK.",
      ".KKKKKKWWKKKKKK.",
      ".WWWWWKKKKKWWWW.",
      ".WWWWWKKKKKWWWW.",
      "..WWWWWWWWWWWW..",
      "..WWWWWWWWWWWW..",
      "...WWWWWWWWWW...",
      "....WWWWWWWW....",
      "......WWWW......"
    ]
  },
  kirby: {
    colors: { P: "#ff9ec7", E: "#20243c", B: "#f56ea2", M: "#20243c" },
    rows: [
      "................",
      ".....PPPPPP.....",
      "....PPPPPPPP....",
      "...PPPPPPPPPP...",
      "..PPPPPPPPPPPP..",
      "..PPPPPPPPPPPP..",
      ".PPPPPPPPPPPPPP.",
      ".PPPPPPPPPPPPPP.",
      ".PPEEPPPPPPEEPP.",
      ".PPEEPPPPPPEEPP.",
      ".PPPBBPPPPBBPPP.",
      ".PPPPMMMMMPPPPP.",
      "..PPPPPPPPPPPP..",
      "..PPPP....PPPP..",
      "..PPPP....PPPP..",
      "................"
    ]
  }
};

function initBadgeIcons() {
  const map = {
    psych: BADGE_ICONS.question,
    map: BADGE_ICONS.map,
    content: BADGE_ICONS.leaf,
    community: BADGE_ICONS.shield,
    coach: BADGE_ICONS.pokeball,
    kid: BADGE_ICONS.kirby
  };
  Object.entries(map).forEach(([key, sprite]) => {
    const el = document.querySelector(`.ach-icon[data-badge="${key}"]`);
    if (!el) return;
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    paintSticker(c, sprite);
    el.appendChild(c);
  });
}

/* ---------- 20. 头像表情互动 ---------- */
const AVATAR_IDLE_LINES = [
  "这云好像蘑菇云?",
  "今天也在认真找玩家",
  "猜猜我游戏库里有多少游戏",
  "等一下,我在研究新副本",
  "你也是玩家吗?"
];

function initAvatarExpressions() {
  const canvases = $$("canvas#pixelAvatarHero, canvas#pixelAvatarAbout");
  canvases.forEach((canvas) => {
    let current = "normal";
    let isHover = false;
    let look = 0;
    let blinkTimer = null;
    let waveTimer = null;
    let dizzyTimer = null;
    let dropTimer = null;
    let laughTimer = null;
    let suppressClick = false;
    let drag = null;
    const enterLog = [];

    const bubble = document.createElement("span");
    bubble.className = "avatar-bubble";
    bubble.setAttribute("aria-hidden", "true");
    (canvas.parentElement || canvas).appendChild(bubble);

    function showBubble(text, ms) {
      if (canvas.id !== "pixelAvatarHero") return;
      bubble.textContent = text;
      bubble.classList.add("show");
      clearTimeout(bubble._t);
      bubble._t = setTimeout(() => bubble.classList.remove("show"), ms);
    }

    function setFrame(frame) {
      current = frame;
      drawPixelAvatar(canvas, frame, look);
    }

    function scheduleBlink() {
      clearTimeout(blinkTimer);
      blinkTimer = setTimeout(() => {
        if (current === "normal") {
          setFrame("blink");
          setTimeout(() => {
            if (current === "blink") setFrame(isHover ? "happy" : "normal");
            scheduleBlink();
          }, 160);
        } else {
          scheduleBlink();
        }
      }, 2600 + Math.random() * 3200);
    }

    function triggerDizzy() {
      clearTimeout(dizzyTimer);
      setFrame("dizzy");
      bubble.classList.remove("near");
      showBubble("\u8f6c\u6655\u5566\u2026", 1600);
      dizzyTimer = setTimeout(() => {
        setFrame(isHover ? "happy" : "normal");
        scheduleBlink();
      }, 1700);
    }

    canvas.addEventListener("mouseenter", () => {
      const now = performance.now();
      enterLog.push(now);
      while (enterLog.length && now - enterLog[0] > 2500) enterLog.shift();
      if (enterLog.length >= 3 && current !== "dizzy") {
        enterLog.length = 0;
        triggerDizzy();
        return;
      }
      isHover = true;
      clearTimeout(waveTimer);
      setFrame("wave");
      bubble.classList.add("near");
      showBubble("\u55e8!", 1600);
      waveTimer = setTimeout(() => {
        if (current === "wave") setFrame(isHover ? "happy" : "normal");
      }, 1300);
    });

    canvas.addEventListener("mouseleave", () => {
      isHover = false;
      clearTimeout(waveTimer);
      bubble.classList.remove("show");
      if (current === "happy" || current === "wave") setFrame("normal");
    });

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const rel = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const newLook = Math.max(-1, Math.min(1, Math.round(rel * 2)));
      if (newLook !== look) {
        look = newLook;
        if (["normal", "happy", "wave"].includes(current)) setFrame(current);
      }
    });

    canvas.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY };
      canvas.classList.add("avatar-dragging");
      setFrame("lift");
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      canvas.style.transform = `translate(${dx}px, ${dy}px) scale(1.08) rotate(-3deg)`;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
    });

    canvas.addEventListener("pointerup", () => {
      if (!drag) return;
      const wasMoved = !!drag.moved;
      drag = null;
      canvas.classList.remove("avatar-dragging");
      canvas.style.transform = "";
      if (wasMoved) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 100);
        canvas.classList.add("avatar-drop");
        clearTimeout(dropTimer);
        dropTimer = setTimeout(() => canvas.classList.remove("avatar-drop"), 520);
        setFrame(isHover ? "happy" : "normal");
      }
    });

    canvas.addEventListener("click", () => {
      if (suppressClick) return;
      setFrame("laugh");
      clearTimeout(laughTimer);
      laughTimer = setTimeout(() => setFrame(isHover ? "happy" : "normal"), 900);
      if (canvas.id === "pixelAvatarAbout") openStatModal();
    });

    let idleTimer = null;
    function scheduleIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!isHover && current === "normal") {
          showBubble(AVATAR_IDLE_LINES[Math.floor(Math.random() * AVATAR_IDLE_LINES.length)], 2000);
        }
        scheduleIdle();
      }, 5000 + Math.random() * 5000);
    }
    scheduleIdle();

    scheduleBlink();
  });
}

/* ---------- 21. 角色属性弹窗 ---------- */
function openStatModal() {
  const modal = $("#statModal");
  if (!modal) return;
  const hint = $("#statHint");
  if (hint) {
    hint.classList.remove("show");
    localStorage.setItem("xyh-stat-hint-seen", "1");
  }
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  const close = $("#statModalClose");
  if (close) close.focus();
  playBlip(760, 0.09, "square", 0.03);
}

function closeStatModal() {
  const modal = $("#statModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function initStatModal() {
  drawPixelAvatar($("#statModalAvatar"), "normal");
  const modal = $("#statModal");
  const close = $("#statModalClose");
  const gear = $("#statGear");
  if (!modal || !close) return;
  if (gear) gear.addEventListener("click", openStatModal);
  close.addEventListener("click", closeStatModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeStatModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeStatModal();
  });

  const hint = $("#statHint");
  if (hint && !localStorage.getItem("xyh-stat-hint-seen")) {
    setTimeout(() => hint.classList.add("show"), 700);
    setTimeout(() => {
      hint.classList.remove("show");
      localStorage.setItem("xyh-stat-hint-seen", "1");
    }, 4300);
  }
}

/* ---------- 22. 玩家成就互动 ---------- */
const DRAW_CARDS = [
  { icon: "🌵", name: "荒野大镖客 2", note: "在西部,慢慢活着也是一种浪漫" },
  { icon: "🗡️", name: "艾尔登法环", note: "死 200 次也不会卸载的那种爱" },
  { icon: "🏹", name: "塞尔达传说:旷野之息", note: "一个人,一匹马,整个世界都在等你" },
  { icon: "🏛️", name: "文明 6", note: "再玩一回合就睡——然后天亮了" },
  { icon: "🚗", name: "GTA5", note: "洛圣都的每一天都像新游戏" },
  { icon: "⚰️", name: "黑暗之魂三部曲", note: "受苦,然后变强" },
  { icon: "🩸", name: "血源诅咒", note: "猎杀之夜,恐惧与优雅并存" },
  { icon: "🦅", name: "刺客信条", note: "信仰之跃前的深呼吸" },
  { icon: "🐕", name: "看门狗", note: "整座城市都是我的终端" },
  { icon: "⚔️", name: "巫师 3", note: "把支线玩成主线" },
  { icon: "🌆", name: "赛博朋克 2077", note: "夜之城的霓虹里,有最好的故事" },
  { icon: "🍄", name: "最后生还者", note: "末日里最动人的其实是人" },
  { icon: "🕰️", name: "塞尔达传说:王国之泪", note: "想象力就是最大的能力" },
  { icon: "🤖", name: "宇宙机器人", note: "小小的机器人,大大的快乐" },
  { icon: "🧟", name: "生化危机", note: "恐怖不是怪物,是转角的声音" },
  { icon: "🌌", name: "质量效应", note: "跨越银河,决定文明的命运" },
  { icon: "🎭", name: "33 号远征队", note: "向死神宣战的远征" },
  { icon: "🐒", name: "黑神话:悟空", note: "天命人,棍扫三界" },
  { icon: "⚔️", name: "战神系列", note: "父子与神,一斧劈开命运" },
  { icon: "🎮", name: "双人成行", note: "和好朋友玩到凌晨" },
  { icon: "🦖", name: "怪物猎人", note: "狩猎就是我的周末" }
];
let lastDraw = -1;

function initGamesSection() {
  const games = document.getElementById("games");
  if (!games) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const chips = Array.from(games.querySelectorAll(".chip"));
        chips.forEach((chip, i) => {
          setTimeout(() => {
            chip.classList.add("lit");
            playBlip(520 + i * 30, 0.06, "square", 0.025);
          }, 120 + i * 110);
        });
        const nums = Array.from(games.querySelectorAll(".gamer-num[data-count]"));
        nums.forEach((num, i) => {
          setTimeout(() => {
            const target = Number(num.dataset.count || 0);
            const suffix = num.dataset.suffix || "";
            const dur = 900;
            const start = performance.now();
            function step(now) {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              num.textContent = Math.round(target * eased).toLocaleString() + suffix;
              if (p < 1) requestAnimationFrame(step);
              else num.textContent = target.toLocaleString() + suffix;
            }
            requestAnimationFrame(step);
          }, 400 + i * 500);
        });
      });
    },
    { threshold: 0.3 }
  );
  io.observe(games);

  const flipCards = Array.from(games.querySelectorAll(".flip-card"));
  flipCards.forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("flipped");
      playBlip(720, 0.06, "square", 0.02);
    });
  });

  const btn = document.getElementById("drawCardBtn");
  const result = document.getElementById("drawResult");
  if (btn && result) {
    btn.addEventListener("click", () => {
      let idx = Math.floor(Math.random() * DRAW_CARDS.length);
      if (DRAW_CARDS.length > 1) {
        while (idx === lastDraw) idx = Math.floor(Math.random() * DRAW_CARDS.length);
      }
      lastDraw = idx;
      const card = DRAW_CARDS[idx];
      result.innerHTML = `<div class="draw-pop"><span class="draw-icon">${card.icon}</span><b>${card.name}</b><p>${card.note}</p></div>`;
      result.hidden = false;
      playBlip(880, 0.1, "square", 0.04);
    });
  }
}

function initTitlePop() {
  [660, 780, 900].forEach((f, i) => {
    setTimeout(() => playBlip(f, 0.08, "square", 0.03), 120 + i * 230);
  });
}

/* ---------- 23. 开场仪式 ---------- */
function initIntro() {
  const overlay = document.getElementById("introOverlay");
  if (!overlay) return;
  if (prefersReducedMotion()) {
    overlay.remove();
    return;
  }
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playBlip(f, 0.1, "square", 0.04), 100 + i * 180);
  });
  setTimeout(() => overlay.remove(), 3200);
}

/* ---------- 24. 打怪升级记录掉落物 ---------- */
function initExpDrops() {
  const map = {
    offer: ["📄", "💼", "⭐"],
    heart: ["💗", "📝", "✨"],
    talk: ["💬", "🤝", "💡"],
    game: ["🎮", "🎬", "🍿"]
  };
  document.querySelectorAll(".exp-card").forEach((card) => {
    const items = map[card.dataset.drop] || ["✦"];
    card.addEventListener("mouseenter", () => {
      const rect = card.getBoundingClientRect();
      items.forEach((icon, i) => {
        const s = document.createElement("span");
        s.className = "exp-drop";
        s.textContent = icon;
        s.style.left = (10 + Math.random() * (rect.width - 40)) + "px";
        s.style.animationDelay = (i * 0.12 + Math.random() * 0.2) + "s";
        s.style.animationDuration = (0.9 + Math.random() * 0.5) + "s";
        card.appendChild(s);
        s.addEventListener("animationend", () => s.remove());
      });
    });
  });
}

/* ---------- 25. Background Music ---------- */
const bgmAudio = new Audio("assets/bgm.m4a");
bgmAudio.loop = true;
bgmAudio.volume = 0.55;

function startMusic() {
  if (!soundOn) return;
  const p = bgmAudio.play();
  if (p) p.catch(() => {});
}

function stopMusic() {
  bgmAudio.pause();
}

function initMusic() {
  const kick = () => {
    startMusic();
    if (!bgmAudio.paused) {
      document.removeEventListener("pointerdown", kick);
      document.removeEventListener("keydown", kick);
      document.removeEventListener("touchstart", kick);
    }
  };
  document.addEventListener("pointerdown", kick);
  document.addEventListener("keydown", kick);
  document.addEventListener("touchstart", kick);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopMusic();
    else if (soundOn) startMusic();
  });
  startMusic();
}

/* ---------- 26. 成长时间轴动效 ---------- */
function initEducationFx() {
  const edu = document.getElementById("education");
  if (!edu) return;
  const timeline = edu.querySelector(".timeline");
  if (timeline) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          timeline.classList.add("grow");
        });
      },
      { threshold: 0.3 }
    );
    io.observe(edu);
  }

  const years = edu.querySelectorAll(".edu-year");
  if (prefersReducedMotion() || !years.length) return;
  const onScroll = () => {
    const r = edu.getBoundingClientRect();
    const mid = r.top + r.height / 2 - window.innerHeight / 2;
    years.forEach((y, i) => {
      y.style.transform = "translateY(" + (-mid * (0.06 + i * 0.03)).toFixed(1) + "px)";
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- 启动 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initIntro();
  initMusic();
  drawPixelAvatar($("#pixelAvatarHero"));
  drawPixelAvatar($("#pixelAvatarAbout"));
  initAvatarExpressions();
  initStatModal();
  initSound();
  addButtonSounds();
  initStarfield();
  initTypewriter();
  initTitlePop();
  initNav();
  initRevealAndCounters();
  initEducationFx();
  initRadar();
  initTags();
  initQR();
  initCopy();
  initStickers();
  initSectionStickers();
  initBadgeIcons();
  initHeroFx();
  initTrail();
  initKorok();
  initGamesSection();
  initExpDrops();
});
