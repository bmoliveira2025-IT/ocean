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
      const { clientX, clientY } = e;
      updateAngle(clientX, clientY);
    };

    const updateAngle = (x, y) => {
      if (!engineRef.current) return;
      const dx = x - window.innerWidth / 2;
      const dy = y - window.innerHeight / 2;
      engineRef.current.mouse.angle = Math.atan2(dy, dx);
    };

    // Mouse only for PC
    const onMouseDown = () => { if (engineRef.current) engineRef.current.mouse.boosting = true; };
    const onMouseUp = () => { if (engineRef.current) engineRef.current.mouse.boosting = false; };
    
    // Joystick and Boost will be handled via the component, 
    // but the engine needs to be updated. 
    // We can expose the engine to the window for simple cross-component access 
    // or use a more React-way. For now, let's keep it simple.
    window.gameEngine = engine;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      // Delay slightly to ensure innerWidth/Height are updated
      setTimeout(handleResize, 100);
    });

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    engine.start(nickname, theme, onGameStateChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      if (engineRef.current) engineRef.current.running = false;
      window.gameEngine = null;
    };
  }, [nickname, theme]);

  return <canvas id="gameCanvas" ref={canvasRef} />;
};

export default GameCanvas;
