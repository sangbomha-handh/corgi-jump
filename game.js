// ── Image loading ──
const images = {};
function loadImg(name, src) {
  const img = new Image();
  img.src = src;
  images[name] = img;
}
// Select indicator
loadImg('select', 'img/select.png');
// Corgi select screen portraits
loadImg('pbrk', 'img/pbrk.png');
loadImg('tri', 'img/tri.png');
// Corgi variant 1 animation frames (left-facing source)
loadImg('corgi1_1', 'img/corgi1_1.png');
loadImg('corgi1_2', 'img/corgi1_2.png');
loadImg('corgi1_3', 'img/corgi1_3.png');
// Corgi variant 2 (tri-color)
loadImg('corgi2_1', 'img/corgi2_1.png');
loadImg('corgi2_2', 'img/corgi2_2.png');
loadImg('corgi2_3', 'img/corgi2_3.png');
// Propeller hat: collectible item
loadImg('cap_item', 'img/cap.png');
// Propeller hat: wearing animation (replaces full body)
for (let i = 1; i <= 8; i++) loadImg('cap_' + i, 'img/cap_' + i + '.png');
// Propeller hat: tri-color variant
for (let i = 1; i <= 8; i++) loadImg('cap_' + i + '_t', 'img/cap_' + i + '_t.png');
// Human companion
loadImg('human1', 'img/human1.png');
loadImg('human2', 'img/human2.png');
// Clouds
loadImg('cloud_1', 'img/cloud_1.png');
loadImg('cloud_2', 'img/cloud_2.png');
loadImg('cloud_3', 'img/cloud_3.png');
const CLOUD_SIZES = [
  { key: 'cloud_1', w: 65, h: 38 },
  { key: 'cloud_2', w: 37.5, h: 27.25 },
  { key: 'cloud_3', w: 46, h: 18.5 },
];
// Item effects
loadImg('star', 'img/star.png');
loadImg('rainbow', 'img/rainbow.png');
// Score panel
loadImg('score_pannel', 'img/score_pannel.png');
// Smoke explosion spritesheet
loadImg('smoke', 'img/smoke.png');
const SMOKE_FRAME_W = 64;
const SMOKE_FRAME_H = 64;
const SMOKE_ROW = 13; // row 13 (0-indexed)
const SMOKE_FRAMES = 16;
// Platforms
loadImg('plat_normal', 'img/plat_normal.png');
loadImg('plat_moving', 'img/plat_moving.png');
loadImg('plat_moving_v', 'img/plat_moving_v.png');
loadImg('plat_breaking', 'img/plat_breaking.png');
loadImg('plat_broken', 'img/plat_broken.png');
loadImg('plat_disappear', 'img/plat_disappear.png');
loadImg('plat_explode', 'img/plat_explode.png');
// Spring device
loadImg('device_spring_1', 'img/device_spring_1.png');
loadImg('device_spring_2', 'img/device_spring_2.png');
loadImg('device_spring_3', 'img/device_spring_3.png');
// Trampoline device
loadImg('device_trampoline_1', 'img/device_trampoline_1.png');
loadImg('device_trampoline_2', 'img/device_trampoline_2.png');
loadImg('device_trampoline_3', 'img/device_trampoline_3.png');
// Jetpack: collectible item
loadImg('jet_item', 'img/item_jetpack.png');
// Jetpack: wearing animation
loadImg('jet_1', 'img/jet_1.png');
loadImg('jet_2', 'img/jet_2.png');

// ── Constants ──
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;
const GRAVITY = 0.4;
const JUMP_FORCE = -12;
const SPRING_FORCE = -20;
const TRAMPOLINE_FORCE = -24;
const PROPELLER_SPEED = -3;
const PROPELLER_DURATION = 180; // frames (~3 seconds)
const JETPACK_SPEED = -8;
const JETPACK_DURATION = 150; // frames (~2.5 seconds)
const MAX_SPEED_X = 6;
const ACCEL_X = 0.5;
const FRICTION = 0.85;
const PLATFORM_WIDTH = 70;
const PLATFORM_HEIGHT = 14;
const PLAYER_W = 42;
const PLAYER_H = 56;
const PLATFORM_GAP_MAX = 120;

// ── Canvas setup ──
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const ratio = GAME_WIDTH / GAME_HEIGHT;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (w / h > ratio) {
    w = h * ratio;
  } else {
    h = w / ratio;
  }
  // Canvas physical pixels = CSS display size * dpr (1:1 pixel mapping, no blur)
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const scale = (w * dpr) / GAME_WIDTH;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}
window.addEventListener('resize', resize);
resize();

// ── Game state ──
let player, companion, platforms, items, score, highScore, cameraY, gameOver, gameStarted;
let frameCount = 0;

// ── Particle system for item effects ──
let starParticles = [];
let rainbowTrail = [];
let selectedCorgi = null; // 1 or 2
let selectedHuman = null; // 1 or 2
let screenState = 'title'; // 'title', 'charSelect', 'playing', 'gameOver'

// ── Multiplayer state ──
let isMultiplayer = false;
let opponent = null; // { x, y, score, facingRight, corgi, human, alive }
let opponentDied = false;
let multiSeed = 0;
let syncCounter = 0;

// ── UI button helpers ──
function hitRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// Title screen buttons
const TITLE_BTN_W = 220;
const TITLE_BTN_H = 55;
const TITLE_BTN_X = GAME_WIDTH / 2 - TITLE_BTN_W / 2;
const TITLE_BTN_Y1 = GAME_HEIGHT / 2;
const TITLE_BTN_Y2 = GAME_HEIGHT / 2 + 70;

// Character select buttons (2x2 grid)
const CHAR_BTN_SIZE = 100;
const CHAR_GAP = 20;
const CHAR_GRID_W = CHAR_BTN_SIZE * 2 + CHAR_GAP;
const CHAR_START_X = GAME_WIDTH / 2 - CHAR_GRID_W / 2;
const CHAR_ROW1_Y = GAME_HEIGHT / 2 - 110;
const CHAR_ROW2_Y = CHAR_ROW1_Y + CHAR_BTN_SIZE + CHAR_GAP + 40;
const CHAR_GO_BTN_Y = CHAR_ROW2_Y + CHAR_BTN_SIZE + 30;

// Game over buttons
const GO_BTN_W = 160;
const GO_BTN_H = 45;
const GO_BTN_X = GAME_WIDTH / 2 - GO_BTN_W / 2;
const GO_BTN_Y1 = GAME_HEIGHT / 2 - 10;
const GO_BTN_Y2 = GAME_HEIGHT / 2 + 50;

function handleScreenClick(gx, gy) {
  if (screenState === 'title') {
    if (hitRect(gx, gy, TITLE_BTN_X, TITLE_BTN_Y1, TITLE_BTN_W, TITLE_BTN_H)) {
      screenState = 'charSelect'; selectedCorgi = null; selectedHuman = null;
    }
    if (hitRect(gx, gy, TITLE_BTN_X, TITLE_BTN_Y2, TITLE_BTN_W, TITLE_BTN_H)) {
      if (typeof showLobby === 'function') showLobby();
    }
    return;
  }
  if (screenState === 'charSelect') {
    const col0 = CHAR_START_X;
    const col1 = CHAR_START_X + CHAR_BTN_SIZE + CHAR_GAP;
    // Corgi row
    if (hitRect(gx, gy, col0, CHAR_ROW1_Y, CHAR_BTN_SIZE, CHAR_BTN_SIZE)) { selectedCorgi = 1; return; }
    if (hitRect(gx, gy, col1, CHAR_ROW1_Y, CHAR_BTN_SIZE, CHAR_BTN_SIZE)) { selectedCorgi = 2; return; }
    // Human row
    if (hitRect(gx, gy, col0, CHAR_ROW2_Y, CHAR_BTN_SIZE, CHAR_BTN_SIZE)) { selectedHuman = 1; return; }
    if (hitRect(gx, gy, col1, CHAR_ROW2_Y, CHAR_BTN_SIZE, CHAR_BTN_SIZE)) { selectedHuman = 2; return; }
    // Start button (only if both selected)
    if (selectedCorgi && selectedHuman) {
      const startBtnW = 180;
      const startBtnX = GAME_WIDTH / 2 - startBtnW / 2;
      if (hitRect(gx, gy, startBtnX, CHAR_GO_BTN_Y, startBtnW, 50)) {
        screenState = 'playing'; init(); return;
      }
    }
    return;
  }
  if (screenState === 'gameOver') {
    if (isMultiplayer) {
      // Multiplayer: only "로비로" button
      if (hitRect(gx, gy, GO_BTN_X, GO_BTN_Y1, GO_BTN_W, GO_BTN_H)) {
        returnToLobbyFromGame(); return;
      }
    } else {
      if (hitRect(gx, gy, GO_BTN_X, GO_BTN_Y1, GO_BTN_W, GO_BTN_H)) {
        screenState = 'playing'; init(); return; // 재시작
      }
      if (hitRect(gx, gy, GO_BTN_X, GO_BTN_Y2, GO_BTN_W, GO_BTN_H)) {
        screenState = 'title'; selectedCorgi = null; selectedHuman = null; return; // 처음으로
      }
    }
    return;
  }
}

function init() {
  player = {
    x: GAME_WIDTH / 2 - PLAYER_W / 2 - 10,
    y: GAME_HEIGHT - 50 - PLAYER_H + 7,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    facingRight: true,
    activeItem: null,
    itemTimer: 0,
  };
  companion = {
    x: player.x + 30,
    y: player.y + (PLAYER_H - 48) - 13,
    facingRight: true,
    bobPhase: 0,
  };
  platforms = [];
  items = [];
  score = 0;
  highScore = parseInt(localStorage.getItem('corgiJumpHigh') || '0', 10);
  cameraY = 0;
  gameOver = false;
  gameStarted = false;
  frameCount = 0;

  distSinceLastSafe = 0;
  // Bottom safe platform
  platforms.push(createPlatform(GAME_WIDTH / 2 - PLATFORM_WIDTH / 2, GAME_HEIGHT - 50, 'normal'));
  // Fill screen with platforms
  let y = GAME_HEIGHT - 50;
  while (y > -GAME_HEIGHT) {
    y = generateNextPlatform(y, -GAME_HEIGHT);
  }
}

function createPlatform(x, y, type) {
  return {
    x, y, w: PLATFORM_WIDTH, type,
    broken: false,
    moveDir: 1,
    moveDirY: 1,
    originY: y,
    // Disappearing platform state
    visible: true,
    blinkTimer: 0,
    stepped: false,
    // Exploding platform state
    explodeTimer: -1, // -1 = not triggered
    exploded: false,
    // Device on platform
    device: null, // 'spring' or 'trampoline'
    // Trampoline animation state
    trampAnimSeq: [1, 2, 2, 3, 1],
    trampAnimIdx: -1,
    trampAnimTimer: 0,
    trampBounceDelay: 0, // delay before actual bounce
    // Spring animation state
    springAnimSeq: [1, 2, 3, 1, 3, 1, 3, 1],
    springAnimIdx: -1, // -1 = not playing
    springAnimTimer: 0,
  };
}

// Max jump height = v^2 / (2*g) where v=JUMP_FORCE, g=GRAVITY
const MAX_JUMP_HEIGHT = (JUMP_FORCE * JUMP_FORCE) / (2 * GRAVITY); // 180
// Safe limit: must place a safe platform before this distance from the last one
const SAFE_DISTANCE = MAX_JUMP_HEIGHT * 0.65; // 117
// Track distance since last safe (landable) platform
let distSinceLastSafe = 0;

function generateNextPlatform(prevY, targetTop) {
  let gap = 40 + Math.random() * (PLATFORM_GAP_MAX - 40);
  let forceSafe = false;

  // If this gap would put us beyond safe reach, clamp the gap and force safe
  if (distSinceLastSafe + gap > SAFE_DISTANCE) {
    gap = Math.max(40, SAFE_DISTANCE - distSinceLastSafe);
    forceSafe = true;
  }

  const y = prevY - gap;
  // Limit horizontal distance from previous platform for reachability
  let px;
  const lastPlat = platforms[platforms.length - 1];
  if (lastPlat) {
    const maxHorizDist = 150; // max horizontal gap
    const minX = Math.max(0, lastPlat.x - maxHorizDist);
    const maxX = Math.min(GAME_WIDTH - PLATFORM_WIDTH, lastPlat.x + maxHorizDist);
    px = minX + Math.random() * (maxX - minX);
  } else {
    px = Math.random() * (GAME_WIDTH - PLATFORM_WIDTH);
  }
  const type = pickPlatformType(y, forceSafe);

  distSinceLastSafe += gap;
  if (type === 'normal' || type === 'moving' || type === 'moving_v') {
    distSinceLastSafe = 0;
  }

  const p = createPlatform(px, y, type);
  platforms.push(p);
  maybeAddDevice(p, y);
  maybeSpawnItem(p, y);
  return y;
}

function pickPlatformType(y, forceSafe) {
  const difficulty = Math.min(Math.abs(y) / 5000, 1);

  if (forceSafe) {
    const r = Math.random();
    if (r < 0.15 + difficulty * 0.1) return 'moving';
    if (r < 0.22 + difficulty * 0.1) return 'moving_v';
    return 'normal';
  }

  const r = Math.random();
  let threshold = 0;
  threshold += 0.05 + difficulty * 0.08;
  if (r < threshold) return 'breaking';
  threshold += 0.05 + difficulty * 0.08;
  if (r < threshold) return 'moving';
  threshold += 0.03 + difficulty * 0.05;
  if (r < threshold) return 'moving_v';
  threshold += 0.03 + difficulty * 0.06;
  if (r < threshold) return 'disappearing';
  threshold += 0.02 + difficulty * 0.05;
  if (r < threshold) return 'exploding';
  return 'normal';
}

function maybeAddDevice(p, y) {
  // Only add devices on normal or moving platforms
  if (p.type !== 'normal' && p.type !== 'moving') return;
  const difficulty = Math.min(Math.abs(y) / 5000, 1);
  const r = Math.random();
  if (r < 0.04 + difficulty * 0.03) {
    p.device = 'trampoline';
  } else if (r < 0.10 + difficulty * 0.05) {
    p.device = 'spring';
  }
}

function maybeSpawnItem(p, y) {
  // Only spawn items on normal platforms without devices
  if (p.type !== 'normal' || p.device) return;
  const difficulty = Math.min(Math.abs(y) / 5000, 1);
  const r = Math.random();
  if (r < 0.02 + difficulty * 0.02) {
    items.push({
      x: p.x + p.w / 2 - 10,
      y: p.y - 24,
      w: 24, h: 24,
      type: 'jetpack',
      collected: false,
    });
  } else if (r < 0.06 + difficulty * 0.04) {
    items.push({
      x: p.x + p.w / 2 - 10,
      y: p.y - 24,
      w: 24, h: 24,
      type: 'propeller',
      collected: false,
    });
  }
}

// ── Input handling ──
const input = { left: false, right: false };

function canvasToGame(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = GAME_WIDTH / rect.width;
  const scaleY = GAME_HEIGHT / rect.height;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (screenState !== 'playing') {
    const t = e.touches[0];
    const pos = canvasToGame(t.clientX, t.clientY);
    handleScreenClick(pos.x, pos.y);
    return;
  }
  if (!gameStarted) gameStarted = true;
  handleTouches(e.touches);
});
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleTouches(e.touches); });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleTouches(e.touches); });

function handleTouches(touches) {
  input.left = false;
  input.right = false;
  const rect = canvas.getBoundingClientRect();
  const mid = rect.left + rect.width / 2;
  for (let i = 0; i < touches.length; i++) {
    if (touches[i].clientX < mid) input.left = true;
    else input.right = true;
  }
}

window.addEventListener('keydown', (e) => {
  if (screenState !== 'playing') return;
  if (!gameStarted) gameStarted = true;
  if (e.key === 'ArrowLeft' || e.key === 'a') input.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') input.right = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') input.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') input.right = false;
});

canvas.addEventListener('mousedown', (e) => {
  if (screenState !== 'playing') {
    const pos = canvasToGame(e.clientX, e.clientY);
    handleScreenClick(pos.x, pos.y);
    return;
  }
  if (!gameStarted) gameStarted = true;
  const rect = canvas.getBoundingClientRect();
  const mid = rect.left + rect.width / 2;
  if (e.clientX < mid) input.left = true;
  else input.right = true;
});
canvas.addEventListener('mouseup', () => { input.left = false; input.right = false; });

// ── Update ──
function update() {
  frameCount++;
  if (screenState !== 'playing' || gameOver || !gameStarted) return;

  // Horizontal movement
  if (input.left) {
    player.vx -= ACCEL_X;
    player.facingRight = false;
  }
  if (input.right) {
    player.vx += ACCEL_X;
    player.facingRight = true;
  }
  if (!input.left && !input.right) {
    player.vx *= FRICTION;
  }
  player.vx = Math.max(-MAX_SPEED_X, Math.min(MAX_SPEED_X, player.vx));
  player.x += player.vx;

  // Wrap around screen edges
  if (player.x + player.w < 0) player.x = GAME_WIDTH;
  if (player.x > GAME_WIDTH) player.x = -player.w;

  // Active item effect
  if (player.activeItem) {
    player.itemTimer--;
    if (player.activeItem === 'propeller') {
      player.vy = PROPELLER_SPEED;
    } else if (player.activeItem === 'jetpack') {
      player.vy = JETPACK_SPEED;
    }
    if (player.itemTimer <= 0) {
      player.activeItem = null;
    }
  } else {
    // Normal gravity
    player.vy += GRAVITY;
  }
  player.y += player.vy;

  // Item collection
  for (const item of items) {
    if (item.collected) continue;
    const iy = item.y - cameraY;
    if (
      player.x + player.w > item.x &&
      player.x < item.x + item.w &&
      player.y + player.h > iy &&
      player.y < iy + item.h
    ) {
      item.collected = true;
      player.activeItem = item.type;
      player.itemTimer = item.type === 'propeller' ? PROPELLER_DURATION : JETPACK_DURATION;
    }
  }

  // Platform collision (only when falling and no active item)
  if (player.vy > 0 && !player.activeItem) {
    for (const p of platforms) {
      if (p.broken || p.exploded) continue;
      if (p.type === 'disappearing' && !p.visible) continue;
      const py = p.y - cameraY;
      if (
        player.x + player.w > p.x + 5 &&
        player.x < p.x + p.w - 5 &&
        player.y + player.h >= py &&
        player.y + player.h <= py + PLATFORM_HEIGHT + player.vy
      ) {
        // Breaking platform
        if (p.type === 'breaking') {
          p.broken = true;
          continue;
        }
        // Exploding platform — start timer on first step
        if (p.type === 'exploding') {
          if (p.explodeTimer === -1) {
            p.explodeTimer = 30; // explodes after ~0.5s
          }
        }
        // Disappearing platform — mark as stepped
        if (p.type === 'disappearing' && !p.stepped) {
          p.stepped = true;
          p.blinkTimer = 45; // disappears after ~0.75s
        }
        // Device bounce
        if (p.device === 'trampoline') {
          player.vy = TRAMPOLINE_FORCE;
          p.trampAnimIdx = 0;
          p.trampAnimTimer = 4;
        } else if (p.device === 'spring') {
          player.vy = SPRING_FORCE;
          p.springAnimIdx = 0;
          p.springAnimTimer = 4;
        } else {
          player.vy = JUMP_FORCE;
        }
        player.y = py - player.h;
        triggerLandingAnim();
      }
    }
  }

  // Companion follows player
  const COMP_H = 48;
  const targetX = player.x + (player.facingRight ? -32 : PLAYER_W + 4);
  const targetY = player.y + (PLAYER_H - COMP_H) - 8; // align feet, 8px up
  companion.x += (targetX - companion.x) * 0.12;
  companion.y = targetY;
  companion.facingRight = player.facingRight;
  companion.bobPhase += 0.08;

  // Camera follow
  const threshold = GAME_HEIGHT * 0.4;
  if (player.y < threshold) {
    const diff = threshold - player.y;
    player.y = threshold;
    cameraY -= diff;
    score = Math.max(score, Math.floor(-cameraY / 10));
  }

  // Update platforms
  for (const p of platforms) {
    // Horizontal moving
    if (p.type === 'moving' && !p.broken) {
      p.x += p.moveDir * 1.5;
      if (p.x <= 0 || p.x + p.w >= GAME_WIDTH) p.moveDir *= -1;
    }
    // Vertical moving
    if (p.type === 'moving_v' && !p.broken) {
      p.y += p.moveDirY * 0.8;
      if (Math.abs(p.y - p.originY) > 50) p.moveDirY *= -1;
    }
    // Disappearing blink
    if (p.type === 'disappearing' && p.stepped) {
      p.blinkTimer--;
      if (p.blinkTimer <= 0) {
        p.visible = false;
      }
    }
    // Exploding countdown
    if (p.type === 'exploding' && p.explodeTimer > 0) {
      p.explodeTimer--;
      if (p.explodeTimer <= 0) {
        p.exploded = true;
        p.explodedTimer = 30;
      }
    }
    // Exploded effect countdown
    if (p.exploded && p.explodedTimer > 0) {
      p.explodedTimer--;
    }
    // Trampoline animation
    if (p.trampAnimIdx >= 0) {
      p.trampAnimTimer--;
      if (p.trampAnimTimer <= 0) {
        p.trampAnimIdx++;
        if (p.trampAnimIdx >= p.trampAnimSeq.length) {
          p.trampAnimIdx = -1;
        } else {
          p.trampAnimTimer = 4;
        }
      }
    }
    // Spring animation
    if (p.springAnimIdx >= 0) {
      p.springAnimTimer--;
      if (p.springAnimTimer <= 0) {
        p.springAnimIdx++;
        if (p.springAnimIdx >= p.springAnimSeq.length) {
          p.springAnimIdx = -1; // animation done
        } else {
          p.springAnimTimer = 4;
        }
      }
    }
  }

  // Generate new platforms above
  const highestPlatform = Math.min(...platforms.map(p => p.y));
  if (highestPlatform > cameraY - GAME_HEIGHT) {
    let y = highestPlatform;
    while (y > cameraY - GAME_HEIGHT) {
      y = generateNextPlatform(y, cameraY - GAME_HEIGHT);
    }
  }

  // Remove platforms and items far below
  platforms = platforms.filter(p => p.y - cameraY < GAME_HEIGHT + 100);
  items = items.filter(i => !i.collected && i.y - cameraY < GAME_HEIGHT + 100);

  // Jump animation
  updateJumpAnim();

  // Propeller: spawn falling stars from feet
  if (player.activeItem === 'propeller' && frameCount % 4 === 0) {
    starParticles.push({
      x: player.x + PLAYER_W / 2 + (Math.random() - 0.5) * 16,
      y: player.y + PLAYER_H,
      vy: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 1.5,
      size: 10 + Math.random() * 8,
      life: 40,
      rot: Math.random() * Math.PI * 2,
    });
  }
  // Jetpack: add rainbow trail segment from feet
  if (player.activeItem === 'jetpack' && frameCount % 2 === 0) {
    rainbowTrail.push({
      x: player.x + PLAYER_W / 2,
      y: player.y + PLAYER_H + cameraY, // world Y (cameraY is negative)
      life: 30,
    });
  }
  // Update star particles
  starParticles = starParticles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += 0.1;
    p.life--;
    return p.life > 0;
  });
  // Update rainbow trail
  rainbowTrail = rainbowTrail.filter(r => {
    r.life--;
    return r.life > 0;
  });

  // Multiplayer: send state every 3 frames
  if (isMultiplayer && socket) {
    syncCounter++;
    if (syncCounter % 3 === 0) {
      socket.emit('gameState', {
        x: player.x,
        y: player.y + cameraY, // send world-space Y
        score: score,
        facingRight: player.facingRight,
      });
    }
  }

  // Game over
  if (player.y > GAME_HEIGHT + 50) {
    gameOver = true;
    screenState = 'gameOver';
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('corgiJumpHigh', String(highScore));
    }
    if (isMultiplayer && socket) {
      socket.emit('playerDied', score);
    }
  }
}

// ── Draw ──
// Jump animation: 2→1→2→3 sequence, one cycle per jump
// Jump animation: frame 1 only on landing, frame 3 in air
let landingTimer = 0;
const LANDING_HOLD = 5;

function getCorgiAnimFrame(variant) {
  const prefix = 'corgi' + (variant || 1);
  let frame;
  if (!gameStarted) {
    frame = 2;
  } else if (landingTimer > 0) {
    frame = 1;
  } else {
    frame = 3;
  }
  return images[prefix + '_' + frame];
}

function updateJumpAnim() {
  if (landingTimer > 0) landingTimer--;
}

function triggerLandingAnim() {
  landingTimer = LANDING_HOLD;
}

function drawSpriteFlipped(img, x, y, w, h, facingRight) {
  ctx.save();
  if (facingRight) {
    ctx.translate(x + w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, y, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

function drawCorgi(x, y, facingRight, variant) {
  // Propeller hat active: use cap animation (variant-aware)
  if (player.activeItem === 'propeller') {
    const capSuffix = variant === 2 ? '_t' : '';
    const capCheckKey = 'cap_1' + capSuffix;
    if (images[capCheckKey] && images[capCheckKey].complete && images[capCheckKey].naturalWidth > 0) {
      const capIdx = (Math.floor(frameCount / 4) % 8) + 1;
      const capFrame = images['cap_' + capIdx + capSuffix];
      if (capFrame && capFrame.complete) {
        drawSpriteFlipped(capFrame, x, y, PLAYER_W, PLAYER_H, facingRight);
        return;
      }
    }
  }

  // Jetpack active: use jet_1, jet_2 animation (loops)
  if (player.activeItem === 'jetpack') {
    const jetKey = 'jet_1';
    if (images[jetKey] && images[jetKey].complete && images[jetKey].naturalWidth > 0) {
      const jetIdx = (Math.floor(frameCount / 5) % 2) + 1;
      const jetFrame = images['jet_' + jetIdx];
      if (jetFrame && jetFrame.complete) {
        const movingJet = Math.abs(player.vx) > 0.5;
        const lookJet = movingJet ? facingRight : (companion.x > player.x);
        drawSpriteFlipped(jetFrame, x, y, PLAYER_W, PLAYER_H, lookJet);
        return;
      }
    }
  }

  // Try image-based rendering
  const spriteKey = 'corgi' + (variant || 1) + '_1';
  if (images[spriteKey] && images[spriteKey].complete && images[spriteKey].naturalWidth > 0) {
    const frame = getCorgiAnimFrame(variant);
    if (frame && frame.complete) {
      const moving = Math.abs(player.vx) > 0.5;
      const look = moving ? facingRight : (companion.x > player.x);
      drawSpriteFlipped(frame, x, y, PLAYER_W, PLAYER_H, look);
      return;
    }
  }

  // Fallback: canvas drawing
  const isCream = variant === 2;
  const furColor = isCream ? '#F5DEB3' : '#D2691E';
  const headColor = isCream ? '#FFF8E7' : '#DEB887';
  const earColor = isCream ? '#E8C88A' : '#A0522D';
  const innerEarColor = isCream ? '#FFECD2' : '#FFCBA4';
  const bellyColor = isCream ? '#FFFAF0' : '#F5DEB3';
  const noseColor = isCream ? '#C0756B' : '#000';

  const cx = x + PLAYER_W / 2;
  const botY = y + PLAYER_H;
  const dir = facingRight ? 1 : -1;

  // ── Jetpack (behind body) ──
  if (player.activeItem === 'jetpack') {
    ctx.fillStyle = '#666';
    ctx.fillRect(cx - dir * 16, botY - 34, 7, 16);
    ctx.fillStyle = '#555';
    ctx.fillRect(cx - dir * 17, botY - 36, 9, 4);
    const flameH = 8 + Math.random() * 10;
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.moveTo(cx - dir * 17, botY - 18);
    ctx.lineTo(cx - dir * 9, botY - 18);
    ctx.lineTo(cx - dir * 13, botY - 18 + flameH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(cx - dir * 15, botY - 18);
    ctx.lineTo(cx - dir * 11, botY - 18);
    ctx.lineTo(cx - dir * 13, botY - 18 + flameH * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  // ── Legs (two legs standing upright) ──
  ctx.fillStyle = furColor;
  ctx.fillRect(cx - 8, botY - 14, 6, 14);
  ctx.fillRect(cx + 2, botY - 14, 6, 14);
  ctx.fillStyle = isCream ? '#C9A96E' : '#8B4513';
  ctx.fillRect(cx - 9, botY - 3, 8, 3);
  ctx.fillRect(cx + 1, botY - 3, 8, 3);

  // ── Body (torso, upright) ──
  ctx.fillStyle = furColor;
  ctx.beginPath();
  ctx.ellipse(cx, botY - 24, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bellyColor;
  ctx.beginPath();
  ctx.ellipse(cx, botY - 22, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Arms ──
  ctx.strokeStyle = furColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + dir * 10, botY - 30);
  ctx.lineTo(cx + dir * 16, botY - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - dir * 10, botY - 30);
  ctx.lineTo(cx - dir * 14, botY - 22);
  ctx.stroke();

  // ── Tail (sticking out behind) ──
  ctx.strokeStyle = earColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - dir * 11, botY - 26);
  ctx.quadraticCurveTo(cx - dir * 22, botY - 34, cx - dir * 18, botY - 42);
  ctx.stroke();

  // ── Head (corgi face, on top of body) ──
  const headY = botY - 44;
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.ellipse(cx, headY, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face mask (white muzzle area)
  ctx.fillStyle = bellyColor;
  ctx.beginPath();
  ctx.ellipse(cx + dir * 2, headY + 3, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Propeller hat ──
  if (player.activeItem === 'propeller') {
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 10, 9, 4, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, headY - 14);
    ctx.rotate(frameCount * 0.4);
    ctx.fillStyle = '#3498DB';
    ctx.fillRect(-12, -2, 24, 4);
    ctx.fillRect(-2, -12, 4, 24);
    ctx.restore();
    ctx.fillStyle = '#F1C40F';
    ctx.beginPath();
    ctx.arc(cx, headY - 14, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // ── Ears (pointy corgi ears) ──
    ctx.fillStyle = furColor;
    // Left ear
    ctx.beginPath();
    ctx.moveTo(cx - 8, headY - 6);
    ctx.lineTo(cx - 14, headY - 18);
    ctx.lineTo(cx - 2, headY - 8);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(cx + 8, headY - 6);
    ctx.lineTo(cx + 14, headY - 18);
    ctx.lineTo(cx + 2, headY - 8);
    ctx.closePath();
    ctx.fill();
    // Inner ear
    ctx.fillStyle = innerEarColor;
    ctx.beginPath();
    ctx.moveTo(cx - 7, headY - 7);
    ctx.lineTo(cx - 12, headY - 16);
    ctx.lineTo(cx - 3, headY - 9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 7, headY - 7);
    ctx.lineTo(cx + 12, headY - 16);
    ctx.lineTo(cx + 3, headY - 9);
    ctx.closePath();
    ctx.fill();
  }

  // ── Eyes ──
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 4 * dir + dir * 8, headY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 4 * dir - dir * 0, headY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx - 4 * dir + dir * 9, headY - 3, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 4 * dir + dir * 1, headY - 3, 1, 0, Math.PI * 2);
  ctx.fill();

  // ── Nose ──
  ctx.fillStyle = noseColor;
  ctx.beginPath();
  ctx.ellipse(cx + dir * 5, headY + 4, 2.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Mouth (small smile) ──
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx + dir * 5, headY + 5, 3, 0.1, Math.PI * 0.9);
  ctx.stroke();
}

function drawCompanion(x, y, facingRight, variant) {
  // Try image-based rendering
  const humanKey = 'human' + (variant || 1);
  const humanImg = images[humanKey];
  if (humanImg && humanImg.complete && humanImg.naturalWidth > 0) {
    const COMP_W = 42;
    const COMP_H = 56;
    ctx.drawImage(humanImg, x, y, COMP_W, COMP_H);
    return;
  }

  // Fallback: canvas drawing
  const isRed = variant === 2;
  const hairColor = isRed ? '#C0392B' : '#5C4033';

  const COMP_W = 32;
  const COMP_H = 48;
  const cx = x + COMP_W / 2;
  const botY = y + COMP_H;
  const dir = facingRight ? 1 : -1;
  const bob = Math.sin(companion.bobPhase) * 1.5;

  // ── Legs ──
  ctx.fillStyle = '#4A6FA5';
  ctx.fillRect(cx - 6, botY - 14, 5, 14);
  ctx.fillRect(cx + 1, botY - 14, 5, 14);
  // Shoes
  ctx.fillStyle = '#333';
  ctx.fillRect(cx - 7, botY - 3, 7, 3);
  ctx.fillRect(cx, botY - 3, 7, 3);

  // ── Body (T-shirt) ──
  ctx.fillStyle = '#E8E8E8';
  ctx.beginPath();
  ctx.ellipse(cx, botY - 24 + bob, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shirt detail (collar)
  ctx.strokeStyle = '#CCC';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, botY - 33 + bob, 5, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // ── Arms ──
  ctx.strokeStyle = '#FFDAB9';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  // Front arm (waving gently)
  const armWave = Math.sin(companion.bobPhase * 1.5) * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx + dir * 10, botY - 30 + bob);
  ctx.lineTo(cx + dir * 17, botY - 20 + bob + armWave * 4);
  ctx.stroke();
  // Back arm
  ctx.beginPath();
  ctx.moveTo(cx - dir * 10, botY - 30 + bob);
  ctx.lineTo(cx - dir * 15, botY - 22 + bob);
  ctx.stroke();

  // ── Head ──
  const headY = botY - 42 + bob;
  // Hair (behind head)
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.ellipse(cx, headY - 2, 11, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Face
  ctx.fillStyle = '#FFDAB9';
  ctx.beginPath();
  ctx.ellipse(cx, headY, 10, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair top/bangs
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.ellipse(cx, headY - 7, 11, 6, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // ── Eyes ──
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx + dir * 4, headY - 1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - dir * 4, headY - 1, 2, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx + dir * 5, headY - 2, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - dir * 3, headY - 2, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // ── Mouth (small smile) ──
  ctx.strokeStyle = '#C0756B';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, headY + 4, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // ── Blush ──
  ctx.fillStyle = 'rgba(255,150,150,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - 7, headY + 2, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, headY + 2, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawDevice(p, py) {
  const midX = p.x + p.w / 2;
  if (p.device === 'spring') {
    // Determine animation frame
    let springFrame = 1;
    if (p.springAnimIdx >= 0 && p.springAnimIdx < p.springAnimSeq.length) {
      springFrame = p.springAnimSeq[p.springAnimIdx];
    }
    const sKey = 'device_spring_' + springFrame;
    const sImg = images[sKey];
    const sw = 16, sh = 20;
    if (sImg && sImg.complete && sImg.naturalWidth > 0) {
      ctx.drawImage(sImg, midX - sw / 2, py - sh, sw, sh);
    } else {
      // Fallback
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(midX - 8, py - 17, 16, 5);
    }
  } else if (p.device === 'trampoline') {
    let trampFrame = 1;
    if (p.trampAnimIdx >= 0 && p.trampAnimIdx < p.trampAnimSeq.length) {
      trampFrame = p.trampAnimSeq[p.trampAnimIdx];
    }
    const tKey = 'device_trampoline_' + trampFrame;
    const tImg = images[tKey];
    const tw = 60, th = 12;
    if (tImg && tImg.complete && tImg.naturalWidth > 0) {
      ctx.drawImage(tImg, midX - tw / 2, py - th, tw, th);
    } else {
      // Fallback
      ctx.strokeStyle = '#E91E63';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x + 5, py - 3);
      ctx.quadraticCurveTo(midX, py - 10, p.x + p.w - 5, py - 3);
      ctx.stroke();
    }
  }
}

function drawItem(item) {
  const iy = item.y - cameraY;
  if (iy < -30 || iy > GAME_HEIGHT + 30) return;

  // Glow effect behind item
  const pulse = 0.7 + Math.sin(frameCount * 0.1) * 0.3;
  const gcx = item.x + item.w / 2;
  const gcy = iy + item.h / 2 + 10;
  // Outer cyan glow (big circle)
  const r2 = item.w * 1.5;
  const glow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, r2);
  glow.addColorStop(0, `rgba(0, 220, 255, ${0.4 * pulse})`);
  glow.addColorStop(0.5, `rgba(0, 180, 255, ${0.2 * pulse})`);
  glow.addColorStop(1, 'rgba(0, 180, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(gcx, gcy, r2, 0, Math.PI * 2);
  ctx.fill();
  // Inner white core (smaller circle inside)
  const r1 = item.w * 0.6;
  const core = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, r1);
  core.addColorStop(0, `rgba(255, 255, 255, ${0.8 * pulse})`);
  core.addColorStop(0.6, `rgba(255, 255, 255, ${0.3 * pulse})`);
  core.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(gcx, gcy, r1, 0, Math.PI * 2);
  ctx.fill();

  if (item.type === 'propeller') {
    const capImg = images['cap_item'];
    if (capImg && capImg.complete && capImg.naturalWidth > 0) {
      ctx.drawImage(capImg, item.x, iy, item.w, item.h);
    } else {
      // Fallback
      ctx.fillStyle = '#E74C3C';
      ctx.beginPath();
      ctx.ellipse(item.x + 10, iy + 14, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item.type === 'jetpack') {
    const jetImg = images['jet_item'];
    if (jetImg && jetImg.complete && jetImg.naturalWidth > 0) {
      ctx.drawImage(jetImg, item.x, iy, item.w, item.h);
    } else {
      // Fallback
      ctx.fillStyle = '#777';
      ctx.beginPath();
      ctx.roundRect(item.x + 2, iy + 2, 16, 16, 3);
      ctx.fill();
    }
  }
}

function drawPlatformImg(key, x, py, w, h) {
  const img = images[key];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, py, w, h);
    return true;
  }
  return false;
}

function drawPlatform(p) {
  const py = p.y - cameraY;
  if (py < -30 || py > GAME_HEIGHT + 30) return;

  // Exploded platform — smoke animation
  if (p.exploded) {
    if (p.explodedTimer <= 0) return;
    const smokeImg = images['smoke'];
    if (smokeImg && smokeImg.complete && smokeImg.naturalWidth > 0) {
      const totalFrames = SMOKE_FRAMES;
      const maxTimer = 30;
      const frameIdx = Math.min(Math.floor((maxTimer - p.explodedTimer) / (maxTimer / totalFrames)), totalFrames - 1);
      const sx = frameIdx * SMOKE_FRAME_W;
      const sy = SMOKE_ROW * SMOKE_FRAME_H;
      const drawSize = 50;
      ctx.drawImage(smokeImg, sx, sy, SMOKE_FRAME_W, SMOKE_FRAME_H,
        p.x + p.w / 2 - drawSize / 2, py - drawSize / 2 + 5, drawSize, drawSize);
    }
    return;
  }

  // Broken platform
  if (p.broken) {
    drawPlatformImg('plat_broken', p.x, py, p.w, PLATFORM_HEIGHT);
    return;
  }

  // Disappearing: blink effect
  if (p.type === 'disappearing' && !p.visible) return;
  if (p.type === 'disappearing' && p.stepped && p.blinkTimer > 0) {
    if (Math.floor(p.blinkTimer / 4) % 2 === 0) return;
  }

  // Image key mapping (type -> image name)
  let imgKey = 'plat_' + p.type;
  if (p.type === 'exploding') imgKey = 'plat_explode';
  if (p.type === 'moving_v') imgKey = 'plat_moving_v';

  // Exploding platform: pulse when timer active
  if (p.type === 'exploding' && p.explodeTimer > 0) {
    const pulse = Math.sin(frameCount * 0.5) * 0.15 + 0.85;
    ctx.globalAlpha = pulse;
    drawPlatformImg(imgKey, p.x, py, p.w, PLATFORM_HEIGHT);
    ctx.globalAlpha = 1.0;
  } else {
    drawPlatformImg(imgKey, p.x, py, p.w, PLATFORM_HEIGHT);
  }

  // Draw device on top
  if (p.device) {
    drawDevice(p, py);
  }
}

function drawCorgiFace(cx, cy, size) {
  const s = size / 50; // scale factor

  // Face
  ctx.fillStyle = '#DEB887';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 22 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#D2691E';
  ctx.beginPath();
  ctx.moveTo(cx - 16 * s, cy - 10 * s);
  ctx.lineTo(cx - 26 * s, cy - 30 * s);
  ctx.lineTo(cx - 4 * s, cy - 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 16 * s, cy - 10 * s);
  ctx.lineTo(cx + 26 * s, cy - 30 * s);
  ctx.lineTo(cx + 4 * s, cy - 14 * s);
  ctx.closePath();
  ctx.fill();
  // Inner ears
  ctx.fillStyle = '#FFCBA4';
  ctx.beginPath();
  ctx.moveTo(cx - 14 * s, cy - 11 * s);
  ctx.lineTo(cx - 22 * s, cy - 27 * s);
  ctx.lineTo(cx - 6 * s, cy - 15 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 14 * s, cy - 11 * s);
  ctx.lineTo(cx + 22 * s, cy - 27 * s);
  ctx.lineTo(cx + 6 * s, cy - 15 * s);
  ctx.closePath();
  ctx.fill();

  // White muzzle
  ctx.fillStyle = '#FFF8E7';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 8 * s, cy - 3 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 8 * s, cy - 3 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx - 7 * s, cy - 4 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 9 * s, cy - 4 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2 * s, 3.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 4.5 * s);
  ctx.lineTo(cx - 5 * s, cy + 9 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + 4.5 * s);
  ctx.lineTo(cx + 5 * s, cy + 9 * s);
  ctx.stroke();
}

function drawCorgiFace2(cx, cy, size) {
  // Cream/light corgi variant
  const s = size / 50;

  // Face
  ctx.fillStyle = '#F5DEB3';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 22 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#E8C88A';
  ctx.beginPath();
  ctx.moveTo(cx - 16 * s, cy - 10 * s);
  ctx.lineTo(cx - 26 * s, cy - 30 * s);
  ctx.lineTo(cx - 4 * s, cy - 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 16 * s, cy - 10 * s);
  ctx.lineTo(cx + 26 * s, cy - 30 * s);
  ctx.lineTo(cx + 4 * s, cy - 14 * s);
  ctx.closePath();
  ctx.fill();
  // Inner ears
  ctx.fillStyle = '#FFECD2';
  ctx.beginPath();
  ctx.moveTo(cx - 14 * s, cy - 11 * s);
  ctx.lineTo(cx - 22 * s, cy - 27 * s);
  ctx.lineTo(cx - 6 * s, cy - 15 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 14 * s, cy - 11 * s);
  ctx.lineTo(cx + 22 * s, cy - 27 * s);
  ctx.lineTo(cx + 6 * s, cy - 15 * s);
  ctx.closePath();
  ctx.fill();

  // White muzzle
  ctx.fillStyle = '#FFFAF0';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#4A3728';
  ctx.beginPath();
  ctx.arc(cx - 8 * s, cy - 3 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 8 * s, cy - 3 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx - 7 * s, cy - 4 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 9 * s, cy - 4 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#C0756B';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2 * s, 3.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#7A5C4F';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 4.5 * s);
  ctx.lineTo(cx - 5 * s, cy + 9 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + 4.5 * s);
  ctx.lineTo(cx + 5 * s, cy + 9 * s);
  ctx.stroke();
}

function drawHumanFace(cx, cy, size) {
  const s = size / 50;

  // Hair behind
  ctx.fillStyle = '#5C4033';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 4 * s, 22 * s, 24 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face
  ctx.fillStyle = '#FFDAB9';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 20 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair bangs
  ctx.fillStyle = '#5C4033';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 14 * s, 22 * s, 12 * s, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 7 * s, cy - 2 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 7 * s, cy - 2 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx - 6 * s, cy - 3 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 8 * s, cy - 3 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#C0756B';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.arc(cx, cy + 8 * s, 5 * s, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Blush
  ctx.fillStyle = 'rgba(255,150,150,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx - 14 * s, cy + 4 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 14 * s, cy + 4 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHumanFace2(cx, cy, size) {
  // Red-haired variant
  const s = size / 50;

  // Hair behind
  ctx.fillStyle = '#C0392B';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 4 * s, 22 * s, 24 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face
  ctx.fillStyle = '#FFDAB9';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 20 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair bangs
  ctx.fillStyle = '#C0392B';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 14 * s, 22 * s, 12 * s, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 7 * s, cy - 2 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 7 * s, cy - 2 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx - 6 * s, cy - 3 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 8 * s, cy - 3 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#C0756B';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.arc(cx, cy + 8 * s, 5 * s, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Blush
  ctx.fillStyle = 'rgba(255,150,150,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx - 14 * s, cy + 4 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 14 * s, cy + 4 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMenuBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  grad.addColorStop(0, '#2C3E7B');
  grad.addColorStop(1, '#87CEEB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  // Animated clouds (image-based, spread across full screen)
  for (let i = 0; i < 8; i++) {
    const cloudType = CLOUD_SIZES[i % 3];
    const cImg = images[cloudType.key];
    if (cImg && cImg.complete && cImg.naturalWidth > 0) {
      const cx = ((i * 67 + 20) + frameCount * (0.15 + i * 0.02)) % (GAME_WIDTH + 80) - 40;
      const cy = 40 + i * 80;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(cImg, cx, cy, cloudType.w, cloudType.h);
      ctx.globalAlpha = 1.0;
    }
  }
}

function drawRoundButton(x, y, w, h, label, color, enabled) {
  const r = 12;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w, h, r);
  ctx.fill();
  // Background
  ctx.fillStyle = enabled ? color : '#999';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  // Text
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 20px KerisKedyuche, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.textBaseline = 'alphabetic';
}

// Title screen bouncing characters - one at a time, random order
const titleCharDefs = [
  { type: 'corgi', variant: 1, flip: false },
  { type: 'corgi', variant: 1, flip: true },
  { type: 'corgi', variant: 2, flip: false },
  { type: 'corgi', variant: 2, flip: true },
  { type: 'human', variant: 2, flip: false },
  { type: 'human', variant: 1, flip: false },
  { type: 'corgi_cap', variant: 1, flip: false },
  { type: 'corgi_cap', variant: 1, flip: true },
  { type: 'portrait', img: 'pbrk', flip: false },
  { type: 'portrait', img: 'tri', flip: true },
];
function createTitleJumper() {
  const idx = Math.floor(Math.random() * titleCharDefs.length);
  const def = titleCharDefs[idx];
  const peakTravel = GAME_HEIGHT / 2 + 65 + (Math.random() - 0.5) * 60; // vary height
  let vy;
  if (def.type === 'corgi_cap') vy = PROPELLER_SPEED;
  else if (def.type === 'corgi_jet') vy = JETPACK_SPEED;
  else vy = -Math.sqrt(2 * 0.4 * peakTravel);
  return {
    idx,
    x: GAME_WIDTH / 2,
    vy,
    y: GAME_HEIGHT,
    reachedPeak: false,
  };
}
let titleJumpers = [createTitleJumper()];
let titleSpawnDelay = 0;

function drawTitleScreen() {
  drawMenuBg();

  // Title
  ctx.font = 'bold 46px KerisKedyuche, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFF';
  ctx.fillText('코기점푸!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 130);

  // Bouncing characters - one or two at a time
  const peakY = GAME_HEIGHT / 2 - 65;

  // Spawn new jumper with delay
  if (titleSpawnDelay > 0) {
    titleSpawnDelay--;
  } else if (titleJumpers.length === 0) {
    titleJumpers.push(createTitleJumper());
    titleSpawnDelay = 60; // ~1초 대기
  } else if (titleJumpers.length === 1 && Math.random() < 0.003) {
    titleJumpers.push(createTitleJumper());
  }

  for (let ji = titleJumpers.length - 1; ji >= 0; ji--) {
    const tj = titleJumpers[ji];
    const td = titleCharDefs[tj.idx];

    if (td.type === 'corgi_cap' || td.type === 'corgi_jet') {
      const riseSpeed = td.type === 'corgi_cap' ? PROPELLER_SPEED : JETPACK_SPEED;
      if (!tj.reachedPeak) {
        tj.vy = riseSpeed;
        tj.y += tj.vy;
        if (tj.y <= peakY + (Math.random() - 0.5) * 30) {
          tj.reachedPeak = true;
          tj.vy = 2;
        }
      } else {
        tj.vy += 0.4;
        tj.y += tj.vy;
      }
    } else {
      tj.vy += 0.4;
      tj.y += tj.vy;
    }

    // Remove when off screen, spawn replacement
    if (tj.y >= GAME_HEIGHT + 60) {
      titleJumpers.splice(ji, 1);
      titleSpawnDelay = 40 + Math.floor(Math.random() * 40); // 0.7~1.3초 대기
      continue;
    }

  if (tj.y < GAME_HEIGHT + 60) {
    // Helper to draw with optional flip
    function drawTitleSprite(img, x, y, w, h, flip) {
      if (!img || !img.complete) return;
      if (flip) {
        ctx.save();
        ctx.translate(x + w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, y, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
    }

    if (td.type === 'corgi_cap') {
      if (!tj.reachedPeak && frameCount % 4 === 0) {
        starParticles.push({
          x: tj.x + (Math.random() - 0.5) * 16, y: tj.y,
          vy: 1 + Math.random() * 2, vx: (Math.random() - 0.5) * 1.5,
          size: 10 + Math.random() * 8, life: 40, rot: Math.random() * Math.PI * 2,
        });
      }
      const capIdx = (Math.floor(frameCount / 4) % 8) + 1;
      const capFrame = images['cap_' + capIdx];
      drawTitleSprite(capFrame, tj.x - PLAYER_W / 2, tj.y - PLAYER_H, PLAYER_W, PLAYER_H, td.flip);
    } else if (td.type === 'corgi_jet') {
      if (!tj.reachedPeak && frameCount % 2 === 0) {
        rainbowTrail.push({ x: tj.x, y: tj.y - cameraY, life: 30 });
      }
      const jetIdx = (Math.floor(frameCount / 5) % 2) + 1;
      const jetFrame = images['jet_' + jetIdx];
      drawTitleSprite(jetFrame, tj.x - PLAYER_W / 2, tj.y - PLAYER_H, PLAYER_W, PLAYER_H, td.flip);
    } else if (td.type === 'corgi') {
      const prefix = 'corgi' + td.variant;
      const frame = tj.vy < 0 ? 3 : 1;
      drawTitleSprite(images[prefix + '_' + frame], tj.x - PLAYER_W / 2, tj.y - PLAYER_H, PLAYER_W, PLAYER_H, td.flip);
    } else if (td.type === 'portrait') {
      drawTitleSprite(images[td.img], tj.x - PLAYER_W / 2, tj.y - PLAYER_H, PLAYER_W, PLAYER_H, td.flip);
    } else {
      drawTitleSprite(images['human' + td.variant], tj.x - 21, tj.y - 56, 42, 56, td.flip);
    }
  }
  } // end for loop

  // Update & draw rainbow trail on title screen
  rainbowTrail = rainbowTrail.filter(r => { r.life--; return r.life > 0; });
  const rbImgT = images['rainbow'];
  if (rbImgT && rbImgT.complete && rbImgT.naturalWidth > 0) {
    for (const r of rainbowTrail) {
      ctx.globalAlpha = (r.life / 30) * 0.8;
      ctx.drawImage(rbImgT, r.x - 15, r.y, 30, 10);
    }
    ctx.globalAlpha = 1.0;
  }

  // Update star particles on title screen
  starParticles = starParticles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += 0.1;
    p.life--;
    return p.life > 0;
  });

  // Star particles on title screen
  const starImgT = images['star'];
  if (starImgT && starImgT.complete && starImgT.naturalWidth > 0) {
    for (const s of starParticles) {
      ctx.globalAlpha = s.life / 40;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.drawImage(starImgT, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  // Buttons (on top of characters)
  drawRoundButton(TITLE_BTN_X, TITLE_BTN_Y1, TITLE_BTN_W, TITLE_BTN_H, '싱글플레이', '#4CAF50', true);
  drawRoundButton(TITLE_BTN_X, TITLE_BTN_Y2, TITLE_BTN_W, TITLE_BTN_H, '멀티플레이', '#2196F3', true);

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '12px KerisKedyuche, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('hermalang games', GAME_WIDTH / 2, GAME_HEIGHT - 20);
}

function drawCharButton(bx, by, size, borderColor, isSelected, drawFaceFn, label) {
  const r = 12;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.roundRect(bx + 2, by + 2, size, size, r); ctx.fill();
  // Background
  ctx.fillStyle = isSelected ? '#FFFDE7' : '#FFF';
  ctx.beginPath(); ctx.roundRect(bx, by, size, size, r); ctx.fill();
  // Border (thicker if selected)
  ctx.strokeStyle = isSelected ? '#FFD700' : borderColor;
  ctx.lineWidth = isSelected ? 5 : 3;
  ctx.stroke();
  // Face
  drawFaceFn(bx + size / 2, by + size / 2 - 2, size * 0.65);
  // Label
  ctx.fillStyle = '#FFF'; ctx.font = '12px KerisKedyuche, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(label, bx + size / 2, by + size + 16);
  // Checkmark if selected
  if (isSelected) {
    const selImg = images['select'];
    if (selImg && selImg.complete) ctx.drawImage(selImg, bx + size - 24, by + 4, 20, 20);
  }
}

function drawCharSelectScreen() {
  drawMenuBg();

  // Title
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 32px KerisKedyuche, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('캐릭터 선택', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 160);

  const col0 = CHAR_START_X;
  const col1 = CHAR_START_X + CHAR_BTN_SIZE + CHAR_GAP;
  const S = CHAR_BTN_SIZE;

  // Row labels
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '16px KerisKedyuche, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('코기', col0, CHAR_ROW1_Y - 8);
  ctx.fillText('반려자', col0, CHAR_ROW2_Y - 8);

  // Corgi buttons (image-based, same style as human)
  function drawCorgiImgBtn(imgKey, fallbackFn, cx, cy, size) {
    const img = images[imgKey];
    if (img && img.complete && img.naturalWidth > 0) {
      const sw = 144, sh = 120;
      const cr = 10;
      const scale = 1.2;
      const dw = size * scale;
      const dh = dw * (sh / sw);
      const dx = cx - dw / 2, dy = cy - dh / 2;
      const bx = cx - size / 2, by = cy - size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, size, size, cr);
      ctx.clip();
      ctx.fillStyle = '#FFF';
      ctx.fillRect(bx, by, size, size);
      ctx.drawImage(img, 0, 0, sw, sh, dx, dy + 8, dw, dh);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, size, size, cr);
      ctx.stroke();
    } else {
      fallbackFn(cx, cy, size);
    }
  }

  // Corgi 1 (펨브로크)
  drawCorgiImgBtn('pbrk', drawCorgiFace, col0 + S / 2, CHAR_ROW1_Y + S / 2, S);
  if (selectedCorgi === 1) {
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(col0, CHAR_ROW1_Y, S, S, 12); ctx.stroke();
    const selImg1 = images['select'];
    if (selImg1 && selImg1.complete) ctx.drawImage(selImg1, col0 + S - 24, CHAR_ROW1_Y + 4, 20, 20);
  }
  ctx.fillStyle = '#FFF'; ctx.font = '12px KerisKedyuche, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('펨브로크', col0 + S / 2, CHAR_ROW1_Y + S + 16);

  // Corgi 2 (트라이)
  drawCorgiImgBtn('tri', drawCorgiFace2, col1 + S / 2, CHAR_ROW1_Y + S / 2, S);
  if (selectedCorgi === 2) {
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(col1, CHAR_ROW1_Y, S, S, 12); ctx.stroke();
    const selImg2 = images['select'];
    if (selImg2 && selImg2.complete) ctx.drawImage(selImg2, col1 + S - 24, CHAR_ROW1_Y + 4, 20, 20);
  }
  ctx.fillStyle = '#FFF'; ctx.font = '12px KerisKedyuche, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('트라이', col1 + S / 2, CHAR_ROW1_Y + S + 16);

  // Human buttons
  // Human buttons: crop square face from full body image
  function drawHumanImgBtn(img, fallbackFn, cx, cy, size) {
    if (img && img.complete && img.naturalWidth > 0) {
      // Image as-is (144:120 ratio), square border around it
      const sw = 144, sh = 120;
      const cr = 10;
      const dw = size;
      const dh = size * (sh / sw);
      const dx = cx - dw / 2, dy = cy - dh / 2;
      const bx = cx - size / 2, by = cy - size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, size, size, cr);
      ctx.clip();
      ctx.fillStyle = '#FFF';
      ctx.fillRect(bx, by, size, size);
      ctx.drawImage(img, 0, 0, sw, sh, dx, dy + 8, dw, dh);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, size, size, cr);
      ctx.stroke();
    } else {
      fallbackFn(cx, cy, size);
    }
  }
  const drawHumanImg1 = (cx, cy, size) => drawHumanImgBtn(images['human1'], drawHumanFace, cx, cy, size);
  const drawHumanImg2 = (cx, cy, size) => drawHumanImgBtn(images['human2'], drawHumanFace2, cx, cy, size);
  // Human 1
  drawHumanImg1(col0 + S / 2, CHAR_ROW2_Y + S / 2, S);
  if (selectedHuman === 1) {
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(col0, CHAR_ROW2_Y, S, S, 12); ctx.stroke();
    const selImg3 = images['select'];
    if (selImg3 && selImg3.complete) ctx.drawImage(selImg3, col0 + S - 24, CHAR_ROW2_Y + 4, 20, 20);
  }
  ctx.fillStyle = '#FFF'; ctx.font = '12px KerisKedyuche, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('엄마', col0 + S / 2, CHAR_ROW2_Y + S + 16);

  // Human 2
  drawHumanImg2(col1 + S / 2, CHAR_ROW2_Y + S / 2, S);
  if (selectedHuman === 2) {
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(col1, CHAR_ROW2_Y, S, S, 12); ctx.stroke();
    const selImg4 = images['select'];
    if (selImg4 && selImg4.complete) ctx.drawImage(selImg4, col1 + S - 24, CHAR_ROW2_Y + 4, 20, 20);
  }
  ctx.fillStyle = '#FFF'; ctx.font = '12px KerisKedyuche, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('아빠', col1 + S / 2, CHAR_ROW2_Y + S + 16);

  // Start button (only if both selected)
  if (selectedCorgi && selectedHuman) {
    const startW = 180;
    const startX = GAME_WIDTH / 2 - startW / 2;
    drawRoundButton(startX, CHAR_GO_BTN_Y, startW, 50, '시작!', '#4CAF50', true);
  } else {
    // Hint text
  }
}

function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 36px KerisKedyuche, sans-serif';
  ctx.textAlign = 'center';

  if (isMultiplayer) {
    // Multiplayer result
    let resultText = 'Game Over';
    if (opponentDied && opponent) {
      resultText = score >= opponent.score ? '승리!' : '패배...';
    } else if (!opponentDied) {
      resultText = '패배...';
    }
    ctx.fillText(resultText, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100);

    ctx.font = '18px KerisKedyuche, sans-serif';
    ctx.fillText('나: ' + score, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60);
    if (opponent) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(opponent.name + ': ' + opponent.score, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
    }

    drawRoundButton(GO_BTN_X, GO_BTN_Y1, GO_BTN_W, GO_BTN_H, '로비로', '#607D8B', true);
  } else {
    ctx.fillText('Game Over', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110);
    ctx.font = '22px KerisKedyuche, sans-serif';
    ctx.fillText('Score: ' + score, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70);
    if (score >= highScore && score > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('New Best!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
    }

    drawRoundButton(GO_BTN_X, GO_BTN_Y1, GO_BTN_W, GO_BTN_H, '재시작', '#4CAF50', true);
    drawRoundButton(GO_BTN_X, GO_BTN_Y2, GO_BTN_W, GO_BTN_H, '처음으로', '#607D8B', true);
  }
}

function draw() {
  if (screenState === 'title') { drawTitleScreen(); return; }
  if (screenState === 'charSelect') { drawCharSelectScreen(); return; }

  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  grad.addColorStop(0, '#4A90D9');
  grad.addColorStop(1, '#87CEEB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Clouds (seeded pseudo-random, image-based)
  const cloudSpacing = 160;
  const cloudStartY = Math.floor(cameraY / cloudSpacing) * cloudSpacing;
  for (let i = -1; i < Math.ceil(GAME_HEIGHT / cloudSpacing) + 2; i++) {
    const worldY = cloudStartY + i * cloudSpacing;
    const seed = Math.abs(worldY * 7919 + 1301) % 10000;
    const cloudType = CLOUD_SIZES[seed % 3];
    const cx = seed % (GAME_WIDTH - Math.floor(cloudType.w));
    const cy = (worldY - cameraY) + (seed % 60);
    if (cy < -50 || cy > GAME_HEIGHT + 50) continue;
    const cImg = images[cloudType.key];
    if (cImg && cImg.complete && cImg.naturalWidth > 0) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(cImg, cx, cy, cloudType.w, cloudType.h);
      ctx.globalAlpha = 1.0;
    }
  }

  // Platforms
  for (const p of platforms) {
    drawPlatform(p);
  }

  // Multiplayer: draw opponent (semi-transparent ghost)
  if (isMultiplayer && opponent && opponent.alive) {
    ctx.globalAlpha = 0.45;
    const oppScreenY = opponent.y - (-cameraY) - PLAYER_H; // convert world Y to screen Y
    drawCorgi(opponent.x, oppScreenY, opponent.facingRight, opponent.corgi || 1);
    ctx.globalAlpha = 1.0;
    // Opponent name tag
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 11px KerisKedyuche, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opponent.name, opponent.x + PLAYER_W / 2, oppScreenY - 6);
  }

  // Rainbow trail (behind player)
  const rbImg = images['rainbow'];
  if (rbImg && rbImg.complete && rbImg.naturalWidth > 0 && rainbowTrail.length > 0) {
    for (const r of rainbowTrail) {
      const screenY = r.y - cameraY;
      if (screenY < -20 || screenY > GAME_HEIGHT + 20) continue;
      const alpha = r.life / 30;
      ctx.globalAlpha = alpha * 0.8;
      const rw = 30, rh = 10;
      ctx.drawImage(rbImg, r.x - rw / 2, screenY, rw, rh);
    }
    ctx.globalAlpha = 1.0;
  }

  // Star particles (behind player)
  const starImg = images['star'];
  if (starImg && starImg.complete && starImg.naturalWidth > 0) {
    for (const s of starParticles) {
      ctx.globalAlpha = s.life / 40;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.drawImage(starImg, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  // Companion (human, drawn behind player)
  drawCompanion(companion.x, companion.y, companion.facingRight, selectedHuman || 1);

  // Player (corgi)
  drawCorgi(player.x, player.y, player.facingRight, selectedCorgi || 1);

  // Items (top z-order)
  for (const item of items) {
    if (!item.collected) drawItem(item);
  }

  // Score panel
  const spImg = images['score_pannel'];
  if (spImg && spImg.complete && spImg.naturalWidth > 0) {
    const ph = 25;
    const pw = Math.round(ph * (spImg.naturalWidth / spImg.naturalHeight));
    const scoreText = '' + score;
    ctx.font = 'bold 13px KerisKedyuche, sans-serif';
    const textW = ctx.measureText(scoreText).width;
    const panelW = Math.round(textW + 16);
    const panelX = Math.round(GAME_WIDTH / 2 - (pw + panelW + pw) / 2);
    const panelY = 8;
    // Left cap
    ctx.drawImage(spImg, panelX, panelY, pw, ph);
    // Center black fill
    ctx.fillStyle = '#000';
    ctx.fillRect(panelX + pw - 1, panelY, panelW + 2, ph - 0.4);
    // Right cap (flipped)
    ctx.save();
    ctx.translate(panelX + pw + panelW + pw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(spImg, 0, panelY, pw, ph);
    ctx.restore();
    // Score text
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 13px KerisKedyuche, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(scoreText, panelX + pw + panelW / 2, panelY + ph / 2 + 5);
  } else {
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px KerisKedyuche, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 10, 30);
  }
  if (isMultiplayer && opponent) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '14px KerisKedyuche, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(opponent.name + ': ' + opponent.score + (opponent.alive ? '' : ' (탈락)'), 10, 50);
  }

  // Active item indicator
  if (player.activeItem) {
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px KerisKedyuche, sans-serif';
    ctx.textAlign = 'right';
    const label = player.activeItem === 'propeller' ? '🚁 프로펠러' : '🚀 제트팩';
    ctx.fillText(label, GAME_WIDTH - 10, 30);
    // Timer bar
    const maxTimer = player.activeItem === 'propeller' ? PROPELLER_DURATION : JETPACK_DURATION;
    const ratio = player.itemTimer / maxTimer;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(GAME_WIDTH - 110, 36, 100, 6);
    ctx.fillStyle = player.activeItem === 'propeller' ? '#3498DB' : '#FF4500';
    ctx.fillRect(GAME_WIDTH - 110, 36, 100 * ratio, 6);
  }

  // Start screen (waiting for first input)
  if (!gameStarted && !gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = '#FFF';
    ctx.font = '18px KerisKedyuche, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('터치 / 클릭으로 시작', GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.font = '14px KerisKedyuche, sans-serif';
    ctx.fillText('왼쪽 = 왼쪽 이동  |  오른쪽 = 오른쪽 이동', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
  }

  // Game over screen
  if (screenState === 'gameOver') {
    drawGameOverScreen();
  }
}

// ── Game loop ──
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ── Multiplayer functions (called from lobby.js) ──
function startMultiplayerGame(data) {
  isMultiplayer = true;
  multiSeed = data.seed;
  opponentDied = false;

  // Find my data and opponent data
  const me = data.players.find(p => p.id === (socket ? socket.id : ''));
  const opp = data.players.find(p => p.id !== (socket ? socket.id : ''));

  selectedCorgi = me ? me.corgi : 1;
  selectedHuman = me ? me.human : 1;

  opponent = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 100,
    score: 0,
    facingRight: true,
    corgi: opp ? opp.corgi : 1,
    human: opp ? opp.human : 1,
    name: opp ? opp.name : '상대',
    alive: true,
  };

  screenState = 'playing';
  init();
}

function updateOpponent(state) {
  if (!opponent) return;
  opponent.x = state.x;
  opponent.y = state.y;
  opponent.score = state.score;
  opponent.facingRight = state.facingRight;
}

function onOpponentDied(data) {
  if (!opponent) return;
  opponent.alive = false;
  opponent.score = data.score;
  opponentDied = true;
}

function returnToLobbyFromGame() {
  isMultiplayer = false;
  opponent = null;
  opponentDied = false;
  screenState = 'title';
  if (typeof backToLobbyFromRoom === 'function') {
    backToLobbyFromRoom();
    showLobby();
  }
}

init();
loop();
