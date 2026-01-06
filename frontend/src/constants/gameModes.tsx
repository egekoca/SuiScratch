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
    payouts: { 3: 0.3, 4: 1.0, 5: 2.0, 6: 4.0, 7: 8.0, 8: 12.0, 9: 20.0, 10: 35.0, 11: 55.0, 12: 85.0, 13: 130.0, 14: 200.0, 15: 300.0, 16: 450.0 },
    matchReq: 5,
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
    payouts: { 3: 0.12, 4: 0.8, 5: 3.0, 6: 8.0, 7: 16.0, 8: 28.0, 9: 45.0, 10: 70.0, 11: 110.0, 12: 170.0, 13: 260.0, 14: 400.0, 15: 600.0, 16: 900.0, 17: 1350.0, 18: 2000.0, 19: 3000.0, 20: 4500.0, 21: 6750.0, 22: 10000.0, 23: 15000.0, 24: 22500.0, 25: 35000.0 },
    matchReq: 6,
    icon: <LayoutGrid size={18} />,
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-600',
    shadow: 'shadow-purple-500/20',
    border: 'border-purple-200',
  },
};

