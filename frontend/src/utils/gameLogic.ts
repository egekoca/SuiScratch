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

  if (intendedScenario !== 'LOSS') {
    const numWinningSymbols = intendedScenario === 'COMBO' ? 2 : 1;
    const chosenWinningKeys: string[] = [];

    // Weighted selection: DIAMOND has lower chance (10%), others have equal chance (30% each)
    const getWeightedSymbol = (): string => {
      const rand = Math.random();
      if (rand < 0.1) return 'DIAMOND'; // 10% chance
      if (rand < 0.4) return 'DROP'; // 30% chance
      if (rand < 0.7) return 'ROCKET'; // 30% chance
      return 'COIN'; // 30% chance
    };

    while (chosenWinningKeys.length < numWinningSymbols) {
      const key = getWeightedSymbol();
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

  // Fill remaining cells with only winning symbols
  // In LOSS scenario, ensure no symbol reaches matchReq (so no win occurs)
  // In WIN scenarios, fill with random winning symbols (already have enough for a win)
  for (let i = 0; i < totalCells; i++) {
    if (!grid[i]) {
      if (intendedScenario === 'LOSS') {
        // Count current symbols to ensure we don't accidentally create a win
        const currentCounts: Record<string, number> = {};
        grid.forEach((sym) => {
          if (sym && winningKeys.includes(sym.id)) {
            currentCounts[sym.id] = (currentCounts[sym.id] || 0) + 1;
          }
        });

        // Choose a winning symbol that won't reach matchReq
        const availableSymbols = winningKeys.filter((key) => {
          const currentCount = currentCounts[key] || 0;
          return currentCount < selectedMode.matchReq - 1;
        });

        // If all symbols are at max (matchReq - 1), randomly choose any winning symbol
        // This ensures variety but no win
        // Use weighted selection (DIAMOND less likely)
        const getWeightedSymbol = (): string => {
          const rand = Math.random();
          if (rand < 0.1) return 'DIAMOND'; // 10% chance
          if (rand < 0.4) return 'DROP'; // 30% chance
          if (rand < 0.7) return 'ROCKET'; // 30% chance
          return 'COIN'; // 30% chance
        };

        if (availableSymbols.length === 0) {
          const randomKey = getWeightedSymbol();
          grid[i] = BASE_SYMBOLS[randomKey];
        } else {
          // Filter available symbols with weighted selection
          const weightedAvailable = availableSymbols.flatMap((key) => {
            if (key === 'DIAMOND') return [key]; // 1x weight
            return [key, key, key]; // 3x weight for others
          });
          const randomKey = weightedAvailable[Math.floor(Math.random() * weightedAvailable.length)];
          grid[i] = BASE_SYMBOLS[randomKey];
        }
      } else {
        // For WIN scenarios, fill with weighted random winning symbols (DIAMOND less likely)
        const getWeightedSymbol = (): string => {
          const rand = Math.random();
          if (rand < 0.1) return 'DIAMOND'; // 10% chance
          if (rand < 0.4) return 'DROP'; // 30% chance
          if (rand < 0.7) return 'ROCKET'; // 30% chance
          return 'COIN'; // 30% chance
        };
        const randomWinningKey = getWeightedSymbol();
        grid[i] = BASE_SYMBOLS[randomWinningKey];
      }
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
      // baseValue is a percentage of ticket price, so multiply by ticket price and multiplier
      const winVal = Math.round(sym.baseValue * selectedMode.price * multiplier);
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

