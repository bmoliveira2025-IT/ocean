import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import { LoadingScreen, StartScreen, DeathScreen, SkinModal } from './components/Screens';
import './styles/global.css';

function App() {
  const [gameState, setGameState] = useState('loading'); // loading, menu, playing, dead
  const [loadProgress, setLoadProgress] = useState(0);
  const [playerData, setPlayerData] = useState({ nickname: '', theme: null });
  const [gameStats, setGameStats] = useState({ size: 10, kills: 0, bestSize: 0 });
  const [ranking, setRanking] = useState([]);
  const [isSkinModalOpen, setIsSkinModalOpen] = useState(false);

  useEffect(() => {
    if (gameState === 'loading') {
      const interval = setInterval(() => {
        setLoadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setGameState('menu'), 500);
            return 100;
          }
          return prev + 5;
        });
      }, 50);
    }
  }, [gameState]);

  const handleStart = (nickname) => {
    setPlayerData({ ...playerData, nickname });
    setGameState('playing');
    
    // Request fullscreen for true mobile "tela cheia" experience
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fallback or ignore if blocked (e.g. some browsers or previous rejection)
      });
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  };

  return (
    <div className="App">
      {gameState === 'loading' && <LoadingScreen progress={loadProgress} />}
      
      {gameState === 'menu' && (
        <>
          <StartScreen 
            onStart={handleStart} 
            bestSize={gameStats.bestSize} 
          />
          <button id="openSkinBtn" onClick={() => setIsSkinModalOpen(true)}>✨ Escolher Skin</button>
          
          <SkinModal 
            isOpen={isSkinModalOpen} 
            onClose={() => setIsSkinModalOpen(false)}
            onSelectSkin={(theme) => {
              setPlayerData({ ...playerData, theme });
              setIsSkinModalOpen(false);
            }}
          />
        </>
      )}

      {gameState === 'dead' && (
        <DeathScreen 
          stats={gameStats} 
          onRespawn={() => setGameState('menu')} 
        />
      )}

      {gameState === 'playing' && (
        <>
          <GameCanvas 
            nickname={playerData.nickname} 
            theme={playerData.theme}
            onGameStateChange={(data) => {
              if (data.dead) setGameState('dead');
              setGameStats(prev => ({ ...prev, ...data }));
              if (data.ranking) setRanking(data.ranking);
            }}
          />
          <HUD 
            stats={gameStats}
            powerups={{
              shield: { active: false, percent: 0 },
              speed: { active: false, percent: 0 },
              magnet: { active: false, percent: 0 }
            }}
            ranking={ranking}
            onlineCount={847}
            ping={42}
            fps={60}
            biome="Oceano Aberto"
          />
        </>
      )}
    </div>
  );
}

export default App;
