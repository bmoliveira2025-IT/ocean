// Snake.js
const SEGMENT_SIZE = 5;
const BASE_SPEED = 3;
const BOOST_SPEED = 6;
const SPEED_PU_SPEED = 9;
const WORLD_RADIUS = 3000;

function dist(ax, ay, bx, by) { const dx=ax-bx, dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }
function lerpAngle(a, b, t) {
  let d = b - a;
  while(d > Math.PI) d -= Math.PI*2;
  while(d < -Math.PI) d += Math.PI*2;
  return a + d * t;
}
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}

export class Snake {
  constructor(x, y, color, name) {
    this.x = x; this.y = y;
    this.color = color;
    this.name = name;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = BASE_SPEED;
    this.size = 10;
    this.segments = [];
    this.trail = [];
    this.alive = true;
    this.kills = 0;
    this.shield = false; this.shieldTime = 0;
    this.speedBoost = false; this.speedTime = 0; this.speedDuration = 6000;
    this.magnet = false; this.magnetTime = 0; this.magnetDuration = 10000;
    this.shieldDuration = 8000;
    this.phase = Math.random() * Math.PI * 2;
    this.glowAlpha = 0;
    this.boostTrail = [];
    const rgb = hexToRgb(color);
    this.rgb = rgb;
    this.accumulatedDist = 0;
    this.targetSegmentDist = 4; // Constant distance between segments
    for(let i = 0; i < Math.floor(this.size * 5); i++) {
      this.segments.push({ x: x - Math.cos(this.angle)*i*this.targetSegmentDist, y: y - Math.sin(this.angle)*i*this.targetSegmentDist });
    }
  }
  get headRadius() { return 10 + Math.sqrt(this.size) * 2.2; }
  get bodyRadius() { return 7 + Math.sqrt(this.size) * 1.9; }

  move(targetAngle, boosting) {
    const turnSpeed = 0.08 + (boosting ? 0.02 : 0);
    this.angle = lerpAngle(this.angle, targetAngle, turnSpeed);
    const spd = boosting ? (this.speedBoost ? SPEED_PU_SPEED : BOOST_SPEED)
                          : (this.speedBoost ? SPEED_PU_SPEED : BASE_SPEED);
    this.x += Math.cos(this.angle) * spd;
    this.y += Math.sin(this.angle) * spd;
    
    // Boundary check
    const d = dist(0, 0, this.x, this.y);
    if(d > WORLD_RADIUS - 50) {
      const a = Math.atan2(this.y, this.x);
      this.x = Math.cos(a) * (WORLD_RADIUS - 60);
      this.y = Math.sin(a) * (WORLD_RADIUS - 60);
    }

    // Distance-based segment recording
    this.accumulatedDist += spd;
    while(this.accumulatedDist >= this.targetSegmentDist) {
      this.accumulatedDist -= this.targetSegmentDist;
      this.segments.unshift({ x: this.x, y: this.y });
      
      const maxSegments = Math.floor(this.size * 8); // Scaled with size
      if(this.segments.length > maxSegments) {
        this.segments.length = maxSegments;
      }
    }

    this.phase += 0.1;

    if(boosting && !this.speedBoost) {
      this.size = Math.max(5, this.size - 0.012);
    }

    if(boosting || this.speedBoost) {
      const segs = this.segments;
      const tailIdx = Math.min(segs.length - 1, Math.floor(segs.length * 0.6));
      const ts = segs[tailIdx] || segs[segs.length - 1];
      for(let i = 0; i < 2; i++) {
        const spread = (Math.random() - 0.5) * this.bodyRadius * 1.2;
        const perpX = Math.cos(this.angle + Math.PI/2) * spread;
        const perpY = Math.sin(this.angle + Math.PI/2) * spread;
        this.boostTrail.push({
          x: ts.x + perpX + (Math.random()-0.5)*4,
          y: ts.y + perpY + (Math.random()-0.5)*4,
          vx: -Math.cos(this.angle) * (0.5 + Math.random()*1.5) + (Math.random()-0.5)*0.8,
          vy: -Math.sin(this.angle) * (0.5 + Math.random()*1.5) + (Math.random()-0.5)*0.8,
          life: 1.0,
          decay: 0.025 + Math.random()*0.03,
          r: this.bodyRadius * (0.25 + Math.random()*0.35),
          color: this.speedBoost ? '#f4d03f' : (this.theme && this.theme.trail ? this.theme.trail : this.color),
        });
      }
    }
    for(let i = this.boostTrail.length - 1; i >= 0; i--) {
      const tp = this.boostTrail[i];
      tp.x += tp.vx; tp.y += tp.vy;
      tp.vx *= 0.93; tp.vy *= 0.93;
      tp.r *= 0.97;
      tp.life -= tp.decay;
      if(tp.life <= 0) this.boostTrail.splice(i, 1);
    }
  }

  updatePowerups(dt) {
    if(this.shield && this.shieldTime > 0) { this.shieldTime -= dt; if(this.shieldTime <= 0) { this.shield = false; } }
    if(this.speedBoost && this.speedTime > 0) { this.speedTime -= dt; if(this.speedTime <= 0) { this.speedBoost = false; } }
    if(this.magnet && this.magnetTime > 0) { this.magnetTime -= dt; if(this.magnetTime <= 0) { this.magnet = false; } }
  }

  applyPowerup(type) {
    if(type === 'shield') { this.shield = true; this.shieldTime = this.shieldDuration; }
    else if(type === 'speed') { this.speedBoost = true; this.speedTime = this.speedDuration; }
    else if(type === 'magnet') { this.magnet = true; this.magnetTime = this.magnetDuration; }
  }

  grow(amount) { this.size = Math.max(5, (this.size || 5) + amount); }

  drawFish(ctx, cx, cy) {
    if(!this.alive) return;
    const seg = this.segments;
    if(seg.length < 2) return;
    const r = this.rgb;
    const headR = this.headRadius;
    const bodyR = this.bodyRadius;
    const th = this.theme || null;
    const bodyColor = th ? th.body : `rgba(${r.r},${r.g},${r.b},1)`;
    const glowColor = th ? th.glow : this.color;

    if(this.boostTrail.length > 0) {
      for(const tp of this.boostTrail) {
        ctx.save();
        ctx.globalAlpha = tp.life * 0.75;
        ctx.fillStyle = tp.color;
        ctx.shadowBlur = 10; ctx.shadowColor = tp.color;
        ctx.beginPath();
        ctx.arc(tp.x - cx, tp.y - cy, Math.max(0.5, tp.r), 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = tp.life * 0.4;
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(tp.x - cx, tp.y - cy, Math.max(0.3, tp.r * 0.4), 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw Body Segments
    // Use dynamic step to maintain performance while having high-density points
    const drawStep = Math.max(1, Math.floor(seg.length / 100)); 
    for(let i = seg.length - 1; i >= 0; i -= 2) { // Draw every 2nd point for overlap
      const s = seg[i];
      if(!s) continue;
      const t = i / seg.length;
      const sr = bodyR * (0.4 + 0.6 * (1 - t));
      const alpha = 0.6 + 0.4 * (1 - t);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = bodyColor;
      ctx.shadowBlur = i < 5 ? 10 : 0; // Less shadow on body for perf
      ctx.shadowColor = glowColor;
      ctx.beginPath();
      ctx.arc(s.x - cx, s.y - cy, sr, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    const tailSeg = seg[Math.min(seg.length - 1, Math.floor(seg.length * 0.85))];
    const tailAngle = Math.atan2(seg[0].y - tailSeg.y, seg[0].x - tailSeg.x) + Math.PI;
    const tailWag = Math.sin(this.phase * 1.5) * 0.4;
    ctx.save();
    ctx.translate(tailSeg.x - cx, tailSeg.y - cy);
    ctx.rotate(tailAngle + tailWag);
    ctx.fillStyle = th ? th.body : `rgba(${r.r},${r.g},${r.b},0.7)`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-bodyR * 1.8, -bodyR * 1.2);
    ctx.lineTo(-bodyR * 1.8, bodyR * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if(this.shield) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.phase) * 0.1;
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3;
      ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6';
      ctx.beginPath();
      ctx.arc(seg[0].x - cx, seg[0].y - cy, headR + 12 + Math.sin(this.phase)*3, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    if(this.magnet) {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(this.phase)*0.1;
      ctx.strokeStyle = '#9b5de5'; ctx.lineWidth = 1;
      for(let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + this.phase * 0.5;
        ctx.beginPath();
        ctx.arc(seg[0].x - cx, seg[0].y - cy, 100 + Math.sin(this.phase + i)*20, ang, ang + Math.PI * 0.4);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 15; ctx.shadowColor = glowColor;
    ctx.beginPath();
    ctx.arc(seg[0].x - cx, seg[0].y - cy, headR, 0, Math.PI*2);
    ctx.fill();
    if(th && th.accent) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = th.accent;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(seg[0].x - cx + Math.cos(this.angle-0.5)*headR*0.4, seg[0].y - cy + Math.sin(this.angle-0.5)*headR*0.4, headR*0.45, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const eyeX = seg[0].x - cx + Math.cos(this.angle + 0.5) * headR * 0.55;
    const eyeY = seg[0].y - cy + Math.sin(this.angle + 0.5) * headR * 0.55;
    ctx.fillStyle = th ? th.eye : '#fff'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(eyeX, eyeY, headR * 0.32, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = th ? th.pupil : '#111';
    ctx.beginPath(); ctx.arc(eyeX + Math.cos(this.angle)*1.5, eyeY + Math.sin(this.angle)*1.5, headR*0.18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = th ? th.fin : `rgba(${r.r},${r.g},${r.b},0.6)`;
    ctx.save();
    ctx.translate(seg[0].x - cx, seg[0].y - cy);
    ctx.rotate(this.angle - Math.PI/2 + Math.sin(this.phase*0.8)*0.3);
    ctx.beginPath();
    ctx.ellipse(0, -headR*0.8, headR*0.3, headR*0.5, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    if(th && th.drawExtra) {
      th.drawExtra(ctx, seg[0].x - cx, seg[0].y - cy, headR, this.phase);
    }

    ctx.save();
    ctx.font = `bold ${Math.max(10, headR * 0.8)}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(this.name, seg[0].x - cx + 1, seg[0].y - cy - headR - 6 + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(this.name, seg[0].x - cx, seg[0].y - cy - headR - 6);
    ctx.restore();
  }
}
