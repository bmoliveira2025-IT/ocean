// SpatialHash.js
export class SpatialHash {
  constructor(cellSize) { this.cs = cellSize; this.cells = new Map(); }
  key(x, y) { return `${Math.floor(x/this.cs)},${Math.floor(y/this.cs)}`; }
  insert(x, y, obj) {
    const k = this.key(x, y);
    if(!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(obj);
  }
  query(x, y, r) {
    const res = [];
    const mn = Math.floor((x-r)/this.cs), mx = Math.floor((x+r)/this.cs);
    const my = Math.floor((y-r)/this.cs), my2 = Math.floor((y+r)/this.cs);
    for(let cx = mn; cx <= mx; cx++) for(let cy = my; cy <= my2; cy++) {
      const k = `${cx},${cy}`;
      if(this.cells.has(k)) res.push(...this.cells.get(k));
    }
    return res;
  }
  clear() { this.cells.clear(); }
}

// Particle.js
export class Particle {
  constructor(x, y, color) {
    const randRange = (a, b) => a + Math.random() * (b - a);
    this.x = x; this.y = y;
    const spd = randRange(1, 5);
    const ang = randRange(0, Math.PI*2);
    this.vx = Math.cos(ang)*spd; this.vy = Math.sin(ang)*spd;
    this.life = 1; this.decay = randRange(0.015, 0.04);
    this.size = randRange(3, 8);
    this.color = color;
    this.gravity = randRange(0.02, 0.08);
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98; this.vy *= 0.98;
    this.life -= this.decay;
  }
  draw(ctx, cx, cy) {
    const sx = this.x - cx, sy = this.y - cy;
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8; ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(sx, sy, this.size * this.life, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}
