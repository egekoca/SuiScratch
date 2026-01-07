import { useState, useEffect } from 'react';
import { Shield, Coins, TrendingUp, ArrowDownCircle, ArrowUpCircle, X, RefreshCw } from 'lucide-react';
import { useWalletKit } from '@mysten/wallet-kit';
import { 
  fundTreasury, 
  withdrawFromTreasury, 
  getTreasuryBalance, 
  getTotalDistributed,
  suiToMist, 
  mistToSui 
} from '@/utils/contract';
import { useTransaction } from '@/hooks/useTransaction';

const ADMIN_ADDRESS = '0x25ad5635da6045902f6d7abcba29c8596d4985da89a4895444ddadcbdf96f061';

export const AdminPanel = () => {
  const { signAndExecuteTransactionBlock, isConnected, currentAccount } = useWalletKit();
  const fundTransaction = useTransaction();
  const withdrawTransaction = useTransaction();
  
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [totalDistributed, setTotalDistributed] = useState<number>(0);
  const [fundAmount, setFundAmount] = useState<string>('10');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('10');
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const isAdmin = isConnected && currentAccount?.address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  const refreshData = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const [balance, distributed] = await Promise.all([
        getTreasuryBalance(),
        getTotalDistributed(),
      ]);
      setTreasuryBalance(mistToSui(balance));
      setTotalDistributed(mistToSui(distributed));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && showPanel) {
      refreshData();
      // Auto-refresh every 10 seconds
      const interval = setInterval(refreshData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, showPanel]);

  const handleFund = async () => {
    if (!isAdmin) {
      alert('Only admin can fund treasury');
      return;
    }

    const amountNum = parseFloat(fundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const amountInMist = suiToMist(amountNum);
      const txHash = await fundTransaction.execute(async () => {
        return await fundTreasury(amountInMist, signAndExecuteTransactionBlock);
      });

      if (txHash) {
        alert(`Successfully funded treasury with ${amountNum} SUI!`);
        setFundAmount('10');
        await refreshData();
      }
    } catch (error: any) {
      console.error('Error funding treasury:', error);
      alert(error?.message || 'Failed to fund treasury. Please try again.');
    }
  };

  const handleWithdraw = async () => {
    if (!isAdmin) {
      alert('Only admin can withdraw from treasury');
      return;
    }

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amountNum > treasuryBalance) {
      alert('Insufficient treasury balance');
      return;
    }

    try {
      const amountInMist = suiToMist(amountNum);
      const txHash = await withdrawTransaction.execute(async () => {
        return await withdrawFromTreasury(amountInMist, signAndExecuteTransactionBlock);
      });

      if (txHash) {
        alert(`Successfully withdrew ${amountNum} SUI from treasury!`);
        setWithdrawAmount('10');
        await refreshData();
      }
    } catch (error: any) {
      console.error('Error withdrawing from treasury:', error);
      alert(error?.message || 'Failed to withdraw from treasury. Please try again.');
    }
  };

  // Only show admin button if connected wallet is admin
  if (!isAdmin) {
    return null;
  }

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg transition-all hover:scale-105 border border-white/20"
      >
        <Shield size={16} />
        <span className="hidden sm:inline">Admin Panel</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#18181b] rounded-3xl border border-white/20 p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Admin Panel</h2>
              <p className="text-xs text-slate-400">Treasury Management</p>
            </div>
          </div>
          <button
            onClick={() => setShowPanel(false)}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 rounded-2xl border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <Coins size={20} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Treasury Balance
              </span>
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {loading ? '...' : treasuryBalance.toFixed(2)}
            </div>
            <div className="text-sm text-blue-400 font-bold">SUI</div>
          </div>

          <div className="bg-gradient-to-br from-green-900/40 to-slate-900/40 rounded-2xl border border-white/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={20} className="text-green-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Distributed
              </span>
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {loading ? '...' : totalDistributed.toFixed(2)}
            </div>
            <div className="text-sm text-green-400 font-bold">SUI</div>
          </div>
        </div>

        {/* Fund Treasury */}
        <div className="bg-slate-900/50 rounded-2xl border border-white/10 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownCircle size={20} className="text-green-400" />
            <h3 className="text-lg font-bold text-white">Fund Treasury</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">
                Amount (SUI)
              </label>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="10"
                min="0"
                step="0.1"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white font-mono focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            {fundTransaction.error && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50">
                <p className="text-sm font-bold text-red-400">{fundTransaction.error}</p>
              </div>
            )}

            <button
              onClick={handleFund}
              disabled={!isConnected || fundTransaction.loading}
              className={`
                w-full py-3 px-4 rounded-xl font-bold text-white
                bg-gradient-to-r from-green-600 to-emerald-600
                hover:from-green-500 hover:to-emerald-500
                transition-all hover:scale-105
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              `}
            >
              {fundTransaction.loading ? (
                'Processing...'
              ) : (
                <>
                  <ArrowDownCircle size={18} />
                  Fund Treasury
                </>
              )}
            </button>
          </div>
        </div>

        {/* Withdraw from Treasury */}
        <div className="bg-slate-900/50 rounded-2xl border border-white/10 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle size={20} className="text-red-400" />
            <h3 className="text-lg font-bold text-white">Withdraw from Treasury</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">
                Amount (SUI)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="10"
                min="0"
                step="0.1"
                max={treasuryBalance}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white font-mono focus:outline-none focus:border-red-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">
                Available: {treasuryBalance.toFixed(2)} SUI
              </p>
            </div>

            {withdrawTransaction.error && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50">
                <p className="text-sm font-bold text-red-400">{withdrawTransaction.error}</p>
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={!isConnected || withdrawTransaction.loading || parseFloat(withdrawAmount) > treasuryBalance}
              className={`
                w-full py-3 px-4 rounded-xl font-bold text-white
                bg-gradient-to-r from-red-600 to-orange-600
                hover:from-red-500 hover:to-orange-500
                transition-all hover:scale-105
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              `}
            >
              {withdrawTransaction.loading ? (
                'Processing...'
              ) : (
                <>
                  <ArrowUpCircle size={18} />
                  Withdraw from Treasury
                </>
              )}
            </button>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refreshData}
          disabled={loading}
          className="w-full py-2 px-4 rounded-xl font-bold text-slate-400 hover:text-white bg-slate-900/50 border border-white/10 hover:border-white/20 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>
    </div>
  );
};

