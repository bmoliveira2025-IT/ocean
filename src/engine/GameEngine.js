// GameEngine.js
import { Snake } from './Snake';
import { Orb, PowerUp } from './entities';
import { SpatialHash, Particle } from './utils';

const MAX_ORBS = 300;
const MAX_POWERUPS = 5;
const WORLD_RADIUS = 3000;

function dist(ax, ay, bx, by) { const dx=ax-bx, dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }
function lerp(a, b, t) { return a + (b - a) * t; }
const randRange = (a, b) => a + Math.random() * (b - a);

export class GameEngine {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.running = false;
    this.lastTime = 0;
    this.player = null;
    this.bots = [];
    this.orbs = [];
    this.powerups = [];
    this.particles = [];
    this.hash = new SpatialHash(100);
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.mouse = { x: 0, y: 0, angle: 0, boosting: false };
    
    this.stats = { size: 10, kills: 0, bestSize: 0, dead: false };
    this.onGameStateChange = null;
    this.ambientParticles = [];
    for(let i = 0; i < 150; i++) this.spawnAmbientParticle();
    this.popups = [];
    this.shake = 0;
  }

  spawnAmbientParticle() {
    const a = Math.random()*Math.PI*2, d = Math.random()*WORLD_RADIUS;
    this.ambientParticles.push({
      x: Math.cos(a)*d, y: Math.sin(a)*d,
      r: Math.random()*2 + 1,
      opacity: Math.random()*0.3 + 0.1,
      phase: Math.random()*Math.PI*2,
      speed: Math.random()*0.02 + 0.01
    });
  }

  spawnScorePopup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 1, vy: -1.5 });
  }

  start(nickname, theme, onGameStateChange) {
    this.player = new Snake(0, 0, '#00b4d8', nickname || 'Peixe');
    this.player.theme = theme;
    this.bots = [];
    for(let i = 0; i < 15; i++) this.spawnBot();
    this.orbs = [];
    for(let i = 0; i < MAX_ORBS; i++) this.spawnOrb();
    this.powerups = [];
    for(let i = 0; i < MAX_POWERUPS; i++) this.spawnPowerUp();
    this.running = true;
    this.lastTime = performance.now();
    this.onGameStateChange = onGameStateChange;
    this.stats = { size: 10, kills: 0, bestSize: 0, dead: false };
    requestAnimationFrame(this.loop.bind(this));
  }

  spawnBot() {
    const a = Math.random()*Math.PI*2, d = Math.random()*WORLD_RADIUS;
    const s = new Snake(Math.cos(a)*d, Math.sin(a)*d, `hsl(${Math.random()*360}, 70%, 50%)`, 'Bot');
    s.aiTimer = 0;
    this.bots.push(s);
  }

  spawnOrb(x, y, val, color, isDeath) {
    if(x === undefined) {
      const a = Math.random()*Math.PI*2, d = Math.random()*WORLD_RADIUS;
      x = Math.cos(a)*d; y = Math.sin(a)*d;
    }
    this.orbs.push(new Orb(x, y, val, color, isDeath));
  }

  spawnPowerUp() {
    this.powerups.push(new PowerUp(WORLD_RADIUS));
  }

  loop(now) {
    if(!this.running) return;
    const dt = Math.min(32, now - this.lastTime);
    this.lastTime = now;

    this.update(dt);
    this.draw();

    if(this.onGameStateChange) {
      const allSnakes = [...this.bots];
      if(this.player.alive) allSnakes.push(this.player);
      const sorted = allSnakes
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(snake => ({
          name: snake.name,
          size: Math.floor(snake.size),
          isMe: snake === this.player
        }));
      this.onGameStateChange({
        size: Math.floor(this.player.size),
        kills: this.player.kills,
        dead: !this.player.alive,
        bestSize: this.stats.bestSize,
        ranking: sorted
      });
    }
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    this.hash.clear();
    
    if(this.player.alive) {
      this.player.move(this.mouse.angle, this.mouse.boosting);
      this.player.updatePowerups(dt);
      
      for(let i = this.orbs.length - 1; i >= 0; i--) {
        const o = this.orbs[i];
        const d = dist(this.player.x, this.player.y, o.x, o.y);
        const magnetDist = this.player.magnet ? 150 : (this.player.headRadius + 20);
        if(d < magnetDist) {
          if (d < this.player.headRadius + 25) {
            this.player.grow(o.value * 0.15);
            this.spawnScorePopup(o.x, o.y, `+${Math.floor(o.value)}`, o.color);
            this.orbs.splice(i, 1);
            if(this.audio) this.audio.play('orb');
            if(this.orbs.length < MAX_ORBS) this.spawnOrb();
            if(o.isDeath) this.shake = Math.max(this.shake, 6);
          } else if (this.player.magnet) {
            const a = Math.atan2(this.player.y - o.y, this.player.x - o.x);
            o.vx += Math.cos(a) * 0.8; o.vy += Math.sin(a) * 0.8;
          }
        }
        o.update(dt);
      }
      
      for(let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        if(dist(this.player.x, this.player.y, p.x, p.y) < this.player.headRadius + p.r + 20) {
          this.player.applyPowerup(p.type);
          if(this.audio) this.audio.play('powerup');
          this.powerups.splice(i, 1);
          setTimeout(() => this.spawnPowerUp(), 8000);
        }
        p.update();
      }
    }

    this.bots.forEach(bot => {
      if(!bot.alive) return;
      bot.aiTimer -= dt;
      if(bot.aiTimer <= 0) {
        bot.targetAngle = Math.random() * Math.PI * 2;
        bot.aiTimer = randRange(1000, 3000);
      }
      bot.move(bot.targetAngle, false);
      
      // OPTIMIZED: Use SpatialHash for orb collection (simplified here for speed)
      for(let i = this.orbs.length - 1; i >= 0; i--) {
        const o = this.orbs[i];
        if(dist(bot.x, bot.y, o.x, o.y) < bot.headRadius + 15) {
          bot.grow(o.value * 0.1);
          this.orbs.splice(i, 1);
          if(this.orbs.length < MAX_ORBS) this.spawnOrb();
        }
      }
    });

    this.bots = this.bots.filter(b => b.alive);
    while(this.bots.length < 15) this.spawnBot();

    const allSnakes = [...this.bots];
    if(this.player.alive) allSnakes.push(this.player);

    allSnakes.forEach(snake => {
      if(!snake.alive) return;
      snake.segments.forEach(seg => this.hash.insert(seg.x, seg.y, { snake, seg }));
    });

    allSnakes.forEach(snake => {
      if(!snake.alive) return;
      
      // OPTIMIZED: Query hash for nearby obstacles only
      const nearby = this.hash.query(snake.x, snake.y, 50);
      for(const entry of nearby) {
        const { snake: other, seg } = entry;
        if(snake === other) continue; // Skip self
        
        // Find segment index (simplified check)
        const isHead = (seg === other.segments[0] || seg === other.segments[1]);
        if(isHead) continue;

        if(dist(snake.x, snake.y, seg.x, seg.y) < snake.headRadius + other.bodyRadius - 2) {
          if(snake.shield) {
            snake.shield = false;
            if(this.audio) this.audio.play('shieldBreak');
          } else {
            if(snake === this.player) {
              this.die();
            } else {
              snake.alive = false;
              if(this.audio) this.audio.play('death');
              this.shake = 15;
              for(let k = 0; k < 25; k++) this.particles.push(new Particle(snake.x, snake.y, snake.color));
              const dropCount = Math.floor(snake.size * 0.5) + 5;
              for(let k = 0; k < dropCount; k++) {
                this.spawnOrb(snake.x + randRange(-50,50), snake.y + randRange(-50,50), 3, snake.color, true);
              }
            }
          }
          break; // Snake died, skip other collision checks for it
        }
      }
    });

    this.camera.x = lerp(this.camera.x, this.player.x, 0.1);
    this.camera.y = lerp(this.camera.y, this.player.y, 0.1);

    this.ambientParticles.forEach(p => {
      p.phase += p.speed;
      p.x += Math.sin(p.phase) * 0.2;
      p.y += Math.cos(p.phase) * 0.2;
    });
    for(let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if(this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
    for(let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy; p.life -= 0.02;
      if(p.life <= 0) this.popups.splice(i, 1);
    }
    if(this.shake > 0) this.shake *= 0.9;
    if(this.shake < 0.1) this.shake = 0;
  }

  die() {
    this.player.alive = false;
    if(this.audio) this.audio.play('death');
    this.shake = 25;
    for(let k = 0; k < 40; k++) this.particles.push(new Particle(this.player.x, this.player.y, this.player.color));
    this.stats.dead = true;
    if(this.player.size > this.stats.bestSize) this.stats.bestSize = Math.floor(this.player.size);
  }

  draw() {
    const { ctx, canvas, camera } = this;
    ctx.save();
    ctx.fillStyle = '#020d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(this.shake > 0) ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    this.ambientParticles.forEach(p => {
      ctx.globalAlpha = p.opacity; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#00b4d833'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(0, 0, WORLD_RADIUS, 0, Math.PI*2); ctx.stroke();
    this.orbs.forEach(orb => orb.draw(ctx, 0, 0));
    this.powerups.forEach(pu => pu.draw(ctx, 0, 0));
    this.bots.forEach(bot => bot.drawFish(ctx, 0, 0));
    if(this.player.alive) {
      this.player.drawFish(ctx, 0, 0);
    }
    this.particles.forEach(p => p.draw(ctx, 0, 0));
    this.popups.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.font = `bold ${16 + (1-p.life)*10}px Segoe UI`; ctx.textAlign = 'center';
      ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.fillText(p.text, p.x, p.y); ctx.restore();
    });
    ctx.restore();
    this.drawMinimap();
  }

  drawMinimap() {
    const mini = document.getElementById('minimapCanvas');
    if(!mini) return;
    const mctx = mini.getContext('2d'), w = mini.width, h = mini.height;
    const centerX = w/2, centerY = h/2, scale = (w/2) / WORLD_RADIUS;
    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = 'rgba(0,20,40,0.4)';
    mctx.beginPath(); mctx.arc(centerX, centerY, w/2 - 2, 0, Math.PI*2); mctx.fill();
    mctx.strokeStyle = 'rgba(0,180,216,0.3)'; mctx.lineWidth = 1; mctx.stroke();
    mctx.globalAlpha = 0.6;
    this.bots.forEach(bot => {
      if(!bot.alive) return;
      mctx.fillStyle = bot.color; mctx.beginPath();
      mctx.arc(centerX + bot.x * scale, centerY + bot.y * scale, 1.5, 0, Math.PI*2); mctx.fill();
    });
    if(this.player.alive) {
      mctx.globalAlpha = 1; mctx.fillStyle = '#fff'; mctx.shadowBlur = 5; mctx.shadowColor = '#fff';
      mctx.beginPath(); mctx.arc(centerX + this.player.x * scale, centerY + this.player.y * scale, 2.5, 0, Math.PI*2); mctx.fill();
    }
  }
}
