
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction, TransactionMessage, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { 
  Raydium, 
  TxVersion, 
  parseTokenAccountResp,
  ApiV3PoolInfoStandardItem,
  CacheLTA
} from '@raydium-io/raydium-sdk-v2';
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

export class RaydiumSwapService {
  private isInitialized: boolean = false;
  private ICC_MINT: PublicKey;
  private SOL_MINT: PublicKey;
  private raydium: Raydium | null = null;
  private poolInfo: ApiV3PoolInfoStandardItem | null = null;

  constructor() {
    console.log('🚀 RaydiumSwapService - Initializing for REAL Raydium SDK swaps...');
    try {
      this.ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');
      this.SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
      console.log('✅ RaydiumSwapService - Real Raydium SDK service ready');
    } catch (error) {
      console.error('❌ RaydiumSwapService - Constructor failed:', error);
      throw error;
    }
  }

  async initialize(): Promise<boolean> {
    console.log('🔧 RaydiumSwapService - Starting REAL Raydium SDK initialization...');
    
    if (this.isInitialized) {
      console.log('✅ RaydiumSwapService - Already initialized for real Raydium swaps');
      return true;
    }

    try {
      const connection = await rpcService.getConnection();
      console.log('✅ RPC connection established for Raydium SDK:', rpcService.getCurrentEndpoint());
      
      // Initialize Raydium SDK
      console.log('🔧 Initializing Raydium SDK...');
      this.raydium = Raydium.load({
        connection,
        cluster: 'mainnet', // or 'devnet'
        disableLoadToken: false, // default is false
        disableFeatureCheck: false, // default is false
        blockhashCommitment: 'finalized', // default is finalized
        // urlConfigs: {
        //   BASE_HOST: '<API_HOST>', // api url configs, currently api doesn't support devnet
        // },
      });
      
      await this.raydium.account.fetchComputeBudgetConfig();
      console.log('✅ Raydium SDK initialized successfully');
      
      // Find ICC/SOL pool
      console.log('🔍 Searching for ICC/SOL pool...');
      await this.findICCSOLPool();
      
      console.log('✅ RaydiumSwapService initialized for REAL ON-CHAIN SWAPS via Raydium SDK');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ RaydiumSwapService - Real Raydium SDK initialization failed:', {
        error: error instanceof Error ? error.message : error,
        rpcInfo: rpcService.getConnectionInfo()
      });
      this.isInitialized = false;
      rpcService.reset();
      return false;
    }
  }

  private async findICCSOLPool(): Promise<void> {
    if (!this.raydium) {
      throw new Error('Raydium SDK not initialized');
    }

    try {
      console.log('🔍 Fetching pool information from Raydium API...');
      
      // Get all pools and find ICC/SOL pool
      const data = await this.raydium.api.fetchPoolList();
      
      // Find pool with ICC and SOL
      const iccSolPool = data.find((pool: ApiV3PoolInfoStandardItem) => {
        const hasICC = pool.mintA.address === this.ICC_MINT.toString() || pool.mintB.address === this.ICC_MINT.toString();
        const hasSOL = pool.mintA.address === this.SOL_MINT.toString() || pool.mintB.address === this.SOL_MINT.toString();
        return hasICC && hasSOL;
      });

      if (iccSolPool) {
        this.poolInfo = iccSolPool;
        console.log('✅ Found ICC/SOL pool:', {
          poolId: iccSolPool.id,
          mintA: iccSolPool.mintA.address,
          mintB: iccSolPool.mintB.address,
          liquidity: iccSolPool.tvl
        });
      } else {
        console.log('⚠️ No direct ICC/SOL pool found, will attempt to find multi-hop route');
        // For now, we'll continue without a direct pool and handle routing later
      }
    } catch (error) {
      console.error('❌ Error finding ICC/SOL pool:', error);
      // Continue without pool info - we can still attempt swaps
    }
  }

  async getAvailableSwapPairs(): Promise<SwapPair[]> {
    console.log('📋 RaydiumSwapService - Fetching real Raydium swap pairs...');
    
    if (!this.isInitialized) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        throw new Error('Failed to initialize RaydiumSwapService for real swaps');
      }
    }
    
    const pairs: SwapPair[] = [
      {
        baseMint: this.ICC_MINT.toString(),
        quoteMint: this.SOL_MINT.toString(),
        baseSymbol: 'ICC',
        quoteSymbol: 'SOL',
        poolId: this.poolInfo?.id || 'raydium-direct'
      }
    ];

    console.log('✅ RaydiumSwapService - Real Raydium swap pairs available:', pairs.length);
    return pairs;
  }

  async getPoolInfo(baseToken: string, quoteToken: string): Promise<PoolInfo | null> {
    console.log(`🏊 RaydiumSwapService - Fetching real Raydium pool info for ${baseToken}/${quoteToken}...`);
    
    if (!this.isInitialized) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        console.error('❌ RaydiumSwapService - Failed to initialize for real pool info');
        return null;
      }
    }
    
    try {
      if (baseToken === 'ICC' && quoteToken === 'SOL' && this.poolInfo) {
        const poolInfo: PoolInfo = {
          poolId: this.poolInfo.id,
          baseReserve: Number(this.poolInfo.mintAmountA),
          quoteReserve: Number(this.poolInfo.mintAmountB),
          price: Number(this.poolInfo.price),
          volume24h: Number(this.poolInfo.day?.volume || 0)
        };

        console.log('✅ RaydiumSwapService - Real Raydium pool info fetched:', poolInfo);
        return poolInfo;
      }

      console.log('ℹ️ RaydiumSwapService - No real pool info available for this pair');
      return null;
    } catch (error) {
      console.error('❌ RaydiumSwapService - Error fetching real pool info:', error);
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
    console.log(`🧮 RaydiumSwapService - Real Raydium swap simulation: ${inputAmount} ${baseToken} → ${quoteToken}`);
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return {
          outputAmount: '0',
          priceImpact: 0,
          minimumReceived: '0',
          error: 'Real Raydium swap service not available - SDK initialization failed'
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
        // Use Raydium SDK to compute swap amounts
        const inputMint = this.ICC_MINT;
        const outputMint = this.SOL_MINT;
        const amountInSmallestUnit = Math.floor(inputAmount * Math.pow(10, 9)); // ICC has 9 decimals
        
        console.log('🔄 Computing swap with Raydium SDK...');
        
        // Get swap route and compute output
        const swapRes = await this.raydium!.liquidity.computeAmountOut({
          poolInfo: this.poolInfo!,
          amountIn: amountInSmallestUnit,
          mintIn: inputMint,
          mintOut: outputMint,
          slippage: slippageTolerance / 100, // Convert to decimal
        });

        if (swapRes.isErr) {
          throw new Error(`Swap computation failed: ${swapRes.val}`);
        }

        const { amountOut, minAmountOut, priceImpact } = swapRes.val;
        
        const outputAmount = Number(amountOut) / LAMPORTS_PER_SOL;
        const minimumReceived = Number(minAmountOut) / LAMPORTS_PER_SOL;
        const priceImpactPct = Number(priceImpact) * 100;

        const result = {
          outputAmount: outputAmount.toFixed(8),
          priceImpact: priceImpactPct,
          minimumReceived: minimumReceived.toFixed(8)
        };

        console.log('✅ RaydiumSwapService - Real Raydium simulation successful:', result);
        return result;
        
      } else {
        return {
          outputAmount: '0',
          priceImpact: 0,
          minimumReceived: '0',
          error: 'Only ICC → SOL real swaps are currently supported'
        };
      }

    } catch (error) {
      console.error('❌ RaydiumSwapService - Real Raydium simulation failed:', error);
      return {
        outputAmount: '0',
        priceImpact: 0,
        minimumReceived: '0',
        error: error instanceof Error ? error.message : 'Real Raydium simulation failed'
      };
    }
  }

  async swapIccToSol(
    wallet: any,
    amountIn: number,
    slippageTolerance: number = 1
  ): Promise<SwapResult> {
    console.log('🔥 RaydiumSwapService - Executing REAL ON-CHAIN RAYDIUM SWAP:', amountIn, 'ICC → SOL');
    
    if (!this.isInitialized || !this.raydium) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return { success: false, error: 'Real Raydium swap service not available - SDK initialization failed' };
      }
    }
    
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: 'Wallet not connected or does not support signing' };
      }

      console.log('🔍 Pre-swap validation for REAL Raydium swap...');
      
      if (amountIn <= 0) {
        return { success: false, error: 'Invalid swap amount' };
      }

      if (!this.poolInfo) {
        return { success: false, error: 'No ICC/SOL pool found on Raydium' };
      }

      const connection = await rpcService.getConnection();
      console.log('💰 Checking ICC balance for REAL Raydium swap via:', rpcService.getCurrentEndpoint());
      
      // Check ICC token balance
      const iccTokenAccount = await getAssociatedTokenAddress(this.ICC_MINT, wallet.publicKey);
      const accountInfo = await connection.getTokenAccountBalance(iccTokenAccount);
      const currentBalance = accountInfo.value.uiAmount || 0;
      
      console.log('💰 REAL Raydium swap balance check:', {
        balance: currentBalance,
        required: amountIn,
        rpcEndpoint: rpcService.getCurrentEndpoint()
      });
      
      if (currentBalance < amountIn) {
        return { 
          success: false, 
          error: `Insufficient ICC balance for real Raydium swap. Available: ${currentBalance}, Required: ${amountIn}` 
        };
      }

      // Build swap transaction with Raydium SDK
      const inputMint = this.ICC_MINT;
      const outputMint = this.SOL_MINT;
      const amountInSmallestUnit = Math.floor(amountIn * Math.pow(10, 9));
      
      console.log('🏗️ Building REAL Raydium swap transaction...');
      
      // Get user token accounts
      const tokenAccountsData = await connection.getTokenAccountsByOwner(wallet.publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });
      
      const tokenAccounts = parseTokenAccountResp({
        owner: wallet.publicKey,
        solBalance: await connection.getBalance(wallet.publicKey),
        tokenAccounts: tokenAccountsData.value,
      });

      // Build swap instruction
      const swapRes = await this.raydium!.liquidity.swap({
        poolInfo: this.poolInfo,
        amountIn: amountInSmallestUnit,
        mintIn: inputMint,
        mintOut: outputMint,
        slippage: slippageTolerance / 100,
        ownerInfo: {
          wallet: wallet.publicKey,
          tokenAccounts,
        },
        associatedOnly: false,
        computeBudgetConfig: await this.raydium!.account.fetchComputeBudgetConfig(),
        txVersion: TxVersion.V0,
      });

      if (swapRes.isErr) {
        throw new Error(`Raydium swap transaction build failed: ${swapRes.val}`);
      }

      const { transaction } = swapRes.val;
      
      console.log('🔐 Signing REAL Raydium transaction...');
      const signedTransaction = await wallet.signTransaction(transaction);
      
      console.log('📡 Submitting REAL Raydium transaction to blockchain...');
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      console.log('⏳ Confirming REAL Raydium transaction:', signature);
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Real Raydium transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('🎉 REAL ON-CHAIN RAYDIUM SWAP COMPLETED SUCCESSFULLY!', {
        signature,
        amountIn,
        poolId: this.poolInfo.id
      });
      
      return { 
        success: true, 
        signature: signature
      };

    } catch (error) {
      console.error('❌ RaydiumSwapService - REAL Raydium swap execution failed:', {
        error: error instanceof Error ? error.message : error,
        rpcEndpoint: rpcService.getCurrentEndpoint()
      });
      
      let errorMessage = 'Real Raydium swap execution failed';
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
console.log('✅ REAL RaydiumSwapService instance exported with direct Raydium SDK integration');
