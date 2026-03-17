export const WORLD_RADIUS = 3000;
export const BASE_SPEED = 3;
export const BOOST_SPEED = 6;
export const SPEED_PU_SPEED = 9;
export const SEGMENT_SIZE = 5;
export const MAX_ORBS = 500;
export const SPATIAL_GRID = 120;
export const BOT_NAMES = ['Peixe-Espada','Tubarão','Piranha','Baiacu','Arraia','Atum','Salmão','Baleia','Polvo','Lagosta','Moreia','Cavalo-Marinho','Lula','Barracuda','Sardinha','Bagre','Garoupa','Robalo','Linguado','Anchova'];
export const BOT_COLORS = ['#1a6fa8','#00b4d8','#e07a5f','#f4d03f','#52b788','#9b5de5','#f15bb5','#fee440','#00bbf9','#00f5d4','#fb5607','#ff006e','#8338ec','#3a86ff','#06d6a0'];

export interface Theme {
  body: string;
  glow: string;
  trail: string;
}

export const THEMES: Theme[] = [
  { body: 'rgba(0,180,216,0.85)', glow: '#00d4ff', trail: '#00b4d8' }, // Ocean
  { body: 'rgba(255,77,109,0.85)', glow: '#ff4d6d', trail: '#c9184a' }, // Fire
  { body: 'rgba(127,255,0,0.8)', glow: '#7fff00', trail: '#38b000' }, // Toxic
  { body: 'rgba(191,127,255,0.7)', glow: '#bf7fff', trail: '#7b2cbf' }, // Galaxy
  { body: 'rgba(255,215,0,0.85)', glow: '#ffd700', trail: '#ffb700' }, // Gold
  { body: 'rgba(0,255,245,0.2)', glow: '#00fff5', trail: 'rgba(0,255,245,0.1)' }, // Ghost
  { body: 'rgba(255,140,0,0.85)', glow: '#ff8c00', trail: '#e85d04' }, // Coral
  { body: 'rgba(224,224,255,0.8)', glow: '#e0e0ff', trail: '#bde0fe' }, // Glacial
];

export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
export function dist(ax: number, ay: number, bx: number, by: number) { const dx=ax-bx, dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }
export function angle(ax: number, ay: number, bx: number, by: number) { return Math.atan2(by-ay, bx-ax); }
export function randRange(a: number, b: number) { return a + Math.random() * (b - a); }
export function randInt(a: number, b: number) { return Math.floor(randRange(a, b+1)); }
export function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while(d > Math.PI) d -= Math.PI*2;
  while(d < -Math.PI) d += Math.PI*2;
  return a + d * t;
}
export function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}
