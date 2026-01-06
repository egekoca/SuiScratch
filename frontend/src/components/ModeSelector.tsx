import { GAME_MODES } from '@/constants/gameModes';
import { GameMode } from '@/types/game';

interface ModeSelectorProps {
  selectedMode: GameMode;
  gameState: string;
  onChangeMode: (modeKey: keyof typeof GAME_MODES) => void;
}

export const ModeSelector = ({ selectedMode, gameState, onChangeMode }: ModeSelectorProps) => {
  return (
    <div className="w-full max-w-3xl flex justify-center sticky top-24 z-40">
      <div className="bg-[#18181b]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 flex gap-2 overflow-x-auto shadow-2xl no-scrollbar">
        {Object.values(GAME_MODES).map((mode) => (
          <button
            key={mode.id}
            onClick={() => onChangeMode(mode.id as keyof typeof GAME_MODES)}
            disabled={gameState === 'PLAYING'}
            className={`
              flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 min-w-max border
              ${selectedMode.id === mode.id
                ? `bg-gradient-to-r ${mode.gradient} text-white shadow-lg border-white/20 transform scale-[1.02]`
                : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-white'}
              ${gameState === 'PLAYING' ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div
              className={`p-1.5 rounded-lg bg-black/20 ${selectedMode.id === mode.id ? 'text-white' : 'text-slate-500'}`}
            >
              {mode.icon}
            </div>
            <div className="text-left flex flex-col leading-none gap-1">
              <span className="font-bold text-sm tracking-wide">{mode.name}</span>
              <span className="text-[10px] opacity-70 font-mono">{mode.price} SUI</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

