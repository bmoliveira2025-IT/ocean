// MultiplayerApp.jsx – Modo Multiplayer Online
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Logo from './components/Logo';
import { socket } from './socket';
import { qualityManager } from './utils/QualityManager';
import { SKINS, RARITY_STYLE } from './skins';

const WORLD_SIZE = 6000;
const lerp = (a, b, t) => a + (b - a) * t;

// ==========================================
// RENDERER
// ==========================================
function drawSnake(ctx, snake, settings) {
  if (!snake || !snake.body || snake.body.length === 0) return;
  const { color, x, y, angle, size, isBoosting, shieldTimer } = snake;
  if (shieldTimer > 0) {
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 180, 216, 0.15)';
    ctx.fill();
    if (settings.glow) { ctx.strokeStyle = '#00b4d8'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  snake.body.forEach(([bx, by], i) => {
    const p = 1 - (i / snake.body.length);
    const s = size * (0.4 + 0.6 * p);
    ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, s);
    if (isBoosting) { grad.addColorStop(0, '#f4d03f'); grad.addColorStop(1, '#d35400'); }
    else { grad.addColorStop(0, color); grad.addColorStop(0.8, color); grad.addColorStop(1, 'rgba(0,0,0,0.4)'); }
    ctx.fillStyle = grad; ctx.fill();
  });
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2);
  const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  hg.addColorStop(0, color); hg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = hg; ctx.fill();
  ctx.fillStyle = '#00b4d8'; ctx.beginPath(); ctx.arc(size * 0.3, 0, size * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(size * 0.3 + 2, 0, size * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (size > 12) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `${Math.max(10, size * 0.8)}px Arial`;
    ctx.textAlign = 'center'; ctx.fillText(snake.name, x, y - size - 8);
  }
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
  const cameraRef = useRef({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 1 });
  const worldRef = useRef({ snakes: [], orbs: [] });
  const inputRef = useRef({ angle: 0, isBoosting: false });
  const myIdRef = useRef(null);
  const settingsRef = useRef(qualityManager.getSettings());
  const isMobileRef = useRef(false);
  const predictedMeRef = useRef(null);   // client-side prediction state
  const lastRenderRef = useRef(0);        // for per-frame dt

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

    socket.on('state', ({ snakes, events }) => {
      worldRef.current.snakes = snakes;

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

      const me = snakes.find(s => s.id === myIdRef.current);
      if (me) {
        // Reconcile client prediction with authoritative server position
        if (predictedMeRef.current) {
          const p = predictedMeRef.current;
          const dx = me.x - p.x, dy = me.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 250) {
            p.x = me.x; p.y = me.y; p.angle = me.angle;
          } else if (dist > 3) {
            p.x += dx * 0.15; p.y += dy * 0.15;
          }
          p.body = me.body; p.size = me.size; p.color = me.color;
          p.score = me.score;
        } else {
          predictedMeRef.current = { ...me, body: [...(me.body || [])] };
        }
        setScore(Math.floor(me.score));
        setActivePowerups({ shield: me.shieldTimer || 0, speed: me.speedTimer || 0 });
        // FIX 2: Leaderboard - update top 10
        const sorted = [...snakes].sort((a, b) => b.score - a.score);
        setRank(sorted.findIndex(s => s.id === myIdRef.current) + 1);
        setLeaderboard(sorted.slice(0, 10).map((s, i) => ({
          rank: i + 1, name: s.name, score: Math.floor(s.score),
          color: s.color, isMe: s.id === myIdRef.current
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
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const settings = settingsRef.current;
      const { snakes, orbs } = worldRef.current;

      // --- Client-side prediction: advance local snake by frame dt ---
      const now = performance.now();
      const dt = Math.min((now - (lastRenderRef.current || now)) / 1000, 0.05);
      lastRenderRef.current = now;
      const pred = predictedMeRef.current;
      if (pred) {
        const input = inputRef.current;
        let diff = input.angle - pred.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        pred.angle += diff * Math.min(dt * 4.0, 1); // match server TURN_SPEED
        const speed = 140 * (input.isBoosting ? 1.8 : 1); // match server speeds
        pred.x += Math.cos(pred.angle) * speed * dt;
        pred.y += Math.sin(pred.angle) * speed * dt;
        pred.x = Math.max(0, Math.min(pred.x, WORLD_SIZE));
        pred.y = Math.max(0, Math.min(pred.y, WORLD_SIZE));
        pred.isBoosting = input.isBoosting;
      }

      // Use predicted position for local player; server state for others
      const me = pred || snakes.find(s => s.id === myIdRef.current);
      const renderSnakes = pred
        ? snakes.map(s => s.id === myIdRef.current ? pred : s)
        : snakes;

      if (me) {
        cameraRef.current.x = lerp(cameraRef.current.x, me.x, 0.1);
        cameraRef.current.y = lerp(cameraRef.current.y, me.y, 0.1);
        cameraRef.current.zoom = lerp(cameraRef.current.zoom, Math.max(0.3, 1.1 * Math.pow(500 / Math.max(500, me.score || 500), 0.35)), 0.05);
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
      ctx.strokeStyle = 'rgba(255,60,60,0.3)'; ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

      orbs.forEach(orb => {
        if (Math.abs(orb.x - camX) < viewW / 2 + 50 && Math.abs(orb.y - camY) < viewH / 2 + 50) drawOrb(ctx, orb);
      });
      const mobile = isMobileRef.current;
      const margin = 200;
      [...renderSnakes]
        .filter(s => Math.abs(s.x - camX) < viewW / 2 + margin && Math.abs(s.y - camY) < viewH / 2 + margin)
        .sort((a, b) => a.size - b.size)
        .forEach(snake => {
          if (!snake || !snake.body || snake.body.length === 0) return;
          const { color, x, y, angle, size, isBoosting, shieldTimer } = snake;
          // Body — skip every other segment on mobile
          const step = mobile ? 2 : 1;
          for (let i = 0; i < snake.body.length; i += step) {
            const [bx, by] = snake.body[i];
            const p = 1 - (i / snake.body.length);
            const s = size * (0.4 + 0.6 * p);
            ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI * 2);
            if (mobile) {
              ctx.fillStyle = isBoosting ? '#f4d03f' : color;
            } else {
              const grad = ctx.createRadialGradient(bx, by, 0, bx, by, s);
              if (isBoosting) { grad.addColorStop(0, '#f4d03f'); grad.addColorStop(1, '#d35400'); }
              else { grad.addColorStop(0, color); grad.addColorStop(0.8, color); grad.addColorStop(1, 'rgba(0,0,0,0.4)'); }
              ctx.fillStyle = grad;
            }
            ctx.fill();
          }
          // Head
          ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
          ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.fill();
          if (!mobile) {
            ctx.fillStyle = '#00b4d8'; ctx.beginPath(); ctx.arc(size * 0.3, 0, size * 0.45, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(size * 0.3 + 2, 0, size * 0.22, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
          // Shield ring
          if (shieldTimer > 0 && !mobile) {
            ctx.beginPath(); ctx.arc(x, y, size * 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#00b4d8'; ctx.lineWidth = 2; ctx.stroke();
          }
          // Name tag — skip for distant snakes when mobile
          const screenDist = Math.hypot(x - camX, y - camY);
          if (size > 12 && (!mobile || screenDist < 600)) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = `${Math.max(10, size * 0.8)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(snake.name, x, y - size - 8);
          }
        });
      ctx.restore();

      if (me) {
        const mmR = 55; const mmX = canvas.width - mmR - 15; const mmY = canvas.height - mmR - 15;
        ctx.fillStyle = 'rgba(10,15,25,0.5)';
        ctx.beginPath(); ctx.arc(mmX, mmY, mmR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
        snakes.forEach(s => {
          const px = mmX + (s.x / WORLD_SIZE - 0.5) * (mmR * 1.8);
          const py = mmY + (s.y / WORLD_SIZE - 0.5) * (mmR * 1.8);
          ctx.fillStyle = s.id === myIdRef.current ? 'white' : s.color + '88';
          ctx.beginPath(); ctx.arc(px, py, s.id === myIdRef.current ? 3 : 2, 0, Math.PI * 2); ctx.fill();
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
  };

  const handleJoin = () => {
    if (uiState === 'CONNECTING') return;
    const name = playerName.trim() || `Jogador${Math.floor(Math.random() * 999)}`;
    const skinColor = SKINS[selectedSkinIdx].color;
    setConnectionError(null); setKillCount(0); setKillFeed([]); setLeaderboard([]);
    setPowerupBanner(null);
    setUiState('CONNECTING');
    socket.connect();
    socket.once('connect', () => { socket.emit('join', { name, skinColor }); });
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
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 select-none touch-none font-sans">
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair touch-none"
        onMouseMove={handleMouseMove} onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} />

      {uiState === 'PLAYING' && (
        <>
          {/* Score HUD */}
          <div className="absolute top-4 left-4 bg-black/30 p-3 rounded-xl backdrop-blur-sm border border-white/10 text-white/80 text-sm pointer-events-none z-10">
            <p>Comprimento: <b className="text-white text-base">{Math.floor(score / 10)}</b></p>
            <p className="text-xs text-white/60 mt-1">Posição: <span className="text-yellow-400 font-bold">#{rank}</span></p>
            {killCount > 0 && <p className="text-red-400 text-xs mt-1">💀 Abates: {killCount}</p>}
            {ping !== null && (
              <p className={`text-xs mt-1 font-mono font-bold ${ping < 80 ? 'text-green-400' : ping < 180 ? 'text-yellow-400' : 'text-red-400'}`}>
                Ping: {ping}ms
              </p>
            )}
            <div className="flex flex-col gap-1 mt-1">
              {activePowerups.shield > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-cyan-300">
                  <span>🛡️</span>
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100,(activePowerups.shield/8)*100)}%` }} />
                  </div>
                </div>
              )}
              {activePowerups.speed > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-yellow-300">
                  <span>⚡</span>
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.min(100,(activePowerups.speed/6)*100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard top 10 */}
          <div className="absolute top-4 right-16 text-white text-sm pointer-events-none text-right z-10 bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-white/10 hidden sm:block">
            <h3 className="font-bold text-gray-300 text-base mb-1 tracking-wide">Líderes</h3>
            <div className="flex flex-col gap-[2px]">
              {leaderboard.map(p => (
                <div key={p.rank} className={`flex justify-end items-center gap-2 ${p.isMe ? 'font-bold bg-white/10 px-2 rounded' : ''}`}>
                  <span className="text-gray-400 w-4 text-xs">#{p.rank}</span>
                  <span className="w-24 truncate text-left text-xs" style={{ color: p.color }}>{p.name}</span>
                  <span className="text-white/70 text-xs w-12 text-right">{p.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kill feed */}
          {killFeed.length > 0 && (
            <div className="absolute bottom-4 left-4 flex flex-col-reverse gap-1 pointer-events-none z-20">
              {killFeed.map(k => (
                <div key={k.id} className="flex items-center gap-2 bg-black/50 border border-white/10 px-3 py-1.5 rounded-full text-xs text-white">
                  Você eliminou <span style={{ color: k.color }} className="font-bold">{k.victim}</span> 💀
                </div>
              ))}
            </div>
          )}

          {/* Power-up banner */}
          {powerupBanner && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-30">
              <div className="px-6 py-2 rounded-full text-base font-black" style={{ background: `${powerupBanner.color}22`, border: `2px solid ${powerupBanner.color}`, color: powerupBanner.color, textShadow: `0 0 10px ${powerupBanner.color}`, animation: 'fadeInUp 0.3s ease' }}>
                {powerupBanner.text}
              </div>
            </div>
          )}

          {/* Mobile joystick */}
          {isMobile && (
            <>
              <div className="absolute bottom-8 left-8 w-32 h-32 bg-white/10 rounded-full border-2 border-white/20 backdrop-blur-md z-50 pointer-events-auto touch-none"
                onTouchStart={handleJoystickStart} onTouchMove={handleJoystickMove} onTouchEnd={handleJoystickEnd}>
                <div id="mp-joystick-knob" className="absolute top-1/2 left-1/2 w-14 h-14 bg-white/50 rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-white/80" />
              </div>
              <div className="absolute bottom-4 right-4 w-[100px] h-[100px] flex items-center justify-center z-50 pointer-events-auto touch-none"
                onTouchStart={(e) => { e.stopPropagation(); inputRef.current.isBoosting = true; }}
                onTouchEnd={(e) => { e.stopPropagation(); inputRef.current.isBoosting = false; }}>
                <div className="w-[70px] h-[70px] bg-yellow-500/30 rounded-full border-2 border-yellow-400 backdrop-blur-md flex items-center justify-center pointer-events-none">
                  <span className="text-3xl">⚡</span>
                </div>
              </div>
            </>
          )}

          <button onClick={handleLeave} className="absolute sm:bottom-4 sm:top-auto top-4 right-4 bg-transparent text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-full border border-white/20 hover:border-white/40 transition-all z-50">
            Sair
          </button>
        </>
      )}

      {/* Lobby / Death screen */}
      {(uiState === 'LOBBY' || uiState === 'DIED' || uiState === 'CONNECTING') && (
        <div className="absolute inset-0 bg-[#0f172a]/95 flex flex-col items-center justify-center z-50 text-white backdrop-blur-md p-4">
          <Logo className="w-16 h-16 mb-2 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
          <h1 className="text-4xl font-black tracking-tighter mb-1" style={{ background: 'linear-gradient(to right, #4ade80, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ocean.io
          </h1>
          <p className="text-purple-400 font-bold text-sm mb-4 uppercase tracking-widest">Multiplayer Online 🌐</p>

          {uiState === 'DIED' && (
            <div className="mb-4 bg-red-900/30 border border-red-500/40 px-6 py-3 rounded-2xl text-center">
              <p className="text-red-400 font-black text-xl">Você foi devorado!</p>
              <p className="text-white/60 text-sm">Score: {score}</p>
            </div>
          )}
          {connectionError && (
            <div className="mb-4 bg-red-900/30 border border-red-500/40 px-4 py-2 rounded-xl text-red-400 text-sm text-center max-w-xs">{connectionError}</div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-sm">

            {/* Skin selector */}
            <div className="flex items-center justify-between gap-3 bg-black/20 rounded-2xl p-3 border border-white/10">
              <button onClick={() => setSelectedSkinIdx(i => (i === 0 ? SKINS.length - 1 : i - 1))} className="text-2xl text-gray-400 hover:text-white transition-all px-1">&lt;</button>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-14 h-14 rounded-full border-4 shadow-lg" style={{ backgroundColor: SKINS[selectedSkinIdx].color, borderColor: SKINS[selectedSkinIdx].color, boxShadow: `0 0 20px ${SKINS[selectedSkinIdx].color}44` }} />
                <span className="font-black text-xs tracking-widest uppercase" style={{ color: SKINS[selectedSkinIdx].color }}>{SKINS[selectedSkinIdx].name}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${RARITY_STYLE[SKINS[selectedSkinIdx].rarity]}`}>{SKINS[selectedSkinIdx].rarity}</span>
              </div>
              <button onClick={() => setSelectedSkinIdx(i => (i === SKINS.length - 1 ? 0 : i + 1))} className="text-2xl text-gray-400 hover:text-white transition-all px-1">&gt;</button>
            </div>

            <input type="text" maxLength={16} value={playerName} onChange={e => setPlayerName(e.target.value)}
              placeholder="Seu Nickname" onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className="bg-white/5 text-white placeholder-gray-600 px-6 py-4 rounded-2xl text-lg w-full text-center border-2 border-white/10 focus:border-purple-500/50 outline-none transition-all" />

            {/* Quality selector */}
            <div className="flex gap-2 justify-center">
              {['Baixo', 'Médio', 'Alto'].map(q => (
                <button key={q} onClick={() => handleQuality(q)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${quality === q ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'}`}>
                  {q}
                </button>
              ))}
            </div>

            <button onClick={handleJoin} disabled={uiState === 'CONNECTING'}
              className="bg-[#4ade80] hover:bg-[#22c55e] disabled:bg-gray-600 text-black font-black py-3.5 rounded-full text-xl shadow-[0_4px_0_#166534] active:translate-y-[4px] active:shadow-none transition-all uppercase tracking-tighter">
              {uiState === 'CONNECTING' ? 'Conectando...' : '🌊 Entrar Online'}
            </button>
            <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-all">
              ← Voltar ao Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
