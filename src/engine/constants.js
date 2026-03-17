// constants.js
export const WORLD_RADIUS = 3000;
export const BASE_SPEED = 3;
export const BOOST_SPEED = 6;
export const SPEED_PU_SPEED = 9;
export const SEGMENT_SIZE = 5;
export const MAX_ORBS = 500;
export const SPATIAL_GRID = 120;
export const BOT_NAMES = ['Peixe-Espada','Tubarão','Piranha','Baiacu','Arraia','Atum','Salmão','Baleia','Polvo','Lagosta','Moreia','Cavalo-Marinho','Lula','Barracuda','Sardinha','Bagre','Garoupa','Robalo','Linguado','Anchova'];
export const BOT_COLORS = ['#1a6fa8','#00b4d8','#e07a5f','#f4d03f','#52b788','#9b5de5','#f15bb5','#fee440','#00bbf9','#00f5d4','#fb5607','#ff006e','#8338ec','#3a86ff','#06d6a0'];

export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist(ax, ay, bx, by) { const dx=ax-bx, dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }
export function angle(ax, ay, bx, by) { return Math.atan2(by-ay, bx-ax); }
export function randRange(a, b) { return a + Math.random() * (b - a); }
export function randInt(a, b) { return Math.floor(randRange(a, b+1)); }
export function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
export function lerpAngle(a, b, t) {
  let d = b - a;
  while(d > Math.PI) d -= Math.PI*2;
  while(d < -Math.PI) d += Math.PI*2;
  return a + d * t;
}
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}
