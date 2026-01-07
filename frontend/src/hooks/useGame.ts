import { useState, useCallback, useRef } from 'react';
import { GameState, GameMode, GridSymbol, WinData } from '@/types/game';
import { GAME_MODES } from '@/constants/gameModes';
import { generateGrid } from '@/utils/gameLogic';
import { useWalletKit } from '@mysten/wallet-kit';
import { 
  purchaseTicket, 
  claimWinnings, 
  setResultHash,
  GAME_MODE, 
  suiToMist,
  calculateResultHash,
} from '@/utils/contract';
import { useTransaction } from './useTransaction';
import { useWalletBalance } from './useWalletBalance';

export const useGame = () => {
  const { signAndExecuteTransactionBlock, isConnected } = useWalletKit();
  const { balance: walletBalance, refresh: refreshBalance } = useWalletBalance();
  const purchaseTransaction = useTransaction();
  const claimTransaction = useTransaction();
  
  const [selectedMode, setSelectedMode] = useState<GameMode>(GAME_MODES.STANDARD);
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [gridSymbols, setGridSymbols] = useState<GridSymbol[]>(
    Array(9).fill({ icon: null, id: 'unknown' })
  );
  const [winData, setWinData] = useState<WinData | null>(null);
  const currentTicketIdRef = useRef<bigint>(BigInt(0));

  const changeMode = useCallback(
    (modeKey: keyof typeof GAME_MODES) => {
      if (gameState === 'PLAYING') return;
      setSelectedMode(GAME_MODES[modeKey]);
      resetGame(true);
    },
    [gameState]
  );

  const buyTicket = useCallback(async () => {
    if (!isConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    if (walletBalance < selectedMode.price) {
      alert('Insufficient Balance!');
      return;
    }

    try {
      // Get game mode number
      let modeNumber: number;
      if (selectedMode.id === 'STANDARD') {
        modeNumber = GAME_MODE.STANDARD;
      } else if (selectedMode.id === 'GOLD') {
        modeNumber = GAME_MODE.GOLD;
      } else {
        modeNumber = GAME_MODE.PLATINUM;
      }

      // Convert price to MIST
      const priceInMist = suiToMist(selectedMode.price);

      // Execute purchase transaction and get ticket ID
      let ticketId: bigint = BigInt(0);
      const purchaseResult = await purchaseTransaction.execute(async () => {
        const result = await purchaseTicket(modeNumber, priceInMist, signAndExecuteTransactionBlock);
        ticketId = result.ticketId;
        return result.txDigest;
      });

      if (!purchaseResult) {
        // Transaction failed, error is already set in purchaseTransaction state
        return;
      }

      // Store ticket ID
      if (ticketId > 0) {
        currentTicketIdRef.current = ticketId;
      } else {
        // Fallback: increment manually if event parsing fails
        ticketId = currentTicketIdRef.current + BigInt(1);
        currentTicketIdRef.current = ticketId;
      }

      // Transaction successful - generate game grid
      setGameState('READY');
      const { grid, winData: newWinData } = generateGrid(selectedMode);
      setGridSymbols(grid);
      setWinData(newWinData);

      // Store ticket ID for later use
      currentTicketIdRef.current = ticketId;

      // Refresh wallet balance
      await refreshBalance();

      setTimeout(() => {
        setGameState('PLAYING');
      }, 10);
    } catch (error: any) {
      console.error('Error purchasing ticket:', error);
      alert(error?.message || 'Failed to purchase ticket. Please try again.');
    }
  }, [walletBalance, selectedMode, isConnected, signAndExecuteTransactionBlock, purchaseTransaction, refreshBalance]);

  const resetGame = useCallback((force = false) => {
    setGameState('IDLE');
    setWinData(null);
    setGridSymbols(
      Array(selectedMode.gridSize * selectedMode.gridSize).fill({ icon: null, id: 'unknown' })
    );
    purchaseTransaction.reset();
    claimTransaction.reset();
    if (force) {
      // Canvas will be cleared by GameCard component
    }
  }, [selectedMode, purchaseTransaction, claimTransaction]);

  const revealGame = useCallback(async () => {
    setGameState('REVEALED');
    
    // If user won, set result hash and claim winnings from contract
    if (winData && isConnected) {
      try {
        const ticketId = currentTicketIdRef.current;
        
        // Calculate result hash from game data
        const gridSymbolIds = gridSymbols.map(s => s.id);
        const resultHash = await calculateResultHash(
          winData.totalAmount,
          ticketId,
          gridSymbolIds
        );

        // Set result hash first (if win) or just mark as played (if loss)
        if (winData.isWin && winData.totalAmount > 0) {
          // Set result hash
          await setResultHash(ticketId, resultHash, signAndExecuteTransactionBlock);

          // Claim winnings
          const amountInMist = suiToMist(winData.totalAmount);
          const txHash = await claimTransaction.execute(async () => {
            return await claimWinnings(ticketId, amountInMist, resultHash, signAndExecuteTransactionBlock);
          });

          if (txHash) {
            // Refresh wallet balance after claiming
            await refreshBalance();
          }
        } else {
          // For losses, we can optionally set a hash indicating loss
          const lossHash = await calculateResultHash(0, ticketId, gridSymbolIds);
          try {
            await setResultHash(ticketId, lossHash, signAndExecuteTransactionBlock);
          } catch (error) {
            // Ignore errors for loss tickets (optional)
            console.log('Loss ticket hash set (optional)');
          }
        }
      } catch (error: any) {
        console.error('Error processing game result:', error);
        // Don't show alert here, let the user see the win notification
        // They can manually retry if needed
      }
    }
  }, [winData, gridSymbols, isConnected, signAndExecuteTransactionBlock, claimTransaction, refreshBalance]);

  return {
    balance: walletBalance,
    selectedMode,
    gameState,
    gridSymbols,
    winData,
    changeMode,
    buyTicket,
    resetGame,
    revealGame,
    purchaseLoading: purchaseTransaction.loading,
    purchaseError: purchaseTransaction.error,
    claimLoading: claimTransaction.loading,
    claimError: claimTransaction.error,
  };
};

