import { useRef, useEffect } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { HUD } from './HUD';

interface GameProps {
  playerName: string;
  themeIdx: number;
  onGameOver: (score: number) => void;
}

export function Game({ playerName, themeIdx, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const engineRef = useGameLoop(canvasRef, playerName, themeIdx, onGameOver);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (engineRef.current) {
        engineRef.current.mouseX = e.clientX;
        engineRef.current.mouseY = e.clientY;
      }
    };

    const handleMouseDown = () => {
      if (engineRef.current) engineRef.current.isBoosting = true;
    };

    const handleMouseUp = () => {
      if (engineRef.current) engineRef.current.isBoosting = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [engineRef]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020d1a]">
      <canvas
        ref={canvasRef}
        id="gameCanvas"
        className="block cursor-none"
      />
      {engineRef.current && (
        <HUD 
          size={Math.floor(engineRef.current.player.size)}
          kills={engineRef.current.player.kills}
          player={engineRef.current.player}
          engine={engineRef.current}
        />
      )}
    </div>
  );
}
