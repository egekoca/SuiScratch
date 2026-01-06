import { Grid3x3, Grid, LayoutGrid } from 'lucide-react';
import { GameMode } from '@/types/game';

export const GAME_MODES: Record<string, GameMode> = {
  STANDARD: {
    id: 'STANDARD',
    name: 'Sui Blue',
    gridSize: 3,
    price: 5,
    payouts: { 3: 0.7, 4: 1.0, 5: 1.5, 6: 2.5, 7: 4.0, 8: 8.0, 9: 18.0 },
    matchReq: 3,
    icon: <Grid3x3 size={18} />,
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/20',
    border: 'border-blue-200',
  },
  GOLD: {
    id: 'GOLD',
    name: 'Royal Gold',
    gridSize: 4,
    price: 10,
    payouts: { 3: 0.3, 4: 1.0, 5: 2.0, 6: 4.0, 7: 8.0, 8: 16.0 },
    matchReq: 3,
    icon: <Grid size={18} />,
    gradient: 'from-yellow-400 via-orange-500 to-amber-600',
    shadow: 'shadow-orange-500/20',
    border: 'border-yellow-200',
  },
  PLATINUM: {
    id: 'PLATINUM',
    name: 'Cyber Punk',
    gridSize: 5,
    price: 25,
    payouts: { 3: 0.12, 4: 0.8, 5: 3.0, 6: 8.0, 7: 16.0, 8: 28.0 },
    matchReq: 3,
    icon: <LayoutGrid size={18} />,
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-600',
    shadow: 'shadow-purple-500/20',
    border: 'border-purple-200',
  },
};

