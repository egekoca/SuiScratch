import { GameMode } from '@/types/game';

export const getGridClass = (gridSize: number): string => {
  switch (gridSize) {
    case 4:
      return 'grid-cols-4';
    case 5:
      return 'grid-cols-5';
    default:
      return 'grid-cols-3';
  }
};

export const getSymbolSizeClass = (gridSize: number): string => {
  switch (gridSize) {
    case 4:
      return 'text-5xl';
    case 5:
      return 'text-4xl';
    default:
      return 'text-6xl';
  }
};

