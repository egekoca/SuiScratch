import React from 'react';
import { Gem, Droplet, Rocket, Coins, Ghost, AlertCircle, X } from 'lucide-react';
import { Symbol } from '@/types/game';

// Icon components factory with colors and sizes
const createIcon = (
  IconComponent: React.ComponentType<{ className?: string; color?: string; strokeWidth?: number; size?: number; fill?: string }>,
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
  });
};

export const BASE_SYMBOLS: Record<string, Symbol> = {
  DIAMOND: {
    id: 'DIAMOND',
    icon: createIcon(Gem, 'text-purple-500', 2.5, 'fill-purple-500'),
    baseValue: 100,
    label: 'MEGA',
  },
  DROP: {
    id: 'DROP',
    icon: createIcon(Droplet, 'text-blue-500', 2.5, 'fill-blue-500'),
    baseValue: 50,
    label: 'SUPER',
  },
  ROCKET: {
    id: 'ROCKET',
    icon: createIcon(Rocket, 'text-orange-500', 2.5, 'fill-orange-500'),
    baseValue: 25,
    label: 'BIG',
  },
  COIN: {
    id: 'COIN',
    icon: createIcon(Coins, 'text-yellow-500', 2.5, 'fill-yellow-500'),
    baseValue: 10,
    label: 'WIN',
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

export const WINNING_SYMBOL_KEYS = ['DIAMOND', 'DROP', 'ROCKET', 'COIN'];
export const LOSING_SYMBOL_KEYS = ['GHOST', 'LEMON', 'CRAB'];

