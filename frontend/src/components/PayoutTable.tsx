import { Trophy } from 'lucide-react';
import { BASE_SYMBOLS, STANDARD_SYMBOLS, GOLD_SYMBOLS, PLATINUM_SYMBOLS } from '@/constants/symbols';
import { GameMode } from '@/types/game';

interface PayoutTableProps {
  selectedMode: GameMode;
}

export const PayoutTable = ({ selectedMode }: PayoutTableProps) => {
  // Get symbols for this game mode
  let symbolKeys: string[];
  if (selectedMode.id === 'STANDARD') {
    symbolKeys = STANDARD_SYMBOLS;
  } else if (selectedMode.id === 'GOLD') {
    symbolKeys = GOLD_SYMBOLS;
  } else {
    symbolKeys = PLATINUM_SYMBOLS;
  }
  
  // Sort symbols by baseValue (highest to lowest)
  const winningSymbols = symbolKeys
    .map(key => BASE_SYMBOLS[key])
    .sort((a, b) => b.baseValue - a.baseValue);

  return (
    <div className="bg-[#18181b]/80 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Trophy size={16} className="text-yellow-500" />
          Payouts
        </h3>
      </div>

      <div className="p-2 space-y-1">
        {winningSymbols.map((sym, idx) => {
          // Get symbol-specific background color - each with distinct colors
          const getSymbolBgColor = () => {
            if (sym.id === 'DIAMOND') return 'bg-purple-600/20 border-purple-500/40';
            if (sym.id === 'DROP') return 'bg-blue-600/20 border-blue-500/40';
            if (sym.id === 'CROWN') return 'bg-amber-600/20 border-amber-500/40';
            if (sym.id === 'SPARKLES') return 'bg-cyan-600/20 border-cyan-500/40';
            if (sym.id === 'ROCKET') return 'bg-orange-600/20 border-orange-500/40';
            if (sym.id === 'STAR') return 'bg-pink-600/20 border-pink-500/40';
            if (sym.id === 'COIN') return 'bg-yellow-600/20 border-yellow-500/40';
            return 'bg-white/5 border-white/10';
          };

          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-xl border ${getSymbolBgColor()} hover:bg-white/10 transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 flex items-center justify-center filter drop-shadow-lg">
                  <div className="w-full h-full flex items-center justify-center">
                    {sym.icon}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide">
                    {sym.label}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {selectedMode.matchReq}x: {(() => {
                      const val = sym.baseValue * selectedMode.price * (selectedMode.payouts[selectedMode.matchReq] || 0);
                      return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
                    })()} SUI
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-white opacity-80">
                  Max {(() => {
                    const val = sym.baseValue * selectedMode.price * Math.max(...Object.values(selectedMode.payouts));
                    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
                  })()} SUI
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 bg-black/20 text-[10px] text-center text-slate-500 border-t border-white/5">
        Min. {selectedMode.matchReq} matches to win
      </div>
    </div>
  );
};

