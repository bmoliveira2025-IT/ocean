import { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';

export function useGameLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  playerName: string,
  themeIdx: number,
  onGameOver: (score: number) => void
) {
  const engineRef = useRef<GameEngine | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(
        canvasRef.current,
        themeIdx,
        playerName,
        onGameOver
      );

      const animate = (time: number) => {
        if (engineRef.current) {
          engineRef.current.update(time);
          engineRef.current.render();
          requestRef.current = requestAnimationFrame(animate);
        }
      };
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      engineRef.current = null;
    };
  }, [canvasRef, playerName, themeIdx]);

  return engineRef;
}
