// Orb.js
export class Orb {
  constructor(x, y, value, color, isDeath) {
    this.x = x; this.y = y;
    this.value = value || 1;
    this.color = color || `hsl(${Math.random() * (220 - 160) + 160},80%,60%)`;
    this.isDeath = !!isDeath;
    this.r = this.isDeath ? 6 + this.value * 2.5 : 4 + this.value * 1.5;
    this.phase = Math.random() * Math.PI * 2;
    this.id = Math.random().toString(36).slice(2);
    this.collectAnim = 0;
    this.collecting = false;
    this.vx = 0; this.vy = 0;
    this.friction = this.isDeath ? 0.94 : 0.88;
  }
  update(t) {
    this.phase += this.isDeath ? 0.07 : 0.04;
    if(this.vx !== 0 || this.vy !== 0) {
      this.x += this.vx; this.y += this.vy;
      this.vx *= this.friction; this.vy *= this.friction;
      if(Math.abs(this.vx) < 0.01) this.vx = 0;
      if(Math.abs(this.vy) < 0.01) this.vy = 0;
    }
    if(this.collecting) { this.collectAnim += 0.12; }
  }
  draw(ctx, cx, cy) {
    const sx = this.x - cx, sy = this.y - cy;
    const pulse = Math.sin(this.phase) * (this.isDeath ? 0.45 : 0.3) + 1;
    const scale = this.collecting ? (1 + this.collectAnim * 1.5) : pulse;
    const alpha = this.collecting ? Math.max(0, 1 - this.collectAnim * 1.8) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;

    if(this.isDeath) {
      ctx.shadowBlur = 22; ctx.shadowColor = this.color;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = alpha * (0.3 + Math.sin(this.phase * 2) * 0.2);
      ctx.beginPath();
      ctx.arc(sx, sy, this.r * scale * 1.5, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }

    ctx.shadowBlur = this.isDeath ? 20 : 15;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(sx, sy, this.r * scale, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = this.isDeath ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(sx - this.r*0.22*scale, sy - this.r*0.22*scale, this.r*0.35*scale, 0, Math.PI*2);
    ctx.fill();

    if(this.isDeath) {
      ctx.globalAlpha = alpha * (0.5 + Math.sin(this.phase * 3) * 0.4);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx + this.r*0.3*scale, sy - this.r*0.4*scale, this.r*0.15*scale, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// PowerUp.js
export class PowerUp {
  constructor(WORLD_RADIUS) {
    const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
    const ang = Math.random() * Math.PI * 2;
    const r = Math.random() * WORLD_RADIUS * 0.8;
    this.x = Math.cos(ang) * r;
    this.y = Math.sin(ang) * r;
    const types = ['shield','speed','magnet'];
    this.type = types[randInt(0, 2)];
    this.phase = Math.random() * Math.PI * 2;
    this.id = Math.random().toString(36).slice(2);
    this.r = 18;
    this.timerAng = 0;
    this.colors = { shield:'#3b82f6', speed:'#f4d03f', magnet:'#9b5de5' };
    this.icons = { shield:'🛡️', speed:'⚡', magnet:'🧲' };
    this.collected = false;
  }
  update() { this.phase += 0.03; this.timerAng = (this.timerAng + 0.02) % (Math.PI*2); }
  draw(ctx, cx, cy) {
    if(this.collected) return;
    const sx = this.x - cx, sy = this.y - cy + Math.sin(this.phase) * 6;
    const col = this.colors[this.type];
    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4 + Math.sin(this.phase)*0.2;
    ctx.beginPath();
    ctx.arc(sx, sy, this.r + 6, 0, Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, this.r + 4, -Math.PI/2, -Math.PI/2 + this.timerAng);
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(0,10,30,0.9)';
    ctx.beginPath();
    ctx.arc(sx, sy, this.r, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `${this.r}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.icons[this.type], sx, sy);
    ctx.restore();
  }
}
