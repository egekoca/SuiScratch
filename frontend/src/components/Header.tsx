import { Sparkles, Coins, Wallet } from 'lucide-react';
import { GameMode } from '@/types/game';
import { useWalletKit, ConnectButton } from '@mysten/wallet-kit';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { getNetworkConfig } from '@/config/sui';

interface HeaderProps {
  selectedMode: GameMode;
}

export const Header = ({ selectedMode }: HeaderProps) => {
  const { disconnect, isConnected, currentAccount } = useWalletKit();
  const { balance, loading: balanceLoading } = useWalletBalance();
  const networkConfig = getNetworkConfig();
  const networkName = networkConfig.network.charAt(0).toUpperCase() + networkConfig.network.slice(1);

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return (
    <header className="w-full border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedMode.gradient} flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]`}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              SuiScratch
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Decentralized Wins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-400">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              networkConfig.network === 'mainnet' ? 'bg-green-500' :
              networkConfig.network === 'testnet' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}></span>
            {networkName} v1.2
          </div>
          <div className="group flex items-center gap-3 bg-[#18181b] pl-4 pr-1.5 py-1.5 rounded-full border border-white/10 shadow-xl transition-all hover:border-white/20">
            <div className="flex flex-col items-end leading-none">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Balance
              </span>
              <span className="font-mono font-bold text-white text-lg">
                {balanceLoading ? '...' : balance.toFixed(2)}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform">
              <Coins size={18} />
            </div>
          </div>
          {isConnected && currentAccount ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg transition-all hover:scale-105 border border-white/20"
            >
              <Wallet size={16} />
              <span className="hidden sm:inline">
                {`${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`}
              </span>
              <span className="sm:hidden">Wallet</span>
            </button>
          ) : (
            <div className="[&>button]:flex [&>button]:items-center [&>button]:gap-2 [&>button]:px-4 [&>button]:py-2 [&>button]:rounded-full [&>button]:bg-gradient-to-r [&>button]:from-purple-600 [&>button]:to-blue-600 [&>button]:hover:from-purple-500 [&>button]:hover:to-blue-500 [&>button]:text-white [&>button]:font-bold [&>button]:text-sm [&>button]:shadow-lg [&>button]:transition-all [&>button]:hover:scale-105 [&>button]:border [&>button]:border-white/20">
              <ConnectButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

