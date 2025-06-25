
import { useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWalletData } from '@/hooks/useWalletData';

const SwapInterface = () => {
  const [fromToken, setFromToken] = useState('ICC');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const { toast } = useToast();
  const { insertSwap } = useWalletData();

  const EXCHANGE_RATE = 0.95; // 1 ICC = 0.95 USDC

  const handleAmountChange = (value: string, isFrom: boolean) => {
    const numValue = parseFloat(value) || 0;
    
    if (isFrom) {
      setFromAmount(value);
      if (fromToken === 'ICC') {
        setToAmount((numValue * EXCHANGE_RATE).toFixed(2));
      } else {
        setToAmount((numValue / EXCHANGE_RATE).toFixed(2));
      }
    } else {
      setToAmount(value);
      if (fromToken === 'ICC') {
        setFromAmount((numValue / EXCHANGE_RATE).toFixed(2));
      } else {
        setFromAmount((numValue * EXCHANGE_RATE).toFixed(2));
      }
    }
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to swap",
        variant: "destructive"
      });
      return;
    }

    setIsSwapping(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Record swap in Supabase
    const success = await insertSwap(
      fromToken,
      toToken,
      parseFloat(fromAmount),
      `${fromToken} → ${toToken} swap`
    );
    
    if (success) {
      toast({
        title: "Swap Successful!",
        description: `Swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
      });
      
      setFromAmount('');
      setToAmount('');
    }
    
    setIsSwapping(false);
  };

  return (
    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <RefreshCw className="text-blue-400" size={24} />
        Token Swap
      </h2>

      <div className="space-y-4">
        <div className="bg-white/10 rounded-xl p-4">
          <label className="text-gray-300 text-sm block mb-2">From</label>
          <div className="flex gap-3">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30 focus:border-blue-400 focus:outline-none"
            >
              <option value="ICC">ICC</option>
              <option value="USDC">USDC</option>
            </select>
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => handleAmountChange(e.target.value, true)}
              placeholder="0.00"
              className="flex-1 bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30 focus:border-blue-400 focus:outline-none placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-300"
          >
            <ArrowRight className="text-white" size={20} />
          </button>
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <label className="text-gray-300 text-sm block mb-2">To</label>
          <div className="flex gap-3">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30 focus:border-blue-400 focus:outline-none"
            >
              <option value="USDC">USDC</option>
              <option value="ICC">ICC</option>
            </select>
            <input
              type="number"
              value={toAmount}
              onChange={(e) => handleAmountChange(e.target.value, false)}
              placeholder="0.00"
              className="flex-1 bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30 focus:border-blue-400 focus:outline-none placeholder-gray-400"
            />
          </div>
        </div>

        <div className="text-center text-sm text-gray-300">
          Rate: 1 ICC = {EXCHANGE_RATE} USDC
        </div>

        <button
          onClick={handleSwap}
          disabled={isSwapping || !fromAmount}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSwapping ? 'Swapping...' : 'Swap Tokens'}
        </button>
      </div>
    </div>
  );
};

export default SwapInterface;
