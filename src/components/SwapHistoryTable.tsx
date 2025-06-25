
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWalletData } from '@/hooks/useWalletData';
import { useWallet } from '@solana/wallet-adapter-react';
import { RefreshCw } from 'lucide-react';

const SwapHistoryTable = () => {
  const { connected } = useWallet();
  const { swaps, loading, fetchSwaps } = useWalletData();

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!connected) {
    return (
      <div className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-6">Swap History</h2>
        <div className="text-center py-8">
          <p className="text-gray-300">Connect your wallet to view swap history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Swap History</h2>
        <button
          onClick={fetchSwaps}
          disabled={loading}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} size={16} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="text-gray-300 mt-2">Loading swap history...</p>
        </div>
      ) : swaps.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-300">No swaps yet</p>
          <p className="text-gray-400 text-sm mt-1">Your swap history will appear here</p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-gray-300 font-semibold">From</TableHead>
                <TableHead className="text-gray-300 font-semibold">To</TableHead>
                <TableHead className="text-gray-300 font-semibold">Amount</TableHead>
                <TableHead className="text-gray-300 font-semibold">Timestamp</TableHead>
                <TableHead className="text-gray-300 font-semibold">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {swaps.map((swap) => (
                <TableRow key={swap.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{swap.token_from}</TableCell>
                  <TableCell className="text-white font-medium">{swap.token_to}</TableCell>
                  <TableCell className="text-white">{swap.amount}</TableCell>
                  <TableCell className="text-gray-300">{formatTimestamp(swap.timestamp)}</TableCell>
                  <TableCell className="text-gray-400">{swap.note || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {swaps.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Showing {swaps.length} swap{swaps.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default SwapHistoryTable;
