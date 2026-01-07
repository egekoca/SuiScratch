import { getFullnodeUrl } from '@mysten/sui.js/client';
import { SuiClient } from '@mysten/sui.js/client';

// Force testnet for now - change this if you want to use a different network
const network = (import.meta.env.VITE_SUI_NETWORK || 'testnet').toLowerCase().trim();

export const getNetworkConfig = () => {
  switch (network) {
    case 'testnet':
      return {
        url: getFullnodeUrl('testnet'),
        network: 'testnet' as const,
      };
    case 'devnet':
      return {
        url: getFullnodeUrl('devnet'),
        network: 'devnet' as const,
      };
    case 'mainnet':
      return {
        url: getFullnodeUrl('mainnet'),
        network: 'mainnet' as const,
      };
    default:
      return {
        url: getFullnodeUrl('testnet'),
        network: 'testnet' as const,
      };
  }
};

export const suiClient = new SuiClient(getNetworkConfig());

// Get environment variables with validation
const rawPackageId = import.meta.env.VITE_CONTRACT_PACKAGE_ID || '';
const rawGameConfigId = import.meta.env.VITE_CONTRACT_GAME_CONFIG_ID || '';

// Remove any whitespace or quotes
export const CONTRACT_PACKAGE_ID = rawPackageId.trim().replace(/^["']|["']$/g, '');
export const CONTRACT_GAME_CONFIG_ID = rawGameConfigId.trim().replace(/^["']|["']$/g, '');

// Debug: Log environment variables immediately
console.log('🔍 Environment Variables Check:', {
  network: import.meta.env.VITE_SUI_NETWORK,
  packageId: CONTRACT_PACKAGE_ID,
  gameConfigId: CONTRACT_GAME_CONFIG_ID,
  packageIdLength: CONTRACT_PACKAGE_ID.length,
  gameConfigIdLength: CONTRACT_GAME_CONFIG_ID.length,
  hasPackageId: !!CONTRACT_PACKAGE_ID,
  hasGameConfigId: !!CONTRACT_GAME_CONFIG_ID,
  rawPackageId: rawPackageId,
  rawGameConfigId: rawGameConfigId,
  allEnvVars: {
    VITE_SUI_NETWORK: import.meta.env.VITE_SUI_NETWORK,
    VITE_CONTRACT_PACKAGE_ID: import.meta.env.VITE_CONTRACT_PACKAGE_ID,
    VITE_CONTRACT_GAME_CONFIG_ID: import.meta.env.VITE_CONTRACT_GAME_CONFIG_ID,
  },
});

// Validate format
if (CONTRACT_PACKAGE_ID && !CONTRACT_PACKAGE_ID.startsWith('0x')) {
  console.warn('⚠️ Package ID should start with 0x:', CONTRACT_PACKAGE_ID);
}
if (CONTRACT_GAME_CONFIG_ID && !CONTRACT_GAME_CONFIG_ID.startsWith('0x')) {
  console.warn('⚠️ GameConfig ID should start with 0x:', CONTRACT_GAME_CONFIG_ID);
}

if (!CONTRACT_PACKAGE_ID || !CONTRACT_GAME_CONFIG_ID) {
  console.error('❌ Missing contract configuration!');
  console.error('Please check your .env file in frontend/ directory');
}

