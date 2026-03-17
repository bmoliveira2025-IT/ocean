import { 
  BASE_SPEED, 
  BOOST_SPEED, 
  dist, 
  hexToRgb, 
  lerpAngle, 
  SEGMENT_SIZE, 
  SPEED_PU_SPEED, 
  type Theme, 
  WORLD_RADIUS 
} from '../utils';
import { Particle } from './Particle';
import type { PowerUpType } from './PowerUp';

export interface Point {
  x: number;
  y: number;
}

export class Snake {
  public x: number;
  public y: number;
  public color: string;
  public name: string;
  public angle: number;
  public speed: number = BASE_SPEED;
  public size: number = 10;
  public segments: Point[] = [];
  public alive: boolean = true;
  public kills: number = 0;
  public targetA?: number; // Added for bot AI
  
  // Power-up states
  public shield: boolean = false;
  public shieldTime: number = 0;
  public speedBoost: boolean = false;
  public speedTime: number = 0;
  public magnet: boolean = false;
  public magnetTime: number = 0;
  
  public shieldDuration: number = 8000;
  public speedDuration: number = 6000;
  public magnetDuration: number = 10000;
  
  // Visual
  private phase: number = Math.random() * Math.PI * 2;
  public boostTrail: any[] = [];
  public rgb: { r: number, g: number, b: number };
  public theme: Theme | null = null;

  constructor(x: number, y: number, color: string, name: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.name = name;
    this.angle = Math.random() * Math.PI * 2;
    this.rgb = hexToRgb(color);
    
    // Init segments
    for (let i = 0; i < Math.floor(this.size * SEGMENT_SIZE); i++) {
      this.segments.push({ x: x - Math.cos(this.angle) * i * 3, y: y - Math.sin(this.angle) * i * 3 });
    }
  }

  get headRadius() { return 10 + Math.sqrt(this.size) * 2.2; }
  get bodyRadius() { return 7 + Math.sqrt(this.size) * 1.9; }

  move(targetAngle: number, boosting: boolean) {
    if (!this.alive) return;
    
    const turnSpeed = 0.08 + (boosting ? 0.02 : 0);
    this.angle = lerpAngle(this.angle, targetAngle, turnSpeed);
    
    const spd = boosting ? (this.speedBoost ? SPEED_PU_SPEED : BOOST_SPEED)
                          : (this.speedBoost ? SPEED_PU_SPEED : BASE_SPEED);
    
    this.x += Math.cos(this.angle) * spd;
    this.y += Math.sin(this.angle) * spd;
    
    // Clamp to world
    const d = dist(0, 0, this.x, this.y);
    if (d > WORLD_RADIUS - 50) {
      const a = Math.atan2(this.y, this.x);
      this.x = Math.cos(a) * (WORLD_RADIUS - 60);
      this.y = Math.sin(a) * (WORLD_RADIUS - 60);
    }
    
    // Update segments
    this.segments.unshift({ x: this.x, y: this.y });
    const maxLen = Math.max(10, Math.floor(this.size * SEGMENT_SIZE * 3));
    if (this.segments.length > maxLen) this.segments.length = maxLen;
    
    this.phase += 0.1;
    
    if (boosting && !this.speedBoost) {
      this.size = Math.max(5, this.size - 0.015);
      const trimLen = Math.max(10, Math.floor(this.size * SEGMENT_SIZE * 3));
      if (this.segments.length > trimLen)
        this.segments.length = trimLen;
    }

    // Spawn trail particles
    if (boosting || this.speedBoost) {
      const segs = this.segments;
      const tailIdx = Math.min(segs.length - 1, Math.floor(segs.length * 0.6));
      const ts = segs[tailIdx] || segs[segs.length - 1];
      for (let i = 0; i < 2; i++) {
        const spread = (Math.random() - 0.5) * this.bodyRadius * 1.2;
        const perpX = Math.cos(this.angle + Math.PI / 2) * spread;
        const perpY = Math.sin(this.angle + Math.PI / 2) * spread;
        this.boostTrail.push(new Particle(
          ts.x + perpX + (Math.random() - 0.5) * 4,
          ts.y + perpY + (Math.random() - 0.5) * 4,
          this.speedBoost ? '#f4d03f' : (this.theme?.trail || this.color)
        ));
      }
    }
    
    // Update trail particles
    for (let i = this.boostTrail.length - 1; i >= 0; i--) {
      const tp = this.boostTrail[i];
      tp.update();
      if (tp.life <= 0) this.boostTrail.splice(i, 1);
    }
  }

  updatePowerups(dt: number) {
    if (this.shield && this.shieldTime > 0) {
      this.shieldTime -= dt;
      if (this.shieldTime <= 0) this.shield = false;
    }
    if (this.speedBoost && this.speedTime > 0) {
      this.speedTime -= dt;
      if (this.speedTime <= 0) this.speedBoost = false;
    }
    if (this.magnet && this.magnetTime > 0) {
      this.magnetTime -= dt;
      if (this.magnetTime <= 0) this.magnet = false;
    }
  }

  applyPowerup(type: PowerUpType) {
    if (type === 'shield') {
      this.shield = true;
      this.shieldTime = this.shieldDuration;
    } else if (type === 'speed') {
      this.speedBoost = true;
      this.speedTime = this.speedDuration;
    } else if (type === 'magnet') {
      this.magnet = true;
      this.magnetTime = this.magnetDuration;
    }
  }

  grow(amount: number) {
    this.size = Math.max(5, (this.size || 5) + amount);
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    if (!this.alive) return;
    const seg = this.segments;
    if (seg.length < 2) return;
    
    const r = this.rgb;
    const headR = this.headRadius;
    const bodyR = this.bodyRadius;
    const bodyColor = this.theme ? this.theme.body : `rgba(${r.r},${r.g},${r.b},1)`;
    const glowColor = this.theme ? this.theme.glow : this.color;

    // Boost trail particles
    for (const tp of this.boostTrail) {
      tp.draw(ctx, cx, cy);
    }

    // Body segments
    const step = Math.max(1, Math.floor(seg.length / 80));
    for (let i = seg.length - 1; i >= step; i -= step) {
      const s = seg[i];
      const t = i / seg.length;
      const sr = bodyR * (0.4 + 0.6 * (1 - t));
      const alpha = 0.5 + 0.5 * (1 - t * 0.7);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = bodyColor;
      ctx.shadowBlur = 4;
      ctx.shadowColor = glowColor;
      ctx.beginPath();
      ctx.arc(s.x - cx, s.y - cy, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Tail
    const tailSeg = seg[Math.min(seg.length - 1, Math.floor(seg.length * 0.85))];
    const tailAngle = Math.atan2(seg[0].y - tailSeg.y, seg[0].x - tailSeg.x) + Math.PI;
    const tailWag = Math.sin(this.phase * 1.5) * 0.4;
    ctx.save();
    ctx.translate(tailSeg.x - cx, tailSeg.y - cy);
    ctx.rotate(tailAngle + tailWag);
    ctx.fillStyle = this.theme ? this.theme.body : `rgba(${r.r},${r.g},${r.b},0.7)`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-bodyR * 1.8, -bodyR * 1.2);
    ctx.lineTo(-bodyR * 1.8, bodyR * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Shield aura
    if (this.shield) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.phase) * 0.1;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#3b82f6';
      ctx.beginPath();
      ctx.arc(seg[0].x - cx, seg[0].y - cy, headR + 12 + Math.sin(this.phase) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Magnet field lines
    if (this.magnet) {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(this.phase) * 0.1;
      ctx.strokeStyle = '#9b5de5';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + this.phase * 0.5;
        ctx.beginPath();
        ctx.arc(seg[0].x - cx, seg[0].y - cy, 100 + Math.sin(this.phase + i) * 20, ang, ang + Math.PI * 0.4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
