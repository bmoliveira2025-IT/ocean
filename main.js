// main.js - Snake Jungle Slither-Style Open World
var globalPlayerName = "";
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Constants and Config for Open World
const WORLD_SIZE = 5000;
const TILE_SIZE = 28; // Increased for chunkier look
const TURN_SPEED = 0.12; // Smoother turns for thick body
const SEGMENT_DISTANCE = 10; // Tighter overlap for scales
const TRAIL_MAX = 5000; // Consistent trail
const BASE_MOVE_SPEED = 200; 

// DOM Elements
const screenMenu = document.getElementById("menu-screen");
const screenGame = document.getElementById("game-screen");
const screenOver = document.getElementById("gameover-screen");
const screenRank = document.getElementById("ranking-screen");
const appContainer = document.getElementById("app-container");
const statsScore = document.getElementById("stats-score");
const statsLives = document.getElementById("stats-lives");
const liveRankList = document.getElementById("live-ranking");

// UI Elements
const uiScore = document.getElementById("ui-score");
const uiHighScore = document.getElementById("ui-high-score");
const uiLevel = document.getElementById("ui-level");
const uiCombo = document.getElementById("ui-combo");
const uiPtsNext = document.getElementById("ui-pts-next");
const uiProgress = document.getElementById("ui-progress");
const uiLivesContainer = document.getElementById("ui-lives");
const finalScore = document.getElementById("final-score");
const finalLevel = document.getElementById("final-level");
const rankingList = document.getElementById("ranking-list");
const rankInputArea = document.getElementById("ranking-input-area");
const playerNameInput = document.getElementById("player-name");
const menuPlayerName = document.getElementById("menu-player-name");

// Buttons
const btnMap = document.querySelectorAll(".map-btn");
const btnSpeed = document.querySelectorAll(".speed-btn");
const btnSkin = document.querySelectorAll(".cosmetic-btn");
const btnPlay = document.getElementById("btn-play");
const btnRanking = document.getElementById("btn-ranking");
const btnRestart = document.getElementById("btn-restart");
const btnMenuOver = document.getElementById("btn-menu-over");
const btnBackMenu = document.getElementById("btn-back-menu");
const btnSaveScore = document.getElementById("btn-save-score");
const btnQuit = document.getElementById("btn-quit");

// Game State
const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3, RANKING: 4 };
let currentState = STATE.MENU;

// Settings
let activeMode = "selva";
let baseSpeed = 6;
const COSMETIC_CATALOG = {
    eyes: {
        friendly: { name: "Olhos Simpáticos", price: 0, style: "friendly" },
        cyber: { name: "Olhos Cyber", price: 300, style: "cyber" },
        angry: { name: "Olhos Irritados", price: 400, style: "angry" },
        cute: { name: "Olhos Fofos", price: 500, style: "cute" }
    },
    hair: {
        none: { name: "Nenhum", price: 0, style: "none" },
        crazy: { name: "Cabelo Maluco", price: 300, style: "crazy" },
        chef: { name: "Chapéu de Chef", price: 500, style: "chef" },
        party: { name: "Chapéu de Festa", price: 200, style: "party" },
        metal: { name: "Metaleiro", price: 800, style: "metal" },
        emo: { name: "Cabelo Emo", price: 750, style: "emo" }
    },
    heads: {
        none: { name: "Padrão", price: 0, decoration: "none" },
        horns: { name: "Chifres Dracônicos", price: 300, decoration: "horns" },
        cat: { name: "Orelhas de Gato", price: 400, decoration: "cat" },
        dog: { name: "Orelhas de Dog", price: 400, decoration: "dog" },
        cyber: { name: "Visor Cyber", price: 600, decoration: "cyber" },
        crown: { name: "Coroa Real", price: 1000, decoration: "crown" }
    },
    bodies: {
        emerald: { name: "Esmeralda", color: "#10b981", glow: "#34d399", price: 0 },
        lava: { name: "Lava", color: "#ef4444", glow: "#f87171", price: 500 },
        frost: { name: "Gelo", color: "#38bdf8", glow: "#7dd3fc", price: 400 },
        neon: { name: "Neon", color: "#f472b6", glow: "#fb923c", price: 600 },
        gold: { name: "Ouro", color: "#fbbf24", glow: "#fcd34d", price: 1000 },
        ruby: { name: "Rubi", color: "#991b1b", glow: "#dc2626", price: 800 },
        cyber: { name: "Cyber", color: "#06b6d4", glow: "#22d3ee", price: 1200 },
        shadow: { name: "Shadow", color: "#1e1b4b", glow: "#4338ca", price: 900 },
        forest: { name: "Floresta", price: 300, color: "#166534", glow: "#22c55e" },
        soul: { name: "Alma", price: 1500, color: "#f8fafc", glow: "#94a3b8" },
        holographic: { name: "Holográfico", price: 2000, color: "#60a5fa", glow: "#f472b6" }
    },
    tails: {
        standard: { name: "Padrão", price: 0, type: "none" },
        glow: { name: "Ponta Brilhante", price: 400, type: "glow" },
        spiky: { name: "Espinhos", price: 600, type: "spikes" },
        cyber: { name: "Terminal Cyber", price: 800, type: "cyber" },
        chain: { name: "Corrente", price: 700, type: "chain" },
        fire: { name: "Fogo Infernal", price: 900, type: "fire" },
        skeleton: { name: "Cauda Óssea", price: 1200, type: "skeleton" }
    }
};

let totalCoins = parseInt(localStorage.getItem("snake-brasil-coins") || "0");
let unlockedCosmetics = JSON.parse(localStorage.getItem("snake-brasil-unlocks-v3") || JSON.stringify({
    eyes: ["friendly"],
    hair: ["none"],
    heads: ["none"],
    bodies: ["emerald"],
    tails: ["standard"]
}));

let playerCustomization = JSON.parse(localStorage.getItem("snake-brasil-custom-v2") || JSON.stringify({
    eye: "friendly",
    hair: "none",
    head: "none",
    body: "emerald",
    tail: "standard"
}));

const uiTotalCoins = document.getElementById("ui-total-coins");
const menuCoinBalance = document.getElementById("menu-coin-balance");

let currentZoom = 1.0;
let camX = 0, camY = 0;
let camOffset = { x: 0, y: 0 };
let gameLoopId = null;
const particles = [];
const lavaDrops = [];
const iceShards = [];

class LavaDrop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.scale = 0.1; // Represents height/depth
        this.alpha = 0;
        this.done = false;
        this.speed = Math.random() * 0.02 + 0.01;
    }
    update() {
        this.scale += this.speed;
        this.alpha = Math.min(1, this.scale * 2);
        if (this.scale >= 1.2) {
            this.done = true;
            spawnBurst(this.x, this.y, "#ef4444", 8); // Splash!
            SFX.collect(); // Subtle impact sound
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 20 * this.scale;
        ctx.shadowColor = "#f97316";
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 10 * this.scale);
        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.5, "#fbbf24");
        grad.addColorStop(1, "#ef4444");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10 * this.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class IceShard {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.size = Math.random() * 20 + 20;
        this.rotation = Math.random() * Math.PI * 2;
        this.done = false;
    }
    update(snakes) {
        // Check distance to all snake heads
        for (let s of snakes) {
            const dx = s.x - this.x;
            const dy = s.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 60) {
                this.done = true;
                spawnBurst(this.x, this.y, "#7dd3fc", 15); // Shatter!
                SFX.hit(); // Glass/Ice break feel
            }
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#38bdf8";
        
        ctx.fillStyle = "rgba(186, 230, 253, 0.7)";
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size/2, this.size/2);
        ctx.lineTo(-this.size/2, this.size/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
}
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= this.decay; }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 3 * this.life, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class FlameParticle extends Particle {
    constructor(x, y) {
        super(x, y, `hsl(${Math.random() * 40 + 10}, 100%, 50%)`); // Red to Yellow
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.size = Math.random() * 8 + 4;
        this.decay = Math.random() * 0.03 + 0.03;
    }
    update() {
        super.update();
        this.size *= 0.95;
        this.vy -= 0.2; // Float upwards
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function spawnBurst(x, y, color, count=10) {
    for(let i=0; i<count; i++) particles.push(new Particle(x, y, color));
}

function spawnFlame(x, y, count=2) {
    for(let i=0; i<count; i++) particles.push(new FlameParticle(x, y));
}

// Procedural Skin Patterns & Effects
const SKIN_EFFECTS = {
    shadow: (ctx, x, y, radius, time) => {
        const pulse = Math.sin(time / 200) * 0.2 + 0.8;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, "#a855f7"); grad.addColorStop(pulse, "#1e1b4b");
        ctx.fillStyle = grad; 
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    },
    cyber: (ctx, x, y, radius, time) => {
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2;
        ctx.beginPath();
        const angle = (time / 500) % (Math.PI * 2);
        ctx.moveTo(x - radius, y);
        ctx.lineTo(x + radius, y);
        ctx.stroke();
    },
    ruby: (ctx, x, y, radius, time) => {
        const grad = ctx.createLinearGradient(x-radius, y-radius, x+radius, y+radius);
        const pos = (time / 1000) % 1;
        grad.addColorStop(0, "#450a0a"); grad.addColorStop(pos, "#ef4444"); grad.addColorStop(1, "#450a0a");
        ctx.fillStyle = grad; 
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    },
    soul: (ctx, x, y, radius, time) => {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#fff"; 
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    },
    holographic: (ctx, x, y, radius, time) => {
        const hue = (time / 10 + x / 10 + y / 10) % 360;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `hsla(${hue}, 80%, 80%, 0.8)`);
        grad.addColorStop(1, `hsla(${(hue + 60) % 360}, 80%, 50%, 0.4)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 1)`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
};

// Textures are handled via COSMETIC_CATALOG now

const bgImage = new Image();
bgImage.src = "/assets/cheerful_slither_bg_1773599059817.png";

// Image Processing: Robust black background removal
function processImageTransparency(img) {
    const tempCanvas = document.createElement('canvas');
    const tCtx = tempCanvas.getContext('2d');
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    tCtx.drawImage(img, 0, 0);
    const imageData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        // Check if pixel is "dark enough" to be considered background
        // Using a threshold for the sum helps with noisy blacks
        if (r + g + b < 60) {
            data[i+3] = 0; 
        }
    }
    tCtx.putImageData(imageData, 0, 0);
    const newImg = new Image();
    newImg.src = tempCanvas.toDataURL();
    return newImg;
}

const btnFullscreen = document.getElementById("btn-fullscreen");

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

const fruitTypes = [
    { name: 'apple', img: new Image(), src: "assets/modern_apple_glow.png" },
    { name: 'banana', img: new Image(), src: "assets/modern_banana_glow.png" },
    { name: 'watermelon', img: new Image(), src: "assets/modern_watermelon_glow.png" },
    { name: 'pineapple', img: new Image(), src: "assets/modern_pineapple_glow.png" }
];

fruitTypes.forEach(f => {
    f.img.onload = () => {
        if (!f.processed && f.img.naturalWidth > 0) {
            f.processed = true;
            const processed = processImageTransparency(f.img);
            // Replace the original image with the processed one
            f.img = processed;
        }
    };
    f.img.src = f.src;
});

// Game variables
let player = {
    id: 'player',
    name: '',
    snake: [], // Array of segment positions
    trail: [], // High-res path history for segments to follow
    x: 2500, y: 2500, // Float positions
    angle: -Math.PI/2,
    targetAngle: -Math.PI/2,
    score: 0,
    skin: 'emerald',
    lives: 3,
    level: 1,
    pointsInLevel: 0,
    ptsForNextLevel: 10,
    shieldActive: false,
    doublePointsActive: 0,
    slowActive: 0,
    combo: 1,
    isBoosting: false
};

let bots = [];
let foods = [];
let powerups = [];
let walls = [];
let lastUpdateTime = 0;

let highScore = localStorage.getItem("snake-jungle-high") || 0;
uiHighScore.innerText = highScore;

const botNames = ["Micky", "Rique", "Josue", "Joyce", "Mile", "Python", "CobraKai", "Snek", "Venom", "Striker"];

const POWERUP_TYPES = [
  { type: 'slow', icon: '🧊', color: '#3b82f6', duration: 50, img: new Image(), src: "assets/potion_speed_blue.png" },
  { type: 'shield', icon: '🛡️', color: '#6366f1', duration: 0, img: new Image(), src: "assets/potion_shield_green.png" },
  { type: '2x', icon: '🌿', color: '#84cc16', duration: 60, img: new Image(), src: "assets/potion_mega_purple.png" }
];

POWERUP_TYPES.forEach(p => {
    p.img.onload = () => { if (!p.processed) { p.processed = true; p.img = processImageTransparency(p.img); } };
    p.img.src = p.src;
});

// Sound System (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type = 'sine', duration = 0.1, vol = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq / 2, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const SFX = {
    eat: () => playSound(600, 'square', 0.1, 0.05),
    powerup: () => playSound(800, 'sine', 0.3, 0.1),
    collect: () => playSound(900, 'sine', 0.1, 0.05),
    hit: () => playSound(150, 'sawtooth', 0.2, 0.1),
    lvlup: () => { playSound(400, 'sine', 0.1, 0.1); setTimeout(() => playSound(600, 'sine', 0.2, 0.1), 100); },
    gameover: () => playSound(100, 'sawtooth', 0.5, 0.1)
};

// Initialize
function init() {
  bindEvents();
  resizeCanvas();
  
  // Load name from persistence
  const savedName = localStorage.getItem("snake-brasil-name") || "Brasil" + Math.floor(Math.random()*999);
  if (menuPlayerName) menuPlayerName.value = savedName;
  
  showScreen(screenMenu);
}

function bindEvents() {
  btnMap.forEach(btn => { btn.addEventListener("click", () => { btnMap.forEach(b => b.classList.remove("active")); btn.classList.add("active"); activeMode = btn.dataset.map; SFX.eat(); }); });
  btnSpeed.forEach(btn => { btn.addEventListener("click", () => { btnSpeed.forEach(b => b.classList.remove("active")); btn.classList.add("active"); baseSpeed = parseInt(btn.dataset.speed); SFX.eat(); }); });
  // Tab Switching Logic
  const tabs = document.querySelectorAll(".editor-tab");
  const panes = document.querySelectorAll(".editor-pane");
  tabs.forEach(tab => {
      tab.addEventListener("click", () => {
          tabs.forEach(t => t.classList.remove("active"));
          panes.forEach(p => p.classList.remove("active"));
          tab.classList.add("active");
          document.getElementById(`pane-${tab.dataset.target}`).classList.add("active");
          SFX.eat();
      });
  });

  const btnCosmetic = document.querySelectorAll(".cosmetic-btn");
  btnCosmetic.forEach(btn => { 
      btn.addEventListener("click", () => { 
          const id = btn.dataset.id;
          const category = btn.dataset.category; // eyes, heads, hair, bodies, tails
          
          if (unlockedCosmetics[category].includes(id)) {
              // Customization keys: eye, head, hair, body, tail
              let key = category;
              if (category === 'bodies') key = 'body';
              else if (category.endsWith('s')) key = category.slice(0, -1);
              
              playerCustomization[key] = id;
              localStorage.setItem("snake-brasil-custom-v2", JSON.stringify(playerCustomization));
              SFX.eat(); 
              updateUI();
          } else {
              buyCosmetic(category, id);
          }
      }); 
  });
  btnPlay.addEventListener("click", startGame);
  btnRestart.addEventListener("click", startGame);
  btnRanking.addEventListener("click", openRanking);
  btnFullscreen.addEventListener("click", toggleFullscreen);
  btnBackMenu.addEventListener("click", () => showScreen(screenMenu));
  btnMenuOver.addEventListener("click", () => showScreen(screenMenu));
  btnSaveScore.addEventListener("click", () => { saveLocalScore(globalPlayerName, player.score); rankInputArea.classList.add("hidden"); SFX.lvlup(); });
  btnQuit.addEventListener("click", () => { if (confirm("Desistir do jogo e voltar ao menu?")) { currentState = STATE.MENU; clearTimeout(gameLoopId); showScreen(screenMenu); } });
  
  // Mouse/Touch tracking for target angle
  window.addEventListener("mousemove", (e) => {
      if (currentState !== STATE.PLAYING) return;
      updateTargetAngle(e.clientX, e.clientY);
  });
  window.addEventListener("touchmove", (e) => {
      if (currentState !== STATE.PLAYING && e.touches.length) return;
      updateTargetAngle(e.touches[0].clientX, e.touches[0].clientY);
  });
  window.addEventListener("mousedown", () => { if(currentState === STATE.PLAYING) player.isBoosting = true; });
  window.addEventListener("mouseup", () => { player.isBoosting = false; });
}

function updateTargetAngle(mx, my) {
    // Convert screen mouse pos to world pos relative to head
    const head = player.snake[0] || { x: WORLD_SIZE/2, y: WORLD_SIZE/2 };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // We want the angle from screen center (where head is drawn) to mouse
    player.targetAngle = Math.atan2(my - cy, mx - cx);
}

function showScreen(screen) {
  if (!screen) return;
  [screenMenu, screenGame, screenOver, screenRank].forEach(s => s && s.classList.add("hidden"));
  screen.classList.remove("hidden");
  
  if (appContainer) {
    if (screen === screenGame) {
        appContainer.classList.add("playing-mode");
    } else if (screen === screenMenu || screen === screenRank) {
        appContainer.classList.remove("playing-mode");
    }
  }
  resizeCanvas(); // Immediate resize
  setTimeout(resizeCanvas, 100); // Re-sync after animation
}

function startGame() {
  const nameFromInput = menuPlayerName ? menuPlayerName.value.trim() : "";
  globalPlayerName = nameFromInput || "Brasil" + Math.floor(Math.random()*999);
  
  // Persist name
  localStorage.setItem("snake-brasil-name", globalPlayerName);
  
  // Map speed label to actual movement value
  let moveSpeed = 200; // Medium default
  if (baseSpeed === 3) moveSpeed = 140; // Lento
  if (baseSpeed === 12) moveSpeed = 280; // Rápido
  
  player = { ...player, name: globalPlayerName, x: WORLD_SIZE/2, y: WORLD_SIZE/2, angle: -Math.PI/2, targetAngle: -Math.PI/2, score: 0, level: 1, lives: 1, combo: 1, pointsInLevel: 0, shieldActive: false, doublePointsActive: 0, slowActive: 0,
    moveSpeed: moveSpeed,
    skin: playerCustomization.body,
    headDecoration: playerCustomization.head,
    tailType: playerCustomization.tail,
    eyeStyle: playerCustomization.eye,
    hairStyle: playerCustomization.hair,
    trail: [], snake: [] };
  resetPlayerSnake(); // Initialize trail and segments
  bots = []; foods = []; powerups = []; walls = [];
  
  for(let i=0; i<15; i++) bots.push(createBot());
  spawnInitialFood(80);
  
  updateUI();
  updateLivesUI();
  
  showScreen(screenGame);
  
  // Force immediate resize to ensure canvas has dimensions
  resizeCanvas(); 
  
  currentState = STATE.PLAYING;
  lastFrameTime = Date.now();
  
  // Reset camera to player position immediately
  currentZoom = 0.8;
  camOffset = { x: 0, y: 0 };
  const vWidth = canvas.width / currentZoom;
  const vHeight = canvas.height / currentZoom;
  camX = player.x - vWidth / 2;
  camY = player.y - vHeight / 2;
  
  requestAnimationFrame(gameLoop);
}

function resetPlayerSnake() {
  player.x = WORLD_SIZE/2; player.y = WORLD_SIZE/2;
  player.angle = -Math.PI/2; player.targetAngle = -Math.PI/2;
  
  // Initialize trail with all points at head position to avoid "plank" spawn
  player.trail = [];
  for(let i=0; i < 2000; i++) player.trail.push({ x: player.x, y: player.y });

  // Initialize segments
  player.snake = [];
  const segmentCount = 10;
  for (let i = 0; i < segmentCount; i++) {
      player.snake.push({ x: player.x / TILE_SIZE, y: player.y / TILE_SIZE });
  }
  buildWalls();
}

function createBot() {
    const startX = Math.random() * (WORLD_SIZE - 400) + 200;
    const startY = Math.random() * (WORLD_SIZE - 400) + 200;
    const angle = Math.random() * Math.PI * 2;
    const score = Math.floor(Math.random() * 50) * 10;
    const segmentCount = Math.floor(score / 25) + 5;
    
    const bodyKeys = Object.keys(COSMETIC_CATALOG.bodies);
    const headKeys = Object.keys(COSMETIC_CATALOG.heads);
    const tailKeys = Object.keys(COSMETIC_CATALOG.tails);
    const eyeKeys = Object.keys(COSMETIC_CATALOG.eyes);
    const hairKeys = Object.keys(COSMETIC_CATALOG.hair);
    
    const bot = {
        id: Math.random(),
        name: botNames[Math.floor(Math.random() * botNames.length)] + Math.floor(Math.random()*99),
        snake: [],
        trail: [],
        x: startX, y: startY,
        angle: angle,
        targetAngle: angle,
        score: score,
        aiTimer: 0,
        isBoosting: false,
        skin: bodyKeys[Math.floor(Math.random() * bodyKeys.length)],
        headDecoration: headKeys[Math.floor(Math.random() * headKeys.length)],
        tailType: tailKeys[Math.floor(Math.random() * tailKeys.length)],
        eyeStyle: eyeKeys[Math.floor(Math.random() * eyeKeys.length)],
        hairStyle: hairKeys[Math.floor(Math.random() * hairKeys.length)]
    };

    // Fill trail initially at start point (avoids plank glitch)
    for(let i=0; i < 1000; i++) bot.trail.push({ x: startX, y: startY });

    // Initial segments
    for (let i = 0; i < segmentCount; i++) {
        bot.snake.push({ x: startX / TILE_SIZE, y: startY / TILE_SIZE });
    }

    return bot;
}

function buildWalls() {
    walls = [];
}

function spawnInitialFood(count) {
    for(let i=0; i<count; i++) spawnFood();
}

function spawnFood() {
    let tx = Math.floor(Math.random() * (WORLD_SIZE / TILE_SIZE));
    let ty = Math.floor(Math.random() * (WORLD_SIZE / TILE_SIZE));
    const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    const isMega = Math.random() < 0.15; // 15% chance for Mega Fruit
    foods.push({ x: tx, y: ty, type: type, mega: isMega });
}

let lastFrameTime = Date.now();

function gameLoop() {
  if (currentState !== STATE.PLAYING) return;
  const now = Date.now();
  const dt = (now - lastFrameTime) / 1000; // Delta in seconds
  lastFrameTime = now;

  // Run update with delta time
  update(dt);
  
  // Render
  draw();

  // Update Particles
  for(let i=particles.length-1; i>=0; i--) {
      particles[i].update();
      if(particles[i].life <= 0) particles.splice(i, 1);
  }
  
  gameLoopId = requestAnimationFrame(gameLoop);
}

function update(dt) {
    // Clamp dt to avoid huge jumps on tab switch
    const frameDt = Math.min(0.1, dt);
    updatePlayer(frameDt);
    updateBots(frameDt);
    updateLeaderboard();
    
    // Only update UI occasionally or if needed
    if (Math.random() < 0.1) updateUI(); 
}

function updatePlayer(dt) {
    if (player.slowActive > 0) player.slowActive--;
    if (player.doublePointsActive > 0) player.doublePointsActive--;

    // 1. Smooth Steering (dt-independent-ish lerp)
    let diff = player.targetAngle - player.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    player.angle += diff * (TURN_SPEED * (60 * dt)); 

    // 2. Movement
    // baseSpeed setting acts as a multiplier (4=Slow, 6=Med, 8=Fast)
    const speedMult = baseSpeed / 6; 
    // Speed: BASE_MOVE_SPEED is now per-player via speed selection
    let speed = (player.moveSpeed || 200) * dt;
    if (player.isBoosting && player.score > 10) {
        speed *= 1.8;
        player.score -= 0.15; // Drain score during boost
        if (Math.random() < 0.3) spawnFlame(player.x, player.y, 1);
    }
    player.x += Math.cos(player.angle) * speed;
    player.y += Math.sin(player.angle) * speed;

    // Boost consumes score and creates flames
    if (player.isBoosting && player.score > 10) { // Re-check condition for flame spawning
        if (player.snake.length > 0) {
            const tail = player.snake[player.snake.length - 1];
            spawnFlame(tail.x * TILE_SIZE, tail.y * TILE_SIZE, 3);
        }
    }

    // 3. Trail & Segments
    // Add to trail always to keep high resolution for interpolation
    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > TRAIL_MAX) player.trail.pop();

    // Proportional growth (5 fruits = 1 segment base, scaling with size)
    const segmentCost = 5 + (player.score * 0.008); 
    const segmentCount = Math.floor(player.score / segmentCost) + 5;
    player.snake = [];
    
    // Smooth Interpolation: Place segments based on distance along the trail
    let currentTrailIdx = 0;
    let accumulatedDist = 0;
    
    // Head is always at first trail point
    player.snake.push({ x: player.x / TILE_SIZE, y: player.y / TILE_SIZE });
    
    for (let i = 1; i < segmentCount; i++) {
        const targetDist = i * SEGMENT_DISTANCE;
        
        while (accumulatedDist < targetDist && currentTrailIdx < player.trail.length - 1) {
            const p1 = player.trail[currentTrailIdx];
            const p2 = player.trail[currentTrailIdx + 1];
            const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            
            if (accumulatedDist + d >= targetDist) {
                // The target point is between p1 and p2
                const remaining = targetDist - accumulatedDist;
                const ratio = remaining / d;
                const ix = p1.x + (p2.x - p1.x) * ratio;
                const iy = p1.y + (p2.y - p1.y) * ratio;
                player.snake.push({ x: ix / TILE_SIZE, y: iy / TILE_SIZE });
                accumulatedDist = targetDist; // Mark as found for this segment
            } else {
                accumulatedDist += d;
                currentTrailIdx++;
            }
        }
        
        // If we ran out of trail, just repeat the last point
        if (player.snake.length <= i) {
            const last = player.trail[player.trail.length - 1];
            player.snake.push({ x: last.x / TILE_SIZE, y: last.y / TILE_SIZE });
        }
    }

    const headPos = { x: player.x, y: player.y };

    // 4. Boundaries
    if (player.x < 0 || player.x >= WORLD_SIZE || player.y < 0 || player.y >= WORLD_SIZE) {
        handleHit(); return;
    }

    // 5. Collisions
    const collision = checkCollision({ x: player.x / TILE_SIZE, y: player.y / TILE_SIZE }, player.id);
    if (collision.hit) { 
        handleHit(); return; 
    }

    // 6. Food
    for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        const dist = Math.hypot(f.x * TILE_SIZE - player.x, f.y * TILE_SIZE - player.y);
        if (dist < TILE_SIZE * 1.5) {
            const multiplier = f.mega ? 3 : 1;
            let pts = 10 * multiplier * (player.doublePointsActive > 0 ? 2 : 1) * player.combo;
            player.score += pts; player.pointsInLevel += pts; player.combo++;
            spawnBurst(f.x * TILE_SIZE, f.y * TILE_SIZE, f.mega ? "#eab308" : "#38bdf8", 5);
            foods.splice(i, 1); spawnFood(); SFX.eat();
            attemptLevelUp();
        }
    }
}

function updateBots(dt) {
    bots.forEach(bot => {
        bot.aiTimer -= dt * 60;
        
        // 1. AI Decision Making: Smarter logic
        if(bot.aiTimer <= 0) {
            let nearestFood = null;
            let minDist = Infinity;
            foods.forEach(f => {
                let dist = Math.hypot(f.x * TILE_SIZE - bot.x, f.y * TILE_SIZE - bot.y);
                // Priority to Mega food
                let weight = f.mega ? 0.3 : 1.0; 
                if (dist * weight < 800 && dist * weight < minDist) {
                    minDist = dist * weight; nearestFood = f;
                }
            });
            
            if (nearestFood) {
                bot.targetAngle = Math.atan2(nearestFood.y * TILE_SIZE - bot.y, nearestFood.x * TILE_SIZE - bot.x);
            } else if (Math.random() < 0.1) {
                bot.targetAngle = Math.random() * Math.PI * 2;
            }

            // 2. Self-Preservation & Aggression
            bot.isBoosting = false;
            
            // Check for nearby bigger snakes (escaping)
            let scaringSnake = null;
            let playerDist = Math.hypot(player.x - bot.x, player.y - bot.y);
            if (playerDist < 400 && player.score > bot.score) scaringSnake = player;
            
            if (scaringSnake) {
                // Fly away!
                bot.targetAngle = Math.atan2(bot.y - scaringSnake.y, bot.x - scaringSnake.x);
                if (bot.score > 20) bot.isBoosting = true;
            } else {
                // Try to hunt smaller snakes if close
                bots.forEach(other => {
                    if (other.id !== bot.id) {
                        let d = Math.hypot(other.x - bot.x, other.y - bot.y);
                        if (d < 300 && bot.score > other.score * 1.5) {
                            // Intercept maneuver
                            bot.targetAngle = Math.atan2(other.y - bot.y, other.x - bot.x);
                            if (bot.score > 40) bot.isBoosting = true;
                        }
                    }
                });
            }

            bot.aiTimer = Math.floor(Math.random() * 20) + 10;
        }

        // 3. Collision Avoidance (Ray-casting style check)
        const checkDist = 150 + (bot.isBoosting ? 100 : 0);
        const testX = bot.x + Math.cos(bot.angle) * checkDist;
        const testY = bot.y + Math.sin(bot.angle) * checkDist;
        if (testX < 0 || testX >= WORLD_SIZE || testY < 0 || testY >= WORLD_SIZE || checkCollision({x: testX/TILE_SIZE, y: testY/TILE_SIZE}, bot.id).hit) {
            bot.targetAngle += Math.PI / 2; 
        }

        // 3. Smooth Steering
        let diff = bot.targetAngle - bot.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        bot.angle += diff * (TURN_SPEED * (60 * dt));

        // 5. Movement with size penalty and boost
        const isSpeedBoost = bot.isBoosting && bot.score > 5;
        const sizePenalty = Math.max(0.6, 1 - (bot.score / 20000));
        const moveSpeed = (isSpeedBoost ? BASE_MOVE_SPEED * 2.2 : BASE_MOVE_SPEED) * sizePenalty;
        bot.x += Math.cos(bot.angle) * moveSpeed * dt;
        bot.y += Math.sin(bot.angle) * moveSpeed * dt;

        if (isSpeedBoost) {
            bot.score -= dt * 10;
            if (bot.snake.length > 0) {
                const tail = bot.snake[bot.snake.length - 1];
                spawnFlame(tail.x * TILE_SIZE, tail.y * TILE_SIZE, 2);
            }
        }

        // ULTRA-SMOOTH TRAIL: Higher resolution trail (matching player refinement)
        bot.trail.unshift({ x: bot.x, y: bot.y });
        if (bot.trail.length > TRAIL_MAX) bot.trail.pop();

        const segmentCost = 5 + (bot.score * 0.008);
        const segmentCount = Math.floor(bot.score / segmentCost) + 3; 
        bot.snake = [];
        
        let currentTrailIdx = 0;
        let accumulatedDist = 0;
        
        // Head
        bot.snake.push({ x: bot.x / TILE_SIZE, y: bot.y / TILE_SIZE });
        
        for (let i = 1; i < segmentCount; i++) {
            const targetDist = i * SEGMENT_DISTANCE;
            
            while (accumulatedDist < targetDist && currentTrailIdx < bot.trail.length - 1) {
                const p1 = bot.trail[currentTrailIdx];
                const p2 = bot.trail[currentTrailIdx + 1];
                const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                
                if (accumulatedDist + d >= targetDist) {
                    const remaining = targetDist - accumulatedDist;
                    const ratio = remaining / d;
                    const ix = p1.x + (p2.x - p1.x) * ratio;
                    const iy = p1.y + (p2.y - p1.y) * ratio;
                    bot.snake.push({ x: ix / TILE_SIZE, y: iy / TILE_SIZE });
                    accumulatedDist = targetDist;
                } else {
                    accumulatedDist += d;
                    currentTrailIdx++;
                }
            }
            
            if (bot.snake.length <= i) {
                const last = bot.trail[bot.trail.length - 1];
                bot.snake.push({ x: last.x / TILE_SIZE, y: last.y / TILE_SIZE });
            }
        }

        // 5. Food
        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            const dist = Math.hypot(f.x * TILE_SIZE - bot.x, f.y * TILE_SIZE - bot.y);
            if (dist < TILE_SIZE * 1.5) {
                const multiplier = f.mega ? 3 : 1;
                bot.score += 10 * multiplier;
                foods.splice(i, 1); spawnFood();
            }
        }

        // 6. Death Collision Check
        const collision = checkCollision({x: bot.x/TILE_SIZE, y: bot.y/TILE_SIZE}, bot.id);
        if (collision.hit) {
            bot.dead = true;
            // Reward player if they were the killer
            if (collision.killerId === player.id) {
                const killReward = 50 + Math.floor(bot.score / 10);
                totalCoins += killReward;
                localStorage.setItem("snake-brasil-coins", totalCoins);
                updateUI(); // Ensure immediate UI update
                SFX.collect(); // Visual/Audio feedback
            }
            updateUI();
            spawnBurst(bot.x, bot.y, "#fbbf24", 20); // Golden coins burst
            SFX.powerup();
        }
    });

    // Remove dead bots and turn them to food
    for (let i = bots.length - 1; i >= 0; i--) {
        if (bots[i].dead) {
            snakeToFood(bots[i].snake);
            bots.splice(i, 1);
            setTimeout(() => { if(currentState === STATE.PLAYING) bots.push(createBot()); }, 3000);
        }
    }
}

function checkCollision(head, ownerId) {
    const headX = head.x * TILE_SIZE, headY = head.y * TILE_SIZE;
    
    // Boundary check
    if (headX < 0 || headX >= WORLD_SIZE || headY < 0 || headY >= WORLD_SIZE) {
        return { hit: true, killerId: "wall" };
    }

    // Check against Player body
    if (ownerId !== player.id) {
        for (let i = 0; i < player.snake.length; i++) {
            const seg = player.snake[i];
            const dist = Math.hypot(seg.x * TILE_SIZE - headX, seg.y * TILE_SIZE - headY);
            if (dist < TILE_SIZE * 0.6) return { hit: true, killerId: player.id };
        }
    }

    // Check against all bots bodies
    for (let bot of bots) {
        if (bot.id !== ownerId) {
            for (let i = 0; i < bot.snake.length; i++) {
                const seg = bot.snake[i];
                const dist = Math.hypot(seg.x * TILE_SIZE - headX, seg.y * TILE_SIZE - headY);
                if (dist < TILE_SIZE * 0.6) return { hit: true, killerId: bot.id };
            }
        }
    }
    
    return { hit: false, killerId: null };
}

function handleHit() {
    SFX.hit();
    spawnBurst(player.x, player.y, COSMETIC_CATALOG.bodies[player.skin].color, 30);
    if (player.shieldActive) { 
        player.shieldActive = false; 
        player.combo = 1; 
        return; 
    }
    
    // Total Permadeath: Turn to food and end game immediately
    snakeToFood(player.snake);
    player.snake = []; 
    gameOver();
}

function snakeToFood(segments) {
    segments.forEach((seg, i) => {
        if (i % 2 === 0) { 
            const fType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
            foods.push({ x: seg.x, y: seg.y, type: fType, mega: Math.random() < 0.05 });
        }
    });
}

function attemptLevelUp() {
    if (player.pointsInLevel >= player.ptsForNextLevel) {
        player.level++; player.pointsInLevel = 0; player.ptsForNextLevel = 100 * player.level; SFX.lvlup();
    }
}

function updateLeaderboard() {
    let list = [{ name: player.name, score: player.score, isPlayer: true, id: player.id }, ...bots.map(b => ({ name: b.name, score: b.score, isPlayer: false, id: b.id }))];
    list.sort((a,b) => b.score - a.score);
    const top10 = list.slice(0, 10);
    
    liveRankList.innerHTML = top10.map((s, i) => `
        <li class="${s.id === player.id ? 'player-row' : ''}">
            <span>${i+1}. ${s.name}</span>
            <span>${Math.floor(s.score)}</span>
        </li>
    `).join("");
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
document.addEventListener('fullscreenchange', resizeCanvas);


function updateUI() {
    if (uiScore) uiScore.innerText = Math.floor(player.score);
    if (uiLevel) uiLevel.innerText = player.level;
    if (uiCombo) uiCombo.innerText = "x" + player.combo;
    if (uiPtsNext) uiPtsNext.innerText = Math.floor(player.ptsForNextLevel - player.pointsInLevel) + " pts";
    if (uiProgress) uiProgress.style.width = Math.min(100, (player.pointsInLevel / player.ptsForNextLevel) * 100) + "%";

    // Update Coin Displays
    if (uiTotalCoins) uiTotalCoins.innerText = totalCoins;
    if (menuCoinBalance) menuCoinBalance.innerText = totalCoins;

    // Generic Cosmetic Updater
    document.querySelectorAll(".cosmetic-btn").forEach(btn => {
        const id = btn.dataset.id;
        const category = btn.dataset.category;
        const itemData = COSMETIC_CATALOG[category][id];
        if (!itemData) return;
        
        const isUnlocked = unlockedCosmetics[category].includes(id);
        const isActive = playerCustomization[category === 'bodies' ? 'body' : category.slice(0, -1)] === id;
        
        btn.classList.toggle("locked", !isUnlocked);
        btn.classList.toggle("active", isActive);
        
        let label = btn.querySelector(".skin-price-label");
        if (!label) {
            label = document.createElement("div");
            label.className = "skin-price-label";
            btn.appendChild(label);
        }
        label.innerText = isUnlocked ? (isActive ? "EQUIPADO" : "POSSUÍDO") : itemData.price + " 💰";
    });
}

function updateLivesUI() {
    // Hidden as per user request for permadeath
}

function draw() {
    // Reset transformation matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Clear whole canvas
    ctx.fillStyle = "#0f172a"; // Match neon theme background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Inverted Dynamic Zoom: Zoom IN as score increases
    // Start at 0.8, go up to 1.2 as score increases (e.g. 10000 points)
    const growthFactor = Math.min(1.2, 0.8 + (player.score / 15000)); 
    const targetZoom = player.isBoosting && player.score > 0 ? growthFactor * 0.75 : growthFactor;
    
    currentZoom += (targetZoom - currentZoom) * 0.03; 
    ctx.scale(currentZoom, currentZoom);

    const head = player.snake[0];
    if (!head) {
        ctx.restore();
        return;
    }

    // Viewport dims adjusted for current zoom
    const vWidth = canvas.width / currentZoom;
    const vHeight = canvas.height / currentZoom;

    // Smooth Look-ahead Offset: Using angle since player.dir is deprecated
    const targetOffset = { x: Math.cos(player.angle) * TILE_SIZE * 4, y: Math.sin(player.angle) * TILE_SIZE * 4 };
    camOffset.x += (targetOffset.x - camOffset.x) * 0.05;
    camOffset.y += (targetOffset.y - camOffset.y) * 0.05;

    // Target position: center on head + smooth offset
    const targetX = player.x - vWidth / 2 + camOffset.x;
    const targetY = player.y - vHeight / 2 + camOffset.y;

    // Smooth LERP for main camera
    if (typeof camX === 'undefined') { camX = targetX; camY = targetY; }
    camX += (targetX - camX) * 0.1;
    camY += (targetY - camY) * 0.1;

    // Clamp to world bounds
    const curCamX = Math.max(0, Math.min(camX, WORLD_SIZE - vWidth));
    const curCamY = Math.max(0, Math.min(camY, WORLD_SIZE - vHeight));

    ctx.translate(-curCamX, -curCamY);

    // Scenario Visuals Configuration
    let bgCol = "#0f172a";
    let gridCol = "rgba(56, 189, 248, 0.15)";
    let borderCol = "#38bdf8";

    if (activeMode === "caverna") {
        bgCol = "#020617";
        gridCol = "rgba(139, 92, 246, 0.1)"; // Purple grid
        borderCol = "#8b5cf6";
    } else if (activeMode === "vulcao") {
        bgCol = "#180000"; // Deep dark red
        gridCol = "rgba(249, 115, 22, 0.15)"; // Orange grid
        borderCol = "#ef4444";
        // World particles (Embers)
        if (Math.random() < 0.2) spawnFlame(Math.random()*WORLD_SIZE, Math.random()*WORLD_SIZE, 1);
    } else if (activeMode === "selva") {
        bgCol = "#052e16"; // Deep jungle green
        gridCol = "rgba(34, 197, 94, 0.15)"; // Green grid
        borderCol = "#22c55e";
    }

    // Grid Rendering
    ctx.fillStyle = bgCol; ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    ctx.strokeStyle = gridCol; ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0; x<=WORLD_SIZE; x+=100) { ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); }
    for(let y=0; y<=WORLD_SIZE; y+=100) { ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); }
    ctx.stroke();

    // World Border
    ctx.strokeStyle = borderCol; ctx.lineWidth = 20; ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Food (Modern Fruits)
    foods.forEach(f => { 
        const renderX = f.x * TILE_SIZE, renderY = f.y * TILE_SIZE;
        const size = (f.mega ? 40 : 25) + Math.sin(Date.now() / 200) * 3;
        
        ctx.save();
        if (f.type && f.type.img && f.type.processed) {
            ctx.shadowBlur = f.mega ? 25 : 10;
            ctx.shadowColor = f.mega ? "#fbbf24" : "#38bdf8";
            ctx.drawImage(f.type.img, renderX - size/2, renderY - size/2, size, size);
        } else {
            // Fallback to glowing orb
            ctx.shadowBlur = 10; ctx.shadowColor = "#38bdf8";
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(renderX, renderY, f.mega ? 15 : 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });

    // Magic Potions (Powerups)
    powerups.forEach(p => {
        const renderX = p.x * TILE_SIZE, renderY = p.y * TILE_SIZE;
        const size = 45 + Math.sin(Date.now() / 150) * 5;
        const config = POWERUP_TYPES.find(t => t.type === p.type);
        
        ctx.save();
        if (config && config.img && config.processed) {
            ctx.shadowBlur = 30; ctx.shadowColor = config.color;
            ctx.drawImage(config.img, renderX - size/2, renderY - size/2, size, size);
            
            // Sparkle Particle Effect around potion
            if (Math.random() < 0.1) spawnBurst(renderX, renderY, config.color, 1);
        } else {
            ctx.font = "30px serif"; ctx.textAlign = "center";
            ctx.fillText(config ? config.icon : "🧪", renderX, renderY + 10);
        }
        ctx.restore();
    });

    // Environment Effects
    if (activeMode === "vulcao") {
        if (Math.random() < 0.05) {
            const dropX = camX + Math.random() * (canvas.width / currentZoom);
            const dropY = camY + Math.random() * (canvas.height / currentZoom);
            lavaDrops.push(new LavaDrop(dropX, dropY));
        }
    } else if (activeMode === "caverna") {
        if (Math.random() < 0.03) {
            const shardX = camX + Math.random() * (canvas.width / currentZoom);
            const shardY = camY + Math.random() * (canvas.height / currentZoom);
            iceShards.push(new IceShard(shardX, shardY));
        }
    }
    
    lavaDrops.forEach((d, i) => {
        d.update();
        d.draw(ctx);
        if (d.done) lavaDrops.splice(i, 1);
    });

    iceShards.forEach((s, i) => {
        // Collect all snake heads for proximity check
        const heads = [{ x: player.x, y: player.y }, ...bots.map(b => ({ x: b.x, y: b.y }))];
        s.update(heads);
        s.draw(ctx);
        if (s.done) iceShards.splice(i, 1);
    });

    particles.forEach(p => p.draw(ctx));

    // Walls
    walls.forEach(w => { ctx.fillStyle = "#4b5563"; ctx.fillRect(w.x*TILE_SIZE, w.y*TILE_SIZE, TILE_SIZE, TILE_SIZE); });

    // Ranking for Decorations
    let allSnakes = [{ 
        id: player.id, 
        name: player.name, 
        score: player.score, 
        snake: player.snake, 
        skin: player.skin, 
        x: player.x,
        y: player.y,
        angle: player.angle, 
        shielded: player.shieldActive,
        headDecoration: player.headDecoration,
        tailType: player.tailType,
        eyeStyle: player.eyeStyle,
        hairStyle: player.hairStyle
    }, ...bots.map(b => ({
        ...b,
        x: b.x,
        y: b.y
    }))];
    
    // Stable Sort: By score, then by ID to prevent Z-flicker
    allSnakes.sort((a,b) => {
        if (Math.floor(b.score) !== Math.floor(a.score)) return b.score - a.score;
        return (b.id || 0) > (a.id || 0) ? 1 : -1;
    });

    // Snakes
    const sortedForDrawing = [...allSnakes].sort((a,b) => {
        if (Math.floor(a.score) !== Math.floor(b.score)) return a.score - b.score;
        return (a.id || 0) > (b.id || 0) ? 1 : -1;
    });

    sortedForDrawing.forEach(s => {
        const rank = allSnakes.findIndex(x => x.id === s.id); // 0 = First place
        drawSnake(s, rank);
    });

    ctx.restore();

    // UI Overlays (Post-Transform)
    if (activeMode === "caverna") {
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width/4, canvas.width/2, canvas.height/2, canvas.width*0.8);
        grad.addColorStop(0, "rgba(255, 255, 255, 0)");
        grad.addColorStop(1, "rgba(56, 189, 248, 0.2)"); // Frosty blue edges
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Minimap (Corner)
    drawMinimap();
}

function drawMinimap() {
    const size = 150;
    const padding = 20;
    const x = canvas.width - size - padding;
    const y = canvas.height - size - padding;
    
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 10);
    ctx.fill();
    ctx.stroke();
    
    const scale = size / WORLD_SIZE;
    
    // Bots
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    bots.forEach(b => {
        ctx.beginPath(); ctx.arc(x + b.x * scale, y + b.y * scale, 1.5, 0, Math.PI*2); ctx.fill();
    });
    
    // Player
    ctx.fillStyle = "#38bdf8";
    ctx.shadowBlur = 5; ctx.shadowColor = "#38bdf8";
    ctx.beginPath(); ctx.arc(x + player.x * scale, y + player.y * scale, 3, 0, Math.PI*2); ctx.fill();
    
    ctx.restore();
}

function drawSnake(s, rank = 99) {
    const segments = s.snake;
    if (segments.length < 2) return;
    
    // Support modular cosmetics
    const bodyData = COSMETIC_CATALOG.bodies[s.skin] || COSMETIC_CATALOG.bodies.emerald;
    const bodyWidth = TILE_SIZE * 1.5; // Thicker snake body
    const time = Date.now();
    
    ctx.save();
    
    // ABSOLUTE ANCHOR: High-resolution head
    const headX = (s.id === player.id) ? player.x : (s.x || segments[0].x * TILE_SIZE);
    const headY = (s.id === player.id) ? player.y : (s.y || segments[0].y * TILE_SIZE);
    
    // 1. Draw Segments from Tail to Head for Layering
    for (let i = segments.length - 1; i >= 1; i--) {
        const seg = segments[i];
        const nextSeg = segments[i-1];
        
        const px = seg.x * TILE_SIZE;
        const py = seg.y * TILE_SIZE;
        const nx = nextSeg.x * TILE_SIZE;
        const ny = nextSeg.y * TILE_SIZE;
        
        const angle = Math.atan2(ny - py, nx - px);
        
        // Scale Shape Rendering
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        
        // Draw Scale/Armor Plate
        const scaleRadius = (bodyWidth / 2) * (1 - (i / segments.length) * 0.3); // Taper tail
        
        // Shadow/Outer Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = bodyData.glow || bodyData.color;
        
        // Create Layered Gradient
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaleRadius);
        grad.addColorStop(0, bodyData.glow || "#fff");
        grad.addColorStop(0.4, bodyData.color);
        grad.addColorStop(1, "rgba(0,0,0,0.5)");
        
        ctx.fillStyle = grad;
        
        // Diamond/Shield Shape for Scales
        ctx.beginPath();
        ctx.moveTo(scaleRadius * 1.2, 0); // Point forward
        ctx.lineTo(0, scaleRadius);      // Side
        ctx.lineTo(-scaleRadius * 0.5, 0); // Back
        ctx.lineTo(0, -scaleRadius);     // Side
        ctx.closePath();
        ctx.fill();
        
        // Secondary Highlight Line
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }

    // 2. Head Rendering (Always on top)
    let renderAngle = s.angle;
    if (segments.length > 1) {
        const neck = segments[1];
        renderAngle = Math.atan2(headY - neck.y * TILE_SIZE, headX - neck.x * TILE_SIZE);
    }

    // Draw Head Base (Layered)
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(renderAngle);
    
    // Head Armor Plate
    const headRadius = bodyWidth / 2;
    const hGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, headRadius * 1.5);
    hGrad.addColorStop(0, bodyData.glow || "#fff");
    hGrad.addColorStop(0.5, bodyData.color);
    hGrad.addColorStop(1, "rgba(0,0,0,0.2)");
    
    ctx.fillStyle = hGrad;
    ctx.shadowBlur = 15;
    ctx.shadowColor = bodyData.glow || bodyData.color;
    
    ctx.beginPath();
    ctx.moveTo(headRadius * 1.5, 0);
    ctx.lineTo(0, headRadius);
    ctx.lineTo(-headRadius * 0.5, headRadius * 0.5);
    ctx.lineTo(-headRadius * 0.5, -headRadius * 0.5);
    ctx.lineTo(0, -headRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Head Decorations (Modular)
    drawHeadDecoration(ctx, headX, headY, bodyWidth / 2, renderAngle, s.headDecoration || "none", bodyData.color);
    drawEyeStyle(ctx, headX, headY, bodyWidth / 2, renderAngle, s.eyeStyle || "friendly");
    drawHairStyle(ctx, headX, headY, bodyWidth / 2, renderAngle, s.hairStyle || "none");

    // 4. Specific effects on head
    if (SKIN_EFFECTS[s.skin]) {
        SKIN_EFFECTS[s.skin](ctx, headX, headY, bodyWidth / 2, time);
    }

    // 5. Crown/UI
    if (rank === 0) { 
        ctx.font = "24px serif"; ctx.textAlign = "center";
        ctx.fillText("👑", headX, headY - TILE_SIZE * 2);
    }

    ctx.fillStyle = "white";
    ctx.font = "bold 13px 'Outfit', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.name || "Snek", headX, headY - TILE_SIZE * 1.5);
    
    ctx.restore();
}

function drawEyeStyle(ctx, hx, hy, radius, angle, style) {
    const eyeRadius = radius * 0.45;
    const eyeOffset = radius * 0.5;
    
    const eye1Angle = angle - 0.7;
    const eye2Angle = angle + 0.7;
    
    // Time-based sparkle for "alive" look
    const sparkle = Math.sin(Date.now() / 300) * 0.5 + 0.5;

    const eyes = [
        { x: hx + Math.cos(eye1Angle) * eyeOffset, y: hy + Math.sin(eye1Angle) * eyeOffset },
        { x: hx + Math.cos(eye2Angle) * eyeOffset, y: hy + Math.sin(eye2Angle) * eyeOffset }
    ];

    eyes.forEach(e => {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(e.x, e.y, eyeRadius, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = "#000";
        let px = e.x + Math.cos(angle) * (eyeRadius * 0.3);
        let py = e.y + Math.sin(angle) * (eyeRadius * 0.3);
        
        if (style === "friendly") {
           // Large friendly pupils
           ctx.beginPath(); ctx.arc(px, py, eyeRadius * 0.65, 0, Math.PI * 2); ctx.fill();
           // White highlights for life/sympathy (Triple highlights)
           ctx.fillStyle = "#fff"; 
           ctx.beginPath(); ctx.arc(px - 2, py - 2, 2.5 + sparkle, 0, Math.PI * 2); ctx.fill();
           ctx.beginPath(); ctx.arc(px + 1.5, py + 2, 1.2, 0, Math.PI * 2); ctx.fill();
           ctx.beginPath(); ctx.arc(px + 3, py - 1, 0.8, 0, Math.PI * 2); ctx.fill();
        } else if (style === "cute") {
           // Kawaii style eyes
           ctx.beginPath(); ctx.arc(px, py, eyeRadius * 0.75, 0, Math.PI * 2); ctx.fill();
           ctx.fillStyle = "#fff"; 
           ctx.beginPath(); ctx.arc(px - 2, py - 2, 3, 0, Math.PI * 2); ctx.fill();
           ctx.beginPath(); ctx.arc(px + 1.5, py + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        } else if (style === "angry") {
           // Draw angled lid
           ctx.beginPath(); ctx.arc(px, py, eyeRadius * 0.6, 0, Math.PI, true); ctx.fill();
           ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
           ctx.beginPath(); ctx.moveTo(e.x - 5, e.y - 5); ctx.lineTo(e.x + 5, e.y - 2); ctx.stroke();
        } else if (style === "cyber") {
           ctx.fillStyle = "#0ea5e9";
           ctx.beginPath(); ctx.arc(e.x, e.y, eyeRadius * 0.8, 0, Math.PI * 2); ctx.fill();
           ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(e.x, e.y, 2, 0, Math.PI * 2); ctx.fill();
        }
    });
}

function drawHairStyle(ctx, hx, hy, radius, angle, style) {
    if (style === "none") return;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(angle);
    
    if (style === "crazy") {
        ctx.strokeStyle = "#f43f5e"; ctx.lineWidth = 4;
        for(let i=0; i<5; i++) {
            ctx.beginPath();
            ctx.moveTo(-radius * 0.5, -radius + i*4);
            ctx.quadraticCurveTo(-radius, -radius * 2, -radius * 1.5, -radius * 1.5 - i*5);
            ctx.stroke();
        }
    } else if (style === "chef") {
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 4; ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.arc(0, -radius * 1.5, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-radius * 0.6, -radius * 1.5, radius * 1.2, radius * 1.0);
    } else if (style === "party") {
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.5);
        ctx.lineTo(-radius * 0.8, -radius * 2.2);
        ctx.lineTo(radius * 0.8, -radius * 2.2);
        ctx.closePath();
        ctx.fill();
        // Pom pom
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, -radius * 2.3, 5, 0, Math.PI * 2); ctx.fill();
    } else if (style === "metal") {
        ctx.fillStyle = "#000";
        for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.rotate(-0.8 + i * 0.2);
            ctx.beginPath();
            ctx.moveTo(0, -radius * 0.8);
            ctx.quadraticCurveTo(radius * 0.5, -radius * 2.5, radius * 0.2, -radius * 3.5);
            ctx.lineTo(-radius * 0.2, -radius * 1.5);
            ctx.fill();
            ctx.restore();
        }
    } else if (style === "emo") {
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.moveTo(-radius * 0.8, -radius * 0.5);
        ctx.bezierCurveTo(-radius * 1.5, -radius * 2.5, radius * 1.5, -radius * 2.5, radius * 1.2, radius * 0.5);
        ctx.lineTo(radius * 0.5, radius * 0.2);
        ctx.bezierCurveTo(0, -radius, -radius, -radius, -radius * 0.8, -radius * 0.5);
        ctx.fill();
        // Colored streak
        ctx.strokeStyle = "#f472b6"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.4, -radius * 1.2);
        ctx.quadraticCurveTo(radius * 0.5, -radius * 1.5, radius * 0.8, 0);
        ctx.stroke();
    }
    ctx.restore();
}

function drawHeadDecoration(ctx, hx, hy, radius, angle, type, color) {
    if (type === "none") return;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    if (type === "horns") {
        ctx.beginPath();
        // Left Horn (Faded tip)
        ctx.moveTo(radius * 0.4, -radius * 0.7);
        ctx.bezierCurveTo(radius * 1.0, -radius * 1.2, radius * 1.5, -radius * 2.2, radius * 1.8, -radius * 2.5);
        ctx.lineTo(radius * 1.2, -radius * 0.8);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        // Right Horn
        ctx.moveTo(radius * 0.4, radius * 0.7);
        ctx.bezierCurveTo(radius * 1.0, radius * 1.2, radius * 1.5, radius * 2.2, radius * 1.8, radius * 2.5);
        ctx.lineTo(radius * 1.2, radius * 0.8);
        ctx.closePath();
        ctx.fill();
    } else if (type === "cat") {
        ctx.beginPath();
        // Left Ear (Triangular/Pointy)
        ctx.moveTo(-radius * 0.3, -radius * 0.8);
        ctx.lineTo(radius * 0.2, -radius * 1.8);
        ctx.lineTo(radius * 0.7, -radius * 0.6);
        ctx.fill();
        
        // Right Ear
        ctx.beginPath();
        ctx.moveTo(-radius * 0.3, radius * 0.8);
        ctx.lineTo(radius * 0.2, radius * 1.8);
        ctx.lineTo(radius * 0.7, radius * 0.6);
        ctx.fill();
        
        // Inner ears
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.moveTo(0, -radius * 1.0); ctx.lineTo(radius * 0.2, -radius * 1.5); ctx.lineTo(radius * 0.4, -radius * 0.8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, radius * 1.0); ctx.lineTo(radius * 0.2, radius * 1.5); ctx.lineTo(radius * 0.4, radius * 0.8); ctx.fill();
        // Whiskers
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(radius * 0.8, -2); ctx.lineTo(radius * 1.5, -10);
        ctx.moveTo(radius * 0.8, 0); ctx.lineTo(radius * 1.8, 0);
        ctx.moveTo(radius * 0.8, 2); ctx.lineTo(radius * 1.5, 10);
        ctx.stroke();
    } else if (type === "dog") {
        ctx.beginPath();
        // Left Floppy Ear
        ctx.ellipse(radius * 0.2, -radius * 1.2, radius * 0.6, radius * 0.4, -0.3, 0, Math.PI * 2);
        // Right Floppy Ear
        ctx.ellipse(radius * 0.2, radius * 1.2, radius * 0.6, radius * 0.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Nose
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(radius * 0.95, 0, 4, 0, Math.PI * 2); ctx.fill();
    } else if (type === "cyber") {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.strokeRect(-radius * 0.5, -radius * 1.1, radius, radius * 2.2);
    } else if (type === "crown") {
        const gold = "#fbbf24";
        const darkGold = "#b45309";
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.7, -radius * 0.5);
        ctx.lineTo(-radius * 0.8, -radius * 1.5); // Peak 1
        ctx.lineTo(-radius * 0.4, -radius * 0.8);
        ctx.lineTo(0, -radius * 1.8); // Center Peak
        ctx.lineTo(radius * 0.4, -radius * 0.8);
        ctx.lineTo(radius * 0.8, -radius * 1.5); // Peak 3
        ctx.lineTo(radius * 0.7, -radius * 0.5);
        ctx.lineTo(radius * 0.7, radius * 0.5);
        ctx.lineTo(-radius * 0.7, radius * 0.5);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = darkGold; ctx.lineWidth = 1; ctx.stroke();
        
        // Jewels
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, -radius * 1.0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(-radius * 0.4, -radius * 0.6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(radius * 0.4, -radius * 0.6, 2, 0, Math.PI * 2); ctx.fill();
    }
    
    ctx.restore();
}

function drawTailDecoration(ctx, tx, ty, radius, type, color, angle) {
    if (type === "standard") return;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    
    if (type === "glow") {
        const pulse = Math.sin(Date.now() / 200) * 5 + 10;
        ctx.shadowBlur = pulse; ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (type === "spikes") {
        ctx.fillStyle = color;
        ctx.shadowBlur = 10; ctx.shadowColor = color;
        
        // Premium Mace/Tail Blade Design
        // Main Core
        ctx.beginPath();
        ctx.arc(-radius * 0.5, 0, radius * 1.1, 0, Math.PI * 2);
        ctx.fill();
        
        // Spikes (Pointing away from movement)
        for (let i = 0; i < 5; i++) {
            ctx.save();
            const sa = Math.PI - 0.8 + (i * 0.4); // Focus spikes towards back
            ctx.rotate(sa);
            
            ctx.beginPath();
            ctx.moveTo(radius * 0.8, -radius * 0.3);
            ctx.lineTo(radius * 2.2, 0); // Long sharp point
            ctx.lineTo(radius * 0.8, radius * 0.3);
            ctx.closePath();
            ctx.fill();
            
            // Secondary highlight on spikes
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(radius * 0.9, 0);
            ctx.lineTo(radius * 1.8, 0);
            ctx.stroke();
            
            ctx.restore();
        }
    } else if (type === "chain") {
        const linkCount = 3;
        const linkSize = radius * 1.2;
        ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
        for (let i = 0; i < linkCount; i++) {
            ctx.save();
            ctx.translate(-i * linkSize * 0.7, 0);
            if (i % 2 === 1) ctx.rotate(Math.PI / 2);
            ctx.shadowBlur = 5; ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.beginPath(); ctx.ellipse(0, 0, linkSize, linkSize * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(0, -1, linkSize * 0.8, linkSize * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    } else if (type === "fire") {
        const pulse = Math.sin(Date.now() / 100) * 0.2 + 1.0;
        const fGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.5 * pulse);
        fGrad.addColorStop(0, "#fff"); fGrad.addColorStop(0.3, "#fbbf24"); fGrad.addColorStop(0.6, "#ef4444"); fGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fGrad; ctx.shadowBlur = 20; ctx.shadowColor = "#f97316";
        ctx.beginPath(); ctx.arc(0, 0, radius * 2.5 * pulse, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.3) spawnFlame(tx, ty, 1);
    } else if (type === "skeleton") {
        ctx.fillStyle = "#f1f5f9"; // Bone color
        ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1;
        const vertebraSize = radius * 1.3;
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.translate(-i * vertebraSize * 0.8, 0);
            
            // Main bone body
            ctx.beginPath();
            ctx.ellipse(0, 0, vertebraSize * 0.6, vertebraSize * 0.9, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            
            // Side processes (spikes)
            ctx.beginPath();
            ctx.moveTo(0, -vertebraSize * 0.8);
            ctx.lineTo(-vertebraSize * 0.8, -vertebraSize * 1.2);
            ctx.moveTo(0, vertebraSize * 0.8);
            ctx.lineTo(-vertebraSize * 0.8, vertebraSize * 1.2);
            ctx.stroke();
            
            ctx.restore();
        }
    }
    
    ctx.restore();
}

function gameOver() {
    currentState = STATE.GAMEOVER; SFX.gameover();
    
    // Award coins based on score
    const coinsEarned = Math.floor(player.score);
    totalCoins += coinsEarned;
    localStorage.setItem("snake-brasil-coins", totalCoins);
    
    if (player.score > highScore) { highScore = player.score; localStorage.setItem("snake-brasil-high", highScore); uiHighScore.innerText = highScore; }
    finalScore.innerText = Math.floor(player.score); finalLevel.innerText = player.level;
    
    // Show earnings in game over screen if possible
    const earningsEl = document.getElementById("match-earnings");
    if (earningsEl) earningsEl.innerText = "+" + coinsEarned + " 💰";
    
    showScreen(screenOver);
    updateUI();
}

function saveLocalScore(name, score) {
    let ranks = JSON.parse(localStorage.getItem("snake-brasil-ranks") || "[]");
    ranks.push({ name, score }); ranks.sort((a,b) => b.score - a.score); ranks = ranks.slice(0, 5);
    localStorage.setItem("snake-brasil-ranks", JSON.stringify(ranks));
}

function openRanking() { displayRankings(); showScreen(screenRank); }
function displayRankings() {
    let ranks = JSON.parse(localStorage.getItem("snake-brasil-ranks") || "[]");
    rankingList.innerHTML = ranks.length ? ranks.map((r, i) => `<li class="ranking-item"><span>${i+1}. ${r.name}</span><span>${r.score}</span></li>`).join("") : "<p>Nenhum recorde!</p>";
}

window.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") { 
        if (currentState === STATE.PLAYING) currentState = STATE.PAUSED; 
        else if (currentState === STATE.PAUSED) currentState = STATE.PLAYING; 
        return; 
    }
    if (e.key === " ") {
        player.isBoosting = true;
        return;
    }
});

window.addEventListener("keyup", (e) => {
    if (e.key === " ") {
        player.isBoosting = false;
    }
});

let touchStartX = null, touchStartY = null;
function buyCosmetic(category, itemId) {
    const item = COSMETIC_CATALOG[category][itemId];
    if (totalCoins >= item.price) {
        if (confirm(`Deseja comprar ${item.name} por ${item.price} moedas?`)) {
            totalCoins -= item.price;
            unlockedCosmetics[category].push(itemId);
            localStorage.setItem("snake-brasil-coins", totalCoins);
            localStorage.setItem("snake-brasil-unlocks-v3", JSON.stringify(unlockedCosmetics));
            SFX.powerup();
            updateUI();
        }
    } else {
        alert("Moedas insuficientes!");
    }
}

canvas.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, {passive:true});
canvas.addEventListener("touchend", (e) => {
    if (touchStartX === null || touchStartY === null || currentState !== STATE.PLAYING) return;
    const dx = e.changedTouches[0].screenX - touchStartX, dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
        player.targetAngle = Math.atan2(dy, dx);
    }
});

init();
