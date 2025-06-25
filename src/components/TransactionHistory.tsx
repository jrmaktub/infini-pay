
import { History, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useWalletData } from '@/hooks/useWalletData';
import { useWallet } from '@solana/wallet-adapter-react';

const TransactionHistory = () => {
  const { connected } = useWallet();
  const { swaps, loading, fetchSwaps } = useWalletData();

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!connected) {
    return (
      <div className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <History className="text-gray-400" size={24} />
          Transaction History
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-300">Connect your wallet to view transaction history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <History className="text-gray-400" size={24} />
          Transaction History
        </h2>
        <button
          onClick={fetchSwaps}
          disabled={loading}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} size={16} />
        </button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="text-gray-300 mt-2">Loading transactions...</p>
          </div>
        ) : swaps.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-300">No transactions yet</p>
            <p className="text-gray-400 text-sm mt-1">Your swap history will appear here</p>
          </div>
        ) : (
          swaps.map((swap) => (
            <div key={swap.id} className="bg-white/10 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-blue-400" size={20} />
                  <div>
                    <p className="text-white font-medium">Swap</p>
                    <p className="text-gray-300 text-sm">{swap.note || 'Token swap'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">
                    {swap.amount} {swap.token_from} → {swap.token_to}
                  </p>
                  <p className="text-gray-400 text-sm">{formatTimestamp(swap.timestamp)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {swaps.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Showing {swaps.length} transaction{swaps.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
