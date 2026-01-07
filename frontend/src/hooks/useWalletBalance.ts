import { useState, useEffect } from 'react';
import { useWalletKit } from '@mysten/wallet-kit';
import { suiClient } from '@/config/sui';
import { SUI_TYPE_ARG } from '@mysten/sui.js/utils';

export const useWalletBalance = () => {
  const { currentAccount, isConnected } = useWalletKit();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!isConnected || !currentAccount) {
      setBalance(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const coins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: SUI_TYPE_ARG,
      });

      // Calculate total balance
      const totalBalance = coins.data.reduce((sum, coin) => {
        return sum + BigInt(coin.balance);
      }, BigInt(0));

      // Convert MIST to SUI (1 SUI = 1,000,000,000 MIST)
      const balanceInSui = Number(totalBalance) / 1_000_000_000;
      setBalance(balanceInSui);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance');
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && currentAccount) {
      fetchBalance();

      // Refresh balance every 5 seconds
      const interval = setInterval(fetchBalance, 5000);
      return () => clearInterval(interval);
    } else {
      setBalance(0);
    }
  }, [isConnected, currentAccount?.address]);

  return {
    balance,
    loading,
    error,
    refresh: fetchBalance,
  };
};

