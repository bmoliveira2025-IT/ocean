import { useState, useEffect } from 'react';
import { Game } from './components/Game';
import { StartScreen } from './components/StartScreen';
import { DeathScreen } from './components/DeathScreen';
import { supabase } from './lib/supabase';
import './App.css';

type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [playerName, setPlayerName] = useState('');
  const [themeIdx, setThemeIdx] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    fetchLeaderboard();
    
    // Real-time subscription
    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setLeaderboard(data);
    }
  }

  async function handleGameOver(score: number) {
    setFinalScore(score);
    setGameState('GAMEOVER');

    // Save score to Supabase
    if (playerName) {
      await supabase.from('leaderboard').insert({
        player_name: playerName,
        score: score,
        theme_id: themeIdx
      });
    }
  }

  function startGame(name: string, theme: number) {
    setPlayerName(name);
    setThemeIdx(theme);
    setGameState('PLAYING');
  }

  return (
    <div className="w-screen h-screen bg-[#020d1a]">
      {gameState === 'START' && (
        <StartScreen onStart={startGame} />
      )}

      {gameState === 'PLAYING' && (
        <Game 
          playerName={playerName} 
          themeIdx={themeIdx} 
          onGameOver={handleGameOver} 
        />
      )}

      {gameState === 'GAMEOVER' && (
        <DeathScreen 
          score={finalScore} 
          onRespawn={() => setGameState('START')} 
        />
      )}

      {/* Global Ranking Overlay (Always visible in background or as a side panel) */}
      {gameState !== 'PLAYING' && leaderboard.length > 0 && (
        <div className="fixed top-4 left-4 z-[110] bg-[#001428bf] border border-[#00b4d833] rounded-xl p-4 min-w-[200px] backdrop-blur-md pointer-events-none sm:pointer-events-auto">
          <div className="text-[10px] text-[#00b4d8] uppercase tracking-wider mb-2">🏆 Top Oceano</div>
          <div className="space-y-1">
            {leaderboard.map((entry, idx) => (
              <div key={entry.id} className="flex justify-between text-xs text-white/80">
                <span className="flex gap-2">
                  <span className="text-white/30 w-4">{idx + 1}</span>
                  <span className={idx < 3 ? 'text-[#f4d03f] font-bold' : ''}>{entry.player_name}</span>
                </span>
                <span className="font-mono">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
