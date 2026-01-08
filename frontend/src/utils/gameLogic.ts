import { GameMode, GridSymbol, WinData } from '@/types/game';
import { BASE_SYMBOLS, STANDARD_SYMBOLS, GOLD_SYMBOLS, PLATINUM_SYMBOLS } from '@/constants/symbols';

/**
 * Generate grid from on-chain contract data
 * Symbol IDs come directly from the contract (0-6)
 */
export const generateGridFromContract = (selectedMode: GameMode, symbolIds: number[]): { grid: GridSymbol[]; winData: WinData } => {
  const totalCells = selectedMode.gridSize * selectedMode.gridSize;
  
  // Validate grid size
  if (symbolIds.length !== totalCells) {
    console.error(`Grid size mismatch: expected ${totalCells}, got ${symbolIds.length}`);
    throw new Error(`Invalid grid size: expected ${totalCells} cells, got ${symbolIds.length}`);
  }

  // Get available symbols for this game mode
  let winningKeys: string[];
  if (selectedMode.id === 'STANDARD') {
    winningKeys = STANDARD_SYMBOLS; // 5 symbols: 0-4
  } else if (selectedMode.id === 'GOLD') {
    winningKeys = GOLD_SYMBOLS; // 6 symbols: 0-5
  } else {
    winningKeys = PLATINUM_SYMBOLS; // 7 symbols: 0-6
  }

  // Map symbol IDs to symbol keys
  const symbolIdToKey = (symbolId: number): string => {
    if (symbolId < winningKeys.length) {
      return winningKeys[symbolId];
    }
    // Fallback to first symbol if ID is out of range
    console.warn(`Invalid symbol ID ${symbolId} for mode ${selectedMode.id}, using first symbol`);
    return winningKeys[0];
  };

  // Convert symbol IDs to grid symbols
  const grid: GridSymbol[] = symbolIds.map((symbolId) => {
    const symbolKey = symbolIdToKey(symbolId);
    return BASE_SYMBOLS[symbolKey];
  });

  const counts: Record<string, number> = {};
  grid.forEach((sym) => {
    if (sym && winningKeys.includes(sym.id)) {
      counts[sym.id] = (counts[sym.id] || 0) + 1;
    }
  });

  let totalWinAmount = 0;
  const calculatedWinners: string[] = [];
  const winDetails: string[] = [];

  Object.entries(counts).forEach(([id, count]) => {
    const payoutKeys = Object.keys(selectedMode.payouts)
      .map(Number)
      .sort((a, b) => b - a);
    let multiplier = 0;
    let matchedKey = 0;

    for (const k of payoutKeys) {
      if (count >= k) {
        multiplier = selectedMode.payouts[k];
        matchedKey = k;
        break;
      }
    }

    if (multiplier > 0) {
      const sym = BASE_SYMBOLS[id];
      // baseValue is a percentage of ticket price, so multiply by ticket price and multiplier
      const winVal = sym.baseValue * selectedMode.price * multiplier;
      totalWinAmount += winVal;
      calculatedWinners.push(id);
      // Format with up to 2 decimal places, but show decimals only if needed
      const formattedVal = winVal % 1 === 0 ? winVal.toFixed(0) : winVal.toFixed(2);
      winDetails.push(`${matchedKey}x ${sym.label} (${formattedVal} SUI)`);
    }
  });

  return {
    grid: grid as GridSymbol[],
    winData: {
      isWin: totalWinAmount > 0,
      winningSymbolIds: calculatedWinners,
      totalAmount: totalWinAmount,
      details: winDetails,
    },
  };
};

