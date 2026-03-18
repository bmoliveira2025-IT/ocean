// MultiplayerApp.jsx – Modo Multiplayer Online
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Logo from './components/Logo';
import { socket } from './socket';
import { qualityManager } from './utils/QualityManager';
import { SKINS, RARITY_STYLE } from './skins';

const COLORS = {
  blue: '#1a6fa8',
  turquoise: '#00b4d8',
  coral: '#e07a5f',
  yellow: '#f4d03f',
  green: '#52b788',
  purple: '#9b59b6',
  white: '#ffffff',
  danger: '#ff4757',
  neonGreen: '#39ff14', 
  neonCyan: '#00ffff', 
  neonPink: '#ff00ff', 
  boneWhite: '#e0e0e0', 
  classicRed: '#ef4444',
  silver: '#9ca3af',
  brGreen: '#009c3b',
  brYellow: '#ffdf00',
  brBlue: '#002776'
};

// WORLD_SIZE is now dynamic, we use worldRadius from server
const lerp = (a, b, t) => a + (b - a) * t;

// ==========================================
// RENDERER
// ==========================================
function drawSnake(ctx, snake, settings, t = 0) {
  if (!snake || !snake.body || snake.body.length === 0) return;
  const { color, x, y, angle, size, isBoosting, shieldTimer, speedTimer, name, isKing, isProtected } = snake;
  const skinType = (typeof snake.skinType === 'string') ? snake.skinType : 'cyclops';
  const boosting = isBoosting || (speedTimer > 0);

  ctx.save();
  if (isProtected) {
    // Efeito de piscar a cada 0.2 segundos (t é em segundos)
    if (Math.floor(t * 10) % 2 === 0) ctx.globalAlpha = 0.4;
    
    // Anel de proteção dourado em volta
    ctx.beginPath();
    ctx.arc(x, y, size * 2.5 + Math.sin(t * 8) * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(t * 10) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (shieldTimer > 0) {
    ctx.beginPath();
    ctx.arc(x, y, size * 2 + Math.sin(t * 10) * 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 180, 216, 0.2)';
    ctx.fill();
    if (settings.glow) { ctx.strokeStyle = COLORS.turquoise; ctx.lineWidth = 2; ctx.stroke(); }
  }

  // Determine body source (local prediction gives {x,y}, server gives [x,y])
  const bodyIter = snake.localBody ? snake.localBody.map(b => [b.x, b.y]) : snake.body;
  const step = settings.label === 'Baixo' ? 2 : 1;

  for (let i = bodyIter.length - 1; i >= 0; i -= step) {
    const [bx, by] = bodyIter[i];
    const p = 1 - (i / bodyIter.length);
    const s = size * (0.4 + 0.6 * p);

    if (skinType === 'chain') {
      ctx.save(); ctx.translate(bx, by);
      let segAngle = angle;
      if (i > 0) {
        const [px, py] = bodyIter[i-1];
        segAngle = Math.atan2(py - by, px - bx);
      }
      ctx.rotate(segAngle);
      const isSideView = i % 2 === 0;
      const metalGrad = ctx.createLinearGradient(-s, -s, s, s);
      metalGrad.addColorStop(0, '#e5e7eb'); metalGrad.addColorStop(0.5, '#6b7280'); metalGrad.addColorStop(1, '#1f2937');
      ctx.fillStyle = metalGrad; ctx.strokeStyle = '#000000'; ctx.lineWidth = s * 0.15;
      ctx.beginPath();
      if (isSideView) {
        ctx.ellipse(0, 0, s*1.2, s*0.7, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, s*0.6, s*0.25, 0, 0, Math.PI*2); ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
      } else {
        ctx.ellipse(0, 0, s*0.4, s*0.9, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    } else {
      const cacheKey = `${skinType}_${color}_${boosting}`;
      const segmentCanvas = ctx.segmentCache && ctx.segmentCache[cacheKey];
      if (segmentCanvas) {
        ctx.drawImage(segmentCanvas, bx - s, by - s, s * 2, s * 2);
      } else {
        ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, s);
        if (boosting) {
          grad.addColorStop(0, COLORS.yellow); grad.addColorStop(1, '#d35400');
        } else {
          if (skinType === 'dragon') { grad.addColorStop(0, '#333333'); grad.addColorStop(0.8, '#111111'); grad.addColorStop(1, '#8b0000'); }
          else if (skinType === 'dragon_neon') { grad.addColorStop(0, '#111111'); grad.addColorStop(0.7, '#222222'); grad.addColorStop(1, color); }
          else if (skinType === 'seahorse') {
            const stripe = Math.floor(i / 3) % 3; const segColor = stripe === 0 ? COLORS.brGreen : (stripe === 1 ? COLORS.brYellow : COLORS.brBlue);
            grad.addColorStop(0, segColor); grad.addColorStop(0.8, segColor); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
          }
          else if (skinType.startsWith('skeleton')) { grad.addColorStop(0, '#000000'); grad.addColorStop(0.5, '#1a1a1a'); grad.addColorStop(0.8, color); grad.addColorStop(1, '#000000'); }
          else { grad.addColorStop(0, color); grad.addColorStop(0.8, color); grad.addColorStop(1, 'rgba(0,0,0,0.4)'); }
        }
        ctx.fillStyle = grad; ctx.fill();
      }
    }
  }

  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  
  if (skinType.startsWith('dragon')) {
    const isNeon = skinType === 'dragon_neon';
    const hornColor = isNeon ? color : '#4a0000'; const eyeColor = isNeon ? '#ffffff' : '#ff0000'; const eyeGlow = isNeon ? color : '#ff0000';
    ctx.fillStyle = hornColor; if (isNeon) { ctx.shadowBlur = 10; ctx.shadowColor = color; }
    ctx.beginPath(); ctx.moveTo(0, -size * 0.4); ctx.lineTo(-size * 1.5, -size * 1.3); ctx.lineTo(-size * 0.5, -size * 0.1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, size * 0.4); ctx.lineTo(-size * 1.5, size * 1.3); ctx.lineTo(-size * 0.5, size * 0.1); ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(0, 0, size * 1.1, size * 0.9, 0, 0, Math.PI * 2);
    const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.1);
    headGrad.addColorStop(0, isNeon ? '#222' : '#444'); headGrad.addColorStop(1, '#050505');
    ctx.fillStyle = headGrad; ctx.fill();
    ctx.fillStyle = eyeColor; ctx.shadowBlur = 15; ctx.shadowColor = eyeGlow;
    ctx.beginPath(); ctx.ellipse(size * 0.4, -size * 0.35, size * 0.35, size * 0.15, Math.PI / 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size * 0.4, size * 0.35, size * 0.35, size * 0.15, -Math.PI / 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(size * 0.45, -size * 0.35, size * 0.05, size * 0.12, Math.PI / 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size * 0.45, size * 0.35, size * 0.05, size * 0.12, -Math.PI / 8, 0, Math.PI * 2); ctx.fill();
  } else if (skinType.startsWith('skeleton')) {
    const isNeon = skinType === 'skeleton_neon';
    ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.85, 0, 0, Math.PI * 2); ctx.fillStyle = color;
    if (isNeon) { ctx.shadowBlur = 15; ctx.shadowColor = color; } ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#050505'; const eyeOffsetX = size * 0.3; const eyeSize = size * 0.35;
    ctx.beginPath(); ctx.arc(eyeOffsetX, -size * 0.35, eyeSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeOffsetX, size * 0.35, eyeSize, 0, Math.PI * 2); ctx.fill();
    if (isNeon) { ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 10; ctx.shadowColor = color; ctx.beginPath(); ctx.arc(eyeOffsetX + 2, -size * 0.35, eyeSize * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeOffsetX + 2, size * 0.35, eyeSize * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.moveTo(size * 0.7, 0); ctx.lineTo(size * 0.5, -size * 0.1); ctx.lineTo(size * 0.5, size * 0.1); ctx.fill();
  } else if (skinType === 'chain') {
    ctx.beginPath(); ctx.ellipse(0, 0, size * 1.1, size * 0.9, 0, 0, Math.PI * 2);
    const headGrad = ctx.createLinearGradient(-size, -size, size, size); headGrad.addColorStop(0, '#e5e7eb'); headGrad.addColorStop(0.5, '#6b7280'); headGrad.addColorStop(1, '#111827');
    ctx.fillStyle = headGrad; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = size * 0.1; ctx.stroke();
    ctx.fillStyle = '#ff0000'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000'; ctx.beginPath(); ctx.ellipse(size * 0.5, 0, size * 0.2, size * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  } else if (skinType === 'seahorse') {
    ctx.fillStyle = COLORS.brBlue; ctx.beginPath(); ctx.moveTo(-size * 0.5, -size * 0.8); ctx.lineTo(-size * 0.2, -size * 1.5); ctx.lineTo(size * 0.1, -size * 0.8); ctx.lineTo(size * 0.4, -size * 1.4); ctx.lineTo(size * 0.6, -size * 0.7); ctx.fill();
    ctx.lineWidth = size * 0.7; ctx.strokeStyle = COLORS.brYellow; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size * 1.8, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2); const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.1); headGrad.addColorStop(0, COLORS.brGreen); headGrad.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = headGrad; ctx.fill();
    const eyeOffsetX = size * 0.3; const eyeOffsetY = size * 0.65; const eyeR = size * 0.45;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(eyeOffsetX + size*0.1, -eyeOffsetY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeOffsetX + size*0.1, eyeOffsetY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
  } else if (skinType === 'lula') {
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size); headGrad.addColorStop(0, color); headGrad.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = headGrad; ctx.fill();
    ctx.lineWidth = size * 0.45; ctx.strokeStyle = color; ctx.lineCap = 'round'; const eyeLX = size * 0.9; const eyeLY = -size * 0.65; const eyeRX = size * 0.9; const eyeRY = size * 0.65;
    ctx.beginPath(); ctx.moveTo(size * 0.2, -size * 0.3); ctx.lineTo(eyeLX, eyeLY); ctx.stroke(); ctx.beginPath(); ctx.moveTo(size * 0.2, size * 0.3); ctx.lineTo(eyeRX, eyeRY); ctx.stroke();
    const eyeR = size * 0.5; const pupilR = size * 0.22; ctx.lineWidth = size * 0.15; ctx.strokeStyle = '#000000'; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(eyeLX, eyeLY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(eyeRX, eyeRY, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(eyeLX + eyeR * 0.3, eyeLY, pupilR, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeRX + eyeR * 0.3, eyeRY, pupilR, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size); headGrad.addColorStop(0, color); headGrad.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = headGrad; ctx.fill();
    const eyeOffsetX = size * 0.3; const eyeSize = size * 0.45; ctx.fillStyle = '#00b4d8'; ctx.beginPath(); ctx.arc(eyeOffsetX, 0, eyeSize, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(eyeOffsetX + 2, 0, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  
  if (isKing) {
    ctx.save(); ctx.translate(-size * 0.2, 0); ctx.shadowBlur = 15; ctx.shadowColor = '#fbbf24';
    const crownGrad = ctx.createLinearGradient(0, -size * 0.6, 0, size * 0.6); crownGrad.addColorStop(0, '#fef08a'); crownGrad.addColorStop(0.5, '#fbbf24'); crownGrad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = crownGrad; ctx.strokeStyle = '#422006'; ctx.lineWidth = size * 0.1; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(size * 0.1, -size * 0.6); ctx.lineTo(-size * 0.4, -size * 0.65); ctx.lineTo(-size * 0.1, -size * 0.2); ctx.lineTo(-size * 0.8, 0); ctx.lineTo(-size * 0.1, size * 0.2); ctx.lineTo(-size * 0.4, size * 0.65); ctx.lineTo(size * 0.1, size * 0.6); ctx.quadraticCurveTo(size * 0.35, 0, size * 0.1, -size * 0.6); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 10; ctx.shadowColor = '#60a5fa'; ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(-size * 0.5, 0, size * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  
  ctx.restore();
  if (size > 12) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `${Math.max(10, size * 0.8)}px Arial`;
    ctx.textAlign = 'center'; ctx.fillText(name, x, y - size - 8);
  }
  ctx.restore();
}

function drawOrb(ctx, orb) {
  if (!orb) return;
  ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
  ctx.fillStyle = orb.color; ctx.fill();
  if (orb.isPowerup) {
    ctx.shadowBlur = 10; ctx.shadowColor = orb.color; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(['S', '⚡', '🧲', '🪙'][orb.type ?? 0], orb.x, orb.y);
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MultiplayerApp({ onBack }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 0.8 });
  const worldRef = useRef({ snakes: [], orbs: [] });
  const worldRadiusRef = useRef(1500); 
  const inputRef = useRef({ angle: 0, isBoosting: false });
  const myIdRef = useRef(null);
  const settingsRef = useRef(qualityManager.getSettings());
  const isMobileRef = useRef(false);
  const predictedMeRef = useRef(null);   // client-side prediction state
  const lastRenderRef = useRef(0);        // for per-frame dt
  const smoothSnakesRef = useRef(new Map()); // id -> {x, y, angle, path, body}

  const [quality, setQuality] = useState(qualityManager.currentQuality);
  const [uiState, setUiState] = useState('LOBBY');
  const [playerName, setPlayerName] = useState('');
  const [selectedSkinIdx, setSelectedSkinIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [score, setScore] = useState(0);
  const [rank, setRank] = useState('-');
  const [leaderboard, setLeaderboard] = useState([]);
  const [killFeed, setKillFeed] = useState([]);
  const [killCount, setKillCount] = useState(0);
  const [ping, setPing] = useState(null);
  const [powerupBanner, setPowerupBanner] = useState(null);
  const [activePowerups, setActivePowerups] = useState({ shield: 0, speed: 0 });
  const [connectionError, setConnectionError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(localStorage.getItem('ocean_bgm') !== 'false');
  const [sfxEnabled, setSfxEnabled] = useState(localStorage.getItem('ocean_sfx') !== 'false');
  const [multiHighScore, setMultiHighScore] = useState(() => {
    return parseInt(localStorage.getItem('ocean_multi_highscore') || '0', 10);
  });
  const joystick = useRef({ active: false, baseX: 0, baseY: 0 });

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 800px)').matches || navigator.maxTouchPoints > 0;
    setIsMobile(mobile);
    isMobileRef.current = mobile;
  }, []);

  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        const s = settingsRef.current.renderScale;
        canvasRef.current.width = window.innerWidth * s;
        canvasRef.current.height = window.innerHeight * s;
        canvasRef.current.style.width = '100vw';
        canvasRef.current.style.height = '100vh';
      }
    };
    window.addEventListener('resize', resize); resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Socket event listeners
  useEffect(() => {
    socket.on('joined', ({ playerId, orbs }) => {
      myIdRef.current = playerId;
      worldRef.current.orbs = orbs;
      setUiState('PLAYING');
      startRenderLoop();
    });

    socket.on('state', ({ snakes, worldRadius, events }) => {
      worldRef.current.snakes = snakes;
      if (worldRadius) worldRadiusRef.current = worldRadius;

      // FIX 1: Process orbCollected events to remove eaten orbs
      if (events && events.length > 0) {
        const collectedIds = new Set(
          events.filter(ev => ev.type === 'orbCollected').map(ev => ev.orbId)
        );
        if (collectedIds.size > 0) {
          worldRef.current.orbs = worldRef.current.orbs.filter(o => !collectedIds.has(o.id));
        }

        events.forEach(ev => {
          if (ev.type === 'death' && ev.killerId === myIdRef.current) {
            const kill = { id: Date.now() + Math.random(), victim: ev.name, color: '#ef4444' };
            setKillFeed(prev => [kill, ...prev].slice(0, 5));
            setKillCount(prev => prev + 1);
            setTimeout(() => setKillFeed(prev => prev.filter(k => k.id !== kill.id)), 4000);
          }
          if (ev.type === 'powerup' && ev.playerId === myIdRef.current) {
            const labels = ['🛡️ Escudo ativado!', '⚡ Velocidade ativada!', '🪴 Ímã ativado!', '🪙 +1 moeda!'];
            const colors = ['#00b4d8', '#f4d03f', '#9b59b6', '#ffd700'];
            const banner = { text: labels[ev.orbType] ?? 'Power-up!', color: colors[ev.orbType] ?? '#fff' };
            setPowerupBanner(banner);
            setTimeout(() => setPowerupBanner(null), 2500);
          }
        });
      }

      // Sync smoothSnakesRef
      const currentIds = new Set(snakes.map(s => s.id));
      const smoothSnakes = smoothSnakesRef.current;
      
      // Remove snakes that are gone
      for (const [id] of smoothSnakes) {
        if (!currentIds.has(id)) smoothSnakes.delete(id);
      }

      snakes.forEach(serv => {
        let smooth = smoothSnakes.get(serv.id);
        if (!smooth) {
          smooth = { ...serv, path: serv.body.map(p => ({x:p[0], y:p[1]})).reverse() };
          // If local, use prediction record
          if (serv.id === myIdRef.current && predictedMeRef.current) {
            smooth = predictedMeRef.current;
          }
          smoothSnakes.set(serv.id, smooth);
        } else if (serv.id === myIdRef.current) {
          // Reconcile local prediction with authoritative server position
          const dx = serv.x - smooth.x, dy = serv.y - smooth.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 250) { smooth.x = serv.x; smooth.y = serv.y; smooth.angle = serv.angle; } 
          else if (dist > 3) { smooth.x += dx * 0.15; smooth.y += dy * 0.15; }
          smooth.body = serv.body; smooth.size = serv.size; smooth.score = serv.score;
          smooth.shieldTimer = serv.shieldTimer; smooth.speedTimer = serv.speedTimer;
          smooth.isProtected = serv.isProtected;
        } else {
          // Remote snake: update targets
          smooth.targetX = serv.x; smooth.targetY = serv.y; smooth.targetAngle = serv.angle;
          smooth.targetBody = serv.body; smooth.size = serv.size; smooth.score = serv.score;
          smooth.shieldTimer = serv.shieldTimer; smooth.speedTimer = serv.speedTimer;
          smooth.isProtected = serv.isProtected;
          smooth.isBoosting = serv.isBoosting; smooth.skinType = serv.skinType; smooth.name = serv.name; smooth.color = serv.color;
        }
      });

      const me = snakes.find(s => s.id === myIdRef.current);
      if (me) {
        setScore(Math.floor(me.score));
        setActivePowerups({ shield: me.shieldTimer || 0, speed: me.speedTimer || 0 });
        const sorted = [...snakes].sort((a, b) => b.score - a.score);
        setRank(sorted.findIndex(s => s.id === myIdRef.current) + 1);
        setLeaderboard(sorted.slice(0, 10).map((s, i) => ({
          rank: i + 1, name: s.name, score: Math.floor(s.score), color: s.color, isMe: s.id === myIdRef.current
        })));
      } else if (myIdRef.current) {
        setUiState('DIED');
      }
    });

    socket.on('orbSpawn', (newOrbs) => {
      worldRef.current.orbs = [...worldRef.current.orbs, ...newOrbs];
    });

    // Listen to dedicated orbDelete event emitted directly from server when orbs are eaten
    socket.on('orbDelete', (ids) => {
      const idSet = new Set(ids);
      worldRef.current.orbs = worldRef.current.orbs.filter(o => !idSet.has(o.id));
    });

    socket.on('connect_error', (err) => {
      setConnectionError(`Não foi possível conectar: ${err.message}`);
      setUiState('LOBBY');
    });

    // Ping measurement
    socket.on('pong_check', (sentAt) => {
      setPing(Date.now() - sentAt);
    });

    // Death notification from server
    socket.on('you_died', ({ score: finalScore }) => {
      cancelAnimationFrame(animFrameRef.current);
      setScore(finalScore);
      const fs = Math.floor(finalScore / 10);
      setMultiHighScore(prev => {
        if (fs > prev) {
          localStorage.setItem('ocean_multi_highscore', fs.toString());
          return fs;
        }
        return prev;
      });
      setUiState('DIED');
    });

    return () => {
      socket.off('joined'); socket.off('state');
      socket.off('orbSpawn'); socket.off('orbDelete');
      socket.off('connect_error'); socket.off('pong_check');
      socket.off('you_died');
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (uiState !== 'PLAYING') return;
    // Send input at 30fps
    const inputInterval = setInterval(() => {
      if (socket.connected) socket.emit('input', inputRef.current);
    }, 1000 / 30);
    // Send ping every 2s
    const pingInterval = setInterval(() => {
      if (socket.connected) socket.emit('ping_check', Date.now());
    }, 2000);
    return () => { clearInterval(inputInterval); clearInterval(pingInterval); };
  }, [uiState]);

  const startRenderLoop = () => {
    const render = (time) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const t = time / 1000; // time in seconds for animations
      const ctx = canvas.getContext('2d');
      const settings = settingsRef.current;
      const { snakes, orbs } = worldRef.current;

      // --- Smooth Movement Update for all snakes ---
      const now = performance.now();
      const dt = Math.min((now - (lastRenderRef.current || now)) / 1000, 0.05);
      lastRenderRef.current = now;
      
      const smoothSnakes = Array.from(smoothSnakesRef.current.values());

      smoothSnakes.forEach(snake => {
        if (snake.id === myIdRef.current) {
          // Update local predicted snake
          const input = inputRef.current;
          let diff = input.angle - snake.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          snake.angle += diff * Math.min(dt * 4.0, 1);
          const speed = 140 * (input.isBoosting || snake.speedTimer > 0 ? 1.8 : 1);
          snake.x += Math.cos(snake.angle) * speed * dt;
          snake.y += Math.sin(snake.angle) * speed * dt;
        } else {
          // Lerp remote snake towards target
          if (snake.targetX !== undefined) {
            snake.x = lerp(snake.x, snake.targetX, 0.15);
            snake.y = lerp(snake.y, snake.targetY, 0.15);
            // Angle lerp
            let diff = snake.targetAngle - snake.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            snake.angle += diff * 0.15;
          }
        }
        
        // Boundaries (Visual Client-Side Prediction)
        const R = worldRadiusRef.current;
        const distSq = snake.x * snake.x + snake.y * snake.y;
        if (distSq > R * R) {
          const angleToCenter = Math.atan2(-snake.y, -snake.x);
          snake.x = Math.cos(angleToCenter) * -R;
          snake.y = Math.sin(angleToCenter) * -R;
        }

        // Update body path (shared logic for smoothness)
        if (!snake.path) snake.path = snake.body.map(p => ({x:p[0], y:p[1]})).reverse();
        snake.path.unshift({ x: snake.x, y: snake.y });
        if (snake.path.length > 200) snake.path.length = 200;

        const pLength = Math.floor(15 + snake.score / 100);
        const pSize = 12 + Math.sqrt(snake.score) * 0.15;
        const spacing = snake.skinType === 'chain' ? pSize * 0.6 : pSize * 0.25;

        snake.localBody = [{ x: snake.x, y: snake.y }];
        let pathIndex = 0; let distAccum = 0;
        for (let i = 1; i < pLength; i++) {
          let targetDist = i * spacing;
          while (distAccum < targetDist && pathIndex < snake.path.length - 1) {
            let p1 = snake.path[pathIndex]; let p2 = snake.path[pathIndex + 1];
            let d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (distAccum + d >= targetDist) {
              let t_lerp = (targetDist - distAccum) / d;
              snake.localBody[i] = { x: lerp(p1.x, p2.x, t_lerp), y: lerp(p1.y, p2.y, t_lerp) };
              break;
            }
            distAccum += d; pathIndex++;
          }
          if (pathIndex >= snake.path.length - 1) {
            snake.localBody[i] = { ...snake.path[snake.path.length - 1] };
          }
        }
      });

      const me = smoothSnakesRef.current.get(myIdRef.current);
      if (me) {
        cameraRef.current.x = lerp(cameraRef.current.x, me.x, 0.1);
        cameraRef.current.y = lerp(cameraRef.current.y, me.y, 0.1);
        
        // FOV Formula: Proportional and gradual.
        // Base zoom 0.8. Only start shrinking significantly after score 2000.
        // math: 0.8 * (target_scale ^ power)
        const targetZoom = Math.max(0.15, 0.85 * Math.pow(2500 / Math.max(2500, me.score), 0.35));
        cameraRef.current.zoom = lerp(cameraRef.current.zoom, targetZoom, 0.05);
      }
      const renderSnakes = smoothSnakes;

      // Pre-initialize segment cache
      if (!ctx.segmentCache) {
        ctx.segmentCache = {};
        SKINS.forEach(skin => {
          [false, true].forEach(isBoost => {
            const cacheKey = `${skin.type}_${skin.color}_${isBoost}`;
            const offCvs = document.createElement('canvas'); offCvs.width = 100; offCvs.height = 100;
            const offCtx = offCvs.getContext('2d');
            const cXY = 50, r = 50;
            const grad = offCtx.createRadialGradient(cXY, cXY, 0, cXY, cXY, r);
            if (isBoost) { grad.addColorStop(0, COLORS.yellow); grad.addColorStop(1, '#d35400'); }
            else {
              if (skin.type === 'dragon') { grad.addColorStop(0, '#333333'); grad.addColorStop(0.8, '#111111'); grad.addColorStop(1, '#8b0000'); }
              else if (skin.type === 'dragon_neon') { grad.addColorStop(0, '#111111'); grad.addColorStop(0.7, '#222222'); grad.addColorStop(1, skin.color); }
              else if (skin.type.startsWith('skeleton')) { grad.addColorStop(0, '#000000'); grad.addColorStop(0.5, '#1a1a1a'); grad.addColorStop(0.8, skin.color); grad.addColorStop(1, '#000000'); }
              else { grad.addColorStop(0, skin.color); grad.addColorStop(0.8, skin.color); grad.addColorStop(1, 'rgba(0,0,0,0.4)'); }
            }
            offCtx.fillStyle = grad; offCtx.beginPath(); offCtx.arc(cXY, cXY, r, 0, Math.PI * 2); offCtx.fill();
            ctx.segmentCache[cacheKey] = offCvs;
          });
        });
      }

      const { x: camX, y: camY, zoom } = cameraRef.current;
      ctx.fillStyle = '#10141d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom); ctx.translate(-camX, -camY);

      const R = 45; const wHex = Math.sqrt(3) * R; const hHex = R * 1.5;
      const viewW = canvas.width / zoom; const viewH = canvas.height / zoom;
      const startCol = Math.floor((camX - viewW / 2) / wHex) - 1;
      const endCol = Math.floor((camX + viewW / 2) / wHex) + 1;
      const startRow = Math.floor((camY - viewH / 2) / hHex) - 1;
      const endRow = Math.floor((camY + viewH / 2) / hHex) + 1;
      ctx.lineWidth = 3; ctx.strokeStyle = '#0a0d14';
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          let hx = col * wHex; let hy = row * hHex; if (row % 2 !== 0) hx += wHex / 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 6; ctx.lineTo(hx + R * Math.cos(a), hy + R * Math.sin(a)); }
          ctx.closePath(); ctx.fillStyle = '#0e121a'; ctx.fill(); ctx.stroke();
        }
      }
      // Circular Boundary Border
      const worldR = worldRadiusRef.current;
      ctx.beginPath();
      ctx.arc(0, 0, worldR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,60,60,0.4)';
      ctx.lineWidth = 15;
      ctx.stroke();
      
      // Outer Shadow for mapping edge
      ctx.beginPath();
      ctx.arc(0, 0, worldR + 1000, 0, Math.PI * 2);
      ctx.arc(0, 0, worldR, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();

      orbs.forEach(orb => {
        if (Math.abs(orb.x - camX) < viewW / 2 + 50 && Math.abs(orb.y - camY) < viewH / 2 + 50) drawOrb(ctx, orb);
      });
      const mobile = isMobileRef.current;
      const margin = 200;
      [...renderSnakes]
        .filter(s => Math.abs(s.x - camX) < viewW / 2 + margin && Math.abs(s.y - camY) < viewH / 2 + margin)
        .sort((a, b) => a.size - b.size)
        .forEach(snake => {
          drawSnake(ctx, snake, settings, t);
        });
      ctx.restore();

      if (me) {
        const mmR = 60; const mmX = canvas.width - mmR - 20; const mmY = canvas.height - mmR - 20;
        ctx.fillStyle = 'rgba(10,15,25,0.7)';
        ctx.beginPath(); ctx.arc(mmX, mmY, mmR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
        
        const curR = worldRadiusRef.current;
        snakes.forEach(s => {
          const px = mmX + (s.x / curR) * (mmR * 0.9);
          const py = mmY + (s.y / curR) * (mmR * 0.9);
          ctx.fillStyle = s.id === myIdRef.current ? 'white' : s.color + 'bb';
          ctx.beginPath(); ctx.arc(px, py, s.id === myIdRef.current ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
  };

  const handleJoin = () => {
    if (uiState === 'CONNECTING') return;
    // Solicitar tela cheia automaticamente (o clique é um user gesture válido)
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
      // Tentar bloquear orientação em landscape no mobile
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } catch (e) { /* fullscreen may be denied, continue anyway */ }

    const name = playerName.trim() || `Jogador${Math.floor(Math.random() * 999)}`;
    const skinColor = SKINS[selectedSkinIdx].color;
    const skinType = SKINS[selectedSkinIdx].type;
    setConnectionError(null); setKillCount(0); setKillFeed([]); setLeaderboard([]);
    setPowerupBanner(null);
    setUiState('CONNECTING');
    socket.connect();
    socket.once('connect', () => { socket.emit('join', { name, skinColor, skinType }); });
  };

  const handleLeave = () => {
    socket.disconnect(); cancelAnimationFrame(animFrameRef.current);
    myIdRef.current = null; worldRef.current = { snakes: [], orbs: [] };
    setUiState('LOBBY');
  };

  // FIX 3: Quality selector handler
  const handleQuality = (q) => {
    qualityManager.setQuality(q);
    settingsRef.current = qualityManager.getSettings();
    setQuality(q);
  };

  const handleMouseMove = useCallback((e) => {
    if (uiState !== 'PLAYING') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    inputRef.current.angle = Math.atan2(cy - canvas.height / 2, cx - canvas.width / 2);
  }, [uiState]);

  const handleMouseDown = () => { inputRef.current.isBoosting = true; };
  const handleMouseUp = () => { inputRef.current.isBoosting = false; };

  const handleTouchMove = useCallback((e) => {
    if (uiState !== 'PLAYING' || joystick.current.active) return;
    const canvas = canvasRef.current; if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    inputRef.current.angle = Math.atan2(cy - canvas.height / 2, cx - canvas.width / 2);
  }, [uiState]);

  const handleJoystickStart = (e) => {
    e.stopPropagation(); joystick.current.active = true;
    const rect = e.currentTarget.getBoundingClientRect();
    joystick.current.baseX = rect.left + rect.width / 2;
    joystick.current.baseY = rect.top + rect.height / 2;
  };
  const handleJoystickMove = (e) => {
    e.stopPropagation();
    if (!joystick.current.active || !e.targetTouches[0]) return;
    const dx = e.targetTouches[0].clientX - joystick.current.baseX;
    const dy = e.targetTouches[0].clientY - joystick.current.baseY;
    inputRef.current.angle = Math.atan2(dy, dx);
    const knob = document.getElementById('mp-joystick-knob');
    const maxDist = 45; const dist = Math.min(Math.hypot(dx, dy), maxDist);
    const h = Math.hypot(dx, dy) || 1;
    if (knob) knob.style.transform = `translate(calc(-50% + ${(dx / h) * dist}px), calc(-50% + ${(dy / h) * dist}px))`;
  };
  const handleJoystickEnd = (e) => {
    e.stopPropagation(); joystick.current.active = false;
    const knob = document.getElementById('mp-joystick-knob');
    if (knob) knob.style.transform = 'translate(-50%, -50%)';
  };

  return (
          <div className="fixed inset-0 overflow-hidden bg-gray-900 select-none touch-none font-sans">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair touch-none"
        onMouseMove={handleMouseMove} onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} />

      {uiState === 'PLAYING' && (
        <>
          {/* ── HUD Superior Esquerdo ── */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-1.5">
            {/* Score Principal */}
            <div className="bg-black/50 backdrop-blur-sm border border-white/10 px-3 py-2 rounded-2xl flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-white/40 text-[9px] uppercase tracking-widest font-bold">Comprimento</span>
                <span className="text-white font-black text-lg leading-none">{Math.floor(score / 10)}</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-white/40 text-[9px] uppercase tracking-widest font-bold">Posição</span>
                <span className="text-yellow-400 font-black text-lg leading-none">#{rank}</span>
              </div>
              {killCount > 0 && (
                <>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-white/40 text-[9px] uppercase tracking-widest font-bold">Abates</span>
                    <span className="text-red-400 font-black text-lg leading-none">{killCount}</span>
                  </div>
                </>
              )}
            </div>

            {/* Ping */}
            {ping !== null && (
              <div className={`self-start px-2 py-0.5 rounded-full text-[10px] font-black font-mono border ${ping < 80 ? 'text-green-400 border-green-500/30 bg-green-950/40' : ping < 180 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-950/40' : 'text-red-400 border-red-500/30 bg-red-950/40'}`}>
                ⬤ {ping}ms
              </div>
            )}

            {/* Power-ups ativos */}
            {(activePowerups.shield > 0 || activePowerups.speed > 0) && (
              <div className="flex flex-col gap-1">
                {activePowerups.shield > 0 && (
                  <div className="flex items-center gap-1.5 bg-cyan-900/40 border border-cyan-400/30 px-2 py-1 rounded-xl">
                    <span className="text-xs">🛡️</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${Math.min(100,(activePowerups.shield/8)*100)}%` }} />
                    </div>
                  </div>
                )}
                {activePowerups.speed > 0 && (
                  <div className="flex items-center gap-1.5 bg-yellow-900/40 border border-yellow-400/30 px-2 py-1 rounded-xl">
                    <span className="text-xs">⚡</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${Math.min(100,(activePowerups.speed/6)*100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Botão Sair — topo direito, nunca cobre controles ── */}
          <button onClick={handleLeave}
            className="absolute top-3 right-3 z-50 bg-black/40 backdrop-blur-sm hover:bg-red-900/60 text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-full border border-white/15 hover:border-red-500/40 transition-all">
            ✕ Sair
          </button>

          {/* ── Leaderboard — abaixo do botão Sair ── */}
          <div className="absolute top-12 right-3 text-white text-sm pointer-events-none z-10 hidden sm:block" style={{minWidth: 210}}>
            <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-3 py-1.5 bg-gradient-to-r from-purple-900/60 to-blue-900/60 border-b border-white/10 flex items-center gap-2">
                <span className="text-yellow-400 text-base">👑</span>
                <h3 className="font-black text-white text-xs uppercase tracking-widest">Líderes</h3>
              </div>
              <div className="flex flex-col px-2 py-1.5 gap-0.5">
                {leaderboard.map(p => (
                  <div key={p.rank} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg transition-all ${p.isMe ? 'bg-white/10 font-bold' : ''}`}>
                    <span className={`text-[10px] font-black w-5 text-center ${p.rank === 1 ? 'text-yellow-400' : p.rank === 2 ? 'text-gray-300' : p.rank === 3 ? 'text-amber-600' : 'text-white/30'}`}>#{p.rank}</span>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color, boxShadow: `0 0 4px ${p.color}` }} />
                    <span className="flex-1 truncate text-left text-[11px]" style={{ color: p.isMe ? 'white' : p.color }}>{p.name}</span>
                    <span className="text-white/50 text-[10px] font-mono">{p.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Kill Feed — centro-topo ── */}
          {killFeed.length > 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col gap-1 pointer-events-none z-30">
              {killFeed.map(k => (
                <div key={k.id} className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-red-500/30 px-3 py-1.5 rounded-full text-[11px] text-white shadow-[0_0_10px_rgba(255,0,0,0.15)]" style={{animation:'fadeInUp 0.3s ease'}}>
                  <span className="text-red-400">💀</span> Você eliminou <span className="font-bold" style={{ color: k.color }}>{k.victim}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Power-up Banner — centro da tela ── */}
          {powerupBanner && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none z-30">
              <div className="px-6 py-2 rounded-full text-sm font-black backdrop-blur-sm" style={{ background: `${powerupBanner.color}25`, border: `1.5px solid ${powerupBanner.color}80`, color: powerupBanner.color, textShadow: `0 0 12px ${powerupBanner.color}`, animation: 'fadeInUp 0.3s ease' }}>
                {powerupBanner.text}
              </div>
            </div>
          )}

          {/* ── Controles Mobile ── */}
          {isMobile && (
            <>
              {/* Joystick — canto inferior esquerdo */}
              <div className="absolute bottom-8 left-8 w-28 h-28 z-50 pointer-events-auto touch-none"
                onTouchStart={handleJoystickStart} onTouchMove={handleJoystickMove} onTouchEnd={handleJoystickEnd}>
                <div className="w-full h-full rounded-full bg-white/8 border-2 border-white/20 backdrop-blur-md flex items-center justify-center" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div id="mp-joystick-knob" className="absolute top-1/2 left-1/2 w-12 h-12 bg-white/30 rounded-full border border-white/60 backdrop-blur-md" style={{transform:'translate(-50%,-50%)'}} />
                </div>
              </div>

              {/* Boost — canto inferior direito, acima do nível do HUD */}
              <div className="absolute bottom-8 right-8 w-24 h-24 z-50 pointer-events-auto touch-none flex flex-col items-center gap-1"
                onTouchStart={(e) => { e.stopPropagation(); inputRef.current.isBoosting = true; }}
                onTouchEnd={(e) => { e.stopPropagation(); inputRef.current.isBoosting = false; }}>
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full border-2 border-yellow-400/70 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.2)] pointer-events-none">
                  <span className="text-4xl">⚡</span>
                </div>
                <span className="text-yellow-300/60 text-[9px] font-bold uppercase tracking-widest pointer-events-none">Turbo</span>
              </div>
            </>
          )}
        </>
      )}


      {/* Lobby / Death screen */}
      {(uiState === 'LOBBY' || uiState === 'DIED' || uiState === 'CONNECTING') && (
        <div className="absolute inset-0 bg-[#0f172a] z-50 text-white flex flex-col overflow-hidden">

          {/* Navbar — parte do fluxo normal, altura fixa compacta */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/20">
            <div>
              {onBack && uiState === 'LOBBY' ? (
                <button onClick={onBack} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[11px] px-3 py-1.5 rounded-full border border-white/10 transition-all">
                  ← Trocar Modo
                </button>
              ) : <div className="w-2" />}
            </div>
            <h1 className="text-lg font-black tracking-tighter" style={{ background: 'linear-gradient(to right, #4ade80, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ocean.io
            </h1>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowSettings(!showSettings)} className="bg-white/5 hover:bg-white/15 border border-white/10 p-1.5 rounded-full transition-all active:scale-90">
                <span className="text-sm">⚙️</span>
              </button>
              <div className="bg-black/40 border border-yellow-500/40 px-2 py-1 rounded-full text-yellow-400 font-bold text-[10px] flex items-center gap-1">🌐 Online</div>
            </div>
          </div>

          {/* Settings Modal */}
          {showSettings && (
            <div className="absolute inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
              <div className="bg-[#1e293b] border-2 border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black uppercase tracking-widest text-white/90 italic">Configurações</h2>
                  <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-3xl font-light">×</button>
                </div>
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                  <span className="font-bold text-white block mb-3 text-center uppercase text-xs tracking-widest">Qualidade Gráfica</span>
                  <div className="flex gap-2">
                    {['LOW', 'MEDIUM', 'HIGH'].map(lvl => (
                      <button key={lvl} onClick={() => handleQuality(lvl)} className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all border-2 ${quality === lvl ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}>
                        {lvl === 'LOW' ? 'BAIXO' : lvl === 'MEDIUM' ? 'MÉDIO' : 'ALTO'}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowSettings(false)} className="w-full mt-6 bg-white/10 hover:bg-white/20 py-3 rounded-2xl font-bold transition-all uppercase text-xs tracking-[0.3em]">Fechar</button>
              </div>
            </div>
          )}

          {/* Conteúdo — flex-1 sem overflow, tudo cabe aqui */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-hidden">

            {uiState === 'DIED' ? (
              /* ── Tela de Morte ── */
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 animate-pop-in w-full max-w-4xl px-2">
                <div className="text-center md:text-left">
                  <h2 className="font-black text-red-500 uppercase tracking-tighter italic mb-2" style={{fontSize:'clamp(1.4rem, 5vw, 3.5rem)'}}>Você foi Devorado</h2>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Comprimento Final</p>
                    <p className="font-black text-white tracking-tighter" style={{fontSize:'clamp(2rem,8vw,4rem)'}}>{Math.floor(score / 10)}</p>
                    <div className="pt-3 border-t border-white/10 mt-3">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Melhor Online</p>
                      <p className="text-xl font-black text-white">{multiHighScore}</p>
                    </div>
                  </div>
                </div>
                <button onClick={handleLeave} className="bg-purple-600 hover:bg-purple-500 text-white font-black rounded-full shadow-[0_5px_0_#4c1d95] active:translate-y-1 active:shadow-none transition-all w-full md:w-auto uppercase tracking-widest shrink-0"
                  style={{padding:'clamp(0.6rem,2vh,1rem) clamp(2rem,5vw,4rem)', fontSize:'clamp(1rem,3vw,1.4rem)'}}>
                  Voltar ao Lobby
                </button>
              </div>
            ) : (
              /* ── Tela de Lobby ── */
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 w-full max-w-4xl">

                {/* Branding — visível no desktop */}
                <div className="hidden md:flex flex-col items-center text-center shrink-0" style={{maxWidth:'280px'}}>
                  {/* Logo menor com glow */}
                  <div className="w-20 h-20 mb-3 relative">
                    <Logo className="w-full h-full drop-shadow-[0_0_25px_rgba(168,85,247,0.5)]" />
                  </div>
                  {/* Nome */}
                  <h1 className="font-black tracking-tighter leading-none mb-1" style={{ fontSize:'clamp(2.5rem,4vw,3.5rem)', background: 'linear-gradient(to right, #4ade80, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter:'drop-shadow(0 0 20px rgba(168,85,247,0.3))' }}>ocean.io</h1>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mb-3 italic">Sobreviva no Abismo</p>
                  {/* Stats decorativos */}
                  <div className="flex gap-3 mb-4">
                    <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-center">
                      <p className="text-purple-400 font-black text-sm">🌐</p>
                      <p className="text-white/40 text-[9px] uppercase tracking-widest font-bold mt-0.5">Online</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-center">
                      <p className="text-green-400 font-black text-sm">⚡</p>
                      <p className="text-white/40 text-[9px] uppercase tracking-widest font-bold mt-0.5">Turbo</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-center">
                      <p className="text-cyan-400 font-black text-sm">💀</p>
                      <p className="text-white/40 text-[9px] uppercase tracking-widest font-bold mt-0.5">Batalha</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest opacity-60">
                    {isMobile ? "Joystick + ⚡ Turbo" : "Mouse para guiar | Clique = Turbo"}
                  </p>
                </div>

                {/* Coluna de Controles — adaptável */}
                <div className="flex flex-col items-center w-full max-w-xs" style={{gap:'clamp(0.4rem,1.5vh,1rem)'}}>
                  {connectionError && (
                    <div className="bg-red-900/30 border border-red-500/40 px-3 py-1.5 rounded-xl text-red-400 text-xs text-center w-full">{connectionError}</div>
                  )}

                  {/* Skin Card */}
                  <div className="w-full bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    {/* Preview */}
                    <div className="flex items-center justify-center px-4 relative" style={{paddingTop:'clamp(0.6rem,2vh,1.5rem)', paddingBottom:'clamp(0.6rem,2vh,1.5rem)', background:`radial-gradient(ellipse at center, ${SKINS[selectedSkinIdx].color}15 0%, transparent 70%)`}}>
                      <div className="rounded-full flex items-center justify-center border-4 shadow-xl transition-all duration-300"
                        style={{
                          width:'clamp(3.5rem,12vw,6rem)', height:'clamp(3.5rem,12vw,6rem)',
                          background: SKINS[selectedSkinIdx].type.startsWith('dragon') ? 'radial-gradient(circle, #333 0%, #000 100%)' : (SKINS[selectedSkinIdx].type === 'chain' ? 'radial-gradient(circle, #4b5563 0%, #111827 100%)' : `radial-gradient(circle, ${SKINS[selectedSkinIdx].color} 0%, rgba(0,0,0,0.95) 100%)`),
                          borderColor: SKINS[selectedSkinIdx].color,
                          boxShadow: `0 0 24px ${SKINS[selectedSkinIdx].color}55`
                        }}>
                        {SKINS[selectedSkinIdx].type === 'cyclops' && <div className="w-7 h-7 bg-[#00b4d8] rounded-full flex items-center justify-center"><div className="w-3.5 h-3.5 bg-black rounded-full ml-1"/></div>}
                        {SKINS[selectedSkinIdx].type.startsWith('dragon') && <span style={{fontSize:'clamp(1.2rem,4vw,2rem)'}}>🐉</span>}
                        {SKINS[selectedSkinIdx].type.startsWith('skeleton') && <span style={{fontSize:'clamp(1.2rem,4vw,2rem)'}}>💀</span>}
                        {SKINS[selectedSkinIdx].type === 'lula' && <span style={{fontSize:'clamp(1.2rem,4vw,2rem)'}}>🦑</span>}
                        {SKINS[selectedSkinIdx].type === 'chain' && <span style={{fontSize:'clamp(1.2rem,4vw,2rem)'}}>⛓️</span>}
                        {SKINS[selectedSkinIdx].type === 'seahorse' && <span style={{fontSize:'clamp(1.2rem,4vw,2rem)'}}>🦄</span>}
                      </div>
                    </div>
                    {/* Setas + nome */}
                    <div className="flex items-center justify-between px-3 py-2 bg-black/30 border-t border-white/5">
                      <button onClick={() => setSelectedSkinIdx(i => (i === 0 ? SKINS.length - 1 : i - 1))}
                        className="w-8 h-8 rounded-full hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center text-white text-xl font-bold border border-white/10" style={{background:'rgba(255,255,255,0.05)'}}>‹</button>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${RARITY_STYLE[SKINS[selectedSkinIdx].rarity]}`}>{SKINS[selectedSkinIdx].rarity}</span>
                        <span className="font-black text-xs uppercase" style={{ color: SKINS[selectedSkinIdx].color }}>{SKINS[selectedSkinIdx].name}</span>
                      </div>
                      <button onClick={() => setSelectedSkinIdx(i => (i === SKINS.length - 1 ? 0 : i + 1))}
                        className="w-8 h-8 rounded-full hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center text-white text-xl font-bold border border-white/10" style={{background:'rgba(255,255,255,0.05)'}}>›</button>
                    </div>
                  </div>

                  {/* Nickname */}
                  <input type="text" maxLength={16} value={playerName} onChange={e => setPlayerName(e.target.value)}
                    placeholder="Seu Nickname" onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    className="bg-white/5 text-white placeholder-gray-600 px-4 rounded-xl text-sm w-full text-center border-2 border-white/10 focus:border-purple-500/50 outline-none transition-all"
                    style={{paddingTop:'clamp(0.5rem,1.5vh,0.75rem)', paddingBottom:'clamp(0.5rem,1.5vh,0.75rem)'}} />

                  {/* Botão Entrar */}
                  <button onClick={handleJoin} disabled={uiState === 'CONNECTING'}
                    className="bg-[#4ade80] hover:bg-[#22c55e] disabled:bg-gray-600 text-black font-black rounded-full shadow-[0_4px_0_#166534] active:translate-y-0.5 active:shadow-none transition-all uppercase tracking-tighter disabled:opacity-50 w-full"
                    style={{padding:'clamp(0.6rem,1.8vh,0.9rem) 1.5rem', fontSize:'clamp(0.9rem,2.5vw,1.2rem)'}}>
                    {uiState === 'CONNECTING' ? 'Conectando...' : 'Entrar na Arena'}
                  </button>

                  {/* Rodapé */}
                  <div className="flex items-center justify-between w-full">
                    {multiHighScore > 0 ? (
                      <div className="opacity-50">
                        <p className="text-[8px] uppercase font-bold text-gray-500 tracking-widest">Recorde</p>
                        <p className="text-sm font-black text-white">{multiHighScore}</p>
                      </div>
                    ) : <div />}
                    <button onClick={() => { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }}
                      className="bg-blue-600/40 hover:bg-blue-500/60 text-white/60 font-bold py-1 px-2.5 rounded-full text-[9px] uppercase tracking-widest border border-white/10 transition-all">
                      🔲 Tela Cheia
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes pop-in { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }
        .animate-pop-in { animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-pulse-subtle { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}} />
    </div>
  );
}
