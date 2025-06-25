
import { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWalletData } from '@/hooks/useWalletData';
import { useWallet } from '@solana/wallet-adapter-react';
import { raydiumSwapService } from '@/utils/raydiumSwap';

interface SwapPair {
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
  poolId: string;
}

interface PoolInfo {
  poolId: string;
  baseReserve: number;
  quoteReserve: number;
  price: number;
  volume24h?: number;
}

const SwapInterface = () => {
  console.log('SwapInterface component rendering...');
  
  const [fromToken, setFromToken] = useState('ICC');
  const [toToken, setToToken] = useState('SOL');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapPairs, setSwapPairs] = useState<SwapPair[]>([]);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const { toast } = useToast();
  const { insertSwap, balances } = useWalletData();
  const wallet = useWallet();

  // Fetch swap pairs on component mount
  useEffect(() => {
    fetchSwapPairs();
  }, []);

  // Fetch pool info when tokens change
  useEffect(() => {
    if (fromToken && toToken) {
      fetchPoolInfo();
    }
  }, [fromToken, toToken]);

  const fetchSwapPairs = async () => {
    console.log('SwapInterface - Fetching swap pairs...');
    setIsLoadingPairs(true);
    
    try {
      const pairs = await raydiumSwapService.getAvailableSwapPairs();
      console.log('SwapInterface - Successfully fetched swap pairs:', pairs);
      setSwapPairs(pairs);
      
      toast({
        title: "Swap Pairs Loaded",
        description: `Found ${pairs.length} available swap pairs`,
      });
    } catch (error) {
      console.error('SwapInterface - Error fetching swap pairs:', error);
      toast({
        title: "Error Loading Swap Pairs",
        description: error instanceof Error ? error.message : "Failed to load swap pairs",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPairs(false);
    }
  };

  const fetchPoolInfo = async () => {
    console.log(`SwapInterface - Fetching pool info for ${fromToken}/${toToken}...`);
    setIsLoadingPool(true);
    
    try {
      const info = await raydiumSwapService.getPoolInfo(fromToken, toToken);
      console.log('SwapInterface - Successfully fetched pool info:', info);
      setPoolInfo(info);
      
      if (info) {
        toast({
          title: "Pool Info Updated",
          description: `${fromToken}/${toToken} pool loaded successfully`,
        });
      }
    } catch (error) {
      console.error('SwapInterface - Error fetching pool info:', error);
      toast({
        title: "Error Loading Pool Info",
        description: error instanceof Error ? error.message : "Failed to load pool information",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPool(false);
    }
  };

  const handleAmountChange = (value: string, isFrom: boolean) => {
    const numValue = parseFloat(value) || 0;
    
    if (isFrom) {
      setFromAmount(value);
      // Calculate estimated output based on pool info
      if (poolInfo && numValue > 0) {
        const estimatedOutput = (numValue * poolInfo.price).toFixed(6);
        setToAmount(estimatedOutput);
        console.log(`SwapInterface - Calculated output: ${numValue} ${fromToken} → ${estimatedOutput} ${toToken}`);
      } else {
        setToAmount('');
      }
    } else {
      setToAmount(value);
      // Calculate required input based on pool info
      if (poolInfo && numValue > 0) {
        const requiredInput = (numValue / poolInfo.price).toFixed(2);
        setFromAmount(requiredInput);
        console.log(`SwapInterface - Calculated input: ${requiredInput} ${fromToken} → ${numValue} ${toToken}`);
      } else {
        setFromAmount('');
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
    console.log('handleSwap called - READ-ONLY MODE');
    
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
      console.log('Starting swap simulation with Raydium SDK data...');
      
      toast({
        title: "Swap Simulation",
        description: "Simulating swap with real Raydium pool data...",
      });

      // Simulate swap delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Record swap in database as simulation
      const success = await insertSwap(
        fromToken,
        toToken,
        swapAmount,
        `Simulated swap ${fromToken} → ${toToken} using Raydium pool data`
      );
      
      if (success) {
        toast({
          title: "Swap Simulation Complete!",
          description: `Simulated swap of ${fromAmount} I₵C for ${toAmount} SOL`,
        });
        
        setFromAmount('');
        setToAmount('');
      } else {
        toast({
          title: "Database Error",
          description: "Failed to record swap simulation",
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

  console.log('SwapInterface rendering with balances:', balances);
  console.log('SwapInterface rendering with pool info:', poolInfo);

  return (
    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <RefreshCw className="text-blue-400" size={24} />
        Token Swap (Read-Only Integration)
      </h2>

      {/* Pool Information Display */}
      {poolInfo && (
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <h3 className="text-white font-medium mb-2">Pool Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-300">Pool ID:</p>
              <p className="text-white font-mono text-xs">{poolInfo.poolId}</p>
            </div>
            <div>
              <p className="text-gray-300">Current Price:</p>
              <p className="text-white">{poolInfo.price.toFixed(8)} SOL/ICC</p>
            </div>
            <div>
              <p className="text-gray-300">Base Reserve:</p>
              <p className="text-white">{poolInfo.baseReserve.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-300">Quote Reserve:</p>
              <p className="text-white">{poolInfo.quoteReserve.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Swap Pairs Information */}
      {swapPairs.length > 0 && (
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <h3 className="text-white font-medium mb-2">Available Swap Pairs ({swapPairs.length})</h3>
          <div className="text-sm text-gray-300">
            {swapPairs.slice(0, 3).map((pair, index) => (
              <div key={index} className="flex justify-between">
                <span>{pair.baseSymbol}/{pair.quoteSymbol}</span>
                <span className="font-mono text-xs">{pair.poolId.slice(0, 8)}...</span>
              </div>
            ))}
            {swapPairs.length > 3 && (
              <p className="text-xs text-gray-400 mt-1">...and {swapPairs.length - 3} more</p>
            )}
          </div>
        </div>
      )}

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
          <p>
            {poolInfo ? (
              <>Rate: 1 I₵C ≈ {poolInfo.price.toFixed(8)} SOL (Live from Raydium)</>
            ) : (
              <>Loading pool data...</>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isLoadingPool ? 'Fetching pool information...' : 'Read-only integration active'}
          </p>
        </div>

        <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
          <p className="text-green-300 text-sm">
            ✅ Raydium SDK successfully integrated for read-only operations
          </p>
        </div>

        <button
          onClick={handleSwap}
          disabled={isSwapping || !fromAmount || parseFloat(fromAmount) > maxBalance || !wallet.connected}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSwapping ? 'Processing Simulation...' : !wallet.connected ? 'Connect Wallet' : 'Simulate Swap'}
        </button>
      </div>
    </div>
  );
};

export default SwapInterface;
