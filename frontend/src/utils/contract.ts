import { TransactionBlock } from '@mysten/sui.js/transactions';
import { suiClient, CONTRACT_PACKAGE_ID, CONTRACT_GAME_CONFIG_ID } from '@/config/sui';
import { fromB64 } from '@mysten/sui.js/utils';

// Game mode constants (must match Move contract)
export const GAME_MODE = {
  STANDARD: 0,
  GOLD: 1,
  PLATINUM: 2,
} as const;

// Sui Clock object ID (shared object)
const CLOCK_OBJECT_ID = '0x6';

export interface GameConfig {
  id: string;
  treasury: string;
  total_distributed: string;
  ticket_counter: string;
}

export interface Ticket {
  player: string;
  mode: number;
  ticket_id: string;
  timestamp: string;
  claimed: boolean;
}

/**
 * Calculate hash of game result for verification
 * Uses SHA-256 for secure hashing
 */
export const calculateResultHash = async (
  winAmount: number, 
  ticketId: bigint, 
  gridSymbols: string[]
): Promise<Uint8Array> => {
  // Create a deterministic hash from game result
  // Format: "ticketId:winAmount:symbol1,symbol2,..."
  const resultString = `${ticketId}:${winAmount.toFixed(2)}:${gridSymbols.join(',')}`;
  
  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(resultString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  return new Uint8Array(hashBuffer);
};

/**
 * Convert Uint8Array to hex string for Move vector<u8>
 */
export const uint8ArrayToHex = (arr: Uint8Array): string => {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Convert hex string to Uint8Array
 */
export const hexToUint8Array = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

/**
 * Purchase a ticket for a specific game mode
 * Returns transaction digest and ticket ID from event
 */
export const purchaseTicket = async (
  mode: number,
  priceInMist: bigint,
  signAndExecuteTransactionBlock: any
): Promise<{ txDigest: string; ticketId: bigint }> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    console.error('❌ Contract configuration missing:', {
      packageId: CONTRACT_PACKAGE_ID || 'MISSING',
      gameConfigId: CONTRACT_GAME_CONFIG_ID || 'MISSING',
    });
    throw new Error('Contract not configured. Please set VITE_CONTRACT_PACKAGE_ID and VITE_CONTRACT_GAME_CONFIG_ID');
  }

  console.log('📦 Using contract:', {
    packageId: CONTRACT_PACKAGE_ID,
    gameConfigId: CONTRACT_GAME_CONFIG_ID,
    network: import.meta.env.VITE_SUI_NETWORK,
  });

  // Verify package exists on the network before creating transaction
  try {
    const packageObject = await suiClient.getObject({
      id: CONTRACT_PACKAGE_ID,
      options: {
        showType: true,
      },
    });
    if (!packageObject.data) {
      throw new Error(`Package ${CONTRACT_PACKAGE_ID} not found on ${import.meta.env.VITE_SUI_NETWORK}`);
    }
    console.log('✅ Package verified:', packageObject.data.type);
  } catch (error: any) {
    console.error('❌ Package verification failed:', error);
    throw new Error(`Package ${CONTRACT_PACKAGE_ID} does not exist on ${import.meta.env.VITE_SUI_NETWORK}. Please verify:\n1. Package is deployed on ${import.meta.env.VITE_SUI_NETWORK}\n2. Wallet is connected to ${import.meta.env.VITE_SUI_NETWORK}\n3. Package ID is correct`);
  }

  const tx = new TransactionBlock();
  
  // Split the exact amount needed for the ticket
  const [coin] = tx.splitCoins(tx.gas, [priceInMist]);
  
  // Call purchase_ticket function with Clock object
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::purchase_ticket`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      coin,
      tx.pure.u8(mode),
      tx.object(CLOCK_OBJECT_ID), // Clock object for timestamp
    ],
  });

  const result = await signAndExecuteTransactionBlock({ transactionBlock: tx });
  
  // Parse ticket ID from transaction events
  let ticketId: bigint = BigInt(0);
  try {
    const txResult = await suiClient.getTransactionBlock({
      digest: result.digest,
      options: {
        showEvents: true,
      },
    });

    if (txResult.events) {
      for (const event of txResult.events) {
        if (event.type.includes('TicketPurchased')) {
          const parsedJson = event.parsedJson as any;
          if (parsedJson && parsedJson.ticket_id) {
            ticketId = BigInt(parsedJson.ticket_id);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing ticket ID from event:', error);
    // If we can't parse, we'll need to get it from contract state
  }

  return { txDigest: result.digest, ticketId };
};

/**
 * Set result hash for a ticket (called after game is played)
 */
export const setResultHash = async (
  ticketId: bigint,
  resultHash: Uint8Array,
  signAndExecuteTransactionBlock: any
): Promise<string> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    throw new Error('Contract not configured. Please set VITE_CONTRACT_PACKAGE_ID and VITE_CONTRACT_GAME_CONFIG_ID');
  }

  const tx = new TransactionBlock();
  
  // Convert Uint8Array to vector<u8> for Move
  const hashVector = Array.from(resultHash);
  
  // Call set_result_hash function
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::set_result_hash`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      tx.pure.u64(ticketId),
      tx.pure('vector<u8>', hashVector),
    ],
  });

  const result = await signAndExecuteTransactionBlock({ transactionBlock: tx });
  return result.digest;
};

/**
 * Claim winnings after a win (with result hash verification)
 */
export const claimWinnings = async (
  ticketId: bigint,
  amountInMist: bigint,
  resultHash: Uint8Array,
  signAndExecuteTransactionBlock: any
): Promise<string> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    throw new Error('Contract not configured. Please set VITE_CONTRACT_PACKAGE_ID and VITE_CONTRACT_GAME_CONFIG_ID');
  }

  const tx = new TransactionBlock();
  
  // Convert Uint8Array to vector<u8> for Move
  const hashVector = Array.from(resultHash);
  
  // Call claim_winnings function with result hash
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::claim_winnings`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      tx.pure.u64(ticketId),
      tx.pure.u64(amountInMist),
      tx.pure('vector<u8>', hashVector),
    ],
  });

  const result = await signAndExecuteTransactionBlock({ transactionBlock: tx });
  return result.digest;
};

/**
 * Get GameConfig object data
 */
export const getGameConfig = async (): Promise<GameConfig | null> => {
  if (!CONTRACT_GAME_CONFIG_ID) {
    return null;
  }

  try {
    const object = await suiClient.getObject({
      id: CONTRACT_GAME_CONFIG_ID,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (object.data?.content && 'fields' in object.data.content) {
      const fields = object.data.content.fields as any;
      return {
        id: CONTRACT_GAME_CONFIG_ID,
        treasury: fields.treasury || '0',
        total_distributed: fields.total_distributed || '0',
        ticket_counter: fields.ticket_counter || '0',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching game config:', error);
    return null;
  }
};

/**
 * Get treasury balance in MIST
 * Reads directly from GameConfig object's treasury Balance field
 */
export const getTreasuryBalance = async (): Promise<bigint> => {
  if (!CONTRACT_GAME_CONFIG_ID) {
    return BigInt(0);
  }

  try {
    // Read GameConfig object directly
    const object = await suiClient.getObject({
      id: CONTRACT_GAME_CONFIG_ID,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (object.data?.content && 'fields' in object.data.content) {
      const fields = object.data.content.fields as any;
      
      // Debug: Log the structure to understand how Balance is stored
      console.log('📋 GameConfig fields structure:', JSON.stringify(fields, null, 2));
      
      // Treasury is a Balance<SUI> object
      // In Sui, Balance objects in structs are stored inline with their value field
      if (fields.treasury) {
        // Try different possible structures
        if (typeof fields.treasury === 'object' && fields.treasury !== null) {
          // Check if it has a direct 'value' field (most common)
          if ('value' in fields.treasury) {
            const value = fields.treasury.value;
            if (typeof value === 'string') {
              return BigInt(value);
            }
            if (typeof value === 'number') {
              return BigInt(value);
            }
          }
          
          // Check if it has nested 'fields' with 'value'
          if ('fields' in fields.treasury) {
            const treasuryFields = fields.treasury.fields as any;
            if (treasuryFields?.value !== undefined) {
              return BigInt(treasuryFields.value);
            }
          }
          
          // Log the structure for debugging
          console.log('📋 Treasury structure:', JSON.stringify(fields.treasury, null, 2));
        }
        
        // Alternative: Treasury might be stored as a string (unlikely but possible)
        if (typeof fields.treasury === 'string') {
          return BigInt(fields.treasury);
        }
      }
    }

    // Fallback: Try to get balance using suiClient.getBalance
    // But this won't work for Balance objects in structs
    
    return BigInt(0);
  } catch (error) {
    console.error('Error fetching treasury balance:', error);
    return BigInt(0);
  }
};

/**
 * Fund the treasury (for initial setup or adding more funds)
 */
export const fundTreasury = async (
  amountInMist: bigint,
  signAndExecuteTransactionBlock: any
): Promise<string> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    throw new Error('Contract not configured. Please set VITE_CONTRACT_PACKAGE_ID and VITE_CONTRACT_GAME_CONFIG_ID');
  }

  console.log('💰 Funding treasury with:', {
    amount: amountInMist.toString(),
    packageId: CONTRACT_PACKAGE_ID,
    gameConfigId: CONTRACT_GAME_CONFIG_ID,
    network: import.meta.env.VITE_SUI_NETWORK,
  });

  // Verify package exists on the network before creating transaction
  try {
    const packageObject = await suiClient.getObject({
      id: CONTRACT_PACKAGE_ID,
      options: {
        showType: true,
      },
    });
    if (!packageObject.data) {
      throw new Error(`Package ${CONTRACT_PACKAGE_ID} not found on ${import.meta.env.VITE_SUI_NETWORK}`);
    }
    console.log('✅ Package verified:', packageObject.data.type);
  } catch (error: any) {
    console.error('❌ Package verification failed:', error);
    throw new Error(`Package ${CONTRACT_PACKAGE_ID} does not exist on ${import.meta.env.VITE_SUI_NETWORK}. Please verify:\n1. Package is deployed on ${import.meta.env.VITE_SUI_NETWORK}\n2. Wallet is connected to ${import.meta.env.VITE_SUI_NETWORK}\n3. Package ID is correct`);
  }

  const tx = new TransactionBlock();
  
  // Split the exact amount to fund treasury from gas
  const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
  
  // Call fund_treasury function
  const moveCallTarget = `${CONTRACT_PACKAGE_ID}::suiscratch::fund_treasury`;
  console.log('📤 Creating transaction with:', {
    target: moveCallTarget,
    gameConfigId: CONTRACT_GAME_CONFIG_ID,
    amount: amountInMist.toString(),
  });
  
  tx.moveCall({
    target: moveCallTarget,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      coin,
    ],
  });

  try {
    console.log('📤 Sending fund treasury transaction...');
    const result = await signAndExecuteTransactionBlock({ 
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    console.log('✅ Transaction successful:', result.digest);
    return result.digest;
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    // Check if error is about package not existing
    if (error.message?.includes('Package object does not exist') || error.message?.includes('does not exist with ID')) {
      throw new Error(`Package ${CONTRACT_PACKAGE_ID} does not exist on the network your wallet is connected to.\n\nPlease ensure:\n1. Your wallet is connected to ${import.meta.env.VITE_SUI_NETWORK}\n2. The package is deployed on ${import.meta.env.VITE_SUI_NETWORK}\n3. Check your wallet's network settings (should be ${import.meta.env.VITE_SUI_NETWORK})`);
    }
    throw error;
  }
};

/**
 * Withdraw from treasury (admin only)
 */
export const withdrawFromTreasury = async (
  amountInMist: bigint,
  signAndExecuteTransactionBlock: any
): Promise<string> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    throw new Error('Contract not configured. Please set VITE_CONTRACT_PACKAGE_ID and VITE_CONTRACT_GAME_CONFIG_ID');
  }

  // Verify package exists on the network before creating transaction
  try {
    const packageObject = await suiClient.getObject({
      id: CONTRACT_PACKAGE_ID,
      options: {
        showType: true,
      },
    });
    if (!packageObject.data) {
      throw new Error(`Package ${CONTRACT_PACKAGE_ID} not found on ${import.meta.env.VITE_SUI_NETWORK}`);
    }
    console.log('✅ Package verified for withdrawal');
  } catch (error: any) {
    console.error('❌ Package verification failed:', error);
    throw new Error(`Package ${CONTRACT_PACKAGE_ID} does not exist on ${import.meta.env.VITE_SUI_NETWORK}. Please verify:\n1. Package is deployed on ${import.meta.env.VITE_SUI_NETWORK}\n2. Wallet is connected to ${import.meta.env.VITE_SUI_NETWORK}\n3. Package ID is correct`);
  }

  const tx = new TransactionBlock();
  
  // Call withdraw_from_treasury function
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::withdraw_from_treasury`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      tx.pure.u64(amountInMist),
    ],
  });

  const result = await signAndExecuteTransactionBlock({ transactionBlock: tx });
  return result.digest;
};

/**
 * Get total distributed amount
 * Reads directly from GameConfig object's total_distributed field
 */
export const getTotalDistributed = async (): Promise<bigint> => {
  if (!CONTRACT_GAME_CONFIG_ID) {
    return BigInt(0);
  }

  try {
    // Read GameConfig object directly
    const object = await suiClient.getObject({
      id: CONTRACT_GAME_CONFIG_ID,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (object.data?.content && 'fields' in object.data.content) {
      const fields = object.data.content.fields as any;
      
      // total_distributed is a u64 field - should be directly readable
      if (fields.total_distributed !== undefined) {
        // Convert to bigint - handle different formats
        if (typeof fields.total_distributed === 'string') {
          return BigInt(fields.total_distributed);
        }
        if (typeof fields.total_distributed === 'number') {
          return BigInt(fields.total_distributed);
        }
        // Sometimes it's stored as a nested object (unlikely for u64, but check anyway)
        if (typeof fields.total_distributed === 'object' && fields.total_distributed !== null) {
          if ('fields' in fields.total_distributed) {
            const nestedFields = fields.total_distributed.fields as any;
            if (nestedFields?.value !== undefined) {
              return BigInt(nestedFields.value);
            }
          }
          // Check for direct value field
          if ('value' in fields.total_distributed) {
            return BigInt(fields.total_distributed.value);
          }
        }
      } else {
        console.warn('⚠️ total_distributed field not found in GameConfig');
      }
    }

    return BigInt(0);
  } catch (error) {
    console.error('Error fetching total distributed:', error);
    return BigInt(0);
  }
};

/**
 * Get ticket information
 */
export const getTicket = async (ticketId: bigint): Promise<Ticket | null> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    return null;
  }

  try {
    const result = await suiClient.devInspectTransactionBlock({
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      transactionBlock: {
        kind: 'moveCall',
        data: {
          package: CONTRACT_PACKAGE_ID,
          module: 'suiscratch',
          function: 'get_ticket',
          arguments: [CONTRACT_GAME_CONFIG_ID, ticketId.toString()],
        },
      },
    });

    if (result.results && result.results[0]?.returnValues) {
      const returnValue = result.results[0].returnValues[0];
      if (returnValue) {
        // Parse the return tuple (address, u8, u64, bool)
        // This is complex, for now return a simple structure
        return {
          player: '',
          mode: 0,
          ticket_id: ticketId.toString(),
          timestamp: '0',
          claimed: false,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
};

/**
 * Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
 */
export const suiToMist = (sui: number): bigint => {
  return BigInt(Math.floor(sui * 1_000_000_000));
};

/**
 * Convert MIST to SUI
 */
export const mistToSui = (mist: bigint | string): number => {
  const mistBigInt = typeof mist === 'string' ? BigInt(mist) : mist;
  return Number(mistBigInt) / 1_000_000_000;
};

