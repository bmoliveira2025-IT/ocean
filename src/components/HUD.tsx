import { useEffect, useState, useRef } from 'react';
import { Snake } from '../game/entities/Snake';
import { GameEngine } from '../game/GameEngine';
import { WORLD_RADIUS } from '../game/utils';

interface HUDProps {
  size: number;
  kills: number;
  player: Snake;
  engine: GameEngine;
}

export function HUD({ size, kills, player, engine }: HUDProps) {
  const [fps, setFps] = useState(60);
  const lastTime = useRef(performance.now());
  const frames = useRef(0);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const updateFPS = () => {
      const now = performance.now();
      frames.current++;
      if (now > lastTime.current + 1000) {
        setFps(Math.round((frames.current * 1000) / (now - lastTime.current)));
        lastTime.current = now;
        frames.current = 0;
      }
      requestAnimationFrame(updateFPS);
    };
    const frameId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const drawMinimap = () => {
      const canvas = minimapRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
      ctx.beginPath();
      ctx.arc(60, 60, 60, 0, Math.PI * 2);
      ctx.fill();

      const scale = 60 / WORLD_RADIUS;

      // Draw bots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      engine.bots.forEach(bot => {
        ctx.beginPath();
        ctx.arc(60 + bot.x * scale, 60 + bot.y * scale, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw player
      ctx.fillStyle = '#00b4d8';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00b4d8';
      ctx.beginPath();
      ctx.arc(60 + player.x * scale, 60 + player.y * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const interval = setInterval(drawMinimap, 100);
    return () => clearInterval(interval);
  }, [engine, player]);

  const powerups = [
    { id: 'pu-shield', icon: '🛡️', name: 'Escudo', active: player.shield, time: player.shieldTime, duration: player.shieldDuration },
    { id: 'pu-speed', icon: '⚡', name: 'Turbo', active: player.speedBoost, time: player.speedTime, duration: player.speedDuration },
    { id: 'pu-magnet', icon: '🧲', name: 'Imã', active: player.magnet, time: player.magnetTime, duration: player.magnetDuration },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-10 font-sans text-white">
      {/* Score Panel */}
      <div className="absolute top-4 left-4 bg-[#001428bf] border border-[#00b4d84d] rounded-xl p-3 min-w-[160px] backdrop-blur-md">
        <div className="text-[10px] text-[#00b4d8] uppercase tracking-wider">Tamanho</div>
        <div className="text-2xl font-bold leading-tight">{size}</div>
        <div className="text-xs text-white/50">{kills} peixes devorados</div>
      </div>

      {/* Ping Panel */}
      <div className="absolute top-4 right-4 bg-[#001428bf] border border-[#00b4d833] rounded-xl px-3 py-2 text-right backdrop-blur-md">
        <div className="text-xs text-[#52b788]">● ONLINE • 847 jogadores</div>
        <div className="text-[10px] text-white/40 mt-0.5">Ping: 42ms</div>
      </div>

      {/* Power-ups */}
      <div className="absolute bottom-[130px] left-1/2 -translate-x-1/2 flex gap-2.5">
        {powerups.map(pu => (
          <div 
            key={pu.id}
            className={`transition-colors duration-200 bg-[#001428d9] border rounded-xl p-2 min-w-[64px] text-center relative overflow-hidden ${pu.active ? 'border-[#00b4d899] bg-[#002850e6]' : 'border-white/15'}`}
          >
            <div className="text-xl">{pu.icon}</div>
            <div className="text-[9px] text-white/50 uppercase tracking-[0.5px] mt-0.5">{pu.name}</div>
            <div className="text-sm font-bold">{pu.active ? Math.ceil(pu.time / 1000) + 's' : '—'}</div>
            {pu.active && (
              <div 
                className="absolute bottom-0 left-0 h-[3px] bg-[#00b4d8] transition-all duration-100 linear"
                style={{ width: `${(pu.time / pu.duration) * 100}%` }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Minimap */}
      <div className="absolute bottom-4 right-4 w-[120px] h-[120px] bg-[#001428cc] border border-[#00b4d84d] rounded-full overflow-hidden">
        <canvas ref={minimapRef} width={120} height={120} className="w-full h-full" />
      </div>

      {/* Mute and FPS */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 pointer-events-auto">
        <button 
          onClick={() => engine.audio.muted = !engine.audio.muted}
          className="bg-[#001428bf] border border-[#00b4d84d] rounded-full w-11 h-11 flex items-center justify-center text-xl hover:bg-[#002850e6] transition-colors"
        >
          🔊
        </button>
        <div className="text-[10px] text-white/25">{fps} FPS</div>
      </div>
    </div>
  );
}
