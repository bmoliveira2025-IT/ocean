import React, { useEffect, useRef, useState, useCallback } from 'react';
import Logo from './components/Logo';

// ==========================================
// CONSTANTS & CONFIG
// ==========================================
const WORLD_SIZE = 6000;
const BASE_SPEED = 140; 
const BOOST_SPEED = 450;
const TURN_SPEED = 4.0;
const INITIAL_LENGTH = 15;
const COLORS = {
  blue: '#1a6fa8',
  turquoise: '#00b4d8',
  coral: '#e07a5f',
  yellow: '#f4d03f',
  green: '#52b788',
  purple: '#9b59b6',
  white: '#ffffff',
  danger: '#ff4757',
  neonGreen: '#39ff14', 
  neonCyan: '#00ffff', 
  neonPink: '#ff00ff', 
  boneWhite: '#e0e0e0', 
  classicRed: '#ef4444',
  silver: '#9ca3af', // Corrente
  brGreen: '#009c3b', // Cores BR
  brYellow: '#ffdf00',
  brBlue: '#002776'
};

// --- NOVO: Configurações das Skins ---
const SKINS = [
  { id: 'classic', name: 'Ciclope Verde', color: '#39ff14', type: 'cyclops', cost: 0 },
  { id: 'lula_red', name: 'Lula Clássica', color: '#ef4444', type: 'lula', cost: 0 }, 
  { id: 'blue', name: 'Abissal Azul', color: '#00b4d8', type: 'cyclops', cost: 0 },
  { id: 'dragon', name: 'Dragão Negro', color: '#1a1a1a', type: 'dragon', cost: 50 },
  { id: 'chain', name: 'Corrente Metálica (Rara)', color: '#9ca3af', type: 'chain', cost: 150 }, 
  { id: 'skeleton', name: 'Esqueleto (Raro)', color: '#e0e0e0', type: 'skeleton', cost: 150 },
  { id: 'neon_dragon', name: 'Dragão Neon', color: '#00ffff', type: 'dragon_neon', cost: 200 },
  { id: 'brazil_seahorse', name: 'Cavalo Marinho BR', color: '#009c3b', type: 'seahorse', cost: 300 }, // NOVA SKIN BRASIL!
  { id: 'neon_skeleton', name: 'Lich Neon (Épico)', color: '#ff00ff', type: 'skeleton_neon', cost: 500 }
];

const BOT_NAMES = [
  "Abyss Walker", "Kraken", "Megalodon", "Siren", "Leviathan", 
  "Nemo", "Moby", "Orca", "Tsunami", "Coral Reaper",
  "Aqua", "Deep Blue", "Predator", "Trench", "Vortex",
  "Pelagic", "Benthic", "Sonar", "Tide", "Neptune"
];

// ==========================================
// MATH & UTILS
// ==========================================
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
};
const distSq = (x1, y1, x2, y2) => (x2 - x1) ** 2 + (y2 - y1) ** 2;
const randomRange = (min, max) => Math.random() * (max - min) + min;

// --- NOVO: Função para encontrar local seguro de spawn ---
const getSafeSpawnPosition = (snakes, worldSize, margin = 500, minDistance = 1000) => {
  for (let i = 0; i < 20; i++) {
    const x = randomRange(margin, worldSize - margin);
    const y = randomRange(margin, worldSize - margin);
    let isSafe = true;
    for (const snake of snakes) {
      if (distSq(x, y, snake.x, snake.y) < minDistance * minDistance) {
        isSafe = false;
        break;
      }
    }
    if (isSafe) return { x, y };
  }
  return { x: randomRange(margin, worldSize - margin), y: randomRange(margin, worldSize - margin) };
};

// ==========================================
// PROCEDURAL AUDIO ENGINE (Web Audio API)
// ==========================================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmGain = null;
  }
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.startAmbient();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      if (this.bgmGain) this.bgmGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.5);
    } else {
      if (this.bgmGain) this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    }
    return this.enabled;
  }

  startAmbient() {
    if (this.bgmGain) return;
    if (!this.ctx) return;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.enabled ? 0.3 : 0;
    this.bgmGain.connect(this.ctx.destination);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 55;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 110;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 250;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.bgmGain);

    osc1.start();
    osc2.start();
    
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 150;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
  }

  play(type, volume = 1) {
    if (!this.enabled || !this.ctx) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (type) {
      case 'pop':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        gain.gain.setValueAtTime(0.4 * volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      case 'coin':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t); 
        osc.frequency.setValueAtTime(1318.51, t + 0.1);
        gain.gain.setValueAtTime(0.3 * volume, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      case 'death':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.8);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.8);
        
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);
        
        gain.gain.setValueAtTime(0.5 * volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        osc.start(t);
        osc.stop(t + 0.8);
        break;
      case 'powerup':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, t);
        osc.frequency.setValueAtTime(659, t + 0.1);
        osc.frequency.setValueAtTime(784, t + 0.2);
        osc.frequency.setValueAtTime(1047, t + 0.3);
        gain.gain.setValueAtTime(0.2 * volume, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
        break;
      case 'shield_break':
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(1000, t + 0.3);
        
        const bpFilter = this.ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.value = 1500;
        
        osc.disconnect();
        osc.connect(bpFilter);
        bpFilter.connect(gain);
        
        gain.gain.setValueAtTime(0.3 * volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      case 'boost':
        if (Math.random() > 0.05) return;
        osc.type = 'square';
        osc.frequency.setValueAtTime(60 + Math.random() * 20, t);
        
        const bpf = this.ctx.createBiquadFilter();
        bpf.type = 'lowpass';
        bpf.frequency.value = 400;
        
        osc.disconnect();
        osc.connect(bpf);
        bpf.connect(gain);
        
        gain.gain.setValueAtTime(0.03 * volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      case 'king':
        osc.type = 'square';
        osc.frequency.setValueAtTime(392.00, t);        
        osc.frequency.setValueAtTime(523.25, t + 0.15); 
        osc.frequency.setValueAtTime(659.25, t + 0.30); 
        osc.frequency.setValueAtTime(1046.50, t + 0.45); 
        
        const kingFilter = this.ctx.createBiquadFilter();
        kingFilter.type = 'lowpass';
        kingFilter.frequency.value = 2000;
        osc.disconnect();
        osc.connect(kingFilter);
        kingFilter.connect(gain);

        gain.gain.setValueAtTime(0.2 * volume, t);
        gain.gain.setValueAtTime(0.2 * volume, t + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        
        osc.start(t);
        osc.stop(t + 1.2);
        break;
    }
  }
}

// ==========================================
// SPATIAL HASHING (Optimization)
// ==========================================
class SpatialHash {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  hash(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
  insert(obj) {
    const key = this.hash(obj.x, obj.y);
    if (!this.cells.has(key)) this.cells.set(key, new Set());
    this.cells.get(key).add(obj);
    obj._hashKey = key;
  }
  update(obj) {
    const key = this.hash(obj.x, obj.y);
    if (obj._hashKey !== key) {
      if (obj._hashKey && this.cells.has(obj._hashKey)) {
        this.cells.get(obj._hashKey).delete(obj);
      }
      this.insert(obj);
    }
  }
  remove(obj) {
    if (obj._hashKey && this.cells.has(obj._hashKey)) {
      this.cells.get(obj._hashKey).delete(obj);
    }
  }
  getNearby(x, y, radius) {
    const nearby = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        if (this.cells.has(key)) {
          this.cells.get(key).forEach(obj => nearby.push(obj));
        }
      }
    }
    return nearby;
  }
  clear() {
    this.cells.clear();
  }
}

// ==========================================
// GAME ENTITIES
// ==========================================

class Particle {
  constructor(x, y, color, speedMultiplier = 1) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = randomRange(50, 150) * speedMultiplier;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = randomRange(0.5, 1.5);
    this.color = color;
    this.size = randomRange(2, 6);
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= this.decay * dt;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class Orb {
  constructor(x, y, isPowerup = false, type = 0, specificColor = null) {
    this.id = Math.random().toString(36);
    this.x = x;
    this.y = y;
    this.isPowerup = isPowerup;
    this.type = type;
    this.value = isPowerup ? 100 : randomRange(10, 30);
    this.size = isPowerup ? 15 : Math.sqrt(this.value) * 1.5;
    this.bobOffset = Math.random() * Math.PI * 2;
    
    if (isPowerup) {
      if (type === 3) this.color = '#ffd700'; 
      else this.color = type === 0 ? COLORS.turquoise : (type === 1 ? COLORS.yellow : COLORS.purple);
    } else {
      if (specificColor) {
        this.color = specificColor;
      } else {
        const colors = [COLORS.green, COLORS.coral, COLORS.blue, COLORS.yellow, COLORS.purple];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
    }
    
    this.absorbedBy = null;
    this.absorbProgress = 0;
  }

  update(dt) {
    this.bobOffset += dt * 2;
    if (this.absorbedBy) {
      this.absorbProgress += dt * 6;
      this.x = lerp(this.x, this.absorbedBy.x, this.absorbProgress);
      this.y = lerp(this.y, this.absorbedBy.y, this.absorbProgress);
    }
  }

  draw(ctx, preRenderedCanvases) {
    if (this.absorbProgress >= 1) return;
    
    const yOffset = Math.sin(this.bobOffset) * 3;
    const scale = this.absorbedBy ? 1 - this.absorbProgress : 1;
    
    ctx.save();
    ctx.translate(this.x, this.y + yOffset);
    ctx.scale(scale, scale);
    
    if (this.isPowerup) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + Math.sin(this.bobOffset * 2) * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = this.type === 3 ? 'black' : 'white';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      let icon = 'S';
      if (this.type === 1) icon = '⚡';
      if (this.type === 2) icon = '🧲';
      if (this.type === 3) icon = '🪙';
      ctx.fillText(icon, 0, 0);
    } else {
      const canvas = preRenderedCanvases[this.color];
      if (canvas) {
        ctx.drawImage(canvas, -this.size * 2, -this.size * 2, this.size * 4, this.size * 4);
      } else {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

class Snake {
  constructor(x, y, name, isPlayer, skinConfig) {
    this.id = Math.random().toString(36);
    this.name = (name && name.trim().length > 0) ? name : (isPlayer ? 'Anônimo' : BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]);
    this.isPlayer = isPlayer;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.baseSize = 12;
    this.score = 500;
    this.size = this.calculateSize();
    this.color = skinConfig.color;
    this.skinType = skinConfig.type;
    
    this.body = [];
    this.path = []; 
    const len = INITIAL_LENGTH;
    for (let i = 0; i < len; i++) {
      this.body.push({ x: this.x - i * 5, y: this.y - i * 5 });
      this.path.push({ x: this.x - i * 5, y: this.y - i * 5 });
    }
    
    this.isBoosting = false;
    this.boostEnergy = 100;
    this.dead = false;
    this.timeAlive = 0;
    this.sessionCoins = 0;
    this.isKing = false; 
    this.spawnProtectionTimer = 3.0;

    this.shieldTimer = 0;
    this.speedTimer = 0;
    this.magnetTimer = 0;

    this.aggressiveness = Math.random();
    this.caution = Math.random();
    this.aiState = 'forage';
    this.aiTarget = null;
    this.aiOrbitAngle = 0;
  }

  calculateSize() {
    return this.baseSize + Math.sqrt(this.score) * 0.15;
  }

  get length() {
    return Math.floor(INITIAL_LENGTH + this.score / 100);
  }

  update(dt, worldSize, inputTarget, spatialHash) {
    if (this.dead) return;
    this.timeAlive += dt;

    if (this.spawnProtectionTimer > 0) this.spawnProtectionTimer -= dt; 
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.speedTimer > 0) this.speedTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;

    const speedMult = this.speedTimer > 0 ? 3 : (this.isBoosting ? 1.8 : 1);
    const growthBonus = 1 + Math.min(0.4, this.score / 25000); // Bônus gradual de até 40% para compensar o zoom
    const speed = BASE_SPEED * speedMult * growthBonus;
    const turn = TURN_SPEED * (this.isBoosting ? 0.6 : 1);

    if (!this.isPlayer) {
      this.updateAI(dt, spatialHash);
      this.score += dt * 15;
    } else if (inputTarget) {
      this.targetAngle = Math.atan2(inputTarget.y - this.y, inputTarget.x - this.x);
    }

    if (this.isBoosting && this.boostEnergy > 0) {
      this.boostEnergy -= dt * 25;
      if (this.score > 150) this.score -= dt * 20; 
      if (this.boostEnergy <= 0) this.isBoosting = false;
    } else {
      this.boostEnergy = Math.min(100, this.boostEnergy + dt * 10);
    }

    this.angle = lerpAngle(this.angle, this.targetAngle, dt * turn);

    this.x += Math.cos(this.angle) * speed * dt;
    this.y += Math.sin(this.angle) * speed * dt;

    if (this.x < 0 || this.y < 0 || this.x > worldSize || this.y > worldSize) {
      this.x = Math.max(0, Math.min(this.x, worldSize));
      this.y = Math.max(0, Math.min(this.y, worldSize));
      if (this.spawnProtectionTimer > 0) {
        this.angle += Math.PI;
        this.targetAngle += Math.PI;
      } else {
        this.hitWall = true;
      }
    }

    this.size = this.calculateSize();

    this.path.unshift({ x: this.x, y: this.y });
    
    const spacing = this.skinType === 'chain' ? this.size * 0.6 : this.size * 0.25; 
    let pathIndex = 0;
    let distAccum = 0;

    while (this.body.length < this.length) {
      this.body.push({ ...this.body[this.body.length - 1] });
    }
    while (this.body.length > this.length) {
      this.body.pop();
    }

    this.body[0] = { x: this.x, y: this.y };
    for (let i = 1; i < this.body.length; i++) {
      let targetDist = i * spacing;
      
      while (distAccum < targetDist && pathIndex < this.path.length - 1) {
        let p1 = this.path[pathIndex];
        let p2 = this.path[pathIndex + 1];
        let d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (distAccum + d >= targetDist) {
          let t = (targetDist - distAccum) / d;
          this.body[i] = {
            x: lerp(p1.x, p2.x, t),
            y: lerp(p1.y, p2.y, t)
          };
          break;
        }
        distAccum += d;
        pathIndex++;
      }
      
      if (pathIndex >= this.path.length - 1) {
        this.body[i] = { ...this.path[this.path.length - 1] };
      }
    }

    if (this.path.length > this.length * 10) {
      this.path.length = this.length * 10;
    }
  }

  updateAI(dt, spatialHash) {
    if (Math.random() < 0.05) {
      this.isBoosting = false;
      if (this.aiTarget && distSq(this.x, this.y, this.aiTarget.x, this.aiTarget.y) < 1500 * 1500) {
        if (this.aiTarget.size > this.size * 1.2) {
          this.aiState = 'flee';
        } else if (this.aiTarget.size < this.size * 0.8 && this.aggressiveness > 0.3) {
          this.aiState = 'hunt';
          if (Math.random() < 0.3) this.aiState = 'encircle';
        } else {
          this.aiState = 'forage';
        }
      } else {
        this.aiState = 'forage';
        this.aiTarget = null;
      }
    }

    if (this.aiState === 'hunt' && this.aiTarget) {
      const predictTime = 1.5;
      const predictX = this.aiTarget.x + Math.cos(this.aiTarget.angle) * BASE_SPEED * predictTime;
      const predictY = this.aiTarget.y + Math.sin(this.aiTarget.angle) * BASE_SPEED * predictTime;
      
      this.targetAngle = Math.atan2(predictY - this.y, predictX - this.x);
      
      if (distSq(this.x, this.y, this.aiTarget.x, this.aiTarget.y) < 400 * 400) {
        this.isBoosting = true;
      }
    } else if (this.aiState === 'encircle' && this.aiTarget) {
      this.aiOrbitAngle += dt * 0.8;
      const radius = this.aiTarget.size * 2 + this.size * 2 + 30;
      const ox = this.aiTarget.x + Math.cos(this.aiOrbitAngle) * radius;
      const oy = this.aiTarget.y + Math.sin(this.aiOrbitAngle) * radius;
      this.targetAngle = Math.atan2(oy - this.y, ox - this.x);
      this.isBoosting = true;
    } else if (this.aiState === 'flee' && this.aiTarget) {
      this.targetAngle = Math.atan2(this.y - this.aiTarget.y, this.x - this.aiTarget.x); 
      this.isBoosting = true;
    } else {
      this.targetAngle += (Math.random() - 0.5) * dt * 3;
    }

    if (spatialHash) {
      const lookAhead = this.size * 10;
      const nearby = spatialHash.getNearby(this.x, this.y, lookAhead);
      let turnForce = 0;

      for (const item of nearby) {
        if (item.isBody && item.parent !== this) {
          const dSq = distSq(this.x, this.y, item.x, item.y);
          if (dSq < lookAhead * lookAhead) {
            const angleToObs = Math.atan2(item.y - this.y, item.x - this.x);
            let angleDiff = angleToObs - this.angle;
            
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) < Math.PI / 1.5) {
              const force = (1 - Math.sqrt(dSq) / lookAhead) * 2;
              const dir = angleDiff >= 0 ? 1 : -1;
              turnForce -= dir * force;
            }
          }
        }
      }
      
      if (Math.abs(turnForce) > 0.1) {
        this.targetAngle += turnForce * dt * 10;
        if (Math.random() < 0.1) this.isBoosting = true; 
      }
    }

    const wallMargin = 600;
    if (this.x < wallMargin) this.targetAngle = lerpAngle(this.targetAngle, 0, dt * 2);
    if (this.y < wallMargin) this.targetAngle = lerpAngle(this.targetAngle, Math.PI / 2, dt * 2);
    if (this.x > WORLD_SIZE - wallMargin) this.targetAngle = lerpAngle(this.targetAngle, Math.PI, dt * 2);
    if (this.y > WORLD_SIZE - wallMargin) this.targetAngle = lerpAngle(this.targetAngle, -Math.PI / 2, dt * 2);
  }

  draw(ctx) {
    if (this.dead) return;
    
    ctx.save();
    if (this.spawnProtectionTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.timeAlive * 15) * 0.3;
    }

    if (this.shieldTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 2 + Math.sin(this.timeAlive * 10) * 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 180, 216, 0.2)';
      ctx.fill();
      ctx.strokeStyle = COLORS.turquoise;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (this.magnetTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 200, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(155, 89, 182, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = this.body.length - 1; i >= 0; i--) {
      const seg = this.body[i];
      // Culling: Only draw segments that are roughly in view
      if (ctx.viewRect && (
        seg.x < ctx.viewRect.minX - 50 || seg.x > ctx.viewRect.maxX + 50 ||
        seg.y < ctx.viewRect.minY - 50 || seg.y > ctx.viewRect.maxY + 50
      )) continue;

      const p = 1 - (i / this.body.length); 
      const s = this.size * (0.4 + 0.6 * p); 
      
      if (this.skinType === 'chain') {
        ctx.save();
        ctx.translate(seg.x, seg.y);
        
        let segAngle = this.angle;
        if (i > 0) {
           const prev = this.body[i-1];
           segAngle = Math.atan2(prev.y - seg.y, prev.x - seg.x);
        }
        ctx.rotate(segAngle);

        const isSideView = i % 2 === 0;

        const metalGrad = ctx.createLinearGradient(-s, -s, s, s);
        metalGrad.addColorStop(0, '#e5e7eb');
        metalGrad.addColorStop(0.5, '#6b7280');
        metalGrad.addColorStop(1, '#1f2937');

        ctx.fillStyle = metalGrad;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = s * 0.15;

        ctx.beginPath();
        if (isSideView) {
          ctx.ellipse(0, 0, s*1.2, s*0.7, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, 0, s*0.6, s*0.25, 0, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fill();
        } else {
          ctx.ellipse(0, 0, s*0.4, s*0.9, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Use pre-rendered segment if available
        const cacheKey = `${this.skinType}_${this.color}_${this.speedTimer > 0}`;
        const segmentCanvas = ctx.segmentCache && ctx.segmentCache[cacheKey];
        
        if (segmentCanvas) {
          ctx.drawImage(segmentCanvas, seg.x - s, seg.y - s, s * 2, s * 2);
        } else {
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, s, 0, Math.PI * 2);
          
          const grad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, s);
          if (this.speedTimer > 0) {
            grad.addColorStop(0, COLORS.yellow);
            grad.addColorStop(1, '#d35400');
          } else {
            if (this.skinType === 'dragon') {
              grad.addColorStop(0, '#333333');
              grad.addColorStop(0.8, '#111111');
              grad.addColorStop(1, '#8b0000'); 
            } else if (this.skinType === 'dragon_neon') {
              grad.addColorStop(0, '#111111');
              grad.addColorStop(0.7, '#222222');
              grad.addColorStop(1, this.color); 
            } else if (this.skinType === 'seahorse') {
              const stripe = Math.floor(i / 3) % 3;
              const segColor = stripe === 0 ? COLORS.brGreen : (stripe === 1 ? COLORS.brYellow : COLORS.brBlue);
              grad.addColorStop(0, segColor);
              grad.addColorStop(0.8, segColor);
              grad.addColorStop(1, 'rgba(0,0,0,0.5)');
            } else if (this.skinType.startsWith('skeleton')) {
              grad.addColorStop(0, '#000000'); 
              grad.addColorStop(0.5, '#1a1a1a');
              grad.addColorStop(0.8, this.color); 
              grad.addColorStop(1, '#000000'); 
            } else {
              grad.addColorStop(0, this.color);
              grad.addColorStop(0.8, this.color);
              grad.addColorStop(1, 'rgba(0,0,0,0.4)');
            }
          }
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    if (this.skinType.startsWith('dragon')) {
      const isNeon = this.skinType === 'dragon_neon';
      const hornColor = isNeon ? this.color : '#4a0000';
      const eyeColor = isNeon ? '#ffffff' : '#ff0000';
      const eyeGlow = isNeon ? this.color : '#ff0000';
      ctx.fillStyle = hornColor;
      if (isNeon) { ctx.shadowBlur = 10; ctx.shadowColor = this.color; }
      ctx.beginPath(); ctx.moveTo(0, -this.size * 0.4); ctx.lineTo(-this.size * 1.5, -this.size * 1.3); ctx.lineTo(-this.size * 0.5, -this.size * 0.1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, this.size * 0.4); ctx.lineTo(-this.size * 1.5, this.size * 1.3); ctx.lineTo(-this.size * 0.5, this.size * 0.1); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.9, 0, 0, Math.PI * 2);
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.1);
      headGrad.addColorStop(0, isNeon ? '#222' : '#444'); headGrad.addColorStop(1, '#050505');
      ctx.fillStyle = headGrad; ctx.fill();
      ctx.fillStyle = eyeColor; ctx.shadowBlur = 15; ctx.shadowColor = eyeGlow;
      ctx.beginPath(); ctx.ellipse(this.size * 0.4, -this.size * 0.35, this.size * 0.35, this.size * 0.15, Math.PI / 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(this.size * 0.4, this.size * 0.35, this.size * 0.35, this.size * 0.15, -Math.PI / 8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.ellipse(this.size * 0.45, -this.size * 0.35, this.size * 0.05, this.size * 0.12, Math.PI / 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(this.size * 0.45, this.size * 0.35, this.size * 0.05, this.size * 0.12, -Math.PI / 8, 0, Math.PI * 2); ctx.fill();
    } else if (this.skinType.startsWith('skeleton')) {
      const isNeon = this.skinType === 'skeleton_neon';
      ctx.beginPath(); ctx.ellipse(0, 0, this.size, this.size * 0.85, 0, 0, Math.PI * 2); ctx.fillStyle = this.color;
      if (isNeon) { ctx.shadowBlur = 15; ctx.shadowColor = this.color; }
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#050505';
      const eyeOffsetX = this.size * 0.3; const eyeSize = this.size * 0.35;
      ctx.beginPath(); ctx.arc(eyeOffsetX, -this.size * 0.35, eyeSize, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeOffsetX, this.size * 0.35, eyeSize, 0, Math.PI * 2); ctx.fill();
      if (isNeon) {
         ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
         ctx.beginPath(); ctx.arc(eyeOffsetX + 2, -this.size * 0.35, eyeSize * 0.3, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(eyeOffsetX + 2, this.size * 0.35, eyeSize * 0.3, 0, Math.PI * 2); ctx.fill();
         ctx.shadowBlur = 0;
      }
      ctx.fillStyle = '#050505';
      ctx.beginPath(); ctx.moveTo(this.size * 0.7, 0); ctx.lineTo(this.size * 0.5, -this.size * 0.1); ctx.lineTo(this.size * 0.5, this.size * 0.1); ctx.fill();
    } else if (this.skinType === 'chain') {
      ctx.beginPath(); ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.9, 0, 0, Math.PI * 2);
      const headGrad = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
      headGrad.addColorStop(0, '#e5e7eb'); headGrad.addColorStop(0.5, '#6b7280'); headGrad.addColorStop(1, '#111827');
      ctx.fillStyle = headGrad; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = this.size * 0.1; ctx.stroke();
      ctx.fillStyle = '#ff0000'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
      ctx.beginPath(); ctx.ellipse(this.size * 0.5, 0, this.size * 0.2, this.size * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (this.skinType === 'seahorse') {
      ctx.fillStyle = COLORS.brBlue; ctx.beginPath();
      ctx.moveTo(-this.size * 0.5, -this.size * 0.8); ctx.lineTo(-this.size * 0.2, -this.size * 1.5); ctx.lineTo(this.size * 0.1, -this.size * 0.8); ctx.lineTo(this.size * 0.4, -this.size * 1.4); ctx.lineTo(this.size * 0.6, -this.size * 0.7); ctx.fill();
      ctx.lineWidth = this.size * 0.7; ctx.strokeStyle = COLORS.brYellow; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(this.size * 1.8, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, this.size * 1.1, 0, Math.PI * 2);
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.1);
      headGrad.addColorStop(0, COLORS.brGreen); headGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = headGrad; ctx.fill();
      const eyeOffsetX = this.size * 0.3; const eyeOffsetY = this.size * 0.65; const eyeR = this.size * 0.45;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, -eyeOffsetY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeOffsetX + this.size*0.1, eyeOffsetY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
    } else if (this.skinType === 'lula') {
      ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      headGrad.addColorStop(0, this.color); headGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = headGrad; ctx.fill();
      ctx.lineWidth = this.size * 0.45; ctx.strokeStyle = this.color; ctx.lineCap = 'round';
      const eyeLX = this.size * 0.9; const eyeLY = -this.size * 0.65; const eyeRX = this.size * 0.9; const eyeRY = this.size * 0.65;
      ctx.beginPath(); ctx.moveTo(this.size * 0.2, -this.size * 0.3); ctx.lineTo(eyeLX, eyeLY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.size * 0.2, this.size * 0.3); ctx.lineTo(eyeRX, eyeRY); ctx.stroke();
      const eyeR = this.size * 0.5; const pupilR = this.size * 0.22;
      ctx.lineWidth = this.size * 0.15; ctx.strokeStyle = '#000000'; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(eyeLX, eyeLY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(eyeRX, eyeRY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(eyeLX + eyeR * 0.3, eyeLY, pupilR, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeRX + eyeR * 0.3, eyeRY, pupilR, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      headGrad.addColorStop(0, this.color); headGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = headGrad; ctx.fill();
      const eyeOffsetX = this.size * 0.3; const eyeSize = this.size * 0.45;
      ctx.fillStyle = '#00b4d8'; ctx.beginPath(); ctx.arc(eyeOffsetX, 0, eyeSize, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(eyeOffsetX + 2, 0, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    if (this.isKing) {
      ctx.save();
      ctx.translate(-this.size * 0.15, 0);
      const crownGrad = ctx.createLinearGradient(0, -this.size * 0.8, 0, this.size * 0.8);
      crownGrad.addColorStop(0, '#fde047'); crownGrad.addColorStop(0.5, '#fbbf24'); crownGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = crownGrad; ctx.strokeStyle = '#78350f'; ctx.lineWidth = this.size * 0.15; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(this.size * 0.2, -this.size * 0.7); ctx.lineTo(-this.size * 0.6, -this.size * 0.8); ctx.lineTo(-this.size * 0.1, -this.size * 0.25); ctx.lineTo(-this.size * 0.9, 0); ctx.lineTo(-this.size * 0.1, this.size * 0.25); ctx.lineTo(-this.size * 0.6, this.size * 0.8); ctx.lineTo(this.size * 0.2, this.size * 0.7); ctx.quadraticCurveTo(this.size * 0.5, 0, this.size * 0.2, -this.size * 0.7);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-this.size * 0.5, -this.size * 0.65, this.size * 0.12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(-this.size * 0.75, 0, this.size * 0.15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-this.size * 0.5, this.size * 0.75, this.size * 0.12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.beginPath(); ctx.arc(-this.size * 0.65, -this.size * 0.1, this.size * 0.08, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (this.size > 15) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, this.y - this.size - 10);
    }
    ctx.restore();
  }
}


// ==========================================
// GAME ENGINE CORE
// ==========================================
export default function OceanApp() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const joystick = useRef({ active: false, x: 0, y: 0, baseX: 0, baseY: 0 });
  
  const [isMobile, setIsMobile] = useState(false);
  const [gameState, setGameState] = useState('START'); 
  const [score, setScore] = useState(0);
  const [playerRank, setPlayerRank] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [selectedSkinIndex, setSelectedSkinIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [powerups, setPowerups] = useState({ shield: 0, speed: 0, magnet: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);

  const [coins, setCoins] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('ocean_coins') || '0', 10);
    }
    return 0;
  });

  const [unlockedSkins, setUnlockedSkins] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ocean_unlocked_skins');
      return saved ? JSON.parse(saved) : ['classic', 'blue', 'lula_red'];
    }
    return ['classic', 'blue', 'lula_red'];
  });

  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ocean_highscore');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const state = useRef({
    snakes: [],
    orbs: [],
    particles: [],
    camera: { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 1 },
    player: null,
    mouseX: 0,
    mouseY: 0,
    lastTime: 0,
    audio: new AudioEngine(),
    spatialHash: new SpatialHash(200), 
    orbCanvases: {},
    eventQueue: [],
    finalScore: 0,
    earnedCoins: 0,
    lastKingId: null 
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 800px)").matches || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const s = state.current;
    [COLORS.green, COLORS.coral, COLORS.blue, COLORS.yellow, COLORS.purple, COLORS.danger, COLORS.neonGreen, COLORS.turquoise, COLORS.neonCyan, COLORS.neonPink, COLORS.boneWhite, COLORS.classicRed, COLORS.silver, COLORS.brGreen, COLORS.brYellow, COLORS.brBlue].forEach(color => {
      const oc = document.createElement('canvas');
      oc.width = 40; oc.height = 40;
      const octx = oc.getContext('2d');
      octx.shadowBlur = 10;
      octx.shadowColor = color;
      octx.fillStyle = color;
      octx.beginPath();
      octx.arc(20, 20, 5, 0, Math.PI * 2);
      octx.fill();
      s.orbCanvases[color] = oc;
    });
  }, []);

  const spawnOrb = (x, y, value, isPowerup = false, type = 0, specificColor = null) => {
    const o = new Orb(x, y, isPowerup, type, specificColor);
    o.value = value;
    state.current.orbs.push(o);
    state.current.spatialHash.insert(o);
  };

  const spawnBot = () => {
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const randomSkin = SKINS[Math.floor(Math.random() * SKINS.length)];
    const pos = getSafeSpawnPosition(state.current.snakes, WORLD_SIZE);
    const bot = new Snake(pos.x, pos.y, name, false, randomSkin);
    const isGiant = Math.random() < 0.15;
    bot.score = isGiant ? randomRange(4000, 12000) : randomRange(300, 2500);
    state.current.snakes.push(bot);
  };

  const spawnExplosion = (x, y, color, count) => {
    for (let i = 0; i < count; i++) {
      state.current.particles.push(new Particle(x, y, color, 1));
    }
  };

  const startGame = () => {
    const s = state.current;
    s.audio.init();
    s.audio.enabled = soundEnabled;
    s.snakes = []; s.orbs = []; s.particles = []; s.spatialHash.clear(); s.eventQueue = []; s.lastKingId = null;
    const finalName = playerName.trim() === '' ? 'Anônimo' : playerName.trim();
    const chosenSkin = SKINS[selectedSkinIndex];
    const pos = getSafeSpawnPosition(s.snakes, WORLD_SIZE);
    s.player = new Snake(pos.x, pos.y, finalName, true, chosenSkin);
    s.snakes.push(s.player);
    for (let i = 0; i < 2000; i++) spawnOrb(randomRange(0, WORLD_SIZE), randomRange(0, WORLD_SIZE), 10);
    for (let i = 0; i < 5; i++) {
      const type = Math.random() < 0.5 ? 3 : Math.floor(Math.random() * 3);
      spawnOrb(randomRange(0, WORLD_SIZE), randomRange(0, WORLD_SIZE), 0, true, type);
    }
    for (let i = 0; i < 40; i++) spawnBot();
    
    // Solicitando Tela Cheia no mobile
    if (isMobile) {
      const doc = document.documentElement;
      if (doc.requestFullscreen) doc.requestFullscreen();
      else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();
      else if (doc.msRequestFullscreen) doc.msRequestFullscreen();
      
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    }

    setGameState('PLAYING'); setScore(500); setPowerups({ shield: 0, speed: 0, magnet: 0 });
    s.lastTime = performance.now();
    if (engineRef.current) cancelAnimationFrame(engineRef.current);
    engineRef.current = requestAnimationFrame(gameLoop);
  };

  const handleInput = (e) => {
    if (gameState !== 'PLAYING') return;
    if (joystick.current.active && e.touches) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches.length > 0) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    if (cx !== undefined && cy !== undefined) {
      state.current.mouseX = cx - rect.left; state.current.mouseY = cy - rect.top;
    }
  };

  const handleDown = () => { if (!isMobile && state.current.player) state.current.player.isBoosting = true; };
  const handleUp = () => { if (!isMobile && state.current.player) state.current.player.isBoosting = false; };

  const handleJoystickStart = (e) => {
    e.stopPropagation(); joystick.current.active = true;
    const rect = e.currentTarget.getBoundingClientRect();
    joystick.current.baseX = rect.left + rect.width / 2;
    joystick.current.baseY = rect.top + rect.height / 2;
    handleJoystickMove(e);
  };

  const handleJoystickMove = (e) => {
    e.stopPropagation(); if (!joystick.current.active) return;
    const touch = e.targetTouches[0]; if (!touch) return;
    const dx = touch.clientX - joystick.current.baseX; const dy = touch.clientY - joystick.current.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy); const maxDist = 40;
    const nx = dist > maxDist ? (dx / dist) * maxDist : dx;
    const ny = dist > maxDist ? (dy / dist) * maxDist : dy;
    joystick.current.x = nx; joystick.current.y = ny;
    const knob = document.getElementById('joystick-knob');
    if (knob) knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    const canvas = canvasRef.current;
    if (canvas) {
       state.current.mouseX = (canvas.width / 2) + nx * 10;
       state.current.mouseY = (canvas.height / 2) + ny * 10;
    }
  };

  const handleJoystickEnd = (e) => {
    e.stopPropagation(); joystick.current.active = false;
    joystick.current.x = 0; joystick.current.y = 0;
    const knob = document.getElementById('joystick-knob');
    if (knob) knob.style.transform = `translate(-50%, -50%)`;
  };

  const gameLoop = (timestamp) => {
    const s = state.current; const dt = Math.min((timestamp - s.lastTime) / 1000, 0.1); s.lastTime = timestamp;
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d');
    let pTarget = null;
    if (s.player && !s.player.dead) {
      const screenX = canvas.width / 2; const screenY = canvas.height / 2;
      const dx = (s.mouseX - screenX) / s.camera.zoom; const dy = (s.mouseY - screenY) / s.camera.zoom;
      pTarget = { x: s.player.x + dx, y: s.player.y + dy };
    }
    if (Math.random() < 2.0 * dt) {
      const type = Math.random() < 0.4 ? 3 : Math.floor(Math.random() * 3);
      const currentCount = s.orbs.filter(o => o.isPowerup && o.type === type).length;
      const maxAllowed = type === 3 ? 15 : 4; 
      if (currentCount < maxAllowed) spawnOrb(randomRange(0, WORLD_SIZE), randomRange(0, WORLD_SIZE), 0, true, type);
    }
    if (s.snakes.length < 41 && Math.random() < 0.5 * dt) spawnBot();
    s.snakes.forEach(snake => {
      if (!snake.isPlayer && !snake.aiTarget && Math.random() < 0.1) {
        const nearby = s.spatialHash.getNearby(snake.x, snake.y, 800);
        const snk = nearby.find(n => n instanceof Snake && n !== snake && !n.dead);
        if (snk) snake.aiTarget = snk;
      }
      snake.update(dt, WORLD_SIZE, snake.isPlayer ? pTarget : null, s.spatialHash);
      if (snake.isBoosting && snake.score > 150) {
        snake.boostDropTimer = (snake.boostDropTimer || 0) + dt;
        if (snake.boostDropTimer > 0.15) { 
          snake.boostDropTimer = 0;
          const tail = snake.body[snake.body.length - 1];
          let dropColor = snake.color;
          if (snake.skinType.startsWith('dragon')) dropColor = COLORS.danger;
          else if (snake.skinType === 'seahorse') dropColor = [COLORS.brGreen, COLORS.brYellow, COLORS.brBlue][Math.floor(Math.random() * 3)];
          spawnOrb(tail.x + randomRange(-5, 5), tail.y + randomRange(-5, 5), 3, false, 0, dropColor);
        }
      }
      if (snake.hitWall && !snake.dead) {
        snake.dead = true;
        if (snake.isPlayer) {
          s.audio.play('death'); s.finalScore = snake.score; s.earnedCoins = (snake.sessionCoins || 0) + Math.floor(snake.score / 500);
          setGameState('GAMEOVER');
          setCoins(prev => { const n = prev + s.earnedCoins; localStorage.setItem('ocean_coins', n.toString()); return n; });
          setHighScore(prev => {
            const fl = Math.floor(snake.score / 10);
            if (fl > prev) { localStorage.setItem('ocean_highscore', fl.toString()); return fl; }
            return prev;
          });
        }
        snake.body.forEach((seg, idx) => { if (idx % 2 === 0) spawnOrb(seg.x + randomRange(-10, 10), seg.y + randomRange(-10, 10), Math.max(10, snake.score / snake.body.length * 2)); });
        spawnExplosion(snake.x, snake.y, snake.color, 40);
      }
    });
    s.spatialHash.clear(); s.orbs.forEach(orb => { orb.update(dt); if (!orb.absorbedBy) s.spatialHash.insert(orb); });
    s.snakes.forEach(snake => { if (!snake.dead) { snake.body.forEach((seg, i) => { if (i % 3 === 0) s.spatialHash.insert({ x: seg.x, y: seg.y, isBody: true, parent: snake, index: i }); }); } });
    s.snakes.forEach(snake => {
      if (snake.dead) return;
      if (snake.magnetTimer > 0) {
        const nearbyOrbs = s.spatialHash.getNearby(snake.x, snake.y, 200).filter(o => o instanceof Orb);
        nearbyOrbs.forEach(orb => {
          if (!orb.absorbedBy) {
             if (distSq(snake.x, snake.y, orb.x, orb.y) < 200 * 200) { orb.x = lerp(orb.x, snake.x, dt * 5); orb.y = lerp(orb.y, snake.y, dt * 5); }
          }
        });
      }
      const collectRadius = snake.size * 1.5; const nearby = s.spatialHash.getNearby(snake.x, snake.y, collectRadius * 2);
      nearby.forEach(item => {
        if (item instanceof Orb && !item.absorbedBy) {
          if (distSq(snake.x, snake.y, item.x, item.y) < collectRadius * collectRadius) {
            item.absorbedBy = snake;
            if (item.isPowerup) {
              if (item.type === 0) snake.shieldTimer = 8; if (item.type === 1) snake.speedTimer = 6; if (item.type === 2) snake.magnetTimer = 10;
              if (item.type === 3) { snake.sessionCoins += 1; if (snake.isPlayer) s.audio.play('coin', 0.6); }
              else { if (snake.isPlayer) s.audio.play('powerup'); }
            } else { snake.score += item.value; if (snake.isPlayer && Math.random() < 0.3) s.audio.play('pop', 0.15); }
          }
        }
      });
    });
    for (let i = 0; i < s.snakes.length; i++) {
      const attacker = s.snakes[i]; if (attacker.dead || attacker.spawnProtectionTimer > 0) continue;
      const hitRadius = attacker.size * 0.8; const nearby = s.spatialHash.getNearby(attacker.x, attacker.y, hitRadius + 30);
      for (const item of nearby) {
        if (item.isBody && item.parent !== attacker) {
          const defender = item.parent; if (defender.dead || defender.spawnProtectionTimer > 0) continue;
          if (distSq(attacker.x, attacker.y, item.x, item.y) < (hitRadius + defender.size * 0.8) ** 2) {
            if (attacker.shieldTimer > 0) {
              attacker.shieldTimer = 0; if (attacker.isPlayer) s.audio.play('shield_break');
              spawnExplosion(attacker.x, attacker.y, COLORS.turquoise, 20);
              attacker.angle += Math.PI; attacker.x += Math.cos(attacker.angle) * 50; attacker.y += Math.sin(attacker.angle) * 50;
              break; 
            } else {
              attacker.dead = true;
              if (attacker.isPlayer) {
                s.audio.play('death'); s.finalScore = attacker.score; s.earnedCoins = (attacker.sessionCoins || 0) + Math.floor(attacker.score / 500);
                setGameState('GAMEOVER');
                setCoins(prev => { const n = prev + s.earnedCoins; localStorage.setItem('ocean_coins', n.toString()); return n; });
                setHighScore(prev => {
                  const fl = Math.floor(attacker.score / 10);
                  if (fl > prev) { localStorage.setItem('ocean_highscore', fl.toString()); return fl; }
                  return prev;
                });
              }
              attacker.body.forEach((seg, idx) => { if (idx % 2 === 0) spawnOrb(seg.x + randomRange(-10, 10), seg.y + randomRange(-10, 10), Math.max(10, attacker.score / attacker.body.length * 2)); });
              spawnExplosion(attacker.x, attacker.y, attacker.color, 40);
              break;
            }
          }
        }
      }
    }
    s.snakes = s.snakes.filter(s => !s.dead); s.orbs = s.orbs.filter(o => o.absorbProgress < 1); s.particles.forEach(p => p.update(dt)); s.particles = s.particles.filter(p => p.life > 0);
    if (s.snakes.length > 0) {
      let currentKing = s.snakes[0]; for (let i = 1; i < s.snakes.length; i++) { if (s.snakes[i].score > currentKing.score) currentKing = s.snakes[i]; }
      if (s.lastKingId !== currentKing.id) { if (currentKing.isPlayer && s.lastKingId !== null) s.audio.play('king', 0.8); s.lastKingId = currentKing.id; }
      s.snakes.forEach(snk => snk.isKing = (snk === currentKing));
    }
    if (s.player && !s.player.dead) {
      s.camera.x = lerp(s.camera.x, s.player.x, dt * 5); s.camera.y = lerp(s.camera.y, s.player.y, dt * 5);
      s.camera.zoom = lerp(s.camera.zoom, Math.max(0.3, 1.1 * Math.pow(500 / Math.max(500, s.player.score), 0.35)), dt * 1.0);
    }
    const viewW = canvas.width / s.camera.zoom; const viewH = canvas.height / s.camera.zoom;
    ctx.viewRect = { minX: s.camera.x - viewW/2, maxX: s.camera.x + viewW/2, minY: s.camera.y - viewH/2, maxY: s.camera.y + viewH/2 };

    if (!s.segmentCache) {
      s.segmentCache = {};
      SKINS.forEach(skin => {
        [false, true].forEach(isBoosting => {
          const cacheKey = `${skin.type}_${skin.color}_${isBoosting}`;
          const offCanvas = document.createElement('canvas');
          const size = 100; offCanvas.width = size; offCanvas.height = size;
          const offCtx = offCanvas.getContext('2d');
          const centerX = size/2, centerY = size/2, radius = size/2;
          const grad = offCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          if (isBoosting) {
            grad.addColorStop(0, COLORS.yellow); grad.addColorStop(1, '#d35400');
          } else {
            if (skin.type === 'dragon') { grad.addColorStop(0, '#333333'); grad.addColorStop(0.8, '#111111'); grad.addColorStop(1, '#8b0000'); }
            else if (skin.type === 'dragon_neon') { grad.addColorStop(0, '#111111'); grad.addColorStop(0.7, '#222222'); grad.addColorStop(1, skin.color); }
            else if (skin.type.startsWith('skeleton')) { grad.addColorStop(0, '#000000'); grad.addColorStop(0.5, '#1a1a1a'); grad.addColorStop(0.8, skin.color); grad.addColorStop(1, '#000000'); }
            else { grad.addColorStop(0, skin.color); grad.addColorStop(0.8, skin.color); grad.addColorStop(1, 'rgba(0,0,0,0.4)'); }
          }
          offCtx.fillStyle = grad; offCtx.beginPath(); offCtx.arc(centerX, centerY, radius, 0, Math.PI * 2); offCtx.fill();
          s.segmentCache[cacheKey] = offCanvas;
        });
      });
    }
    ctx.segmentCache = s.segmentCache;

    ctx.fillStyle = '#10141d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(s.camera.zoom, s.camera.zoom); ctx.translate(-s.camera.x, -s.camera.y);
    const R = 45; const wHex = Math.sqrt(3) * R; const hHex = R * 1.5;
    const startCol = Math.floor((s.camera.x - viewW/2) / wHex) - 1; const endCol = Math.floor((s.camera.x + viewW/2) / wHex) + 1;
    const startRow = Math.floor((s.camera.y - viewH/2) / hHex) - 1; const endRow = Math.floor((s.camera.y + viewH/2) / hHex) + 1;
    ctx.lineWidth = 3; ctx.strokeStyle = '#0a0d14'; 
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        let hx = col * wHex; let hy = row * hHex; if (row % 2 !== 0) hx += wHex / 2;
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const angle = Math.PI / 3 * i - Math.PI / 6; ctx.lineTo(hx + R * Math.cos(angle), hy + R * Math.sin(angle)); }
        ctx.closePath(); const grad = ctx.createLinearGradient(hx, hy - R, hx, hy + R); grad.addColorStop(0, '#1c2331'); grad.addColorStop(1, '#0e121a'); ctx.fillStyle = grad; ctx.fill(); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.3)'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    s.orbs.forEach(orb => { if (Math.abs(orb.x - s.camera.x) < viewW/2 + 50 && Math.abs(orb.y - s.camera.y) < viewH/2 + 50) orb.draw(ctx, s.orbCanvases); });
    s.particles.forEach(p => p.draw(ctx)); [...s.snakes].sort((a, b) => a.size - b.size).forEach(snake => snake.draw(ctx));
    ctx.restore();
    if (s.player && !s.player.dead) {
      const mmRadius = 60; const mmX = canvas.width - mmRadius - 20; const mmY = canvas.height - mmRadius - 20;
      ctx.fillStyle = 'rgba(10, 15, 25, 0.5)'; ctx.beginPath(); ctx.arc(mmX, mmY, mmRadius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1; ctx.stroke();
      s.snakes.forEach(snake => {
        const px = mmX + (snake.x / WORLD_SIZE - 0.5) * (mmRadius * 1.8); const py = mmY + (snake.y / WORLD_SIZE - 0.5) * (mmRadius * 1.8);
        ctx.fillStyle = snake.isPlayer ? 'white' : 'rgba(255, 255, 255, 0.4)'; ctx.beginPath(); ctx.arc(px, py, snake.isPlayer ? 3 : 1.5, 0, Math.PI * 2); ctx.fill();
      });
    }
    if (timestamp % 200 < 20) {
      if (s.player) { setScore(Math.floor(s.player.score)); setPowerups({ shield: s.player.shieldTimer, speed: s.player.speedTimer, magnet: s.player.magnetTimer }); }
      const allSorted = [...s.snakes].sort((a, b) => b.score - a.score);
      setPlayerRank(allSorted.findIndex(snk => snk.isPlayer) + 1); setTotalPlayers(allSorted.length);
      setLeaderboard(allSorted.slice(0, 10).map((snk, i) => ({ 
        name: (snk.name && snk.name.trim() !== '') ? snk.name : 'Desconhecido', 
        score: Math.floor(snk.score), 
        isMe: snk.isPlayer, 
        rank: i+1, 
        color: snk.color 
      })));
    }
    engineRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    const checkOrientation = () => {
      if (isMobile) {
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isMobile]);

  useEffect(() => {
    const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; } };
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleUnlock = () => {
    const currentSkin = SKINS[selectedSkinIndex];
    if (coins >= currentSkin.cost && !unlockedSkins.includes(currentSkin.id)) {
      const newCoins = coins - currentSkin.cost; setCoins(newCoins); localStorage.setItem('ocean_coins', newCoins.toString());
      const newUnlocked = [...unlockedSkins, currentSkin.id]; setUnlockedSkins(newUnlocked); localStorage.setItem('ocean_unlocked_skins', JSON.stringify(newUnlocked));
    }
  };

  const isSkinUnlocked = unlockedSkins.includes(SKINS[selectedSkinIndex].id);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 select-none touch-none font-sans">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair touch-none" onMouseMove={handleInput} onTouchMove={handleInput} onMouseDown={handleDown} onMouseUp={handleUp} />
      {gameState === 'PLAYING' && (
        <>
          <div className="absolute top-4 left-4 text-white/80 pointer-events-none drop-shadow-md text-sm leading-tight z-10 bg-black/30 p-3 rounded-xl backdrop-blur-sm border border-white/10">
            <p>Seu comprimento: <b className="text-white text-base">{Math.floor(score / 10)}</b></p>
            <p className="text-white/60 text-xs mt-1">Classificação: <span className="text-yellow-400 font-bold">{playerRank}</span> de {totalPlayers}</p>
            <p className="text-yellow-400 font-bold text-sm mt-1 flex items-center gap-1">🪙 {state.current.player?.sessionCoins || 0}</p>
          </div>
          <div className="absolute top-4 right-6 text-white text-sm pointer-events-none text-right z-10 font-medium bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-white/10 hidden sm:block">
            <h3 className="font-bold text-gray-300 text-lg mb-1 tracking-wide">Líderes</h3>
            <div className="flex flex-col gap-[2px]">
              {leaderboard.map((player) => (
                <div key={player.rank} className={`flex justify-end items-center gap-3 ${player.isMe ? 'font-bold bg-white/10 px-2 rounded' : ''}`}>
                  <span className="text-gray-400 w-4 text-xs">#{player.rank}</span>
                  <span className="w-24 md:w-32 truncate text-left" style={{ color: player.color }}>{player.name}</span>
                  <span className="w-10 text-gray-300 text-xs">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-24 left-4 flex flex-col gap-2 pointer-events-none z-10">
            {powerups.shield > 0 && (
              <div className="flex items-center gap-2 bg-blue-500/30 backdrop-blur px-3 py-1 rounded-full border border-blue-400">
                <span className="text-lg">🛡️</span>
                <div className="w-20 md:w-24 h-2 bg-black/50 rounded-full overflow-hidden"><div className="h-full bg-blue-400" style={{ width: `${(powerups.shield / 8) * 100}%` }} /></div>
              </div>
            )}
            {powerups.speed > 0 && (
              <div className="flex items-center gap-2 bg-yellow-500/30 backdrop-blur px-3 py-1 rounded-full border border-yellow-400">
                <span className="text-lg">⚡</span>
                <div className="w-20 md:w-24 h-2 bg-black/50 rounded-full overflow-hidden"><div className="h-full bg-yellow-400" style={{ width: `${(powerups.speed / 6) * 100}%` }} /></div>
              </div>
            )}
            {powerups.magnet > 0 && (
              <div className="flex items-center gap-2 bg-purple-500/30 backdrop-blur px-3 py-1 rounded-full border border-purple-400">
                <span className="text-lg">🧲</span>
                <div className="w-20 md:w-24 h-2 bg-black/50 rounded-full overflow-hidden"><div className="h-full bg-purple-400" style={{ width: `${(powerups.magnet / 10) * 100}%` }} /></div>
              </div>
            )}
          </div>
          {isMobile && (
            <>
              <div className="absolute bottom-8 left-8 w-32 h-32 bg-white/10 rounded-full border-2 border-white/20 backdrop-blur-md z-50 pointer-events-auto shadow-[0_0_20px_rgba(255,255,255,0.1)] touch-none" onTouchStart={handleJoystickStart} onTouchMove={handleJoystickMove} onTouchEnd={handleJoystickEnd} onContextMenu={(e) => e.preventDefault()}>
                <div className="absolute top-1/2 left-1/2 w-14 h-14 bg-white/50 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 border border-white/80 transition-transform duration-75" id="joystick-knob"></div>
              </div>
              <div className="absolute bottom-10 right-10 w-[80px] h-[80px] bg-yellow-500/30 rounded-full border-2 border-yellow-400 backdrop-blur-md flex items-center justify-center z-50 shadow-[0_0_20px_rgba(250,204,21,0.4)] pointer-events-auto active:bg-yellow-500/60 active:scale-95 transition-all touch-none" onTouchStart={(e) => { e.stopPropagation(); if (state.current.player) state.current.player.isBoosting = true; }} onTouchEnd={(e) => { e.stopPropagation(); if (state.current.player) state.current.player.isBoosting = false; }} onContextMenu={(e) => e.preventDefault()}>
                <span className="text-4xl translate-x-[2px] translate-y-[2px]">⚡</span>
              </div>
            </>
          )}
          <button onClick={() => setSoundEnabled(state.current.audio.toggle())} className="absolute top-4 right-4 sm:bottom-4 sm:top-auto bg-black/40 hover:bg-black/60 text-white w-12 h-12 flex items-center justify-center rounded-full backdrop-blur border border-white/20 transition-all text-xl cursor-pointer z-50" title={soundEnabled ? "Desativar Som" : "Ativar Som"}>
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </>
      )}
      {isMobile && isPortrait && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center text-white text-center p-6 sm:hidden anim-fade-in">
          <div className="w-24 h-24 mb-6 animate-bounce">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-yellow-400">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <path d="M12 18h.01" />
              <path d="M17 2l-3 3 3 3" className="animate-pulse" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 uppercase tracking-widest">Gire o Aparelho</h2>
          <p className="text-gray-400 text-sm max-w-[250px]">Para a melhor experiência em ocean.io, jogue com o celular deitado.</p>
        </div>
      )}
      {gameState !== 'PLAYING' && (
        <div className="absolute inset-0 bg-[#161a22] flex flex-col items-center justify-center z-50 font-sans text-white">
          <div className="absolute top-4 right-4 bg-black/40 border border-yellow-500/50 px-4 py-2 rounded-full text-yellow-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.3)] flex items-center gap-2">🪙 {coins}</div>
          {gameState === 'GAMEOVER' && (
            <div className="absolute top-20 text-center px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-red-500 mb-2 drop-shadow-md">VOCÊ FOI DEVORADO</h2>
              <p className="text-white text-lg md:text-xl">Comprimento Final: <span className="font-bold text-yellow-400">{Math.floor(state.current.finalScore/10)}</span></p>
              <p className="text-yellow-400 font-bold text-lg mt-2 flex items-center justify-center gap-2">+ {state.current.earnedCoins} 🪙</p>
            </div>
          )}
          <div className="flex flex-col items-center">
            <Logo className="w-32 h-32 md:w-48 md:h-48 mb-2" />
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 md:mb-6 text-center" style={{ background: 'linear-gradient(to right, #4ade80, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.3))' }}>ocean.io</h1>
            <p className="text-[#4b5563] text-xs md:text-sm font-medium mb-6 md:mb-8 px-4 text-center">Não deixe sua cabeça tocar em outras criaturas!</p>
            {highScore > 0 && <div className="mb-6 bg-black/40 border border-[#8b5cf6]/30 px-6 py-2 rounded-full text-yellow-400 font-bold text-sm md:text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] flex items-center gap-2">🏆 Recorde Pessoal: {highScore}</div>}
            <div className="flex items-center gap-4 md:gap-6 mb-6">
              <button onClick={() => setSelectedSkinIndex((prev) => (prev === 0 ? SKINS.length - 1 : prev - 1))} className="text-4xl md:text-5xl text-[#7e75a6] hover:text-white transition-colors cursor-pointer pb-2 px-2">&lt;</button>
              <div className="flex flex-col items-center justify-center w-36 md:w-40">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full mb-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden transition-all duration-300" style={{ background: SKINS[selectedSkinIndex].type.startsWith('dragon') ? 'radial-gradient(circle, #333 0%, #000 100%)' : (SKINS[selectedSkinIndex].type === 'chain' ? 'radial-gradient(circle, #4b5563 0%, #111827 100%)' : `radial-gradient(circle, ${SKINS[selectedSkinIndex].color} 0%, rgba(0,0,0,0.8) 100%)`), border: `2px solid ${SKINS[selectedSkinIndex].color}`, boxShadow: SKINS[selectedSkinIndex].id.includes('neon') ? `0 0 20px ${SKINS[selectedSkinIndex].color}` : '0 0 20px rgba(0,0,0,0.5)' }}>
                  {SKINS[selectedSkinIndex].type.startsWith('dragon') && <div className="absolute flex gap-2"><div className="w-4 h-1 rotate-[20deg]" style={{ backgroundColor: SKINS[selectedSkinIndex].color, boxShadow: `0 0 8px ${SKINS[selectedSkinIndex].color}` }}></div><div className="w-4 h-1 -rotate-[20deg]" style={{ backgroundColor: SKINS[selectedSkinIndex].color, boxShadow: `0 0 8px ${SKINS[selectedSkinIndex].color}` }}></div></div>}
                  {SKINS[selectedSkinIndex].type.startsWith('skeleton') && <div className="absolute flex flex-col items-center justify-center"><div className="w-10 h-9 rounded-full relative" style={{ backgroundColor: SKINS[selectedSkinIndex].color, boxShadow: SKINS[selectedSkinIndex].id.includes('neon') ? `0 0 10px ${SKINS[selectedSkinIndex].color}` : 'none' }}><div className="absolute w-3 h-3 bg-black rounded-full left-1.5 top-2.5"></div><div className="absolute w-3 h-3 bg-black rounded-full right-1.5 top-2.5"></div><div className="absolute w-2 h-1.5 bg-black left-4 bottom-1 rounded-sm"></div></div></div>}
                  {SKINS[selectedSkinIndex].type === 'cyclops' && <div className="w-6 h-6 bg-[#00b4d8] rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"><div className="w-3 h-3 bg-black rounded-full ml-1"></div></div>}
                  {SKINS[selectedSkinIndex].type === 'chain' && <div className="absolute flex items-center justify-center transform -rotate-45"><div className="w-12 h-6 border-[4px] border-[#9ca3af] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center"><div className="w-6 h-12 border-[4px] border-[#d1d5db] rounded-full absolute shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></div></div></div>}
                  {SKINS[selectedSkinIndex].type === 'lula' && <div className="absolute flex flex-col gap-1 translate-x-2"><div className="w-5 h-5 bg-white rounded-full border-[2px] border-black flex items-center justify-end relative -top-1 left-2"><div className="w-2 h-2 bg-black rounded-full mr-0.5"></div></div><div className="w-5 h-5 bg-white rounded-full border-[2px] border-black flex items-center justify-end relative top-1 left-2"><div className="w-2 h-2 bg-black rounded-full mr-0.5"></div></div></div>}
                  {SKINS[selectedSkinIndex].type === 'seahorse' && <div className="absolute flex flex-col items-center justify-center scale-90 md:scale-100"><div className="absolute w-8 h-8 bg-[#002776] -top-6 rotate-45 rounded-sm"></div><div className="absolute w-12 h-4 bg-[#ffdf00] rounded-full left-4"></div><div className="absolute w-10 h-10 bg-[#009c3b] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"></div><div className="absolute w-5 h-5 bg-white rounded-full top-1 right-1 flex items-center justify-end border-2 border-transparent"><div className="w-2.5 h-2.5 bg-black rounded-full mr-0.5"></div></div></div>}
                  {!isSkinUnlocked && <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-[2px]"><span className="text-3xl drop-shadow-md">🔒</span></div>}
                </div>
                <span className="font-bold text-xs md:text-sm tracking-wide uppercase transition-colors text-center px-2" style={{ color: SKINS[selectedSkinIndex].color === '#1a1a1a' ? '#ff4444' : SKINS[selectedSkinIndex].color, textShadow: SKINS[selectedSkinIndex].id.includes('neon') ? `0 0 8px ${SKINS[selectedSkinIndex].color}` : 'none' }}>{SKINS[selectedSkinIndex].name}</span>
              </div>
              <button onClick={() => setSelectedSkinIndex((prev) => (prev === SKINS.length - 1 ? 0 : prev + 1))} className="text-4xl md:text-5xl text-[#7e75a6] hover:text-white transition-colors cursor-pointer pb-2 px-2">&gt;</button>
            </div>
            <div className="relative group mb-4">
              <input type="text" maxLength={16} value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Apelido" onKeyDown={(e) => { if (e.key === 'Enter' && isSkinUnlocked) startGame(); }} className="bg-[#3b3461] text-white placeholder-[#7e75a6] px-6 py-3 md:py-4 rounded-full text-base md:text-lg w-64 md:w-72 text-center border-2 border-transparent focus:border-[#8b5cf6] outline-none shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)] transition-all" />
            </div>
            {isSkinUnlocked ? (
              <button onClick={startGame} className="bg-[#4caf50] hover:bg-[#45a049] text-white font-bold py-3 px-12 rounded-full text-xl shadow-[0_5px_0_#2e7d32] active:translate-y-[5px] active:shadow-none transition-all mt-2 w-64 md:w-auto">Jogar</button>
            ) : (
              <button onClick={handleUnlock} disabled={coins < SKINS[selectedSkinIndex].cost} className={`font-bold py-3 px-8 md:px-12 rounded-full text-lg md:text-xl transition-all mt-2 w-64 md:w-auto ${coins >= SKINS[selectedSkinIndex].cost ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-[0_5px_0_#5b21b6] active:translate-y-[5px] active:shadow-none cursor-pointer' : 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-[0_5px_0_#374151]'}`}>Desbloquear (🪙 {SKINS[selectedSkinIndex].cost})</button>
            )}
          </div>
          <div className="absolute bottom-6 text-[#4b5563] text-xs text-center flex flex-col md:flex-row gap-2 md:gap-8"><span className="hidden md:inline">🖱️ Siga o Mouse | 👆 Segure para Acelerar</span><span className="md:hidden">🕹️ Use o Joystick Virtual e o Botão de Acelerar</span></div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(10px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }
        .animate-fade-in-up { animation: fade-in-up 4s ease-out forwards; }
      `}} />
    </div>
  );
}

