
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

// Strict type guard to ensure we only work with Standard pools
function isStandardPool(pool: any): pool is any {
  return pool && 
         pool.type === 'Standard' && 
         'marketId' in pool && 
         typeof pool.marketId === 'string' &&
         'configId' in pool &&
         typeof pool.configId === 'string' &&
         'lpPrice' in pool &&
         typeof pool.lpPrice === 'number' &&
         'lpAmount' in pool &&
         typeof pool.lpAmount === 'number' &&
         'lpMint' in pool &&
         pool.lpMint &&
         typeof pool.lpMint === 'object';
}

export class RaydiumSwapService {
  private raydium: Raydium | null = null;
  private isInitialized: boolean = false;
  private ICC_MINT: PublicKey;
  private SOL_MINT: PublicKey;

  constructor() {
    console.log('🚀 RaydiumSwapService - Initializing with SDK v2...');
    try {
      this.ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');
      this.SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
      console.log('✅ RaydiumSwapService - Constructor ready');
    } catch (error) {
      console.error('❌ RaydiumSwapService - Constructor failed:', error);
      throw error;
    }
  }

  async initialize(): Promise<boolean> {
    console.log('🔧 RaydiumSwapService - Starting SDK v2 initialization...');
    
    if (this.isInitialized && this.raydium) {
      console.log('✅ RaydiumSwapService - Already initialized');
      return true;
    }

    try {
      const connection = await rpcService.getConnection();
      console.log('✅ RPC connection established:', rpcService.getCurrentEndpoint());
      
      // Initialize Raydium SDK v2
      console.log('🔄 Loading Raydium SDK v2...');
      this.raydium = await Raydium.load({
        connection,
        cluster: 'mainnet', // Use mainnet for real swaps
        disableFeatureCheck: false,
        disableLoadToken: false,
        blockhashCommitment: 'finalized',
      });
      
      console.log('✅ Raydium SDK v2 loaded successfully');
      
      // Verify the connection works
      const latestBlockhash = await connection.getLatestBlockhash();
      console.log('✅ Connection verified with blockhash:', latestBlockhash.blockhash.slice(0, 8));
      
      console.log('✅ RaydiumSwapService initialized successfully with SDK v2');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ RaydiumSwapService - SDK v2 initialization failed:', {
        error: error instanceof Error ? error.message : error,
        rpcInfo: rpcService.getConnectionInfo()
      });
      this.isInitialized = false;
      this.raydium = null;
      rpcService.reset();
      return false;
    }
  }

  async getAvailableSwapPairs(): Promise<SwapPair[]> {
    console.log('📋 RaydiumSwapService - Fetching swap pairs with SDK v2...');
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        throw new Error('Failed to initialize RaydiumSwapService with SDK v2');
      }
    }
    
    try {
      // Use SDK v2 to fetch available pools - convert PublicKey to string
      const poolsData = await this.raydium!.api.fetchPoolByMints({
        mint1: this.ICC_MINT.toBase58(),
        mint2: this.SOL_MINT.toBase58(),
      });

      const pairs: SwapPair[] = [];
      
      // Handle the pools data correctly - it's an object with data property
      const poolsArray = poolsData.data || [];
      
      // Filter for Standard pools only
      const standardPools = poolsArray.filter(isStandardPool);
      console.log(`🔍 Found ${poolsArray.length} total pools, ${standardPools.length} Standard pools`);
      
      if (standardPools.length > 0) {
        for (const pool of standardPools) {
          pairs.push({
            baseMint: pool.mintA.address,
            quoteMint: pool.mintB.address,
            baseSymbol: pool.mintA.symbol || 'ICC',
            quoteSymbol: pool.mintB.symbol || 'SOL',
            poolId: pool.id
          });
        }
      }

      console.log('✅ RaydiumSwapService - SDK v2 Standard swap pairs found:', pairs.length);
      return pairs;
    } catch (error) {
      console.error('❌ Error fetching pools with SDK v2:', error);
      // Return fallback pair
      return [{
        baseMint: this.ICC_MINT.toString(),
        quoteMint: this.SOL_MINT.toString(),
        baseSymbol: 'ICC',
        quoteSymbol: 'SOL',
        poolId: 'fallback-pool'
      }];
    }
  }

  async getPoolInfo(baseToken: string, quoteToken: string): Promise<PoolInfo | null> {
    console.log(`🏊 RaydiumSwapService - Fetching pool info with SDK v2 for ${baseToken}/${quoteToken}...`);
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        console.error('❌ RaydiumSwapService - Failed to initialize for pool info');
        return null;
      }
    }
    
    try {
      if (baseToken === 'ICC' && quoteToken === 'SOL') {
        // Convert PublicKey to string for API call
        const poolsData = await this.raydium!.api.fetchPoolByMints({
          mint1: this.ICC_MINT.toBase58(),
          mint2: this.SOL_MINT.toBase58(),
        });

        const poolsArray = poolsData.data || [];
        
        // Filter for Standard pools only
        const standardPools = poolsArray.filter(isStandardPool);
        
        if (standardPools.length > 0) {
          const pool = standardPools[0];
          const poolInfo: PoolInfo = {
            poolId: pool.id,
            baseReserve: pool.mintAmountA,
            quoteReserve: pool.mintAmountB,
            price: pool.price,
            volume24h: pool.day?.volume || 0
          };

          console.log('✅ RaydiumSwapService - SDK v2 Standard pool info fetched:', poolInfo);
          return poolInfo;
        }
      }

      console.log('ℹ️ RaydiumSwapService - No Standard pool info available for this pair');
      return null;
    } catch (error) {
      console.error('❌ RaydiumSwapService - Error fetching pool info with SDK v2:', error);
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
    console.log(`🧮 RaydiumSwapService - SDK v2 swap simulation: ${inputAmount} ${baseToken} → ${quoteToken}`);
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return {
          outputAmount: '0',
          priceImpact: 0,
          minimumReceived: '0',
          error: 'SDK v2 not available - initialization failed'
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
        // Get Standard pool information for accurate simulation
        const poolsData = await this.raydium!.api.fetchPoolByMints({
          mint1: this.ICC_MINT.toBase58(),
          mint2: this.SOL_MINT.toBase58(),
        });

        const poolsArray = poolsData.data || [];
        const standardPools = poolsArray.filter(isStandardPool);
        
        if (standardPools.length > 0) {
          const pool = standardPools[0];
          const price = pool.price;
          const outputAmount = inputAmount * price;
          const priceImpact = Math.min((inputAmount / pool.mintAmountA) * 100, 15);
          const minimumReceived = outputAmount * (1 - slippageTolerance / 100);

          const result = {
            outputAmount: outputAmount.toFixed(8),
            priceImpact: priceImpact,
            minimumReceived: minimumReceived.toFixed(8)
          };

          console.log('✅ RaydiumSwapService - SDK v2 simulation successful:', result);
          return result;
        }
      }

      return {
        outputAmount: '0',
        priceImpact: 0,
        minimumReceived: '0',
        error: 'No Standard pool found for this swap pair'
      };

    } catch (error) {
      console.error('❌ RaydiumSwapService - SDK v2 simulation failed:', error);
      return {
        outputAmount: '0',
        priceImpact: 0,
        minimumReceived: '0',
        error: error instanceof Error ? error.message : 'Simulation failed'
      };
    }
  }

  async swapIccToSol(
    wallet: any,
    amountIn: number,
    slippageTolerance: number = 1
  ): Promise<SwapResult> {
    console.log('🔥 RaydiumSwapService - Executing REAL ON-CHAIN swap with SDK v2:', amountIn, 'ICC → SOL');
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return { success: false, error: 'SDK v2 not available - initialization failed' };
      }
    }
    
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: 'Wallet not connected or does not support signing' };
      }

      console.log('🔍 Pre-swap validation with SDK v2...');
      
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
        console.warn('⚠️ Could not check ICC balance, proceeding with swap attempt');
      }

      // Get pool information and ensure it's a Standard pool
      const poolsData = await this.raydium!.api.fetchPoolByMints({
        mint1: this.ICC_MINT.toBase58(),
        mint2: this.SOL_MINT.toBase58(),
      });

      const poolsArray = poolsData.data || [];
      
      if (poolsArray.length === 0) {
        return { success: false, error: 'No liquidity pool found for ICC/SOL' };
      }

      // Filter for Standard pools only using the type guard
      const standardPools = poolsArray.filter(isStandardPool);
      
      if (standardPools.length === 0) {
        console.log('Available pool types:', poolsArray.map(p => `${p.type} (${p.id})`));
        return { success: false, error: 'No Standard pool found for ICC/SOL. Only Standard pools support swaps.' };
      }
      
      const standardPool = standardPools[0];
      console.log('🏊 Using Standard pool:', standardPool.id, 'Type:', standardPool.type);

      // Execute REAL on-chain swap using SDK v2 with correct parameters
      console.log('🚀 Executing REAL on-chain swap transaction...');
      
      // Get the associated token accounts
      const iccTokenAccount = await getAssociatedTokenAddress(this.ICC_MINT, wallet.publicKey);
      const solTokenAccount = await getAssociatedTokenAddress(this.SOL_MINT, wallet.publicKey);
      
      // Use the correct parameter structure for SDK v2 swap based on actual SDK requirements
      // The swap method expects specific parameter names without nested ownerInfo
      const swapTransaction = await this.raydium!.liquidity.swap({
        poolInfo: standardPool,
        amountIn: amountIn * Math.pow(10, 9), // Convert to base units (ICC has 9 decimals)
        amountOut: 0, // Will be calculated by the SDK
        fixedSide: 'in', // We're specifying the input amount
        owner: wallet.publicKey,
        tokenAccountIn: iccTokenAccount,
        tokenAccountOut: solTokenAccount,
        txVersion: TxVersion.V0,
      });

      // Sign and send the transaction
      console.log('✍️ Signing transaction...');
      const signedTx = await wallet.signTransaction(swapTransaction);
      
      console.log('📡 Sending REAL transaction to network...');
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('⏳ Confirming REAL transaction:', signature);
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('🎉 REAL on-chain swap completed successfully:', {
        signature,
        amountIn,
        pool: standardPool.id,
        poolType: standardPool.type
      });
      
      return { 
        success: true, 
        signature: signature
      };

    } catch (error) {
      console.error('❌ RaydiumSwapService - REAL swap execution failed:', {
        error: error instanceof Error ? error.message : error,
        rpcEndpoint: rpcService.getCurrentEndpoint()
      });
      
      let errorMessage = 'Real swap execution failed';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (error.message.includes('Insufficient')) {
          errorMessage = 'Insufficient balance or liquidity';
        } else if (error.message.includes('network') || error.message.includes('RPC')) {
          errorMessage = 'Network connection error - please try again';
        } else if (error.message.includes('slippage')) {
          errorMessage = 'Price moved too much during swap - try increasing slippage tolerance';
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
console.log('✅ RaydiumSwapService instance exported with REAL SDK v2 functionality');
