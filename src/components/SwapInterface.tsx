
import { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWalletData } from '@/hooks/useWalletData';
import { useWallet } from '@solana/wallet-adapter-react';
import { raydiumSwapService } from '@/utils/raydiumSwap';
import { useRaydiumSDK, type RaydiumSDKStatus } from '@/hooks/useRaydiumSDK';
import SwapLoadingSkeleton from './SwapLoadingSkeleton';
import SwapErrorFallback from './SwapErrorFallback';

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

interface SimulationResult {
  outputAmount: string;
  priceImpact: number;
  minimumReceived: string;
  error?: string;
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
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const { toast } = useToast();
  const { insertSwap, balances } = useWalletData();
  const wallet = useWallet();
  const { status, error, isReady, retry, canRetry, retryCount } = useRaydiumSDK();

  // Fetch data when SDK becomes ready
  useEffect(() => {
    if (isReady) {
      fetchSwapPairs();
      if (fromToken && toToken) {
        fetchPoolInfo();
      }
    }
  }, [isReady, fromToken, toToken]);

  // Show appropriate loading/error states
  if (status === 'initializing' || status === 'retrying') {
    return <SwapLoadingSkeleton />;
  }

  if (status === 'error' && error) {
    return (
      <SwapErrorFallback 
        error={error}
        onRetry={retry}
        canRetry={canRetry}
        retryCount={retryCount}
      />
    );
  }

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

  const simulateSwap = async (inputAmount: string, isFromInput: boolean) => {
    if (!isReady || !poolInfo || !inputAmount || parseFloat(inputAmount) <= 0) {
      return;
    }

    console.log('SwapInterface - Starting swap simulation...');
    setIsSimulating(true);
    
    try {
      const amount = parseFloat(inputAmount);
      const simulation = await raydiumSwapService.simulateSwap(
        fromToken,
        toToken,
        amount,
        isFromInput
      );
      
      console.log('SwapInterface - Simulation result:', simulation);
      setSimulationResult(simulation);
      
      if (simulation.error) {
        toast({
          title: "Simulation Error",
          description: simulation.error,
          variant: "destructive"
        });
      } else {
        if (isFromInput) {
          setToAmount(simulation.outputAmount);
        } else {
          setFromAmount(simulation.outputAmount);
        }
      }
    } catch (error) {
      console.error('SwapInterface - Simulation failed:', error);
      setSimulationResult({
        outputAmount: '0',
        priceImpact: 0,
        minimumReceived: '0',
        error: error instanceof Error ? error.message : 'Simulation failed'
      });
      
      toast({
        title: "Could not simulate swap",
        description: "Please check inputs and try again",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAmountChange = async (value: string, isFrom: boolean) => {
    const numValue = parseFloat(value) || 0;
    
    if (isFrom) {
      setFromAmount(value);
      if (isReady && numValue > 0) {
        await simulateSwap(value, true);
      } else {
        setToAmount('');
        setSimulationResult(null);
      }
    } else {
      setToAmount(value);
      if (isReady && numValue > 0) {
        await simulateSwap(value, false);
      } else {
        setFromAmount('');
        setSimulationResult(null);
      }
    }
  };

  const handleSwapTokens = () => {
    toast({
      title: "Swap Direction",
      description: "Currently only ICC → SOL swaps are supported",
      variant: "destructive"
    });
  };

  const handleSwap = async () => {
    console.log('handleSwap called - SIMULATION MODE');
    
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

    if (!isReady) {
      toast({
        title: "SDK Not Ready",
        description: "Raydium SDK is not ready for simulation",
        variant: "destructive"
      });
      return;
    }

    setIsSwapping(true);
    
    try {
      console.log('Starting swap simulation with Raydium SDK...');
      
      // Perform final simulation before executing
      const finalSimulation = await raydiumSwapService.simulateSwap(
        fromToken,
        toToken,
        swapAmount,
        true
      );

      if (finalSimulation.error) {
        throw new Error(finalSimulation.error);
      }
      
      toast({
        title: "Swap Simulation",
        description: `Simulating swap with Raydium SDK data...`,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const success = await insertSwap(
        fromToken,
        toToken,
        swapAmount,
        `Simulated swap ${fromToken} → ${toToken} using Raydium SDK simulation`
      );
      
      if (success) {
        toast({
          title: "Swap Simulation Complete!",
          description: `Simulated swap of ${fromAmount} I₵C for ${finalSimulation.outputAmount} SOL`,
        });
        
        setFromAmount('');
        setToAmount('');
        setSimulationResult(null);
      } else {
        toast({
          title: "Database Error",
          description: "Failed to record swap simulation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Swap simulation error:', error);
      toast({
        title: "Swap Simulation Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const maxBalance = fromToken === 'ICC' ? balances.icc_balance : 0;

  const getStatusIcon = () => {
    const currentStatus = status as RaydiumSDKStatus;
    switch (currentStatus) {
      case 'ready':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'initializing':
      case 'retrying':
        return <Clock className="text-yellow-400 animate-pulse" size={16} />;
      default:
        return <AlertCircle className="text-red-400" size={16} />;
    }
  };

  const getStatusText = () => {
    const currentStatus = status as RaydiumSDKStatus;
    switch (currentStatus) {
      case 'ready':
        return 'SDK Active';
      case 'initializing':
        return 'Initializing...';
      case 'retrying':
        return `Retrying... (${retryCount}/3)`;
      default:
        return 'SDK Error';
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <RefreshCw className="text-blue-400" size={24} />
        Token Swap Simulation
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <span className={`text-sm ${status === 'ready' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
            ({getStatusText()})
          </span>
        </div>
      </h2>

      {/* SDK Status Display */}
      <div className={`rounded-lg p-3 border mb-4 ${
        status === 'ready' 
          ? 'bg-green-500/20 border-green-500/30' 
          : status === 'error'
          ? 'bg-red-500/20 border-red-500/30'
          : 'bg-yellow-500/20 border-yellow-500/30'
      }`}>
        <p className={`text-sm ${
          status === 'ready' 
            ? 'text-green-300' 
            : status === 'error'
            ? 'text-red-300'
            : 'text-yellow-300'
        }`}>
          {status === 'ready' && '✅ Raydium SDK active - Simulation enabled'}
          {status === 'initializing' && '🔄 Initializing Raydium SDK...'}
          {status === 'retrying' && `🔄 Retrying SDK initialization (${retryCount}/3)...`}
          {status === 'error' && '❌ SDK error - Simulation unavailable'}
        </p>
      </div>

      {/* Simulation Results */}
      {simulationResult && !simulationResult.error && (
        <div className="bg-blue-500/20 rounded-xl p-4 mb-4 border border-blue-500/30">
          <h3 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
            Simulation Results
            {isSimulating && <Clock className="text-blue-400 animate-spin" size={16} />}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-300">Expected Output:</p>
              <p className="text-white font-semibold">{simulationResult.outputAmount} {toToken}</p>
            </div>
            <div>
              <p className="text-gray-300">Price Impact:</p>
              <p className={`font-semibold ${simulationResult.priceImpact > 5 ? 'text-red-400' : 'text-green-400'}`}>
                {simulationResult.priceImpact.toFixed(2)}%
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-300">Minimum Received (1% slippage):</p>
              <p className="text-white">{simulationResult.minimumReceived} {toToken}</p>
            </div>
          </div>
        </div>
      )}

      {poolInfo && (
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <h3 className="text-white font-medium mb-2 flex items-center gap-2">
            Pool Information
            {isLoadingPool && <Clock className="text-blue-400 animate-spin" size={16} />}
          </h3>
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

      {swapPairs.length > 0 && (
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <h3 className="text-white font-medium mb-2 flex items-center gap-2">
            Available Swap Pairs ({swapPairs.length})
            {isLoadingPairs && <Clock className="text-blue-400 animate-spin" size={16} />}
          </h3>
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
        {/* From Token */}
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

        {/* Swap Arrow */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-300"
            disabled
          >
            <ArrowRight className="text-white" size={20} />
          </button>
        </div>

        {/* To Token */}
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
          {isSimulating && (
            <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
              <Clock className="animate-spin" size={12} />
              Simulating swap...
            </p>
          )}
        </div>

        {/* Exchange Rate */}
        <div className="text-center text-sm text-gray-300">
          <p>
            {poolInfo ? (
              <>Rate: 1 I₵C ≈ {poolInfo.price.toFixed(8)} SOL (Live from Raydium)</>
            ) : (
              <>Loading pool data...</>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isLoadingPool ? 'Fetching pool information...' : status === 'ready' ? 'Real-time simulation' : 'Simulation unavailable'}
          </p>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isSwapping || !fromAmount || parseFloat(fromAmount) > maxBalance || !wallet.connected || status !== 'ready'}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          aria-label={isSwapping ? 'Processing swap simulation' : 'Execute swap simulation'}
        >
          {isSwapping ? 'Processing Simulation...' : !wallet.connected ? 'Connect Wallet' : status !== 'ready' ? 'Service Unavailable' : 'Simulate Swap'}
        </button>
      </div>
    </div>
  );
};

export default SwapInterface;
