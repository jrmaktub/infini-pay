
import { Connection } from '@solana/web3.js';

export class RPCService {
  private static instance: RPCService;
  private connection: Connection | null = null;
  private currentEndpoint: string = '';
  
  // Multiple RPC endpoints with Alchemy as primary
  private readonly endpoints = [
    'https://solana-mainnet.g.alchemy.com/v2/KoKL0N8r5-2X0vfAbasM2', // Primary Alchemy endpoint
    'https://mainnet.helius-rpc.com/?api-key=', // Backup (needs API key)
    'https://solana.publicnode.com', // Public backup
    'https://api.mainnet-beta.solana.com' // Fallback
  ];

  static getInstance(): RPCService {
    if (!RPCService.instance) {
      RPCService.instance = new RPCService();
    }
    return RPCService.instance;
  }

  async getConnection(): Promise<Connection> {
    if (this.connection && this.currentEndpoint) {
      console.log(`🔗 RPCService - Using cached connection: ${this.currentEndpoint}`);
      return this.connection;
    }

    console.log('🔍 RPCService - Finding working RPC endpoint...');
    
    for (const endpoint of this.endpoints) {
      try {
        console.log(`🔗 Testing endpoint: ${endpoint}`);
        console.log(`📡 Making test request to: ${endpoint}`);
        
        const testConnection = new Connection(endpoint, {
          commitment: 'confirmed',
          httpHeaders: {
            'Content-Type': 'application/json',
          }
        });
        
        // Test with shorter timeout for faster failover
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 3s')), 3000)
        );
        
        const blockHashPromise = testConnection.getLatestBlockhash();
        
        console.log(`⏳ Waiting for response from: ${endpoint}`);
        const result = await Promise.race([blockHashPromise, timeoutPromise]);
        
        console.log('✅ RPCService - Connection test successful:', {
          endpoint,
          blockhash: result.blockhash.slice(0, 8) + '...',
          lastValidBlockHeight: result.lastValidBlockHeight
        });
        
        this.connection = testConnection;
        this.currentEndpoint = endpoint;
        return testConnection;
        
      } catch (error) {
        console.log(`❌ RPCService - Failed to connect to ${endpoint}:`, {
          error: error instanceof Error ? error.message : error,
          endpoint,
          errorType: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack?.slice(0, 200) : 'No stack trace'
        });
        
        // Log network-level errors specifically
        if (error instanceof Error) {
          if (error.message.includes('403') || error.message.includes('Forbidden')) {
            console.log(`🚫 HTTP 403 Forbidden - API key may be invalid for: ${endpoint}`);
          } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            console.log(`⏱️ Rate limit exceeded for: ${endpoint}`);
          } else if (error.message.includes('CORS')) {
            console.log(`🌐 CORS error for: ${endpoint}`);
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            console.log(`🌐 Network connectivity issue for: ${endpoint}`);
          }
        }
        continue;
      }
    }
    
    throw new Error('All RPC endpoints failed - unable to connect to Solana network');
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 RPCService - Testing current connection...');
      const connection = await this.getConnection();
      const result = await connection.getLatestBlockhash();
      console.log('✅ RPCService - Connection test passed:', {
        endpoint: this.currentEndpoint,
        blockhash: result.blockhash.slice(0, 8) + '...',
        lastValidBlockHeight: result.lastValidBlockHeight
      });
      return true;
    } catch (error) {
      console.error('❌ RPCService - Connection test failed:', {
        error: error instanceof Error ? error.message : error,
        endpoint: this.currentEndpoint,
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.slice(0, 300)
        } : 'No error details'
      });
      return false;
    }
  }

  getCurrentEndpoint(): string {
    return this.currentEndpoint;
  }

  // Reset connection to force reconnection on next use
  reset(): void {
    console.log('🔄 RPCService - Resetting connection');
    this.connection = null;
    this.currentEndpoint = '';
  }

  // Get connection info for debugging
  getConnectionInfo() {
    return {
      isConnected: !!this.connection,
      currentEndpoint: this.currentEndpoint,
      availableEndpoints: this.endpoints.length
    };
  }

  // Enhanced diagnostics method
  async runDiagnostics(): Promise<void> {
    console.log('🔧 RPCService - Running comprehensive diagnostics...');
    
    for (let i = 0; i < this.endpoints.length; i++) {
      const endpoint = this.endpoints[i];
      console.log(`\n🔍 Testing endpoint ${i + 1}/${this.endpoints.length}: ${endpoint}`);
      
      try {
        const testConnection = new Connection(endpoint, { commitment: 'confirmed' });
        
        const startTime = Date.now();
        const result = await testConnection.getLatestBlockhash();
        const endTime = Date.now();
        
        console.log(`✅ Endpoint ${i + 1} - SUCCESS:`, {
          endpoint,
          responseTime: `${endTime - startTime}ms`,
          blockhash: result.blockhash.slice(0, 8) + '...',
          lastValidBlockHeight: result.lastValidBlockHeight
        });
      } catch (error) {
        console.log(`❌ Endpoint ${i + 1} - FAILED:`, {
          endpoint,
          error: error instanceof Error ? error.message : error,
          errorType: error instanceof Error ? error.name : 'Unknown'
        });
      }
    }
    
    console.log('🔧 RPCService - Diagnostics complete\n');
  }
}

// Export singleton instance
export const rpcService = RPCService.getInstance();
