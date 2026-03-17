import { AudioEngine } from './AudioEngine';
import { Orb } from './entities/Orb';
import { Particle } from './entities/Particle';
import { PowerUp } from './entities/PowerUp';
import { Snake } from './entities/Snake';
import { SpatialHash } from './SpatialHash';
import { 
  BOT_COLORS, 
  BOT_NAMES, 
  dist, 
  MAX_ORBS, 
  randInt, 
  randRange, 
  SPATIAL_GRID, 
  THEMES, 
  WORLD_RADIUS 
} from './utils';

export class GameEngine {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public audio: AudioEngine;
  
  public player: Snake;
  public bots: Snake[] = [];
  public orbs: Orb[] = [];
  public powerups: PowerUp[] = [];
  public particles: Particle[] = [];
  
  private spatialHash: SpatialHash;
  private lastTime: number = 0;
  
  // Camera
  public cameraX: number = 0;
  public cameraY: number = 0;
  public zoom: number = 1;
  
  // Input
  public mouseX: number = 0;
  public mouseY: number = 0;
  public isBoosting: boolean = false;
  
  private onGameOver: (score: number) => void;

  constructor(canvas: HTMLCanvasElement, themeIdx: number, playerName: string, onGameOver: (score: number) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.audio = new AudioEngine();
    this.onGameOver = onGameOver;
    
    this.player = new Snake(0, 0, '#00b4d8', playerName);
    this.player.theme = THEMES[themeIdx];
    
    this.spatialHash = new SpatialHash(SPATIAL_GRID);
    
    this.init();
  }

  private init() {
    // Initial orbs
    for (let i = 0; i < MAX_ORBS; i++) this.spawnOrb();
    // Initial bots
    for (let i = 0; i < 15; i++) this.spawnBot();
    // Initial powerups
    for (let i = 0; i < 5; i++) this.powerups.push(new PowerUp());
    
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private spawnOrb(x?: number, y?: number, val?: number, col?: string) {
    if (x === undefined) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * WORLD_RADIUS;
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
    }
    this.orbs.push(new Orb(x, y!, val, col));
  }

  private spawnBot() {
    const a = Math.random() * Math.PI * 2;
    const r = randRange(WORLD_RADIUS * 0.3, WORLD_RADIUS * 0.9);
    const bot = new Snake(Math.cos(a) * r, Math.sin(a) * r, BOT_COLORS[randInt(0, BOT_COLORS.length - 1)], BOT_NAMES[randInt(0, BOT_NAMES.length - 1)]);
    this.bots.push(bot);
  }

  public update(time: number) {
    const dt = time - this.lastTime;
    this.lastTime = time;
    
    if (!this.player.alive) return;
    
    // Update camera
    this.cameraX = this.player.x;
    this.cameraY = this.player.y;
    const targetZoom = 1 / (1 + Math.sqrt(this.player.size) * 0.05);
    this.zoom += (targetZoom - this.zoom) * 0.05;

    // Player move
    const dx = this.mouseX - this.canvas.width / 2;
    const dy = this.mouseY - this.canvas.height / 2;
    const targetAngle = Math.atan2(dy, dx);
    this.player.move(targetAngle, this.isBoosting);
    this.player.updatePowerups(dt);
    
    if (this.isBoosting) this.audio.startBoost();
    else this.audio.stopBoost();

    // Bots move
    this.bots.forEach(bot => {
      // Simple AI: wander and avoid world edge
      let bAngle = bot.angle;
      const distToCenter = dist(0, 0, bot.x, bot.y);
      if (distToCenter > WORLD_RADIUS * 0.8) {
        const toCenter = Math.atan2(-bot.y, -bot.x);
        bAngle = lerpAngle(bot.angle, toCenter, 0.1);
      } else {
        if (Math.random() < 0.02) bot.targetA = bot.angle + (Math.random() - 0.5) * 2;
        if (bot.targetA !== undefined) bAngle = lerpAngle(bot.angle, bot.targetA, 0.05);
      }
      bot.move(bAngle, false);
    });

    // Orbs & Spatial Hash
    this.spatialHash.clear();
    this.orbs.forEach(orb => {
      orb.update();
      this.spatialHash.insert(orb.x, orb.y, orb);
    });
    
    // Powerups
    this.powerups.forEach(pu => pu.update());

    // Collisions
    this.checkCollisions();

    // Refill orbs
    while (this.orbs.length < MAX_ORBS) this.spawnOrb();
    
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }

  private checkCollisions() {
    const p = this.player;
    const hr = p.headRadius;

    // Orbs
    const range = p.magnet ? 150 : hr + 20;
    const nearbyOrbs = this.spatialHash.query(p.x, p.y, range);
    nearbyOrbs.forEach(orb => {
      if (orb.collecting) return;
      const d = dist(p.x, p.y, orb.x, orb.y);
      if (p.magnet && d < 150) {
        const a = Math.atan2(p.y - orb.y, p.x - orb.x);
        orb.vx += Math.cos(a) * 0.8;
        orb.vy += Math.sin(a) * 0.8;
      }
      if (d < hr + orb.r) {
        orb.collecting = true;
        p.grow(orb.value * 0.15);
        this.audio.play('orb');
        setTimeout(() => {
          const idx = this.orbs.indexOf(orb);
          if (idx !== -1) this.orbs.splice(idx, 1);
        }, 200);
      }
    });

    // Power-ups
    this.powerups.forEach(pu => {
      if (pu.collected) return;
      if (dist(p.x, p.y, pu.x, pu.y) < hr + pu.r) {
        pu.collected = true;
        p.applyPowerup(pu.type);
        this.audio.play('powerup');
        setTimeout(() => {
          const idx = this.powerups.indexOf(pu);
          if (idx !== -1) this.powerups.splice(idx, 1);
          this.powerups.push(new PowerUp());
        }, 500);
      }
    });

    // Snake vs Snake (Head to Body)
    this.bots.forEach((bot, bIdx) => {
      // Player head vs Bot body
      for (let i = 0; i < bot.segments.length; i += 5) {
        const s = bot.segments[i];
        if (dist(p.x, p.y, s.x, s.y) < hr + bot.bodyRadius) {
          if (p.shield) {
            p.shield = false;
            p.shieldTime = 0;
            this.audio.play('shieldBreak');
            // Bounce player back
            p.angle += Math.PI;
            return;
          }
          this.die();
          return;
        }
      }
      
      // Bot head vs Player body
      for (let i = 0; i < p.segments.length; i += 5) {
        const s = p.segments[i];
        if (dist(bot.x, bot.y, s.x, s.y) < bot.headRadius + p.bodyRadius) {
          this.killSnake(bot, bIdx);
          p.kills++;
          this.audio.play('kill');
          return;
        }
      }
    });
  }

  private killSnake(snake: Snake, index: number) {
    snake.alive = false;
    // Turn segments into orbs
    snake.segments.forEach((s, i) => {
      if (i % 3 === 0) this.spawnOrb(s.x, s.y, 2, snake.color);
    });
    this.bots.splice(index, 1);
    setTimeout(() => this.spawnBot(), 3000);
  }

  private die() {
    this.player.alive = false;
    this.audio.play('death');
    this.audio.stopBoost();
    this.onGameOver(Math.floor(this.player.size));
  }

  public render() {
    const { ctx, canvas, cameraX, cameraY, zoom } = this;
    
    // Clear
    ctx.fillStyle = '#020d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);
    
    // Grid
    this.drawGrid();
    
    // World boundary
    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, WORLD_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Orbs
    this.orbs.forEach(orb => orb.draw(ctx, 0, 0));
    
    // Powerups
    this.powerups.forEach(pu => pu.draw(ctx, 0, 0));
    
    // Bots
    this.bots.forEach(bot => bot.draw(ctx, 0, 0));
    
    // Player
    this.player.draw(ctx, 0, 0);
    
    ctx.restore();
  }

  private drawGrid() {
    const { ctx, cameraX, cameraY, canvas, zoom } = this;
    const size = 150;
    const startX = Math.floor((cameraX - canvas.width / zoom / 2) / size) * size;
    const startY = Math.floor((cameraY - canvas.height / zoom / 2) / size) * size;
    const endX = cameraX + canvas.width / zoom / 2;
    const endY = cameraY + canvas.height / zoom / 2;
    
    ctx.strokeStyle = 'rgba(0, 180, 216, 0.05)';
    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += size) {
      ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
    }
    for (let y = startY; y <= endY; y += size) {
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
    }
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
