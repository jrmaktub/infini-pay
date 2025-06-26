
import { Connection } from '@solana/web3.js';

export class RPCService {
  private static instance: RPCService;
  private connection: Connection | null = null;
  private currentEndpoint: string = '';
  
  // Multiple RPC endpoints for failover
  private readonly endpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
  ];

  static getInstance(): RPCService {
    if (!RPCService.instance) {
      RPCService.instance = new RPCService();
    }
    return RPCService.instance;
  }

  async getConnection(): Promise<Connection> {
    if (this.connection && this.currentEndpoint) {
      return this.connection;
    }

    console.log('🔍 RPCService - Finding working RPC endpoint...');
    
    for (const endpoint of this.endpoints) {
      try {
        console.log(`🔗 Testing endpoint: ${endpoint}`);
        const testConnection = new Connection(endpoint, 'confirmed');
        
        // Test with timeout
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );
        
        const blockHashPromise = testConnection.getLatestBlockhash();
        await Promise.race([blockHashPromise, timeoutPromise]);
        
        console.log(`✅ RPCService - Successfully connected to: ${endpoint}`);
        this.connection = testConnection;
        this.currentEndpoint = endpoint;
        return testConnection;
        
      } catch (error) {
        console.log(`❌ RPCService - Failed to connect to ${endpoint}:`, error);
        continue;
      }
    }
    
    throw new Error('All RPC endpoints failed');
  }

  async testConnection(): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      await connection.getLatestBlockhash();
      return true;
    } catch (error) {
      console.error('❌ RPCService - Connection test failed:', error);
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
}

// Export singleton instance
export const rpcService = RPCService.getInstance();
