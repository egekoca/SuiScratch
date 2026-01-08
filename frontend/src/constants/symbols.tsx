import React from 'react';
import { Gem, Droplet, Rocket, Coins, Ghost, AlertCircle, X, Star, Crown, Sparkles, LucideIcon } from 'lucide-react';
import { Symbol } from '@/types/game';

// Icon components factory with colors and sizes
const createIcon = (
  IconComponent: LucideIcon,
  colorClass: string,
  strokeWidth: number = 3,
  fillClass?: string
): React.ReactNode => {
  const className = fillClass 
    ? `w-full h-full ${colorClass} ${fillClass}` 
    : `w-full h-full ${colorClass}`;
  
  return React.createElement(IconComponent, {
    className: className,
    strokeWidth: strokeWidth,
    size: undefined, // Let it fill the container
    fill: fillClass ? 'currentColor' : undefined,
  } as any);
};

export const BASE_SYMBOLS: Record<string, Symbol> = {
  DIAMOND: {
    id: 'DIAMOND',
    icon: createIcon(Gem, 'text-purple-500', 2.5, 'fill-purple-500'),
    baseValue: 0.5, // 0.5 SUI per match (e.g., 3x = 1.5 SUI, 4x = 2.0 SUI, 5x = 2.5 SUI)
    label: 'MEGA',
  },
  DROP: {
    id: 'DROP',
    icon: createIcon(Droplet, 'text-blue-500', 2.5, 'fill-blue-500'),
    baseValue: 0.25, // 0.25 SUI per match (e.g., 3x = 0.75 SUI, 4x = 1.0 SUI, 5x = 1.25 SUI)
    label: 'SUPER',
  },
  ROCKET: {
    id: 'ROCKET',
    icon: createIcon(Rocket, 'text-orange-500', 2.5, 'fill-orange-500'),
    baseValue: 0.1, // 0.1 SUI per match (e.g., 3x = 0.3 SUI, 4x = 0.4 SUI, 5x = 0.5 SUI)
    label: 'BIG',
  },
  COIN: {
    id: 'COIN',
    icon: createIcon(Coins, 'text-yellow-500', 2.5, 'fill-yellow-500'),
    baseValue: 0.05, // 0.05 SUI per match (e.g., 3x = 0.15 SUI, 4x = 0.2 SUI, 5x = 0.25 SUI)
    label: 'WIN',
  },
  STAR: {
    id: 'STAR',
    icon: createIcon(Star, 'text-pink-500', 2.5, 'fill-pink-500'),
    baseValue: 0.15, // 0.15 SUI per match (e.g., 3x = 0.45 SUI, 4x = 0.6 SUI, 5x = 0.75 SUI)
    label: 'ULTRA',
  },
  CROWN: {
    id: 'CROWN',
    icon: createIcon(Crown, 'text-amber-500', 2.5, 'fill-amber-500'),
    baseValue: 0.2, // 0.2 SUI per match (e.g., 3x = 0.6 SUI, 4x = 0.8 SUI, 5x = 1.0 SUI)
    label: 'LEGEND',
  },
  SPARKLES: {
    id: 'SPARKLES',
    icon: createIcon(Sparkles, 'text-cyan-500', 2.5, 'fill-cyan-500'),
    baseValue: 0.18, // 0.18 SUI per match (e.g., 3x = 0.54 SUI, 4x = 0.72 SUI, 5x = 0.9 SUI)
    label: 'EPIC',
  },
  GHOST: {
    id: 'GHOST',
    icon: createIcon(Ghost, 'text-slate-400', 3),
    baseValue: 0,
    label: 'MISS',
  },
  LEMON: {
    id: 'LEMON',
    icon: createIcon(AlertCircle, 'text-slate-400', 3),
    baseValue: 0,
    label: 'MISS',
  },
  CRAB: {
    id: 'CRAB',
    icon: createIcon(X, 'text-slate-400', 3),
    baseValue: 0,
    label: 'MISS',
  },
};

export const WINNING_SYMBOL_KEYS = ['DIAMOND', 'DROP', 'ROCKET', 'COIN', 'STAR', 'CROWN', 'SPARKLES'];
export const LOSING_SYMBOL_KEYS = ['GHOST', 'LEMON', 'CRAB'];

// Symbols available for each game mode
export const STANDARD_SYMBOLS = ['DIAMOND', 'DROP', 'ROCKET', 'COIN', 'STAR']; // 5 symbols
export const GOLD_SYMBOLS = ['DIAMOND', 'DROP', 'ROCKET', 'COIN', 'STAR', 'CROWN']; // 6 symbols
export const PLATINUM_SYMBOLS = ['DIAMOND', 'DROP', 'ROCKET', 'COIN', 'STAR', 'CROWN', 'SPARKLES']; // 7 symbols

