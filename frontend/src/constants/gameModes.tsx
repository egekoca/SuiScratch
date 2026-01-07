import { Droplet, Crown, Zap } from 'lucide-react';
import { GameMode } from '@/types/game';

export const GAME_MODES: Record<string, GameMode> = {
  STANDARD: {
    id: 'STANDARD',
    name: 'Sui Blue',
    gridSize: 3,
    price: 1, // Testnet: 1 SUI (was 5 SUI)
    payouts: { 3: 0.14, 4: 0.2, 5: 0.3, 6: 0.5, 7: 0.8, 8: 1.6, 9: 3.6 }, // 5x cheaper
    matchReq: 3,
    icon: <Droplet size={18} />,
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    shadow: 'shadow-blue-500/20',
    border: 'border-blue-200',
  },
  GOLD: {
    id: 'GOLD',
    name: 'Royal Gold',
    gridSize: 4,
    price: 2, // Testnet: 2 SUI (was 10 SUI)
    payouts: { 3: 0.06, 4: 0.2, 5: 0.4, 6: 0.8, 7: 1.6, 8: 2.4, 9: 4.0, 10: 7.0, 11: 11.0, 12: 17.0, 13: 26.0, 14: 40.0, 15: 60.0, 16: 90.0 }, // 5x cheaper
    matchReq: 5,
    icon: <Crown size={18} />,
    gradient: 'from-yellow-400 via-orange-500 to-amber-600',
    shadow: 'shadow-orange-500/20',
    border: 'border-yellow-200',
  },
  PLATINUM: {
    id: 'PLATINUM',
    name: 'Cyber Punk',
    gridSize: 5,
    price: 5, // Testnet: 5 SUI (was 25 SUI)
    payouts: { 3: 0.024, 4: 0.16, 5: 0.6, 6: 1.6, 7: 3.2, 8: 5.6, 9: 9.0, 10: 14.0, 11: 22.0, 12: 34.0, 13: 52.0, 14: 80.0, 15: 120.0, 16: 180.0, 17: 270.0, 18: 400.0, 19: 600.0, 20: 900.0, 21: 1350.0, 22: 2000.0, 23: 3000.0, 24: 4500.0, 25: 7000.0 }, // 5x cheaper
    matchReq: 6,
    icon: <Zap size={18} />,
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-600',
    shadow: 'shadow-purple-500/20',
    border: 'border-purple-200',
  },
};

