import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import MultiplayerApp from './MultiplayerApp.jsx';
import './index.css';

function Root() {
  const [mode, setMode] = useState('MENU'); // 'MENU' | 'SOLO' | 'MULTI'

  if (mode === 'SOLO') return <App onBack={() => setMode('MENU')} />;
  if (mode === 'MULTI') return <MultiplayerApp onBack={() => setMode('MENU')} />;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white p-6 gap-6 select-none">
      <h1 className="text-6xl font-black tracking-tighter" style={{ background: 'linear-gradient(to right, #4ade80, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        ocean.io
      </h1>
      <p className="text-gray-400 text-base">Escolha o modo de jogo</p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <button
          onClick={() => setMode('SOLO')}
          className="flex-1 bg-[#1e293b] hover:bg-[#334155] border-2 border-white/10 hover:border-white/20 py-6 rounded-3xl text-center transition-all group"
        >
          <div className="text-4xl mb-2">🤖</div>
          <div className="font-black text-lg">Solo</div>
          <div className="text-gray-400 text-xs mt-1">Jogue contra bots</div>
        </button>
        <button
          onClick={() => setMode('MULTI')}
          className="flex-1 bg-[#1e293b] hover:bg-[#334155] border-2 border-purple-500/30 hover:border-purple-500/60 py-6 rounded-3xl text-center transition-all group"
        >
          <div className="text-4xl mb-2">🌐</div>
          <div className="font-black text-lg text-purple-400">Online</div>
          <div className="text-gray-400 text-xs mt-1">Multiplayer real</div>
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
