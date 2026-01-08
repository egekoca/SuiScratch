import { Droplet, Crown, Zap } from 'lucide-react';
import { GameMode } from '@/types/game';

export const GAME_MODES: Record<string, GameMode> = {
  STANDARD: {
    id: 'STANDARD',
    name: 'Sui Blue',
    gridSize: 3,
    price: 1, // Testnet: 1 SUI
    // Balanced payouts: 1 SUI ticket, payouts are multipliers of ticket price
    // Min win: ~0.10 SUI, Max win: ~3.6 SUI
    payouts: { 3: 0.14, 4: 0.2, 5: 0.3, 6: 0.5, 7: 0.8, 8: 1.6, 9: 3.6 },
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
    price: 2, // Testnet: 2 SUI
    // Balanced payouts: 2 SUI ticket
    // Formula: winVal = baseValue * price * multiplier
    // Min win: DIAMOND (1.0) * 2 * 0.07 = 0.14 SUI (3 match) - similar to STANDARD
    // Max win: DIAMOND (1.0) * 2 * 1.8 = 3.6 SUI (16 match) - same as STANDARD max
    payouts: { 3: 0.07, 4: 0.1, 5: 0.15, 6: 0.25, 7: 0.4, 8: 0.8, 9: 1.0, 10: 1.2, 11: 1.4, 12: 1.5, 13: 1.6, 14: 1.7, 15: 1.75, 16: 1.8 },
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
    price: 5, // Testnet: 5 SUI
    // Balanced payouts: 5 SUI ticket
    // Formula: winVal = baseValue * price * multiplier
    // Min win: DIAMOND (1.0) * 5 * 0.028 = 0.14 SUI (3 match) - similar to STANDARD
    // Max win: DIAMOND (1.0) * 5 * 0.72 = 3.6 SUI (25 match) - same as STANDARD max
    payouts: { 3: 0.028, 4: 0.04, 5: 0.06, 6: 0.1, 7: 0.16, 8: 0.32, 9: 0.4, 10: 0.48, 11: 0.56, 12: 0.6, 13: 0.64, 14: 0.68, 15: 0.7, 16: 0.72, 17: 0.72, 18: 0.72, 19: 0.72, 20: 0.72, 21: 0.72, 22: 0.72, 23: 0.72, 24: 0.72, 25: 0.72 },
    matchReq: 6,
    icon: <Zap size={18} />,
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-600',
    shadow: 'shadow-purple-500/20',
    border: 'border-purple-200',
  },
};

