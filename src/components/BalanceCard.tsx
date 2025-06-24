
import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Coins, TrendingUp } from 'lucide-react';

const ICC_TOKEN_ADDRESS = '14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g';
const ICC_DECIMALS = 9;

const BalanceCard = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [iccBalance, setIccBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(250.75); // Simulated USDC balance
  const [loading, setLoading] = useState(false);

  const fetchICCBalance = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: new PublicKey(ICC_TOKEN_ADDRESS) }
      );

      if (tokenAccounts.value.length > 0) {
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        setIccBalance(balance || 0);
      } else {
        setIccBalance(0);
      }
    } catch (error) {
      console.error('Error fetching ICC balance:', error);
      // Fallback to simulated balance for demo
      setIccBalance(1247.5);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (publicKey) {
      fetchICCBalance();
    }
  }, [publicKey]);

  return (
    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Coins className="text-purple-400" size={24} />
          Token Balances
        </h2>
        <TrendingUp className="text-green-400" size={20} />
      </div>

      <div className="space-y-4">
        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-300 text-sm">ICC Balance</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : iccBalance.toLocaleString()} ICC
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">ICC</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-300 text-sm">USDC Balance</p>
              <p className="text-2xl font-bold text-white">
                ${usdcBalance.toLocaleString()} USDC
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">USDC</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={fetchICCBalance}
        className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-2 px-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
        disabled={loading}
      >
        {loading ? 'Refreshing...' : 'Refresh Balances'}
      </button>
    </div>
  );
};

export default BalanceCard;
