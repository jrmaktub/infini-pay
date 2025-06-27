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
  private readonly RAYDIUM_API_BASE = 'https://api-v3.raydium.io/v2';

  constructor() {
    console.log('🚀 RaydiumSwapService - Initializing with API-driven approach...');
    try {
      this.ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');
      this.SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
      console.log('✅ RaydiumSwapService - Constructor ready with API endpoints');
    } catch (error) {
      console.error('❌ RaydiumSwapService - Constructor failed:', error);
      throw error;
    }
  }

  async initialize(): Promise<boolean> {
    console.log('🔧 RaydiumSwapService - Starting API-driven initialization...');
    
    if (this.isInitialized && this.raydium) {
      console.log('✅ RaydiumSwapService - Already initialized');
      return true;
    }

    try {
      const connection = await rpcService.getConnection();
      console.log('✅ RPC connection established:', rpcService.getCurrentEndpoint());
      
      // Initialize Raydium SDK v2 for pool data fetching only
      console.log('🔄 Loading Raydium SDK v2 for pool data...');
      this.raydium = await Raydium.load({
        connection,
        cluster: 'mainnet',
        disableFeatureCheck: false,
        disableLoadToken: false,
        blockhashCommitment: 'finalized',
      });
      
      console.log('✅ Raydium SDK v2 loaded for pool data fetching');
      
      // Verify the connection works
      const latestBlockhash = await connection.getLatestBlockhash();
      console.log('✅ Connection verified with blockhash:', latestBlockhash.blockhash.slice(0, 8));
      
      console.log('✅ RaydiumSwapService initialized with API-driven approach');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ RaydiumSwapService - API-driven initialization failed:', {
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
    console.log('🔥 RaydiumSwapService - Executing REAL API-driven swap:', amountIn, 'ICC → SOL');
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return { success: false, error: 'API service not available - initialization failed' };
      }
    }
    
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: 'Wallet not connected or does not support signing' };
      }

      console.log('🔍 Pre-swap validation with API approach...');
      
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

      // Prepare API call payload following the demo pattern
      const swapPayload = {
        inputMint: this.ICC_MINT.toBase58(),
        outputMint: this.SOL_MINT.toBase58(),
        amount: amountIn * Math.pow(10, 9), // Convert to base units (ICC has 9 decimals)
        slippageBps: slippageTolerance * 100, // Convert percentage to basis points
        txVersion: 'V0' as const, // Use string format as expected by API
        ownerPubkey: wallet.publicKey.toBase58()
      };

      console.log('📡 Making API call to Raydium swap endpoint:', swapPayload);

      // Make the API call to Raydium's swap endpoint
      const response = await fetch(`${this.RAYDIUM_API_BASE}/transaction/swap-base-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapPayload)
      });

      if (!response.ok) {
        throw new Error(`Raydium API error: ${response.status} ${response.statusText}`);
      }

      const apiResult: SwapAPIResponse = await response.json();
      
      if (!apiResult.success || !apiResult.data?.swapTransactions) {
        throw new Error(apiResult.error || 'API returned no swap transactions');
      }

      console.log('✅ Received swap transactions from API:', apiResult.data.swapTransactions.length);

      // Deserialize and sign the transactions
      const transactions: VersionedTransaction[] = apiResult.data.swapTransactions.map(txData => {
        const txBuffer = Buffer.from(txData, 'base64');
        return VersionedTransaction.deserialize(txBuffer);
      });

      console.log('🔄 Signing transactions...');
      const signedTransactions: VersionedTransaction[] = [];
      
      for (const tx of transactions) {
        const signedTx = await wallet.signTransaction(tx);
        signedTransactions.push(signedTx);
      }

      console.log('📡 Sending REAL transactions to network...');
      let finalSignature = '';
      
      // Send all transactions
      for (let i = 0; i < signedTransactions.length; i++) {
        const signedTx = signedTransactions[i];
        
        console.log(`📡 Sending transaction ${i + 1}/${signedTransactions.length}...`);
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        console.log(`⏳ Confirming transaction ${i + 1}: ${signature}`);
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
          throw new Error(`Transaction ${i + 1} failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        // Keep the last signature as the main one
        finalSignature = signature;
        console.log(`✅ Transaction ${i + 1} confirmed: ${signature}`);
      }

      console.log('🎉 REAL API-driven swap completed successfully:', {
        finalSignature,
        transactionCount: signedTransactions.length,
        amountIn
      });
      
      return { 
        success: true, 
        signature: finalSignature
      };

    } catch (error) {
      console.error('❌ RaydiumSwapService - API-driven swap execution failed:', {
        error: error instanceof Error ? error.message : error,
        rpcEndpoint: rpcService.getCurrentEndpoint()
      });
      
      let errorMessage = 'API-driven swap execution failed';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (error.message.includes('Insufficient')) {
          errorMessage = 'Insufficient balance or liquidity';
        } else if (error.message.includes('network') || error.message.includes('RPC')) {
          errorMessage = 'Network connection error - please try again';
        } else if (error.message.includes('slippage')) {
          errorMessage = 'Price moved too much during swap - try increasing slippage tolerance';
        } else if (error.message.includes('API error')) {
          errorMessage = 'Raydium API error - service may be temporarily unavailable';
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
console.log('✅ RaydiumSwapService instance exported with API-driven functionality');
