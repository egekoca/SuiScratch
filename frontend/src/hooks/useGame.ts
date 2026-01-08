import { useState, useCallback, useRef } from 'react';
import { GameState, GameMode, GridSymbol, WinData } from '@/types/game';
import { GAME_MODES } from '@/constants/gameModes';
import { generateGridFromContract } from '@/utils/gameLogic';
import { useWalletKit } from '@mysten/wallet-kit';
import { 
  purchaseTicket, 
  setResultAndClaimWinnings,
  getTicketGrid,
  GAME_MODE, 
  suiToMist,
  calculateResultHash,
} from '@/utils/contract';
import { useTransaction } from './useTransaction';
import { useWalletBalance } from './useWalletBalance';
import { useToast } from './useToast';

export const useGame = (toast?: ReturnType<typeof useToast>) => {
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
      toast?.error('Please connect your wallet first!');
      return;
    }

    if (walletBalance < selectedMode.price) {
      toast?.error('Insufficient Balance!');
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

      // Get grid from on-chain ticket (generated using Sui's random module)
      // Grid is completely generated on-chain for fair and verifiable randomness
      let gridSymbolIds: number[];
      try {
        gridSymbolIds = await getTicketGrid(ticketId);
        console.log('🎲 Got grid from contract:', gridSymbolIds.length, 'symbols');
      } catch (error: any) {
        console.error('Failed to get grid from contract:', error);
        toast?.error('Failed to load game grid. Please try again.');
        return;
      }

      // Convert symbol IDs to grid symbols and calculate win data
      setGameState('READY');
      const { grid, winData: newWinData } = generateGridFromContract(selectedMode, gridSymbolIds);
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
      toast?.error(error?.message || 'Failed to purchase ticket. Please try again.');
    }
  }, [walletBalance, selectedMode, isConnected, signAndExecuteTransactionBlock, purchaseTransaction, refreshBalance, toast]);

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
    // Only reveal if game is still in PLAYING state (prevent double reveal)
    if (gameState !== 'PLAYING') return;
    
    setGameState('REVEALED');
    
    // Automatically claim winnings if user won
    if (winData && isConnected) {
      try {
        const ticketId = currentTicketIdRef.current;
        
        // Validate ticket ID
        if (ticketId === BigInt(0)) {
          console.error('❌ Invalid ticket ID: 0');
          toast?.error('Invalid ticket ID. Please purchase a new ticket.');
          return;
        }
        
        console.log('🎫 Using ticket ID:', ticketId.toString());
        
        // Calculate result hash from game data
        const gridSymbolIds = gridSymbols.map(s => s.id);
        const resultHash = await calculateResultHash(
          winData.totalAmount,
          ticketId,
          gridSymbolIds
        );

        // Set result hash and claim winnings in a single transaction (if win)
        if (winData.isWin && winData.totalAmount > 0) {
          console.log('🎉 Processing win:', {
            ticketId: ticketId.toString(),
            amount: winData.totalAmount,
            hashLength: resultHash.length,
          });

          // Set result hash and claim winnings in one transaction
          // This requires only ONE wallet confirmation instead of two
          const amountInMist = suiToMist(winData.totalAmount);
          const txHash = await claimTransaction.execute(async () => {
            return await setResultAndClaimWinnings(ticketId, amountInMist, resultHash, signAndExecuteTransactionBlock);
          });

          if (txHash) {
            console.log('✅ Winnings claimed successfully! Transaction:', txHash);
            // Refresh wallet balance after claiming
            await refreshBalance();
            toast?.success(
              `🎉 Congratulations! ${winData.totalAmount} SUI has been sent to your wallet!`,
              8000
            );
          } else {
            console.error('❌ Failed to claim winnings - no transaction hash returned');
            toast?.error(
              `Failed to claim winnings. Please try again.\n${claimTransaction.error || 'Unknown error'}`,
              8000
            );
          }
        } else {
          // For losses, we don't need to do anything
          // The ticket will remain unclaimed
          console.log('💔 Loss detected - no action needed');
        }
      } catch (error: any) {
        console.error('❌ Error processing game result:', error);
        toast?.error(
          `Error processing game result: ${error?.message || 'Unknown error'}\nPlease try again.`,
          8000
        );
      }
    } else if (winData && !isConnected) {
      console.warn('⚠️ User won but wallet is not connected');
      toast?.warning('Please connect your wallet to claim your winnings!');
    }
  }, [gameState, winData, gridSymbols, isConnected, signAndExecuteTransactionBlock, claimTransaction, refreshBalance, toast]);

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

