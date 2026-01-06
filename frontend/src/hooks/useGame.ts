import { useState, useCallback } from 'react';
import { GameState, GameMode, GridSymbol, WinData } from '@/types/game';
import { GAME_MODES } from '@/constants/gameModes';
import { generateGrid } from '@/utils/gameLogic';

export const useGame = () => {
  const [balance, setBalance] = useState(250.0);
  const [selectedMode, setSelectedMode] = useState<GameMode>(GAME_MODES.STANDARD);
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [gridSymbols, setGridSymbols] = useState<GridSymbol[]>(
    Array(9).fill({ icon: '❓', id: 'unknown' })
  );
  const [winData, setWinData] = useState<WinData | null>(null);

  const changeMode = useCallback(
    (modeKey: keyof typeof GAME_MODES) => {
      if (gameState === 'PLAYING') return;
      setSelectedMode(GAME_MODES[modeKey]);
      resetGame(true);
    },
    [gameState]
  );

  const buyTicket = useCallback(() => {
    if (balance < selectedMode.price) {
      alert('Yetersiz Bakiye!');
      return;
    }
    setBalance((prev) => prev - selectedMode.price);
    setGameState('READY');
    const { grid, winData: newWinData } = generateGrid(selectedMode);
    setGridSymbols(grid);
    setWinData(newWinData);

    setTimeout(() => {
      setGameState('PLAYING');
    }, 10);
  }, [balance, selectedMode]);

  const resetGame = useCallback((force = false) => {
    setGameState('IDLE');
    setWinData(null);
    setGridSymbols(
      Array(selectedMode.gridSize * selectedMode.gridSize).fill({ icon: '❓', id: 'unknown' })
    );
    if (force) {
      // Canvas will be cleared by GameCard component
    }
  }, [selectedMode]);

  const revealGame = useCallback(() => {
    setGameState('REVEALED');
    if (winData?.isWin) {
      setBalance((prev) => prev + winData.totalAmount);
    }
  }, [winData]);

  return {
    balance,
    selectedMode,
    gameState,
    gridSymbols,
    winData,
    changeMode,
    buyTicket,
    resetGame,
    revealGame,
  };
};

