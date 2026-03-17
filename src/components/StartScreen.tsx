import { useState } from 'react';
import { THEMES } from '../game/utils';

interface StartScreenProps {
  onStart: (name: string, themeIdx: number) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [name, setName] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(0);

  // Since this is a file write, I'll use standard React state in the actual component
  return (
    <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_60%,#021824_0%,#010d18_100%)] flex flex-col items-center justify-center z-[100] overflow-y-auto p-5">
      <h1 className="text-[52px] font-black text-[#00b4d8] [text-shadow:0_0_60px_rgba(0,180,216,0.5)] tracking-tighter mb-0.5">AquaSlither</h1>
      <div className="text-xs text-white/35 mb-7 tracking-[3px] uppercase">Escolha seu peixe e mergulhe</div>

      <div className="mb-6 w-full max-w-[400px]">
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome no oceano..."
          id="playerNameInput"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center outline-none focus:border-[#00b4d8] transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-[780px] mb-6">
        {THEMES.map((theme, idx) => (
          <ThemeCard 
            key={idx} 
            idx={idx} 
            theme={theme} 
            selected={selectedTheme === idx}
            onSelect={() => setSelectedTheme(idx)}
          />
        ))}
      </div>

      <button 
        onClick={() => {
          onStart(name || 'Player', selectedTheme);
        }}
        className="bg-linear-to-br from-[#00b4d8] to-[#0077b6] rounded-2xl px-12 py-4 text-white text-lg font-bold cursor-pointer transition-all hover:scale-105 shadow-[0_4px_32px_rgba(0,180,216,0.5)] hover:shadow-[0_8px_48px_rgba(0,180,216,0.7)]"
      >
        🌊 Mergulhar
      </button>

      <div className="text-[11px] text-white/25 mt-3.5 text-center leading-loose">
        Mouse para nadar • Clique para turbo • Colete orbes para crescer
      </div>
    </div>
  );
}

function ThemeCard({ idx, theme, selected, onSelect }: any) {
  const names = ['Oceano', 'Dragão de Fogo', 'Vírus Tóxico', 'Serpente Galáctica', 'Dragão Dourado', 'Fantasma Neon', 'Cobra Coral', 'Serpente Glacial'];
  const descs = ['Clássico turquesa', 'Escamas flamejantes', 'Verde radioativo', 'Corpo nebular', 'Escamas de ouro', 'Invisível mas devastador', 'Listras alaranjadas', 'Cristais de gelo'];
  
  return (
    <div 
      onClick={onSelect}
      className={`relative flex flex-col items-center gap-2 p-3.5 pb-3 rounded-2xl cursor-pointer transition-all border-1.5 ${selected ? 'border-[#00b4d8] bg-black/30 shadow-[0_0_20px_#00b4d8] translate-y-[-3px] scale-103' : 'border-white/10 bg-white/5 hover:translate-y-[-3px] hover:scale-103 hover:bg-white/10 hover:border-white/30'}`}
    >
      {selected && <div className="absolute top-1.5 left-1.5 w-[18px] h-[18px] bg-[#00b4d8] rounded-full flex items-center justify-center text-[11px] text-black font-black">✓</div>}
      <div 
        className="w-[72px] h-[72px] rounded-full"
        style={{ background: theme.glow }}
      />
      <div className="text-[13px] font-bold text-center">{names[idx]}</div>
      <div className="text-[10px] text-white/40 text-center leading-tight">{descs[idx]}</div>
    </div>
  );
}
