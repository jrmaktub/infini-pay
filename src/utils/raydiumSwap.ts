import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction, TransactionMessage, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { Raydium, TxVersion } from '@raydium-io/raydium-sdk-v2';
import { rpcService } from './rpcService';
import './polyfills';

interface SwapResult {
  success: boolean;
  signature?: string;
  error?: string;
}

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

interface SwapAPIResponse {
  success: boolean;
  data?: {
    swapTransactions: string[];
  };
  error?: string;
}

// Multi-hop route definition
interface SwapRoute {
  inputMint: string;
  outputMint: string;
  hops: Array<{
    poolId: string;
    poolType: string;
    inputMint: string;
    outputMint: string;
  }>;
}

// Enhanced type guards for different pool types with better logging
function isCPMMPool(pool: any): boolean {
  console.log('🔍 Checking if pool is CPMM:', {
    poolId: pool?.id,
    type: pool?.type,
    programId: pool?.programId,
    poolKeys: pool?.poolKeys ? 'present' : 'missing',
    hasType: pool?.type !== undefined,
    typeValue: pool?.type
  });
  
  // Check multiple possible indicators for CPMM pools
  const isCPMM = pool && (
    pool.type === 'CPMM' || 
    pool.type === 'CLMM' || // Sometimes CPMM pools are labeled as CLMM
    pool.type === 'Standard' ||
    pool.programId === 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C' ||
    (pool.poolKeys && pool.poolKeys.programId?.toString() === 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C')
  );
  
  console.log('✅ CPMM check result:', isCPMM);
  return isCPMM;
}

function isConcentratedLiquidityPool(pool: any): boolean {
  console.log('🔍 Checking if pool is Concentrated Liquidity:', {
    poolId: pool?.id,
    type: pool?.type,
    programId: pool?.programId,
    hasType: pool?.type !== undefined,
    typeValue: pool?.type
  });
  
  const isCLMM = pool && (
    pool.type === 'Concentrated' || 
    pool.type === 'CLMM' ||
    pool.programId === 'CAMMCzo5YL8w4VFF8KVHrK22GGUQpMkFr9WeJBgcYLNa' ||
    (pool.poolKeys && pool.poolKeys.programId?.toString() === 'CAMMCzo5YL8w4VFF8KVHrK22GGUQpMkFr9WeJBgcYLNa')
  );
  
  console.log('✅ CLMM check result:', isCLMM);
  return isCLMM;
}

function isStandardPool(pool: any): boolean {
  console.log('🔍 Checking if pool is Standard:', {
    poolId: pool?.id,
    type: pool?.type,
    programId: pool?.programId,
    hasType: pool?.type !== undefined,
    typeValue: pool?.type
  });
  
  const isStandard = pool && (
    pool.type === 'Standard' || 
    pool.type === 'AMM' ||
    pool.programId === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' ||
    (pool.poolKeys && pool.poolKeys.programId?.toString() === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
  );
  
  console.log('✅ Standard check result:', isStandard);
  return isStandard;
}

export class RaydiumSwapService {
  private raydium: Raydium | null = null;
  private isInitialized: boolean = false;
  private ICC_MINT: PublicKey;
  private SOL_MINT: PublicKey;
  private USDC_MINT: PublicKey;
  private readonly RAYDIUM_API_BASE = 'https://api-v3.raydium.io/v2';

  constructor() {
    console.log('🚀 RaydiumSwapService - Initializing with multi-hop swap support...');
    try {
      this.ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');
      this.SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
      this.USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint
      console.log('✅ RaydiumSwapService - Constructor ready with multi-hop routing');
    } catch (error) {
      console.error('❌ RaydiumSwapService - Constructor failed:', error);
      throw error;
    }
  }

  async initialize(): Promise<boolean> {
    console.log('🔧 RaydiumSwapService - Starting multi-hop initialization...');
    
    if (this.isInitialized && this.raydium) {
      console.log('✅ RaydiumSwapService - Already initialized');
      return true;
    }

    try {
      const connection = await rpcService.getConnection();
      console.log('✅ RPC connection established:', rpcService.getCurrentEndpoint());
      
      // Initialize Raydium SDK v2 for multi-hop swaps
      console.log('🔄 Loading Raydium SDK v2 for multi-hop swaps...');
      this.raydium = await Raydium.load({
        connection,
        cluster: 'mainnet',
        disableFeatureCheck: false,
        disableLoadToken: false,
        blockhashCommitment: 'finalized',
      });
      
      console.log('✅ Raydium SDK v2 loaded for multi-hop functionality');
      
      // Verify the connection works
      const latestBlockhash = await connection.getLatestBlockhash();
      console.log('✅ Connection verified with blockhash:', latestBlockhash.blockhash.slice(0, 8));
      
      console.log('✅ RaydiumSwapService initialized with multi-hop support');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ RaydiumSwapService - Multi-hop initialization failed:', {
        error: error instanceof Error ? error.message : error,
        rpcInfo: rpcService.getConnectionInfo()
      });
      this.isInitialized = false;
      this.raydium = null;
      rpcService.reset();
      return false;
    }
  }

  async findMultiHopRoute(inputMint: string, outputMint: string): Promise<SwapRoute | null> {
    console.log(`🔍 Finding multi-hop route: ${inputMint} → ${outputMint}`);
    
    if (!this.isInitialized || !this.raydium) {
      console.error('❌ SDK not initialized for route finding');
      return null;
    }

    try {
      // For ICC → SOL, use the known multi-hop route: ICC → USDC → wSOL
      if (inputMint === this.ICC_MINT.toBase58() && outputMint === this.SOL_MINT.toBase58()) {
        console.log('🛣️ Using ICC → USDC → wSOL multi-hop route');
        
        // Find ICC/USDC pools
        console.log('🔍 Fetching ICC/USDC pools...');
        const iccUsdcPools = await this.raydium.api.fetchPoolByMints({
          mint1: this.ICC_MINT.toBase58(),
          mint2: this.USDC_MINT.toBase58(),
        });

        // Find USDC/wSOL pools
        console.log('🔍 Fetching USDC/wSOL pools...');
        const usdcSolPools = await this.raydium.api.fetchPoolByMints({
          mint1: this.USDC_MINT.toBase58(),
          mint2: this.SOL_MINT.toBase58(),
        });

        const iccUsdcPoolsArray = iccUsdcPools.data || [];
        const usdcSolPoolsArray = usdcSolPools.data || [];

        console.log('📊 Pool discovery results:', {
          iccUsdcPools: iccUsdcPoolsArray.length,
          usdcSolPools: usdcSolPoolsArray.length
        });

        // Log all ICC/USDC pools for debugging
        console.log('🔍 All ICC/USDC pools found:');
        iccUsdcPoolsArray.forEach((pool, index) => {
          console.log(`Pool ${index + 1}:`, {
            id: pool.id,
            type: pool.type,
            programId: pool.programId,
            mintA: pool.mintA,
            mintB: pool.mintB,
            price: pool.price,
            fullPool: pool
          });
        });

        // Log all USDC/SOL pools for debugging
        console.log('🔍 All USDC/SOL pools found:');
        usdcSolPoolsArray.slice(0, 5).forEach((pool, index) => {
          console.log(`Pool ${index + 1}:`, {
            id: pool.id,
            type: pool.type,
            programId: pool.programId,
            mintA: pool.mintA,
            mintB: pool.mintB,
            price: pool.price
          });
        });

        // Try to find any suitable pool for ICC/USDC (be more flexible)
        let firstHopPool = null;
        for (const pool of iccUsdcPoolsArray) {
          if (pool && pool.id && (pool.type || pool.programId)) {
            console.log('✅ Found suitable ICC/USDC pool:', {
              id: pool.id,
              type: pool.type,
              programId: pool.programId
            });
            firstHopPool = pool;
            break;
          }
        }

        // Try to find any suitable pool for USDC/SOL (be more flexible)
        let secondHopPool = null;
        for (const pool of usdcSolPoolsArray) {
          if (pool && pool.id && (pool.type || pool.programId)) {
            console.log('✅ Found suitable USDC/SOL pool:', {
              id: pool.id,
              type: pool.type,
              programId: pool.programId
            });
            secondHopPool = pool;
            break;
          }
        }

        if (firstHopPool && secondHopPool) {
          const route: SwapRoute = {
            inputMint: this.ICC_MINT.toBase58(),
            outputMint: this.SOL_MINT.toBase58(),
            hops: [
              {
                poolId: firstHopPool.id,
                poolType: firstHopPool.type || 'Unknown',
                inputMint: this.ICC_MINT.toBase58(),
                outputMint: this.USDC_MINT.toBase58()
              },
              {
                poolId: secondHopPool.id,
                poolType: secondHopPool.type || 'Unknown',
                inputMint: this.USDC_MINT.toBase58(),
                outputMint: this.SOL_MINT.toBase58()
              }
            ]
          };

          console.log('✅ Multi-hop route constructed successfully:', route);
          return route;
        } else {
          console.log('❌ Could not find suitable pools:', { 
            firstHopPool: !!firstHopPool, 
            secondHopPool: !!secondHopPool,
            iccUsdcPools: iccUsdcPoolsArray.length,
            usdcSolPools: usdcSolPoolsArray.length
          });
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error finding multi-hop route:', error);
      return null;
    }
  }

  async getAvailableSwapPairs(): Promise<SwapPair[]> {
    console.log('📋 RaydiumSwapService - Fetching multi-hop swap pairs...');
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        throw new Error('Failed to initialize RaydiumSwapService');
      }
    }
    
    try {
      const pairs: SwapPair[] = [];
      
      // Check for multi-hop route availability
      const route = await this.findMultiHopRoute(
        this.ICC_MINT.toBase58(), 
        this.SOL_MINT.toBase58()
      );
      
      if (route) {
        pairs.push({
          baseMint: this.ICC_MINT.toString(),
          quoteMint: this.SOL_MINT.toString(),
          baseSymbol: 'ICC',
          quoteSymbol: 'SOL',
          poolId: `multi-hop-${route.hops.length}-hops`
        });
        console.log('✅ Multi-hop pair available: ICC/SOL');
      }

      return pairs;
    } catch (error) {
      console.error('❌ Error fetching multi-hop pairs:', error);
      // Return fallback pair
      return [{
        baseMint: this.ICC_MINT.toString(),
        quoteMint: this.SOL_MINT.toString(),
        baseSymbol: 'ICC',
        quoteSymbol: 'SOL',
        poolId: 'fallback-multi-hop'
      }];
    }
  }

  async getPoolInfo(baseToken: string, quoteToken: string): Promise<PoolInfo | null> {
    console.log(`🏊 RaydiumSwapService - Fetching multi-hop pool info for ${baseToken}/${quoteToken}...`);
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        console.error('❌ RaydiumSwapService - Failed to initialize for pool info');
        return null;
      }
    }
    
    try {
      if (baseToken === 'ICC' && quoteToken === 'SOL') {
        const route = await this.findMultiHopRoute(
          this.ICC_MINT.toBase58(), 
          this.SOL_MINT.toBase58()
        );
        
        if (route && route.hops.length > 0) {
          // Get info from the first hop (ICC/USDC) for display purposes
          const firstHop = route.hops[0];
          const iccUsdcPools = await this.raydium!.api.fetchPoolByMints({
            mint1: this.ICC_MINT.toBase58(),
            mint2: this.USDC_MINT.toBase58(),
          });

          const poolsArray = iccUsdcPools.data || [];
          const cpmm = poolsArray.find(isCPMMPool);
          
          if (cpmm) {
            const poolInfo: PoolInfo = {
              poolId: `multi-hop-${route.hops.length}-hops`,
              baseReserve: cpmm.mintAmountA || 0,
              quoteReserve: cpmm.mintAmountB || 0,
              price: cpmm.price || 0,
              volume24h: cpmm.day?.volume || 0
            };

            console.log('✅ Multi-hop pool info fetched:', poolInfo);
            return poolInfo;
          }
        }
      }

      console.log('ℹ️ RaydiumSwapService - No multi-hop route available for this pair');
      return null;
    } catch (error) {
      console.error('❌ RaydiumSwapService - Error fetching multi-hop pool info:', error);
      return null;
    }
  }

  async simulateSwap(
    baseToken: string,
    quoteToken: string,
    inputAmount: number,
    isFromBase: boolean,
    slippageTolerance: number = 1
  ): Promise<{
    outputAmount: string;
    priceImpact: number;
    minimumReceived: string;
    error?: string;
  }> {
    console.log(`🧮 RaydiumSwapService - Multi-hop simulation: ${inputAmount} ${baseToken} → ${quoteToken}`);
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return {
          outputAmount: '0',
          priceImpact: 0,
          minimumReceived: '0',
          error: 'Multi-hop SDK not available - initialization failed'
        };
      }
    }
    
    try {
      // Validate inputs
      if (inputAmount <= 0) {
        return {
          outputAmount: '0',
          priceImpact: 0,
          minimumReceived: '0',
          error: 'Invalid input amount'
        };
      }

      if (baseToken === 'ICC' && quoteToken === 'SOL' && isFromBase) {
        const route = await this.findMultiHopRoute(
          this.ICC_MINT.toBase58(), 
          this.SOL_MINT.toBase58()
        );
        
        if (route && route.hops.length >= 2) {
          // Simulate first hop: ICC → USDC
          const iccUsdcPools = await this.raydium!.api.fetchPoolByMints({
            mint1: this.ICC_MINT.toBase58(),
            mint2: this.USDC_MINT.toBase58(),
          });

          const iccUsdcPoolsArray = iccUsdcPools.data || [];
          const cpmm = iccUsdcPoolsArray.find(isCPMMPool);
          
          if (cpmm) {
            // Estimate first hop output (ICC → USDC)
            const iccPrice = cpmm.price || 0;
            const usdcAmount = inputAmount * iccPrice;
            
            // Simulate second hop: USDC → wSOL
            const usdcSolPools = await this.raydium!.api.fetchPoolByMints({
              mint1: this.USDC_MINT.toBase58(),
              mint2: this.SOL_MINT.toBase58(),
            });

            const usdcSolPoolsArray = usdcSolPools.data || [];
            const clmm = usdcSolPoolsArray.find(isConcentratedLiquidityPool);
            
            if (clmm) {
              // Estimate final output (USDC → SOL)
              const usdcSolPrice = clmm.price || 0;
              const finalSolAmount = usdcAmount * usdcSolPrice;
              
              // Calculate combined price impact (simplified)
              const priceImpact = Math.min((inputAmount / (cpmm.mintAmountA || 1)) * 100 + 
                                          (usdcAmount / (clmm.mintAmountA || 1)) * 100, 15);
              const minimumReceived = finalSolAmount * (1 - slippageTolerance / 100);

              const result = {
                outputAmount: finalSolAmount.toFixed(8),
                priceImpact: priceImpact,
                minimumReceived: minimumReceived.toFixed(8)
              };

              console.log('✅ Multi-hop simulation successful:', result);
              return result;
            }
          }
        }
      }

      return {
        outputAmount: '0',
        priceImpact: 0,
        minimumReceived: '0',
        error: 'No multi-hop route found for this swap pair'
      };

    } catch (error) {
      console.error('❌ RaydiumSwapService - Multi-hop simulation failed:', error);
      return {
        outputAmount: '0',
        priceImpact: 0,
        minimumReceived: '0',
        error: error instanceof Error ? error.message : 'Multi-hop simulation failed'
      };
    }
  }

  async swapIccToSol(
    wallet: any,
    amountIn: number,
    slippageTolerance: number = 1
  ): Promise<SwapResult> {
    console.log('🔥 RaydiumSwapService - Executing REAL multi-hop swap:', amountIn, 'ICC → USDC → SOL');
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return { success: false, error: 'Multi-hop service not available - initialization failed' };
      }
    }
    
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: 'Wallet not connected or does not support signing' };
      }

      console.log('🛣️ Finding multi-hop route for ICC → SOL...');
      
      const route = await this.findMultiHopRoute(
        this.ICC_MINT.toBase58(), 
        this.SOL_MINT.toBase58()
      );
      
      if (!route || route.hops.length === 0) {
        return { success: false, error: 'No multi-hop route available for ICC → SOL' };
      }

      console.log('✅ Multi-hop route found:', route);
      
      if (amountIn <= 0) {
        return { success: false, error: 'Invalid swap amount' };
      }

      const connection = await rpcService.getConnection();
      console.log('💰 Checking ICC balance via:', rpcService.getCurrentEndpoint());
      
      // Check ICC token balance
      try {
        const iccTokenAccount = await getAssociatedTokenAddress(this.ICC_MINT, wallet.publicKey);
        const accountInfo = await connection.getTokenAccountBalance(iccTokenAccount);
        const currentBalance = accountInfo.value.uiAmount || 0;
        
        console.log('💰 Balance check:', {
          balance: currentBalance,
          required: amountIn,
          rpcEndpoint: rpcService.getCurrentEndpoint()
        });
        
        if (currentBalance < amountIn) {
          return { 
            success: false, 
            error: `Insufficient ICC balance. Available: ${currentBalance}, Required: ${amountIn}` 
          };
        }
      } catch (balanceError) {
        console.warn('⚠️ Could not check ICC balance, proceeding with multi-hop swap attempt');
      }

      // Use Raydium API for multi-hop swap - the API handles route optimization
      const swapPayload = {
        inputMint: this.ICC_MINT.toBase58(),
        outputMint: this.SOL_MINT.toBase58(),
        amount: amountIn * Math.pow(10, 9), // Convert to base units (ICC has 9 decimals)
        slippageBps: slippageTolerance * 100, // Convert percentage to basis points
        txVersion: 'V0' as const,
        ownerPubkey: wallet.publicKey.toBase58()
      };

      console.log('📡 Making multi-hop API call to Raydium swap endpoint:', swapPayload);

      // Make the API call to Raydium's swap endpoint (handles multi-hop automatically)
      const response = await fetch(`${this.RAYDIUM_API_BASE}/transaction/swap-base-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapPayload)
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error response:', errorText);
        throw new Error(`Raydium multi-hop API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const apiResult: SwapAPIResponse = await response.json();
      console.log('📡 API Response data:', apiResult);
      
      if (!apiResult.success || !apiResult.data?.swapTransactions) {
        throw new Error(apiResult.error || 'Multi-hop API returned no swap transactions');
      }

      console.log('✅ Received multi-hop swap transactions from API:', apiResult.data.swapTransactions.length);

      // Deserialize and sign the transactions
      const transactions: VersionedTransaction[] = apiResult.data.swapTransactions.map(txData => {
        const txBuffer = Buffer.from(txData, 'base64');
        return VersionedTransaction.deserialize(txBuffer);
      });

      console.log('🔄 Signing multi-hop transactions...');
      const signedTransactions: VersionedTransaction[] = [];
      
      for (const tx of transactions) {
        const signedTx = await wallet.signTransaction(tx);
        signedTransactions.push(signedTx);
      }

      console.log('📡 Sending REAL multi-hop transactions to network...');
      let finalSignature = '';
      
      // Send all transactions
      for (let i = 0; i < signedTransactions.length; i++) {
        const signedTx = signedTransactions[i];
        
        console.log(`📡 Sending multi-hop transaction ${i + 1}/${signedTransactions.length}...`);
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        console.log(`⏳ Confirming multi-hop transaction ${i + 1}: ${signature}`);
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
          throw new Error(`Multi-hop transaction ${i + 1} failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        // Keep the last signature as the main one
        finalSignature = signature;
        console.log(`✅ Multi-hop transaction ${i + 1} confirmed: ${signature}`);
      }

      console.log('🎉 REAL multi-hop swap completed successfully:', {
        finalSignature,
        transactionCount: signedTransactions.length,
        amountIn,
        route: 'ICC → USDC → SOL'
      });
      
      return { 
        success: true, 
        signature: finalSignature
      };

    } catch (error) {
      console.error('❌ RaydiumSwapService - Multi-hop swap execution failed:', {
        error: error instanceof Error ? error.message : error,
        rpcEndpoint: rpcService.getCurrentEndpoint()
      });
      
      let errorMessage = 'Multi-hop swap execution failed';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (error.message.includes('Insufficient')) {
          errorMessage = 'Insufficient balance or liquidity';
        } else if (error.message.includes('network') || error.message.includes('RPC')) {
          errorMessage = 'Network connection error - please try again';
        } else if (error.message.includes('slippage')) {
          errorMessage = 'Price moved too much during swap - try increasing slippage tolerance';
        } else if (error.message.includes('multi-hop API error')) {
          errorMessage = 'Raydium multi-hop API error - service may be temporarily unavailable';
        } else {
          errorMessage = error.message;
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }
}

// Export singleton instance
export const raydiumSwapService = new RaydiumSwapService();
console.log('✅ RaydiumSwapService instance exported with multi-hop functionality');
