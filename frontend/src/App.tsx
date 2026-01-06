import { Header } from '@/components/Header';
import { ModeSelector } from '@/components/ModeSelector';
import { GameCard } from '@/components/GameCard';
import { PayoutTable } from '@/components/PayoutTable';
import { RecentWinners } from '@/components/RecentWinners';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/hooks/useGame';

function App() {
  const {
    balance,
    selectedMode,
    gameState,
    gridSymbols,
    winData,
    changeMode,
    buyTicket,
    resetGame,
    revealGame,
  } = useGame();

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans flex flex-col items-center overflow-x-hidden relative">
      {/* Global Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-30 transition-all duration-1000 ${
            selectedMode.id === 'GOLD'
              ? 'bg-yellow-600'
              : selectedMode.id === 'PLATINUM'
                ? 'bg-purple-600'
                : 'bg-blue-600'
          }`}
        />
        <div
          className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] opacity-30 transition-all duration-1000 ${
            selectedMode.id === 'GOLD'
              ? 'bg-orange-600'
              : selectedMode.id === 'PLATINUM'
                ? 'bg-pink-600'
                : 'bg-cyan-600'
          }`}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <Header balance={balance} selectedMode={selectedMode} />

      <main className="flex-1 w-full max-w-7xl p-6 lg:p-8 flex flex-col items-center gap-8 relative z-10">
        {/* Mode Selection */}
        <ModeSelector
          selectedMode={selectedMode}
          gameState={gameState}
          onChangeMode={changeMode}
        />

        {/* Layout: items-center (Mobile/Tablet) and lg:items-start (Desktop) */}
        <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 lg:gap-12">
          {/* Left Panel: Payout Table */}
          <div className="w-full lg:w-72 flex-shrink-0 order-2 lg:order-1 space-y-6">
            <PayoutTable selectedMode={selectedMode} />
          </div>

          {/* Center Panel: Card */}
          <div className="flex flex-col items-center flex-1 w-full max-w-xl order-1 lg:order-2">
            {gameState === 'REVEALED' && winData?.isWin && <Confetti />}

            <GameCard
              selectedMode={selectedMode}
              gameState={gameState}
              gridSymbols={gridSymbols}
              winData={winData}
              onReveal={revealGame}
              onBuyTicket={buyTicket}
              onResetGame={() => resetGame(false)}
            />
          </div>

          {/* Right Panel: Recent Winners */}
          <div className="hidden lg:block w-72 flex-shrink-0 order-3 space-y-6">
            <RecentWinners />

            {/* Statistics Box */}
            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 backdrop-blur-md rounded-3xl border border-white/10 p-5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Total Distributed
              </div>
              <div className="text-2xl font-black text-white font-mono">1,240,050</div>
              <div className="text-xs text-blue-400 font-bold">SUI</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

