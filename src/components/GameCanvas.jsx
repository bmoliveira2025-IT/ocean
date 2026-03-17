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

    let lastTapTime = 0;

    // Handle touch movement
    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches && e.touches[0]) {
        updateAngle(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onMouseDown = () => { if (engineRef.current) engineRef.current.mouse.boosting = true; };
    const onMouseUp = () => { if (engineRef.current) engineRef.current.mouse.boosting = false; };
    
    const onTouchStart = (e) => {
      const currentTime = Date.now();
      const tapInterval = currentTime - lastTapTime;
      
      if (tapInterval < 300) {
        // Double tap detected - start boosting
        if (engineRef.current) engineRef.current.mouse.boosting = true;
      }
      
      lastTapTime = currentTime;

      if (e.touches && e.touches[0]) {
        updateAngle(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    const onTouchEnd = () => {
      if (engineRef.current) {
        engineRef.current.mouse.boosting = false;
      }
    };

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
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);

    engine.start(nickname, theme, onGameStateChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      if (engineRef.current) engineRef.current.running = false;
    };
  }, [nickname, theme]);

  return <canvas id="gameCanvas" ref={canvasRef} />;
};

export default GameCanvas;
