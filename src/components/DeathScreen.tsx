interface DeathScreenProps {
  score: number;
  onRespawn: () => void;
}

export function DeathScreen({ score, onRespawn }: DeathScreenProps) {
  return (
    <div className="fixed inset-0 bg-[#00050fec] flex flex-col items-center justify-center z-[100] backdrop-blur-xl">
      <h1 className="text-5xl font-black text-[#e07a5f] [text-shadow:0_0_40px_rgba(224,122,95,0.6)] tracking-tight mb-2 animate-pulse">DEVORADO!</h1>
      <div className="text-base text-white/50 mb-2">Você foi engolido pelo oceano</div>
      <div className="text-[28px] font-bold text-[#f4d03f] mb-8">Tamanho final: {score}</div>
      <button 
        onClick={onRespawn}
        className="bg-linear-to-br from-[#00b4d8] to-[#0077b6] border-none rounded-2xl px-10 py-4 text-white text-lg font-bold cursor-pointer transition-all hover:scale-105 shadow-[0_4px_24px_rgba(0,180,216,0.4)] hover:shadow-[0_6px_32px_rgba(0,180,216,0.6)]"
      >
        🐟 Renascer
      </button>
    </div>
  );
}
