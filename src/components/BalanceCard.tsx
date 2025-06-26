
import { useWallet } from '@solana/wallet-adapter-react';
import { Coins, TrendingUp, RefreshCw } from 'lucide-react';
import { useWalletData } from '@/hooks/useWalletData';

const BalanceCard = () => {
  const { connected } = useWallet();
  const { balances, loading, fetchBalances, lastBalanceCheck } = useWalletData();

  if (!connected) {
    return (
      <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-300">Connect wallet to view balances</p>
        </div>
      </div>
    );
  }

  const handleRefreshBalances = () => {
    fetchBalances();
  };

  const getLastUpdateText = () => {
    if (!lastBalanceCheck) return 'Never updated';
    const now = Date.now();
    const diffSeconds = Math.floor((now - lastBalanceCheck) / 1000);
    
    if (diffSeconds < 60) return `Updated ${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `Updated ${Math.floor(diffSeconds / 60)}m ago`;
    return `Updated ${Math.floor(diffSeconds / 3600)}h ago`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Coins className="text-purple-400" size={24} />
          Real-Time Balances
        </h2>
        <div className="flex items-center gap-2">
          <TrendingUp className="text-green-400" size={20} />
          <button
            onClick={handleRefreshBalances}
            disabled={loading}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Refresh balances"
          >
            <RefreshCw className={`text-white w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Balance Update Status */}
      <div className="mb-4 text-xs text-gray-400 flex items-center justify-between">
        <span>🔗 Live blockchain data</span>
        <span>{getLastUpdateText()}</span>
      </div>

      <div className="space-y-4">
        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-300 text-sm">I₵C Balance</p>
              <p className="text-2xl font-bold text-white">
                {loading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `${balances.icc_balance.toLocaleString()} I₵C`
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">I₵C</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-300 text-sm">USDC Balance</p>
              <p className="text-2xl font-bold text-white">
                {loading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `$${balances.usdc_balance.toLocaleString()} USDC`
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">USDC</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-300 text-sm">SOL Balance</p>
              <p className="text-2xl font-bold text-white">
                {loading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `${balances.sol_balance.toFixed(4)} SOL`
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">SOL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-4 text-xs text-gray-500 border-t border-white/10 pt-2">
        <p>🔍 Debug: {loading ? 'Fetching...' : 'Balances loaded'}</p>
        <p>📡 Source: Solana Mainnet RPC</p>
      </div>
    </div>
  );
};

export default BalanceCard;
