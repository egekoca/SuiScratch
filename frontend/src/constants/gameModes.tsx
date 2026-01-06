import { Grid3x3, Grid, LayoutGrid } from 'lucide-react';
import { GameMode } from '@/types/game';

export const GAME_MODES: Record<string, GameMode> = {
  STANDARD: {
    id: 'STANDARD',
    name: 'Sui Blue',
    gridSize: 3,
    price: 5,
    payouts: { 3: 1.2, 4: 2.0, 5: 3.0, 6: 5.0, 7: 10.0, 8: 20.0, 9: 100.0 },
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
    payouts: { 3: 0.5, 4: 2.5, 5: 5.0, 6: 10.0, 7: 20.0, 8: 50.0 },
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
    payouts: { 3: 0.2, 4: 2.0, 5: 10.0, 6: 20.0, 7: 50.0, 8: 100.0 },
    matchReq: 3,
    icon: <LayoutGrid size={18} />,
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-600',
    shadow: 'shadow-purple-500/20',
    border: 'border-purple-200',
  },
};

