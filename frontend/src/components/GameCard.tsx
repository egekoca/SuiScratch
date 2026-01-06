import { useRef, useEffect } from 'react';
import { Ticket, Star, RotateCcw, Trophy, Frown, Grid3x3, Grid, LayoutGrid, Coins, Sparkles, X } from 'lucide-react';
import { GameMode, GameState, GridSymbol, WinData } from '@/types/game';
import { getGridClass, getSymbolSizeClass } from '@/utils/gridUtils';
import { initCanvas } from '@/utils/canvasUtils';
import { useScratch } from '@/hooks/useScratch';

interface GameCardProps {
  selectedMode: GameMode;
  gameState: GameState;
  gridSymbols: GridSymbol[];
  winData: WinData | null;
  onReveal: () => void;
  onBuyTicket: () => void;
  onResetGame: () => void;
}

export const GameCard = ({
  selectedMode,
  gameState,
  gridSymbols,
  winData,
  onReveal,
  onBuyTicket,
  onResetGame,
}: GameCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isDrawing, lastPoint, startScratch, moveScratch, endScratch, handleMouseEnter } =
    useScratch(canvasRef, gameState, onReveal);

  const handleInstantReveal = () => {
    if (canvasRef.current && gameState === 'PLAYING') {
      // Clear the canvas immediately
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.restore();
      }
      // Trigger reveal
      onReveal();
    }
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && canvasRef.current) {
      initCanvas(canvasRef.current, selectedMode);
    } else if (gameState === 'REVEALED' && canvasRef.current) {
      // Clear canvas when revealed
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.restore();
      }
    }
  }, [gameState, selectedMode]);

  return (
    <div className="flex flex-col items-center flex-1 w-full max-w-xl">
      <div className="relative w-full aspect-[4/5] sm:aspect-square max-w-[460px]">
        {/* Outer Glow */}
        <div
          className={`absolute -inset-4 bg-gradient-to-b ${selectedMode.gradient} rounded-[40px] blur-2xl opacity-20 transition-all duration-1000 ${gameState === 'PLAYING' ? 'opacity-40 scale-105' : ''}`}
        ></div>

        {/* Card Container */}
        <div
          ref={containerRef}
          className={`
            relative w-full h-full bg-[#e4e4e7] rounded-[32px] overflow-hidden shadow-2xl
            transition-transform duration-500
            ${isDrawing ? 'scale-[1.01]' : 'hover:scale-[1.01]'}
            border-[8px] ${selectedMode.border}
          `}
        >
          {/* 1. Result Grid */}
          <div className="absolute inset-0 p-6 bg-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-4 opacity-50">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                <Ticket size={14} /> {selectedMode.name.toUpperCase()}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                NO: {Math.random().toString().slice(2, 10)}
              </div>
            </div>

            <div
              className={`flex-1 grid ${getGridClass(selectedMode.gridSize)} transition-all duration-500 content-center`}
            >
              {gridSymbols.map((symbolData, idx) => {
                const symbol = symbolData.icon;
                const symbolId = symbolData.id;
                const isWinningCell =
                  gameState === 'REVEALED' && winData?.isWin && winData.winningSymbolIds.includes(symbolId);

                // Get symbol-specific color for winning cells
                const getWinningBorderColor = () => {
                  if (symbolId === 'DIAMOND') return 'border-purple-500';
                  if (symbolId === 'DROP') return 'border-blue-500';
                  if (symbolId === 'ROCKET') return 'border-orange-500';
                  if (symbolId === 'COIN') return 'border-yellow-500';
                  if (symbolId === 'STAR') return 'border-pink-500';
                  if (symbolId === 'CROWN') return 'border-amber-500';
                  if (symbolId === 'SPARKLES') return 'border-cyan-500';
                  return selectedMode.id === 'GOLD' ? 'border-yellow-400' : 'border-blue-400';
                };

                const getWinningRingColor = () => {
                  if (symbolId === 'DIAMOND') return 'ring-purple-300';
                  if (symbolId === 'DROP') return 'ring-blue-300';
                  if (symbolId === 'ROCKET') return 'ring-orange-300';
                  if (symbolId === 'COIN') return 'ring-yellow-300';
                  if (symbolId === 'STAR') return 'ring-pink-300';
                  if (symbolId === 'CROWN') return 'ring-amber-300';
                  if (symbolId === 'SPARKLES') return 'ring-cyan-300';
                  return 'ring-blue-300';
                };

                return (
                  <div
                    key={idx}
                    className={`
                      flex items-center justify-center ${getSymbolSizeClass(selectedMode.gridSize)} rounded-xl border-2
                      transition-all duration-700 relative overflow-hidden aspect-square
                      ${isWinningCell
                        ? `bg-white ${getWinningBorderColor()} shadow-xl z-10 ring-2 ring-offset-2 ${getWinningRingColor()}`
                        : 'bg-white border-slate-300 shadow-sm'}
                    `}
                  >
                    <div
                      className={`flex items-center justify-center filter drop-shadow-xl transform transition-transform duration-500 ${isWinningCell ? 'scale-110' : ''} opacity-100`}
                      style={{ minHeight: '70px', minWidth: '70px' }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        {symbol}
                      </div>
                    </div>
                    {isWinningCell && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/50 to-white/0 opacity-0 animate-[shimmer_1s_infinite]"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


          {/* 3. Canvas (Scratchable Area) */}
          <canvas
            ref={canvasRef}
            className={`
              absolute inset-0 z-30 touch-none w-full h-full
              ${gameState === 'PLAYING' ? 'cursor-none' : ''}
              ${gameState === 'REVEALED' ? 'pointer-events-none' : ''}
            `}
            onMouseEnter={handleMouseEnter}
            onMouseDown={startScratch}
            onMouseMove={moveScratch}
            onMouseUp={endScratch}
            onMouseLeave={endScratch}
            onTouchStart={startScratch}
            onTouchMove={moveScratch}
            onTouchEnd={endScratch}
          />

          {/* Cursor */}
          {gameState === 'PLAYING' && (
            <div
              className={`pointer-events-none absolute hidden md:flex items-center justify-center z-50 w-16 h-16 bg-gradient-to-br ${selectedMode.gradient} rounded-full border-4 border-white shadow-[0_10px_20px_rgba(0,0,0,0.3)] transform -translate-x-1/2 -translate-y-1/2`}
              style={{
                left: lastPoint ? lastPoint.x : '-100px',
                top: lastPoint ? lastPoint.y : '-100px',
              }}
            >
              <Coins size={24} className="text-white animate-pulse" />
            </div>
          )}

          {/* 4. Entry Screen */}
          {gameState === 'IDLE' && (
            <div className="absolute inset-0 z-40 bg-[#18181b]/95 flex flex-col items-center justify-center text-white backdrop-blur-sm p-8 text-center transition-all duration-300">
              <div
                className={`w-24 h-24 bg-gradient-to-br ${selectedMode.gradient} rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-white/20 transform rotate-3`}
              >
                {selectedMode.id === 'STANDARD' && <Grid3x3 size={40} />}
                {selectedMode.id === 'GOLD' && <Grid size={40} />}
                {selectedMode.id === 'PLATINUM' && <LayoutGrid size={40} />}
              </div>

              <div className="space-y-1 mb-8">
                <h3 className="text-3xl font-black tracking-tighter text-white">
                  {selectedMode.name.toUpperCase()}
                </h3>
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-400">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  <span>
                    Max Win:{' '}
                    <span className="text-white">
                      {100 * Math.max(...Object.values(selectedMode.payouts))} SUI
                    </span>
                  </span>
                </div>
              </div>

              <button
                onClick={onBuyTicket}
                className={`
                  group relative w-full py-4 px-6 rounded-2xl font-bold text-lg overflow-hidden
                  bg-gradient-to-r ${selectedMode.gradient} shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]
                  transition-all hover:scale-[1.02] active:scale-[0.98]
                `}
              >
                <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full duration-1000 transition-transform skew-x-12 -ml-4"></div>
                <div className="relative flex items-center justify-center gap-3">
                  <span>Buy Ticket</span>
                  <span className="bg-black/20 px-3 py-1 rounded-lg text-sm font-mono border border-white/10 group-hover:bg-black/30 transition-colors">
                    {selectedMode.price} SUI
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions and Scratch Now Button */}
      <div
        className={`mt-6 flex flex-col items-center gap-4 transition-opacity duration-500 ${gameState === 'PLAYING' ? 'opacity-100' : 'opacity-0'}`}
      >
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Scratch the card to reveal your fortune!
        </p>
        <button
          onClick={handleInstantReveal}
          className={`
            group relative px-6 py-3 rounded-xl font-bold text-sm overflow-hidden
            bg-gradient-to-r ${selectedMode.gradient} shadow-lg
            transition-all hover:scale-105 active:scale-95 flex items-center gap-2
          `}
        >
          <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full duration-1000 transition-transform skew-x-12 -ml-4"></div>
          <div className="relative flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-white" />
            <span className="text-white">Scratch Now</span>
          </div>
        </button>
      </div>

      {/* Win/Loss Modal - Below the card */}
      {gameState === 'REVEALED' &&
        (winData?.isWin ? (
          <div className="mt-4 w-full max-w-2xl">
            <div className="bg-white/95 backdrop-blur-xl py-3 px-4 rounded-2xl shadow-2xl border-4 border-yellow-400 transform animate-pop-in flex flex-row items-center gap-4 relative">
              {/* Close button */}
              <button
                onClick={onResetGame}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-200/80 hover:bg-slate-300/80 transition-colors"
                aria-label="Close"
              >
                <X size={14} className="text-slate-600" />
              </button>

              {/* Left side - Trophy and title */}
              <div className="flex items-center gap-3">
                <Trophy className="text-yellow-500 w-8 h-8 filter drop-shadow-lg flex-shrink-0" />
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                    You Won!
                  </h2>
                  <div className="text-xl font-black text-green-600 font-mono tracking-tighter">
                    +{winData.totalAmount % 1 === 0 ? winData.totalAmount.toFixed(0) : winData.totalAmount.toFixed(2)} <span className="text-sm">SUI</span>
                  </div>
                </div>
              </div>

              {/* Middle - Details */}
              <div className="flex-1 flex flex-wrap gap-1.5 justify-center items-center max-h-20 overflow-y-auto">
                {winData.details.map((detail, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold border border-yellow-200"
                  >
                    {detail}
                  </span>
                ))}
              </div>

              {/* Right side - Continue button */}
              <button
                onClick={onResetGame}
                className={`bg-gradient-to-r ${selectedMode.gradient} text-white font-bold py-2 px-5 rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2 text-sm flex-shrink-0`}
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 w-full max-w-2xl">
            <div className="bg-[#18181b]/95 backdrop-blur-xl py-3 px-4 rounded-2xl shadow-2xl border border-white/10 transform animate-pop-in flex flex-row items-center gap-4 relative">
              {/* Close button */}
              <button
                onClick={onResetGame}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-700/80 hover:bg-slate-600/80 transition-colors"
                aria-label="Close"
              >
                <X size={14} className="text-white" />
              </button>

              {/* Left side - Icon and text */}
              <div className="flex items-center gap-3">
                <Frown className="text-slate-500 w-8 h-8 flex-shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-white">Unlucky Round</h2>
                  <p className="text-slate-400 text-xs">This ticket was empty.</p>
                </div>
              </div>

              {/* Right side - Try Again button */}
              <div className="flex-1"></div>
              <button
                onClick={onResetGame}
                className={`bg-gradient-to-r ${selectedMode.gradient} text-white font-bold py-2 px-5 rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2 text-sm flex-shrink-0`}
              >
                <RotateCcw size={14} />
                Try Again
              </button>
            </div>
          </div>
        ))}
    </div>
  );
};

