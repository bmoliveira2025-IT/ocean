// skins.js – Shared skin definitions used by both Solo and Multiplayer modes
export const SKINS = [
  { id: 'classic',       name: 'Ciclope Verde',       rarity: 'comum', color: '#39ff14', type: 'cyclops',      cost: 0 },
  { id: 'lula_red',      name: 'Lula Clássica',        rarity: 'comum', color: '#ef4444', type: 'lula',         cost: 0 },
  { id: 'blue',          name: 'Abissal Azul',         rarity: 'comum', color: '#00b4d8', type: 'cyclops',      cost: 0 },
  { id: 'dragon',        name: 'Dragão Negro',         rarity: 'raro',  color: '#1a1a1a', type: 'dragon',       cost: 50 },
  { id: 'chain',         name: 'Corrente Metálica',    rarity: 'raro',  color: '#9ca3af', type: 'chain',        cost: 150 },
  { id: 'skeleton',      name: 'Esqueleto',            rarity: 'raro',  color: '#e0e0e0', type: 'skeleton',     cost: 150 },
  { id: 'neon_dragon',   name: 'Dragão Neon',          rarity: 'épico', color: '#00ffff', type: 'dragon_neon',  cost: 200 },
  { id: 'brazil_seahorse', name: 'Cavalo Marinho BR',  rarity: 'raro',  color: '#009c3b', type: 'seahorse',     cost: 300 },
  { id: 'neon_skeleton', name: 'Lich Neon',            rarity: 'épico', color: '#ff00ff', type: 'skeleton_neon',cost: 500 },
];

export const RARITY_STYLE = {
  épico: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]',
  raro:  'bg-yellow-500 text-black',
  comum: 'bg-white/10 text-gray-400',
};
