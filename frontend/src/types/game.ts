import { ReactNode } from 'react';

export type GameState = 'IDLE' | 'READY' | 'PLAYING' | 'REVEALED';

export interface GameMode {
  id: string;
  name: string;
  gridSize: number;
  price: number;
  payouts: Record<number, number>;
  matchReq: number;
  icon: ReactNode;
  gradient: string;
  shadow: string;
  border: string;
}

export interface Symbol {
  id: string;
  icon: string;
  baseValue: number;
  label: string;
}

export interface WinData {
  isWin: boolean;
  winningSymbolIds: string[];
  totalAmount: number;
  details: string[];
}

export interface GridSymbol {
  icon: string;
  id: string;
}

