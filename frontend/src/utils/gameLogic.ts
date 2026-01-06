import { GameMode, GridSymbol, WinData } from '@/types/game';
import { BASE_SYMBOLS, WINNING_SYMBOL_KEYS } from '@/constants/symbols';

export const generateGrid = (selectedMode: GameMode): { grid: GridSymbol[]; winData: WinData } => {
  const totalCells = selectedMode.gridSize * selectedMode.gridSize;
  let grid: (GridSymbol | null)[] = Array(totalCells).fill(null);

  const rand = Math.random();
  let intendedScenario: 'LOSS' | 'SINGLE' | 'COMBO' = 'LOSS';
  if (rand < 0.45) intendedScenario = 'SINGLE';
  else if (rand < 0.60) intendedScenario = 'COMBO';

  const winningKeys = WINNING_SYMBOL_KEYS;
  // Only use winning symbols - no losing symbols

  if (intendedScenario !== 'LOSS') {
    const numWinningSymbols = intendedScenario === 'COMBO' ? 2 : 1;
    const chosenWinningKeys: string[] = [];

    while (chosenWinningKeys.length < numWinningSymbols) {
      const key = winningKeys[Math.floor(Math.random() * winningKeys.length)];
      if (!chosenWinningKeys.includes(key)) chosenWinningKeys.push(key);
    }

    chosenWinningKeys.forEach((key) => {
      const sym = BASE_SYMBOLS[key];
      const payouts = selectedMode.payouts;
      const possibleMatches = Object.keys(payouts)
        .map(Number)
        .sort((a, b) => a - b);

      const currentEmpty = grid.filter((c) => c === null).length;
      if (currentEmpty < possibleMatches[0]) return;

      let matchCount = possibleMatches[0];
      const r = Math.random();
      const maxPossible = Math.min(currentEmpty, possibleMatches[possibleMatches.length - 1]);

      if (maxPossible > matchCount) {
        if (r > 0.85) matchCount = maxPossible;
        else if (r > 0.6) matchCount = Math.min(currentEmpty, matchCount + 1);
      }

      let placed = 0;
      let emptyIndices = grid
        .map((val, idx) => (val === null ? idx : null))
        .filter((val) => val !== null) as number[];
      while (placed < matchCount && emptyIndices.length > 0) {
        const randIndex = Math.floor(Math.random() * emptyIndices.length);
        const gridIndex = emptyIndices[randIndex];
        grid[gridIndex] = sym;
        emptyIndices.splice(randIndex, 1);
        placed++;
      }
    });
  }

  // Fill remaining cells with random winning symbols only
  for (let i = 0; i < totalCells; i++) {
    if (!grid[i]) {
      const randomKey = winningKeys[Math.floor(Math.random() * winningKeys.length)];
      grid[i] = BASE_SYMBOLS[randomKey];
    }
  }

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
      const winVal = Math.round(sym.baseValue * multiplier);
      totalWinAmount += winVal;
      calculatedWinners.push(id);
      winDetails.push(`${matchedKey}x ${sym.label} (${winVal} SUI)`);
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

