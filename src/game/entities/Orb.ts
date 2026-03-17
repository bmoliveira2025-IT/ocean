import { randRange } from '../utils';

export class Orb {
  public x: number;
  public y: number;
  public value: number;
  public color: string;
  public r: number;
  private phase: number;
  public id: string;
  public collectAnim: number = 0;
  public collecting: boolean = false;
  public vx: number = 0;
  public vy: number = 0;

  constructor(x: number, y: number, value?: number, color?: string) {
    this.x = x;
    this.y = y;
    this.value = value || 1;
    this.color = color || `hsl(${randRange(160, 220)}, 80%, 60%)`;
    this.r = 4 + this.value * 1.5;
    this.phase = Math.random() * Math.PI * 2;
    this.id = Math.random().toString(36).slice(2);
  }

  update() {
    this.phase += 0.04;
    if (this.vx || this.vy) {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.88;
      this.vy *= 0.88;
    }
    if (this.collecting) {
      this.collectAnim += 0.15;
    }
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const sx = this.x - cx, sy = this.y - cy;
    const pulse = Math.sin(this.phase) * 0.3 + 1;
    const scale = this.collecting ? (1 + this.collectAnim) : pulse;
    const alpha = this.collecting ? Math.max(0, 1 - this.collectAnim * 2) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(sx, sy, this.r * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(sx - this.r * 0.2 * scale, sy - this.r * 0.2 * scale, this.r * 0.3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
