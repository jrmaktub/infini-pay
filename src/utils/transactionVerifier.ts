
import { Connection, PublicKey } from '@solana/web3.js';
import { rpcService } from './rpcService';

export interface TransactionVerificationResult {
  exists: boolean;
  confirmed: boolean;
  signature: string;
  blockTime?: number;
  slot?: number;
  error?: string;
}

export class TransactionVerifier {
  
  static async verifyTransaction(signature: string): Promise<TransactionVerificationResult> {
    console.log('🔍 Verifying transaction on blockchain:', signature);
    
    try {
      const connection = await rpcService.getConnection();
      
      // Get transaction details
      const transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (!transaction) {
        console.log('❌ Transaction not found on blockchain:', signature);
        return {
          exists: false,
          confirmed: false,
          signature,
          error: 'Transaction not found on blockchain'
        };
      }
      
      const isConfirmed = transaction.meta?.err === null;
      
      console.log('✅ Transaction verification result:', {
        signature,
        exists: true,
        confirmed: isConfirmed,
        blockTime: transaction.blockTime,
        slot: transaction.slot,
        error: transaction.meta?.err ? JSON.stringify(transaction.meta.err) : undefined
      });
      
      return {
        exists: true,
        confirmed: isConfirmed,
        signature,
        blockTime: transaction.blockTime || undefined,
        slot: transaction.slot,
        error: transaction.meta?.err ? JSON.stringify(transaction.meta.err) : undefined
      };
      
    } catch (error) {
      console.error('❌ Error verifying transaction:', error);
      return {
        exists: false,
        confirmed: false,
        signature,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }
  
  static async getTransactionStatus(signature: string): Promise<'pending' | 'confirmed' | 'failed' | 'not_found'> {
    const result = await this.verifyTransaction(signature);
    
    if (!result.exists) {
      return 'not_found';
    }
    
    if (result.error && result.error !== 'Transaction not found on blockchain') {
      return 'failed';
    }
    
    return result.confirmed ? 'confirmed' : 'pending';
  }
  
  static isMockTransaction(signature: string): boolean {
    // Check if this is a mock transaction signature
    return signature.startsWith('SWAP_') && signature.includes('_');
  }
  
  static getSolscanUrl(signature: string): string {
    return `https://solscan.io/tx/${signature}`;
  }
  
  static getSolanaFmUrl(signature: string): string {
    return `https://solana.fm/tx/${signature}`;
  }
}

export const transactionVerifier = TransactionVerifier;
