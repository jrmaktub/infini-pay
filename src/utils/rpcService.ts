
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
        const result = await Promise.race([blockHashPromise, timeoutPromise]);
        
        console.log('✅ RPCService - Connection test successful:', {
          endpoint,
          slot: result.context?.slot,
          blockhash: result.value.blockhash.slice(0, 8) + '...'
        });
        
        this.connection = testConnection;
        this.currentEndpoint = endpoint;
        return testConnection;
        
      } catch (error) {
        console.log(`❌ RPCService - Failed to connect to ${endpoint}:`, {
          error: error instanceof Error ? error.message : error,
          endpoint
        });
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
        slot: result.context?.slot
      });
      return true;
    } catch (error) {
      console.error('❌ RPCService - Connection test failed:', {
        error: error instanceof Error ? error.message : error,
        endpoint: this.currentEndpoint
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
}

// Export singleton instance
export const rpcService = RPCService.getInstance();
