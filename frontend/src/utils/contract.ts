/// <reference types="vite/client" />
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { suiClient, CONTRACT_PACKAGE_ID, CONTRACT_GAME_CONFIG_ID } from '@/config/sui';

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
 * Calculate SHA-256 hash of game result for verification
 */
export const calculateResultHash = async (winAmount: number, ticketId: bigint, gridSymbolIds: string[]): Promise<Uint8Array> => {
  const resultString = `${ticketId}:${winAmount}:${gridSymbolIds.join(',')}`;
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
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::purchase_ticket` as `${string}::${string}::${string}`,
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
  
  console.log('📝 Setting result hash:', {
    ticketId: ticketId.toString(),
    hashLength: hashVector.length,
    hashPreview: hashVector.slice(0, 10),
  });
  
  // Call set_result_hash function
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::set_result_hash`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      tx.pure.u64(ticketId),
      tx.pure(hashVector),
    ],
  });

  const result = await signAndExecuteTransactionBlock({ transactionBlock: tx });
  return result.digest;
};

/**
 * Set result hash and claim winnings in a single transaction
 * This uses a single Move function call, requiring only ONE wallet confirmation
 */
export const setResultAndClaimWinnings = async (
  ticketId: bigint,
  amountInMist: bigint,
  resultHash: Uint8Array,
  signAndExecuteTransactionBlock: any
): Promise<string> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    throw new Error('Contract not configured. Please set VITE_CONTRACT_PACKAGE_ID and VITE_CONTRACT_GAME_CONFIG_ID');
  }

  console.log('💰 Setting result and claiming winnings in one transaction:', {
    ticketId: ticketId.toString(),
    amountInMist: amountInMist.toString(),
    amountInSui: Number(amountInMist) / 1_000_000_000,
    hashLength: resultHash.length,
  });

  const tx = new TransactionBlock();
  
  // Convert Uint8Array to vector<u8> for Move
  const hashVector = Array.from(resultHash);
  
  // Single Move function call that does both: set hash and claim winnings
  // This requires only ONE wallet confirmation
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::set_result_and_claim` as `${string}::${string}::${string}`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      tx.pure.u64(ticketId),
      tx.pure.u64(amountInMist),
      tx.pure(hashVector),
    ],
  });

  console.log('📤 Sending single transaction...');
  try {
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
    throw error;
  }
};

/**
 * Claim winnings after a win (with result hash verification)
 * @deprecated Use setResultAndClaimWinnings instead to reduce wallet confirmations
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

  console.log('💰 Claiming winnings:', {
    ticketId: ticketId.toString(),
    amountInMist: amountInMist.toString(),
    amountInSui: Number(amountInMist) / 1_000_000_000,
    hashLength: resultHash.length,
    packageId: CONTRACT_PACKAGE_ID,
    gameConfigId: CONTRACT_GAME_CONFIG_ID,
  });

  const tx = new TransactionBlock();
  
  // Convert Uint8Array to vector<u8> for Move
  const hashVector = Array.from(resultHash);
  
  // Call claim_winnings function with result hash
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::claim_winnings` as `${string}::${string}::${string}`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      tx.pure.u64(ticketId),
      tx.pure.u64(amountInMist),
      tx.pure(hashVector),
    ],
  });

  console.log('📤 Sending claim transaction...');
  try {
    const result = await signAndExecuteTransactionBlock({ 
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    console.log('✅ Claim transaction successful:', result.digest);
    return result.digest;
  } catch (error: any) {
    console.error('❌ Claim transaction failed:', error);
    throw error;
  }
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
      console.log('📋 GameConfig fields structure:', fields);
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
      console.log('📋 Treasury structure:', fields.treasury);
      
      // Treasury is a Balance<SUI> object, we need to read its value
      if (fields.treasury) {
        // Treasury field might be an object reference or nested structure
        if (typeof fields.treasury === 'object' && 'fields' in fields.treasury) {
          const treasuryFields = fields.treasury.fields as any;
          if (treasuryFields.value) {
            return BigInt(treasuryFields.value);
          }
        }
        
        // Alternative: Treasury might be stored as a string
        if (typeof fields.treasury === 'string') {
          return BigInt(fields.treasury);
        }
      }
    }

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
    target: moveCallTarget as `${string}::${string}::${string}`,
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
  
  // Set gas budget explicitly to ensure sufficient gas
  tx.setGasBudget(10000000); // 0.01 SUI for gas (should be enough)
  
  // Call withdraw_from_treasury function
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::withdraw_from_treasury` as `${string}::${string}::${string}`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      tx.pure.u64(amountInMist),
    ],
  });

  console.log('📤 Sending withdraw transaction...');
  try {
    const result = await signAndExecuteTransactionBlock({ 
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    console.log('✅ Withdraw transaction successful:', result.digest);
    return result.digest;
  } catch (error: any) {
    console.error('❌ Withdraw transaction failed:', error);
    if (error.message?.includes('InsufficientCoinBalance')) {
      throw new Error('Insufficient gas balance. Please ensure your wallet has at least 0.01 SUI for transaction fees.');
    }
    throw error;
  }
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
      console.log('📋 Total Distributed structure:', fields.total_distributed);
      
      // total_distributed is a u64 field
      if (fields.total_distributed !== undefined) {
        if (typeof fields.total_distributed === 'string') {
          return BigInt(fields.total_distributed);
        }
        if (typeof fields.total_distributed === 'number') {
          return BigInt(fields.total_distributed);
        }
        if (typeof fields.total_distributed === 'object' && 'fields' in fields.total_distributed) {
          const nestedFields = fields.total_distributed.fields as any;
          if (nestedFields.value !== undefined) {
            return BigInt(nestedFields.value);
          }
        }
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
export const getTicket = async (_ticketId: bigint): Promise<Ticket | null> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    return null;
  }

  try {
    // This requires dynamic field access, which is not directly supported by getObject
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
