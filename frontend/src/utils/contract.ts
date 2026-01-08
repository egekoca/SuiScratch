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
  
  // Call purchase_ticket function with Clock and Random objects
  // Random is a global shared object at address 0x8
  tx.moveCall({
    target: `${CONTRACT_PACKAGE_ID}::suiscratch::purchase_ticket` as `${string}::${string}::${string}`,
    arguments: [
      tx.object(CONTRACT_GAME_CONFIG_ID),
      coin,
      tx.pure.u8(mode),
      tx.object(CLOCK_OBJECT_ID), // Clock object for timestamp
      tx.object('0x8'), // Random object (global shared object at address 0x8)
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
        showEffects: true,
      },
    });

    console.log('📋 Transaction events:', JSON.stringify(txResult.events, null, 2));
    
    if (txResult.events) {
      for (const event of txResult.events) {
        console.log('🔍 Checking event:', event.type);
        console.log('🔍 Full event object:', JSON.stringify(event, null, 2));
        
        if (event.type.includes('TicketPurchased')) {
          const parsedJson = event.parsedJson as any;
          console.log('🎫 Parsed event JSON:', JSON.stringify(parsedJson, null, 2));
          
          // Try different field names (Sui sometimes uses different naming)
          const possibleFields = ['ticket_id', 'ticketId', 'ticket-id', 'ticket'];
          let found = false;
          
          for (const field of possibleFields) {
            if (parsedJson && parsedJson[field] !== undefined) {
              const value = parsedJson[field];
              console.log(`✅ Found ticket ID in field '${field}':`, value);
              ticketId = BigInt(value);
              found = true;
              break;
            }
          }
          
          // If not found in parsedJson, try bcs field
          if (!found && event.bcs) {
            console.log('🔍 Trying to parse from BCS:', event.bcs);
            // BCS format: TicketPurchased { player: address, mode: u8, ticket_id: u64 }
            // We need to parse the u64 value from BCS
            try {
              // Convert bcs to Uint8Array if it's a string
              let bcsBytes: Uint8Array;
              if (typeof event.bcs === 'string') {
                // If it's a base64 string, decode it
                bcsBytes = new Uint8Array(Buffer.from(event.bcs, 'base64'));
              } else {
                bcsBytes = event.bcs as unknown as Uint8Array;
              }
              
              // Skip player (32 bytes) and mode (1 byte), then read u64 (8 bytes)
              if (bcsBytes.length >= 41) { // 32 (address) + 1 (u8) + 8 (u64)
                // Read u64 from bytes 33-40 (little-endian)
                let value = BigInt(0);
                for (let i = 0; i < 8; i++) {
                  value += BigInt(bcsBytes[33 + i]) << BigInt(i * 8);
                }
                ticketId = value;
                console.log('✅ Parsed ticket ID from BCS:', ticketId.toString());
                found = true;
              }
            } catch (bcsError) {
              console.error('❌ Error parsing BCS:', bcsError);
            }
          }
          
          if (found) {
            console.log('✅ Final parsed ticket ID:', ticketId.toString());
            break;
          }
        }
      }
    }
    
    // Fallback: Get ticket counter from GameConfig and use it
    if (ticketId === BigInt(0)) {
      console.warn('⚠️ Could not parse ticket ID from events, trying GameConfig counter...');
      try {
        const gameConfig = await getGameConfig();
        if (gameConfig && gameConfig.ticket_counter) {
          // Counter is incremented before ticket creation, so ticket_id = counter - 1
          const counter = BigInt(gameConfig.ticket_counter);
          if (counter > 0) {
            ticketId = counter - BigInt(1);
            console.log('✅ Using ticket ID from counter:', ticketId.toString());
          }
        }
      } catch (error) {
        console.error('❌ Error getting ticket counter:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error parsing ticket ID from event:', error);
    // If we can't parse, we'll need to get it from contract state
  }

  if (ticketId === BigInt(0)) {
    console.error('❌ Failed to get ticket ID from transaction');
    throw new Error('Failed to get ticket ID from transaction. Please try again.');
  }

  return { txDigest: result.digest, ticketId };
};

/**
 * Get grid from ticket (generated on-chain using Sui's random module)
 * Returns array of symbol IDs (u8 values)
 */
export const getTicketGrid = async (ticketId: bigint): Promise<number[]> => {
  if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
    throw new Error('Contract not configured');
  }

  try {
    console.log('🔍 Fetching grid for ticket ID:', ticketId.toString());
    
    // Use devInspectTransactionBlock to call view function
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${CONTRACT_PACKAGE_ID}::suiscratch::get_ticket_grid` as `${string}::${string}::${string}`,
      arguments: [
        tx.object(CONTRACT_GAME_CONFIG_ID),
        tx.pure.u64(ticketId),
      ],
    });

    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: CONTRACT_GAME_CONFIG_ID, // Use game config as sender for view call
    });

    console.log('📋 devInspect result:', JSON.stringify(result, null, 2));

    if (result.results && result.results[0]?.returnValues) {
      const returnValues = result.results[0].returnValues;
      console.log('📋 Return values:', returnValues);
      
      if (returnValues && returnValues.length > 0) {
        const returnValue = returnValues[0];
        console.log('📋 Return value:', returnValue);
        console.log('📋 Return value type:', typeof returnValue);
        console.log('📋 Return value[0]:', returnValue[0]);
        console.log('📋 Return value[1]:', returnValue[1]);
        
        // returnValue[0] is the BCS bytes (base64 string or Uint8Array)
        // returnValue[1] is the type string
        let bcsData: Uint8Array;
        
        if (returnValue[0]) {
          // Check if it's a base64 string
          if (typeof returnValue[0] === 'string') {
            console.log('📋 Decoding base64 string...');
            // Decode base64 to Uint8Array
            const base64String = returnValue[0];
            bcsData = new Uint8Array(Buffer.from(base64String, 'base64'));
          } else if (returnValue[0] instanceof Uint8Array) {
            bcsData = returnValue[0];
          } else if (Array.isArray(returnValue[0])) {
            bcsData = new Uint8Array(returnValue[0]);
          } else {
            // Try to convert to array
            const bytes = returnValue[1] as unknown as Uint8Array | number[] | string;
            if (typeof bytes === 'string') {
              bcsData = new Uint8Array(Buffer.from(bytes, 'base64'));
            } else if (Array.isArray(bytes)) {
              bcsData = new Uint8Array(bytes);
            } else {
              bcsData = bytes as Uint8Array;
            }
          }
          
          console.log('📋 BCS data length:', bcsData.length);
          console.log('📋 BCS data (first 20 bytes):', Array.from(bcsData.slice(0, 20)));
          
          // BCS vector<u8> format: length (ULEB128) followed by bytes
          // Parse length (ULEB128)
          let index = 0;
          let length = 0;
          let shift = 0;
          
          while (index < bcsData.length) {
            const byte = bcsData[index];
            length |= (byte & 0x7F) << shift;
            index++;
            if ((byte & 0x80) === 0) break;
            if (shift >= 28) {
              // ULEB128 can't be more than 5 bytes
              throw new Error('Invalid ULEB128 length encoding');
            }
            shift += 7;
          }
          
          console.log('📋 Parsed length:', length, 'from index:', index);
          
          // Extract the actual data (symbol IDs)
          const symbolIds: number[] = [];
          for (let i = index; i < index + length && i < bcsData.length; i++) {
            symbolIds.push(bcsData[i]);
          }
          
          console.log('✅ Parsed symbol IDs:', symbolIds.length, 'symbols');
          return symbolIds;
        }
      }
    }

    console.error('❌ No return values found in result');
    throw new Error('Failed to parse grid from contract: No return values');
  } catch (error: any) {
    console.error('❌ Error fetching grid:', error);
    throw error;
  }
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

  // Validate ticket ID
  if (ticketId === BigInt(0)) {
    throw new Error('Invalid ticket ID: 0. Please purchase a ticket first.');
  }

  console.log('💰 Setting result and claiming winnings in one transaction:', {
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
