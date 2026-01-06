import { Sparkles, Coins } from 'lucide-react';
import { GameMode } from '@/types/game';

interface HeaderProps {
  balance: number;
  selectedMode: GameMode;
}

export const Header = ({ balance, selectedMode }: HeaderProps) => {
  return (
    <header className="w-full border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedMode.gradient} flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]`}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              SuiScratch
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Decentralized Wins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Mainnet v1.2
          </div>
          <div className="group flex items-center gap-3 bg-[#18181b] pl-4 pr-1.5 py-1.5 rounded-full border border-white/10 shadow-xl transition-all hover:border-white/20">
            <div className="flex flex-col items-end leading-none">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Balance
              </span>
              <span className="font-mono font-bold text-white text-lg">{balance.toFixed(2)}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform">
              <Coins size={18} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

