import { randRange } from '../utils';

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public decay: number;
  public size: number;
  public color: string;
  public gravity: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const spd = randRange(1, 5);
    const ang = randRange(0, Math.PI * 2);
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.life = 1;
    this.decay = randRange(0.015, 0.04);
    this.size = randRange(3, 8);
    this.color = color;
    this.gravity = randRange(0.02, 0.08);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const sx = this.x - cx, sy = this.y - cy;
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(sx, sy, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
