import { History, ChevronRight } from 'lucide-react';

export const RecentWinners = () => {
  return (
    <div className="bg-[#18181b]/80 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-xl">
      <div className="p-5 border-b border-white/5 bg-white/5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History size={16} className="text-green-500" />
          Son Kazananlar
        </h3>
      </div>
      <div className="p-3 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex justify-between items-center p-2 rounded-xl bg-black/20 border border-white/5"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-mono">
                0x
              </div>
              <span className="text-xs text-slate-400 font-mono">...{8000 + i * 234}</span>
            </div>
            <span className="text-xs font-bold text-green-400">+{50 * i} SUI</span>
          </div>
        ))}
      </div>
      <div className="p-3 text-center">
        <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 w-full">
          Tümünü Gör <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
};

