import { Symbol } from '@/types/game';

export const BASE_SYMBOLS: Record<string, Symbol> = {
  DIAMOND: { id: 'DIAMOND', icon: '💎', baseValue: 100, label: 'MEGA' },
  DROP: { id: 'DROP', icon: '💧', baseValue: 50, label: 'SUPER' },
  ROCKET: { id: 'ROCKET', icon: '🚀', baseValue: 25, label: 'BIG' },
  COIN: { id: 'COIN', icon: '🪙', baseValue: 10, label: 'WIN' },
  GHOST: { id: 'GHOST', icon: '👻', baseValue: 0, label: 'MISS' },
  LEMON: { id: 'LEMON', icon: '🍋', baseValue: 0, label: 'MISS' },
  CRAB: { id: 'CRAB', icon: '🦀', baseValue: 0, label: 'MISS' },
};

export const WINNING_SYMBOL_KEYS = ['DIAMOND', 'DROP', 'ROCKET', 'COIN'];
export const LOSING_SYMBOL_KEYS = ['GHOST', 'LEMON', 'CRAB'];

