// MultiplayerApp.jsx – Modo Multiplayer Online
// Conecta ao servidor Socket.io e renderiza o estado do mundo recebido
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Logo from './components/Logo';
import { socket } from './socket';
import { qualityManager } from './utils/QualityManager';

const WORLD_SIZE = 6000;

const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => {
  let diff = b - a;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
};

// ==========================================
// RENDERER – Draws server-provided state
// ==========================================
function drawSnake(ctx, snake, settings) {
  if (!snake || !snake.body || snake.body.length === 0) return;

  const { color, x, y, angle, size, isBoosting, shieldTimer } = snake;

  // Shield ring
  if (shieldTimer > 0) {
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 180, 216, 0.15)';
    ctx.fill();
    if (settings.glow) {
      ctx.strokeStyle = '#00b4d8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Body
  snake.body.forEach(([bx, by], i) => {
    const p = 1 - (i / snake.body.length);
    const s = size * (0.4 + 0.6 * p);
    ctx.beginPath();
    ctx.arc(bx, by, s, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, s);
    if (isBoosting) {
      grad.addColorStop(0, '#f4d03f');
      grad.addColorStop(1, '#d35400');
    } else {
      grad.addColorStop(0, color);
      grad.addColorStop(0.8, color);
      grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    }
    ctx.fillStyle = grad;
    ctx.fill();
  });

  // Head
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  const headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  headGrad.addColorStop(0, color);
  headGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = headGrad;
  ctx.fill();
  // Eye
  ctx.fillStyle = '#00b4d8';
  ctx.beginPath();
  ctx.arc(size * 0.3, 0, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(size * 0.3 + 2, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Name tag
  if (size > 12) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${Math.max(10, size * 0.8)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(snake.name, x, y - size - 8);
  }
}

function drawOrb(ctx, orb) {
  if (!orb) return;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
  ctx.fillStyle = orb.color;
  ctx.fill();
  if (orb.isPowerup) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = orb.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icons = ['S', '⚡', '🧲', '🪙'];
    ctx.fillText(icons[orb.type ?? 0], orb.x, orb.y);
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
  const settings = qualityManager.getSettings();

  const [uiState, setUiState] = useState('LOBBY'); // LOBBY | CONNECTING | PLAYING | DIED
  const [playerName, setPlayerName] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [score, setScore] = useState(0);
  const [rank, setRank] = useState('-');
  const [killFeed, setKillFeed] = useState([]);
  const [killCount, setKillCount] = useState(0);
  const [connectionError, setConnectionError] = useState(null);
  const joystick = useRef({ active: false, baseX: 0, baseY: 0 });

  // Mobile detection
  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 800px)').matches || navigator.maxTouchPoints > 0);
  }, []);

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth * settings.renderScale;
        canvasRef.current.height = window.innerHeight * settings.renderScale;
        canvasRef.current.style.width = '100vw';
        canvasRef.current.style.height = '100vh';
      }
    };
    window.addEventListener('resize', resize);
    resize();
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
      const me = snakes.find(s => s.id === myIdRef.current);
      if (me) {
        setScore(Math.floor(me.score));
        const sorted = [...snakes].sort((a, b) => b.score - a.score);
        setRank(sorted.findIndex(s => s.id === myIdRef.current) + 1);
      } else if (myIdRef.current) {
        // Player died
        setUiState('DIED');
      }
      // Process events
      if (events) {
        events.forEach(ev => {
          if (ev.type === 'death' && ev.killerId === myIdRef.current) {
            const kill = { id: Date.now(), victim: ev.name, color: '#ef4444' };
            setKillFeed(prev => [kill, ...prev].slice(0, 5));
            setKillCount(prev => prev + 1);
            setTimeout(() => setKillFeed(prev => prev.filter(k => k.id !== kill.id)), 4000);
          }
        });
      }
    });

    socket.on('orbSpawn', (newOrbs) => {
      worldRef.current.orbs = [...worldRef.current.orbs, ...newOrbs];
    });

    socket.on('orbCollected', (orbIds) => {
      const ids = new Set(Array.isArray(orbIds) ? orbIds : [orbIds]);
      worldRef.current.orbs = worldRef.current.orbs.filter(o => !ids.has(o.id));
    });

    socket.on('connect_error', (err) => {
      setConnectionError(`Não foi possível conectar ao servidor: ${err.message}`);
      setUiState('LOBBY');
    });

    return () => {
      socket.off('joined');
      socket.off('state');
      socket.off('orbSpawn');
      socket.off('orbCollected');
      socket.off('connect_error');
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Send input to server at 30fps
  useEffect(() => {
    if (uiState !== 'PLAYING') return;
    const interval = setInterval(() => {
      if (socket.connected) socket.emit('input', inputRef.current);
    }, 1000 / 30);
    return () => clearInterval(interval);
  }, [uiState]);

  const startRenderLoop = () => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { snakes, orbs } = worldRef.current;
      const me = snakes.find(s => s.id === myIdRef.current);

      // Smooth camera
      if (me) {
        cameraRef.current.x = lerp(cameraRef.current.x, me.x, 0.1);
        cameraRef.current.y = lerp(cameraRef.current.y, me.y, 0.1);
        cameraRef.current.zoom = lerp(cameraRef.current.zoom, Math.max(0.3, 1.1 * Math.pow(500 / Math.max(500, me.score), 0.35)), 0.05);
      }

      const { x: camX, y: camY, zoom } = cameraRef.current;

      // Background
      ctx.fillStyle = '#10141d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-camX, -camY);

      // Grid
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
          for (let i = 0; i < 6; i++) { const angle = Math.PI / 3 * i - Math.PI / 6; ctx.lineTo(hx + R * Math.cos(angle), hy + R * Math.sin(angle)); }
          ctx.closePath();
          ctx.fillStyle = '#0e121a'; ctx.fill(); ctx.stroke();
        }
      }
      ctx.strokeStyle = 'rgba(255,60,60,0.3)'; ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

      // Orbs
      orbs.forEach(orb => {
        if (Math.abs(orb.x - camX) < viewW / 2 + 50 && Math.abs(orb.y - camY) < viewH / 2 + 50) {
          drawOrb(ctx, orb);
        }
      });

      // Snakes (sorted by size)
      [...snakes].sort((a, b) => a.size - b.size).forEach(snake => drawSnake(ctx, snake, settings));

      ctx.restore();

      // Minimap
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
    setConnectionError(null);
    setKillCount(0);
    setKillFeed([]);
    setUiState('CONNECTING');
    socket.connect();
    socket.once('connect', () => {
      socket.emit('join', { name, skinColor: '#39ff14' });
    });
  };

  const handleLeave = () => {
    socket.disconnect();
    cancelAnimationFrame(animFrameRef.current);
    myIdRef.current = null;
    worldRef.current = { snakes: [], orbs: [] };
    setUiState('LOBBY');
  };

  // Mouse input
  const handleMouseMove = useCallback((e) => {
    if (uiState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    inputRef.current.angle = Math.atan2(cy - canvas.height / 2, cx - canvas.width / 2);
  }, [uiState]);

  const handleMouseDown = () => { inputRef.current.isBoosting = true; };
  const handleMouseUp = () => { inputRef.current.isBoosting = false; };

  const handleTouchMove = useCallback((e) => {
    if (uiState !== 'PLAYING' || joystick.current.active) return;
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
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
    const maxDist = 45;
    const dist = Math.min(Math.hypot(dx, dy), maxDist);
    const nx = (dx / Math.hypot(dx, dy) || 0) * dist;
    const ny = (dy / Math.hypot(dx, dy) || 0) * dist;
    if (knob) knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  };
  const handleJoystickEnd = (e) => {
    e.stopPropagation(); joystick.current.active = false;
    const knob = document.getElementById('mp-joystick-knob');
    if (knob) knob.style.transform = 'translate(-50%, -50%)';
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 select-none touch-none font-sans">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair touch-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />

      {/* ── HUD during gameplay ── */}
      {uiState === 'PLAYING' && (
        <>
          <div className="absolute top-4 left-4 bg-black/30 p-3 rounded-xl backdrop-blur-sm border border-white/10 text-white/80 text-sm pointer-events-none z-10">
            <p>Comprimento: <b className="text-white text-base">{Math.floor(score / 10)}</b></p>
            <p className="text-xs text-white/60 mt-1">Posição: <span className="text-yellow-400 font-bold">#{rank}</span></p>
            {killCount > 0 && <p className="text-red-400 text-xs mt-1">💀 Abates: {killCount}</p>}
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

      {/* ── Lobby / DIED UI ── */}
      {(uiState === 'LOBBY' || uiState === 'DIED' || uiState === 'CONNECTING') && (
        <div className="absolute inset-0 bg-[#0f172a]/95 flex flex-col items-center justify-center z-50 text-white backdrop-blur-md p-4">
          <Logo className="w-16 h-16 mb-2 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
          <h1 className="text-4xl font-black tracking-tighter mb-1" style={{ background: 'linear-gradient(to right, #4ade80, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ocean.io
          </h1>
          <p className="text-purple-400 font-bold text-sm mb-6 uppercase tracking-widest">Multiplayer Online 🌐</p>

          {uiState === 'DIED' && (
            <div className="mb-6 bg-red-900/30 border border-red-500/40 px-6 py-3 rounded-2xl text-center">
              <p className="text-red-400 font-black text-xl">Você foi devorado!</p>
              <p className="text-white/60 text-sm">Score: {score}</p>
            </div>
          )}

          {connectionError && (
            <div className="mb-4 bg-red-900/30 border border-red-500/40 px-4 py-2 rounded-xl text-red-400 text-sm text-center max-w-xs">
              {connectionError}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <input
              type="text" maxLength={16} value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Seu Nickname"
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className="bg-white/5 text-white placeholder-gray-600 px-6 py-4 rounded-2xl text-lg w-full text-center border-2 border-white/10 focus:border-purple-500/50 outline-none transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={uiState === 'CONNECTING'}
              className="bg-[#4ade80] hover:bg-[#22c55e] disabled:bg-gray-600 text-black font-black py-3.5 rounded-full text-xl shadow-[0_4px_0_#166534] active:translate-y-[4px] active:shadow-none transition-all uppercase tracking-tighter"
            >
              {uiState === 'CONNECTING' ? 'Conectando...' : '🌊 Entrar Online'}
            </button>
            <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-all">
              ← Voltar ao Modo Solo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
