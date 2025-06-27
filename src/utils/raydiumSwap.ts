
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
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

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: any;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot?: number;
  timeTaken?: number;
}

interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

export class RaydiumSwapService {
  private isInitialized: boolean = false;
  private ICC_MINT: PublicKey;
  private SOL_MINT: PublicKey;
  private JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

  constructor() {
    console.log('🚀 RaydiumSwapService - Initializing for REAL on-chain swaps...');
    try {
      this.ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');
      this.SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
      console.log('✅ RaydiumSwapService - Real swap service ready');
    } catch (error) {
      console.error('❌ RaydiumSwapService - Constructor failed:', error);
      throw error;
    }
  }

  async initialize(): Promise<boolean> {
    console.log('🔧 RaydiumSwapService - Starting REAL swap initialization...');
    
    if (this.isInitialized) {
      console.log('✅ RaydiumSwapService - Already initialized for real swaps');
      return true;
    }

    try {
      // Get RPC connection and test Jupiter API
      const connection = await rpcService.getConnection();
      console.log('✅ RPC connection established for real swaps:', rpcService.getCurrentEndpoint());
      
      // Test Jupiter API availability
      const testResponse = await fetch(`${this.JUPITER_API_URL}/quote?inputMint=${this.ICC_MINT.toString()}&outputMint=${this.SOL_MINT.toString()}&amount=1000000000&slippageBps=50`);
      if (!testResponse.ok) {
        throw new Error('Jupiter API not available');
      }
      
      console.log('✅ Jupiter API connection verified for real swaps');
      console.log('✅ RaydiumSwapService initialized for REAL ON-CHAIN SWAPS');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ RaydiumSwapService - Real swap initialization failed:', {
        error: error instanceof Error ? error.message : error,
        rpcInfo: rpcService.getConnectionInfo()
      });
      this.isInitialized = false;
      rpcService.reset();
      return false;
    }
  }

  async getAvailableSwapPairs(): Promise<SwapPair[]> {
    console.log('📋 RaydiumSwapService - Fetching real swap pairs...');
    
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
        poolId: 'jupiter-aggregator'
      }
    ];

    console.log('✅ RaydiumSwapService - Real swap pairs available:', pairs.length);
    return pairs;
  }

  async getPoolInfo(baseToken: string, quoteToken: string): Promise<PoolInfo | null> {
    console.log(`🏊 RaydiumSwapService - Fetching real pool info for ${baseToken}/${quoteToken}...`);
    
    if (!this.isInitialized) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        console.error('❌ RaydiumSwapService - Failed to initialize for real pool info');
        return null;
      }
    }
    
    try {
      if (baseToken === 'ICC' && quoteToken === 'SOL') {
        // Get real-time price from Jupiter
        const response = await fetch(`${this.JUPITER_API_URL}/quote?inputMint=${this.ICC_MINT.toString()}&outputMint=${this.SOL_MINT.toString()}&amount=1000000000&slippageBps=50`);
        
        if (response.ok) {
          const quoteData: JupiterQuoteResponse = await response.json();
          const price = Number(quoteData.outAmount) / Number(quoteData.inAmount);
          
          const poolInfo: PoolInfo = {
            poolId: 'jupiter-aggregator',
            baseReserve: 1000000,
            quoteReserve: Math.floor(1000000 * price),
            price: price,
            volume24h: 0
          };

          console.log('✅ RaydiumSwapService - Real pool info fetched:', poolInfo);
          return poolInfo;
        }
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
    console.log(`🧮 RaydiumSwapService - Real swap simulation: ${inputAmount} ${baseToken} → ${quoteToken}`);
    
    if (!this.isInitialized) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return {
          outputAmount: '0',
          priceImpact: 0,
          minimumReceived: '0',
          error: 'Real swap service not available - RPC connection failed'
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
        // Get real quote from Jupiter API
        const amountInSmallestUnit = Math.floor(inputAmount * Math.pow(10, 9)); // ICC has 9 decimals
        const slippageBps = Math.floor(slippageTolerance * 100); // Convert to basis points
        
        const response = await fetch(`${this.JUPITER_API_URL}/quote?inputMint=${this.ICC_MINT.toString()}&outputMint=${this.SOL_MINT.toString()}&amount=${amountInSmallestUnit}&slippageBps=${slippageBps}`);
        
        if (!response.ok) {
          throw new Error('Failed to get real quote from Jupiter');
        }
        
        const quoteData: JupiterQuoteResponse = await response.json();
        
        const outputAmount = Number(quoteData.outAmount) / LAMPORTS_PER_SOL;
        const priceImpact = Math.abs(Number(quoteData.priceImpactPct));
        const minimumReceived = Number(quoteData.otherAmountThreshold) / LAMPORTS_PER_SOL;

        const result = {
          outputAmount: outputAmount.toFixed(8),
          priceImpact: priceImpact,
          minimumReceived: minimumReceived.toFixed(8)
        };

        console.log('✅ RaydiumSwapService - Real simulation successful:', result);
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
      console.error('❌ RaydiumSwapService - Real simulation failed:', error);
      return {
        outputAmount: '0',
        priceImpact: 0,
        minimumReceived: '0',
        error: error instanceof Error ? error.message : 'Real simulation failed'
      };
    }
  }

  async swapIccToSol(
    wallet: any,
    amountIn: number,
    slippageTolerance: number = 1
  ): Promise<SwapResult> {
    console.log('🔥 RaydiumSwapService - Executing REAL ON-CHAIN SWAP:', amountIn, 'ICC → SOL');
    
    if (!this.isInitialized) {
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        return { success: false, error: 'Real swap service not available - RPC connection failed' };
      }
    }
    
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        return { success: false, error: 'Wallet not connected or does not support signing' };
      }

      console.log('🔍 Pre-swap validation for REAL swap...');
      
      if (amountIn <= 0) {
        return { success: false, error: 'Invalid swap amount' };
      }

      const connection = await rpcService.getConnection();
      console.log('💰 Checking ICC balance for REAL swap via:', rpcService.getCurrentEndpoint());
      
      // Check ICC token balance
      const iccTokenAccount = await getAssociatedTokenAddress(this.ICC_MINT, wallet.publicKey);
      const accountInfo = await connection.getTokenAccountBalance(iccTokenAccount);
      const currentBalance = accountInfo.value.uiAmount || 0;
      
      console.log('💰 REAL swap balance check:', {
        balance: currentBalance,
        required: amountIn,
        rpcEndpoint: rpcService.getCurrentEndpoint()
      });
      
      if (currentBalance < amountIn) {
        return { 
          success: false, 
          error: `Insufficient ICC balance for real swap. Available: ${currentBalance}, Required: ${amountIn}` 
        };
      }

      // Get real quote from Jupiter
      const amountInSmallestUnit = Math.floor(amountIn * Math.pow(10, 9));
      const slippageBps = Math.floor(slippageTolerance * 100);
      
      console.log('📡 Getting REAL quote from Jupiter API...');
      const quoteResponse = await fetch(`${this.JUPITER_API_URL}/quote?inputMint=${this.ICC_MINT.toString()}&outputMint=${this.SOL_MINT.toString()}&amount=${amountInSmallestUnit}&slippageBps=${slippageBps}`);
      
      if (!quoteResponse.ok) {
        throw new Error('Failed to get real quote from Jupiter API');
      }
      
      const quoteData: JupiterQuoteResponse = await quoteResponse.json();
      console.log('✅ REAL Jupiter quote received:', {
        inputAmount: quoteData.inAmount,
        outputAmount: quoteData.outAmount,
        priceImpact: quoteData.priceImpactPct
      });

      // Get swap transaction from Jupiter
      console.log('🏗️ Building REAL swap transaction...');
      const swapResponse = await fetch(`${this.JUPITER_API_URL}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        }),
      });

      if (!swapResponse.ok) {
        const errorData = await swapResponse.text();
        throw new Error(`Jupiter swap API error: ${errorData}`);
      }

      const swapData: JupiterSwapResponse = await swapResponse.json();
      console.log('✅ REAL swap transaction received from Jupiter');

      // Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      console.log('🔐 Signing REAL transaction...');
      const signedTransaction = await wallet.signTransaction(transaction);
      
      console.log('📡 Submitting REAL transaction to blockchain...');
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      console.log('⏳ Confirming REAL transaction:', signature);
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: (await connection.getLatestBlockhash()).blockhash,
        lastValidBlockHeight: swapData.lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Real transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('🎉 REAL ON-CHAIN SWAP COMPLETED SUCCESSFULLY!', {
        signature,
        amountIn,
        jupiterQuote: quoteData.outAmount
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
console.log('✅ REAL RaydiumSwapService instance exported');
