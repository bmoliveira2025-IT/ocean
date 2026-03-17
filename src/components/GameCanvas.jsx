import { useEffect, useRef } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { AudioEngine } from '../engine/AudioEngine';

const GameCanvas = ({ nickname, theme, onGameStateChange }) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
    }

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas, audioRef.current);
    engineRef.current = engine;

    // Handle mouse movement
    const onMouseMove = (e) => {
      if (!engineRef.current) return;
      const { clientX, clientY } = e;
      const dx = clientX - window.innerWidth / 2;
      const dy = clientY - window.innerHeight / 2;
      engineRef.current.mouse.angle = Math.atan2(dy, dx);
    };

    const onMouseDown = () => { if (engineRef.current) engineRef.current.mouse.boosting = true; };
    const onMouseUp = () => { if (engineRef.current) engineRef.current.mouse.boosting = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    engine.start(nickname, theme, onGameStateChange);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      if (engineRef.current) engineRef.current.running = false;
    };
  }, [nickname, theme]);

  return <canvas id="gameCanvas" ref={canvasRef} />;
};

export default GameCanvas;
