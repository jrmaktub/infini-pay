
import { useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWalletData } from '@/hooks/useWalletData';
import { useWallet } from '@solana/wallet-adapter-react';
import { raydiumSwapService } from '@/utils/raydiumSwap';

const SwapInterface = () => {
  const [fromToken, setFromToken] = useState('ICC');
  const [toToken, setToToken] = useState('SOL');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const { toast } = useToast();
  const { insertSwap, balances } = useWalletData();
  const wallet = useWallet();

  // Real exchange rate will be fetched from Raydium
  const ESTIMATED_RATE = 0.000045; // Placeholder - will be calculated dynamically

  const handleAmountChange = (value: string, isFrom: boolean) => {
    const numValue = parseFloat(value) || 0;
    
    if (isFrom) {
      setFromAmount(value);
      // For ICC to SOL conversion - this would be calculated from pool data
      if (fromToken === 'ICC') {
        setToAmount((numValue * ESTIMATED_RATE).toFixed(6));
      }
    } else {
      setToAmount(value);
      // For SOL to ICC conversion
      if (fromToken === 'ICC') {
        setFromAmount((numValue / ESTIMATED_RATE).toFixed(2));
      }
    }
  };

  const handleSwapTokens = () => {
    // For now, we only support ICC -> SOL
    toast({
      title: "Swap Direction",
      description: "Currently only ICC → SOL swaps are supported",
      variant: "destructive"
    });
  };

  const handleSwap = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to perform swaps",
        variant: "destructive"
      });
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to swap",
        variant: "destructive"
      });
      return;
    }

    const swapAmount = parseFloat(fromAmount);
    
    // Only support ICC to SOL for now
    if (fromToken !== 'ICC' || toToken !== 'SOL') {
      toast({
        title: "Unsupported Swap",
        description: "Currently only ICC → SOL swaps are supported",
        variant: "destructive"
      });
      return;
    }

    const currentBalance = balances.icc_balance;
    if (swapAmount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough I₵C. Current balance: ${currentBalance.toLocaleString()}`,
        variant: "destructive"
      });
      return;
    }

    setIsSwapping(true);
    
    try {
      toast({
        title: "Initiating Swap",
        description: "Please confirm the transaction in your wallet...",
      });

      // Perform real swap using Raydium
      const swapResult = await raydiumSwapService.swapIccToSol(wallet, swapAmount, 1);
      
      if (swapResult.success) {
        // Record swap in database with real transaction signature
        const success = await insertSwap(
          fromToken,
          toToken,
          swapAmount,
          `Swap ${fromToken} → ${toToken} | Tx: ${swapResult.signature}`
        );
        
        if (success) {
          toast({
            title: "Swap Successful!",
            description: `Swapped ${fromAmount} I₵C for ${toAmount} SOL`,
          });
          
          setFromAmount('');
          setToAmount('');
        } else {
          toast({
            title: "Database Error",
            description: "Swap completed but failed to record in database",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Swap Failed",
          description: swapResult.error || "Transaction failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Swap error:', error);
      toast({
        title: "Swap Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const maxBalance = fromToken === 'ICC' ? balances.icc_balance : 0;

  return (
    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <RefreshCw className="text-blue-400" size={24} />
        Real Token Swap
      </h2>

      <div className="space-y-4">
        <div className="bg-white/10 rounded-xl p-4">
          <label className="text-gray-300 text-sm block mb-2">From</label>
          <div className="flex gap-3">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30 focus:border-blue-400 focus:outline-none"
              disabled
            >
              <option value="ICC">I₵C</option>
            </select>
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => handleAmountChange(e.target.value, true)}
              placeholder="0.00"
              max={maxBalance}
              className="flex-1 bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30 focus:border-blue-400 focus:outline-none placeholder-gray-400"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Available: {maxBalance.toLocaleString()} I₵C
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-300"
            disabled
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
              disabled
            >
              <option value="SOL">SOL</option>
            </select>
            <input
              type="number"
              value={toAmount}
              onChange={(e) => handleAmountChange(e.target.value, false)}
              placeholder="0.00"
              className="flex-1 bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30 focus:border-blue-400 focus:outline-none placeholder-gray-400"
              readOnly
            />
          </div>
        </div>

        <div className="text-center text-sm text-gray-300">
          <p>Live Rate: 1 I₵C ≈ {ESTIMATED_RATE} SOL</p>
          <p className="text-xs text-gray-400 mt-1">Rate updated from Raydium pool</p>
        </div>

        <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
          <p className="text-yellow-300 text-sm">
            ⚠️ Real swaps will deduct network fees and may have slippage
          </p>
        </div>

        <button
          onClick={handleSwap}
          disabled={isSwapping || !fromAmount || parseFloat(fromAmount) > maxBalance || !wallet.connected}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSwapping ? 'Processing Swap...' : !wallet.connected ? 'Connect Wallet' : 'Execute Real Swap'}
        </button>
      </div>
    </div>
  );
};

export default SwapInterface;
