import { GameMode } from '@/types/game';

export const getGridClass = (gridSize: number): string => {
  switch (gridSize) {
    case 4:
      return 'grid-cols-4 gap-2';
    case 5:
      return 'grid-cols-5 gap-1.5';
    default:
      return 'grid-cols-3 gap-3';
  }
};

export const getSymbolSizeClass = (gridSize: number): string => {
  switch (gridSize) {
    case 4:
      return 'text-4xl';
    case 5:
      return 'text-3xl';
    default:
      return 'text-5xl';
  }
};

