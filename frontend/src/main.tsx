import React from 'react';
import ReactDOM from 'react-dom/client';
import { WalletKitProvider } from '@mysten/wallet-kit';
import { getNetworkConfig, CONTRACT_PACKAGE_ID, CONTRACT_GAME_CONFIG_ID } from './config/sui';
import App from './App';
import './styles/index.css';

const networkConfig = getNetworkConfig();

// Log configuration on app start
console.log('🚀 SuiScratch App Starting...', {
  network: networkConfig.network,
  packageId: CONTRACT_PACKAGE_ID ? `${CONTRACT_PACKAGE_ID.slice(0, 10)}...` : 'MISSING',
  gameConfigId: CONTRACT_GAME_CONFIG_ID ? `${CONTRACT_GAME_CONFIG_ID.slice(0, 10)}...` : 'MISSING',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletKitProvider
      preferredWallets={['Sui Wallet', 'Suiet']}
    >
      <App />
    </WalletKitProvider>
  </React.StrictMode>
);

