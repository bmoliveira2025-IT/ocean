import { randInt, WORLD_RADIUS } from '../utils';

export type PowerUpType = 'shield' | 'speed' | 'magnet';

export class PowerUp {
  public x: number;
  public y: number;
  public type: PowerUpType;
  private phase: number;
  public id: string;
  public r: number = 18;
  private timerAng: number = 0;
  public collected: boolean = false;

  private colors: Record<PowerUpType, string> = {
    shield: '#3b82f6',
    speed: '#f4d03f',
    magnet: '#9b5de5'
  };

  private icons: Record<PowerUpType, string> = {
    shield: '🛡️',
    speed: '⚡',
    magnet: '🧲'
  };

  constructor(x?: number, y?: number, type?: PowerUpType) {
    if (x !== undefined && y !== undefined) {
      this.x = x;
      this.y = y;
    } else {
      const ang = Math.random() * Math.PI * 2;
      const radius = Math.random() * WORLD_RADIUS * 0.8;
      this.x = Math.cos(ang) * radius;
      this.y = Math.sin(ang) * radius;
    }

    const types: PowerUpType[] = ['shield', 'speed', 'magnet'];
    this.type = type || types[randInt(0, 2)];
    this.phase = Math.random() * Math.PI * 2;
    this.id = Math.random().toString(36).slice(2);
  }

  update() {
    this.phase += 0.03;
    this.timerAng = (this.timerAng + 0.02) % (Math.PI * 2);
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    if (this.collected) return;
    const sx = this.x - cx, sy = this.y - cy + Math.sin(this.phase) * 6;
    const col = this.colors[this.type];
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = col;
    // Glow ring
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4 + Math.sin(this.phase) * 0.2;
    ctx.beginPath();
    ctx.arc(sx, sy, this.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    // Timer ring
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, this.r + 4, -Math.PI / 2, -Math.PI / 2 + this.timerAng);
    ctx.stroke();
    // Background
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(0, 10, 30, 0.9)';
    ctx.beginPath();
    ctx.arc(sx, sy, this.r, 0, Math.PI * 2);
    ctx.fill();
    // Icon
    ctx.globalAlpha = 1;
    ctx.font = `${this.r}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.icons[this.type], sx, sy);
    ctx.restore();
  }
}
