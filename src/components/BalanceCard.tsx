
import { useWallet } from '@solana/wallet-adapter-react';
import { Coins } from 'lucide-react';
import { useWalletData } from '@/hooks/useWalletData';

const BalanceCard = () => {
  const { connected } = useWallet();
  const { balances, loading } = useWalletData();

  if (!connected) {
    return (
      <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-300">Connect wallet to view balances</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Coins className="text-purple-400" size={24} />
          Real-Time Balances
        </h2>
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
    </div>
  );
};

export default BalanceCard;
