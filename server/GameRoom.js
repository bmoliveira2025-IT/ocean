// GameRoom.js – Lógica do servidor de jogo
const WORLD_SIZE = 6000;
const BASE_SPEED = 140;
const BOOST_SPEED = 252;
const TURN_SPEED = 4.0;
const INITIAL_LENGTH = 15;
const TICK_RATE = 20;

const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
};
const distSq = (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2;
const randomRange = (min, max) => Math.random() * (max - min) + min;

const BOT_NAMES = [
  'Abyss Walker', 'Kraken', 'Megalodon', 'Siren', 'Leviathan',
  'Nemo', 'Moby', 'Orca', 'Tsunami', 'Coral Reaper',
  'Aqua', 'Deep Blue', 'Predator', 'Trench', 'Vortex',
];

const ORB_COLORS = ['#52b788', '#e07a5f', '#1a6fa8', '#f4d03f', '#9b59b6'];

class Orb {
  constructor() {
    this.id = Math.random().toString(36).substring(2, 9);
    this.x = randomRange(100, WORLD_SIZE - 100);
    this.y = randomRange(100, WORLD_SIZE - 100);
    this.value = randomRange(10, 30);
    this.size = Math.sqrt(this.value) * 1.5;
    this.color = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
    this.isPowerup = false;
    this.collected = false;
  }
}

class PowerOrb extends Orb {
  constructor(type) {
    super();
    this.isPowerup = true;
    this.type = type; // 0=shield, 1=speed, 2=magnet, 3=coin
    const typeColors = ['#00b4d8', '#f4d03f', '#9b59b6', '#ffd700'];
    this.color = typeColors[type];
    this.value = 100;
    this.size = 15;
  }
}

class Snake {
  constructor(id, name, skinColor, skinType, isBot = false) {
    this.id = id;
    this.name = name;
    this.color = skinColor || '#39ff14';
    this.skinType = skinType || 'cyclops';
    this.isBot = isBot;
    this.x = randomRange(500, WORLD_SIZE - 500);
    this.y = randomRange(500, WORLD_SIZE - 500);
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.score = 500;
    this.dead = false;
    this.spawnProtection = 3.0;
    this.shieldTimer = 0;
    this.speedTimer = 0;
    this.isBoosting = false;
    this.boostEnergy = 100;
    this.sessionCoins = 0;

    // Build initial body
    this.body = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      this.body.push({ x: this.x - i * 5, y: this.y });
    }

    // Bot-specific AI
    if (isBot) {
      this.aggressiveness = Math.random();
      this.aiState = 'forage';
    }
  }

  get size() {
    return 12 + Math.sqrt(this.score) * 0.15;
  }

  get length() {
    return Math.floor(INITIAL_LENGTH + this.score / 100);
  }

  update(dt, input) {
    if (this.dead) return;
    if (this.spawnProtection > 0) this.spawnProtection -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.speedTimer > 0) this.speedTimer -= dt;

    // Apply input (for real players) or AI
    if (!this.isBot && input) {
      this.targetAngle = input.angle;
      this.isBoosting = input.isBoosting;
    } else {
      this.updateAI(dt);
    }

    if (this.isBoosting && this.boostEnergy > 0) {
      this.boostEnergy -= dt * 25;
      if (this.score > 150) this.score -= dt * 20;
      if (this.boostEnergy <= 0) this.isBoosting = false;
    } else {
      this.boostEnergy = Math.min(100, this.boostEnergy + dt * 10);
    }

    const speedMult = this.speedTimer > 0 ? 3 : (this.isBoosting ? 1.8 : 1);
    const speed = BASE_SPEED * speedMult;
    this.angle = lerpAngle(this.angle, this.targetAngle, dt * TURN_SPEED);
    this.x += Math.cos(this.angle) * speed * dt;
    this.y += Math.sin(this.angle) * speed * dt;

    // Wall
    if (this.x < 0 || this.x > WORLD_SIZE || this.y < 0 || this.y > WORLD_SIZE) {
      if (this.spawnProtection > 0) {
        this.x = Math.max(0, Math.min(this.x, WORLD_SIZE));
        this.y = Math.max(0, Math.min(this.y, WORLD_SIZE));
        this.angle += Math.PI;
        this.targetAngle = this.angle;
      } else {
        this.dead = true;
        return;
      }
    }

    // Body update
    this.body.unshift({ x: this.x, y: this.y });
    while (this.body.length > this.length) this.body.pop();

    // Bot score growth
    if (this.isBot) this.score += dt * 10;
  }

  updateAI(dt) {
    // Simple wander + wall avoidance
    this.targetAngle += (Math.random() - 0.5) * dt * 2;
    const wallMargin = 500;
    if (this.x < wallMargin) this.targetAngle = lerpAngle(this.targetAngle, 0, dt * 2);
    if (this.y < wallMargin) this.targetAngle = lerpAngle(this.targetAngle, Math.PI / 2, dt * 2);
    if (this.x > WORLD_SIZE - wallMargin) this.targetAngle = lerpAngle(this.targetAngle, Math.PI, dt * 2);
    if (this.y > WORLD_SIZE - wallMargin) this.targetAngle = lerpAngle(this.targetAngle, -Math.PI / 2, dt * 2);
  }

  toDTO() {
    // Compact data for network transmission
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      skinType: this.skinType,
      x: Math.round(this.x),
      y: Math.round(this.y),
      angle: this.angle,
      score: Math.floor(this.score),
      size: this.size,
      isBoosting: this.isBoosting,
      shieldTimer: this.shieldTimer,
      speedTimer: this.speedTimer,
      isBot: this.isBot,
      // Send only every 3rd segment to reduce bandwidth
      body: this.body.filter((_, i) => i % 3 === 0).slice(0, 60).map(s => [Math.round(s.x), Math.round(s.y)])
    };
  }
}

class GameRoom {
  constructor(id, io) {
    this.id = id;
    this.io = io;
    this.players = new Map(); // socketId → Snake
    this.inputs = new Map();  // socketId → { angle, isBoosting }
    this.orbs = new Map();
    this.bots = [];
    this.tickInterval = null;
    this.lastTime = Date.now();
    this.events = []; // Events to broadcast this tick (kills, etc.)

    this._spawnInitialOrbs(1500);
    this._spawnBots(30);
    this._startTick();
  }

  _spawnInitialOrbs(count) {
    for (let i = 0; i < count; i++) {
      const o = new Orb();
      this.orbs.set(o.id, o);
    }
    for (let i = 0; i < 10; i++) {
      const type = Math.floor(Math.random() * 4);
      const p = new PowerOrb(type);
      this.orbs.set(p.id, p);
    }
  }

  _spawnBots(count) {
    for (let i = 0; i < count; i++) {
      const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const colors = ['#00b4d8', '#e07a5f', '#52b788', '#f4d03f', '#9b59b6', '#ff4757'];
      const skinTypes = ['cyclops', 'lula', 'dragon', 'chain', 'skeleton', 'dragon_neon', 'seahorse', 'skeleton_neon'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const skinType = skinTypes[Math.floor(Math.random() * skinTypes.length)];
      const bot = new Snake(`bot_${i}_${Date.now()}`, name, color, skinType, true);
      bot.score = randomRange(300, 3000);
      this.bots.push(bot);
    }
  }

  _startTick() {
    this.tickInterval = setInterval(() => this._tick(), 1000 / TICK_RATE);
  }

  addPlayer(socketId, name, skinColor, skinType) {
    const snake = new Snake(socketId, name, skinColor, skinType, false);
    this.players.set(socketId, snake);
    this.inputs.set(socketId, { angle: 0, isBoosting: false });

    // Send initial state (orbs)
    const orbsArray = Array.from(this.orbs.values()).map(o => ({
      id: o.id, x: Math.round(o.x), y: Math.round(o.y),
      color: o.color, size: o.size, isPowerup: o.isPowerup,
      type: o.type
    }));
    return { snake, orbs: orbsArray };
  }

  removePlayer(socketId) {
    const snake = this.players.get(socketId);
    if (snake && !snake.dead) {
      // Drop orbs
      this._dropSnakeOrbs(snake);
    }
    this.players.delete(socketId);
    this.inputs.delete(socketId);
  }

  updateInput(socketId, input) {
    if (this.inputs.has(socketId)) {
      this.inputs.set(socketId, input);
    }
  }

  _tick() {
    const now = Date.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.events = [];

    const allSnakes = [...this.players.values(), ...this.bots];

    // Update snakes
    allSnakes.forEach(snake => {
      if (snake.dead) return;
      const input = this.inputs.get(snake.id);
      snake.update(dt, input);
    });

    // Collect orbs — gather deletions first, then apply
    const deletedOrbIds = [];
    allSnakes.forEach(snake => {
      if (snake.dead) return;
      const r = snake.size * 1.5;
      this.orbs.forEach((orb, orbId) => {
        if (deletedOrbIds.includes(orbId)) return; // already collected this tick
        if (distSq(snake.x, snake.y, orb.x, orb.y) < r * r) {
          snake.score += orb.value;
          if (orb.isPowerup) {
            if (orb.type === 0) snake.shieldTimer = 8;
            else if (orb.type === 1) snake.speedTimer = 6;
            else if (orb.type === 3) snake.sessionCoins++;
            this.events.push({ type: 'powerup', playerId: snake.id, orbType: orb.type });
          }
          deletedOrbIds.push(orbId);
        }
      });
    });

    // Apply deletions and respawn
    deletedOrbIds.forEach(orbId => {
      this.orbs.delete(orbId);
      setTimeout(() => {
        if (this.orbs.size < 1500) {
          const newOrb = new Orb();
          this.orbs.set(newOrb.id, newOrb);
          this.io.to(this.id).emit('orbSpawn', [{ id: newOrb.id, x: Math.round(newOrb.x), y: Math.round(newOrb.y), color: newOrb.color, size: newOrb.size, isPowerup: false }]);
        }
      }, 200);
    });

    // Emit direct orbDelete event so clients remove them immediately
    if (deletedOrbIds.length > 0) {
      this.io.to(this.id).emit('orbDelete', deletedOrbIds);
    }

    // Collision detection (head vs body)
    allSnakes.forEach(attacker => {
      if (attacker.dead || attacker.spawnProtection > 0) return;
      allSnakes.forEach(defender => {
        if (attacker.dead) return; // FIX: Break if already died to another snake this tick!
        if (defender === attacker || defender.dead) return;
        defender.body.forEach((seg, i) => {
          if (attacker.dead) return; // FIX: Break if already died to another segment this tick!
          if (i < 3) return; // skip head segments
          if (distSq(attacker.x, attacker.y, seg.x, seg.y) < (attacker.size * 0.8) ** 2) {
            if (attacker.shieldTimer > 0) {
              attacker.shieldTimer = 0;
              return;
            }
            attacker.dead = true;
            this._dropSnakeOrbs(attacker);
            this.events.push({ type: 'death', deadId: attacker.id, killerId: defender.id, name: attacker.name, killerName: defender.name });
          }
        });
      });
    });

    // Remove dead snakes and respawn bots
    this.bots = this.bots.filter(bot => {
      if (bot.dead) {
        setTimeout(() => {
          const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          const colors = ['#00b4d8', '#e07a5f', '#52b788', '#f4d03f', '#9b59b6'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const newBot = new Snake(`bot_${Date.now()}`, name, color, true);
          this.bots.push(newBot);
        }, 3000);
        return false;
      }
      return true;
    });

    // Notify dead players and remove them from the room
    this.players.forEach((snake, socketId) => {
      if (snake.dead) {
        this.io.to(socketId).emit('you_died', { score: Math.floor(snake.score) });
        this.players.delete(socketId);
        this.inputs.delete(socketId);
      }
    });

    // Broadcast state — only alive snakes
    const playerDTOs = [...this.players.values()].map(s => s.toDTO());
    const botDTOs = this.bots.filter(b => !b.dead).map(s => s.toDTO());

    this.io.to(this.id).emit('state', {
      snakes: [...playerDTOs, ...botDTOs],
      events: this.events,
      tick: Date.now()
    });
  }

  _dropSnakeOrbs(snake) {
    const count = Math.min(50, Math.floor(snake.body.length / 2));
    for (let i = 0; i < count; i++) {
      const seg = snake.body[i * 2] || snake.body[snake.body.length - 1];
      const o = new Orb();
      o.x = seg.x + randomRange(-20, 20);
      o.y = seg.y + randomRange(-20, 20);
      o.value = Math.max(10, snake.score / snake.body.length * 2);
      o.color = snake.color;
      o.size = Math.sqrt(o.value) * 1.5;
      this.orbs.set(o.id, o);
    }
    // Notify clients of new orbs
    const newOrbs = Array.from(this.orbs.values()).slice(-count).map(o => ({
      id: o.id, x: Math.round(o.x), y: Math.round(o.y),
      color: o.color, size: o.size, isPowerup: false
    }));
    this.io.to(this.id).emit('orbSpawn', newOrbs);
  }

  get isEmpty() {
    return this.players.size === 0;
  }

  destroy() {
    clearInterval(this.tickInterval);
  }
}

module.exports = { GameRoom };
