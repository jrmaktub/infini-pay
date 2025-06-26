
import { raydiumSwapService } from './raydiumSwap';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class OptimizedRaydiumService {
  private cache = new Map<string, CacheEntry<any>>();
  private requestQueue = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  
  // Cache durations in milliseconds
  private readonly CACHE_DURATIONS = {
    POOL_INFO: 30000, // 30 seconds
    SWAP_PAIRS: 60000, // 1 minute
    SIMULATION: 5000,  // 5 seconds
    BALANCE: 10000     // 10 seconds
  };

  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiresAt;
  }

  private setCache<T>(key: string, data: T, duration: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration
    };
    
    this.cache.set(key, entry);
    
    // Clean up expired entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now >= entry.expiresAt) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.cache.delete(key));
    console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
  }

  private async withCache<T>(
    cacheKey: string,
    cacheDuration: number,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached.data;
    }

    // Check if request is already in progress
    const existingRequest = this.requestQueue.get(cacheKey);
    if (existingRequest) {
      console.log(`Request deduplication for ${cacheKey}`);
      return existingRequest;
    }

    // Execute the operation
    const requestPromise = operation();
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.setCache(cacheKey, result, cacheDuration);
      return result;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  private debounce<T extends (...args: any[]) => Promise<any>>(
    key: string,
    fn: T,
    delay: number
  ): T {
    return ((...args: any[]) => {
      return new Promise((resolve, reject) => {
        // Clear existing timer
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Set new timer
        const timer = setTimeout(async () => {
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.debounceTimers.delete(key);
          }
        }, delay);

        this.debounceTimers.set(key, timer);
      });
    }) as T;
  }

  async getSwapPairs() {
    const cacheKey = this.getCacheKey('getSwapPairs');
    return this.withCache(
      cacheKey,
      this.CACHE_DURATIONS.SWAP_PAIRS,
      () => raydiumSwapService.getAvailableSwapPairs()
    );
  }

  async getPoolInfo(baseToken: string, quoteToken: string) {
    const cacheKey = this.getCacheKey('getPoolInfo', baseToken, quoteToken);
    return this.withCache(
      cacheKey,
      this.CACHE_DURATIONS.POOL_INFO,
      () => raydiumSwapService.getPoolInfo(baseToken, quoteToken)
    );
  }

  async simulateSwap(
    baseToken: string,
    quoteToken: string,
    inputAmount: number,
    isFromBase: boolean,
    slippageTolerance?: number
  ) {
    const cacheKey = this.getCacheKey('simulateSwap', baseToken, quoteToken, inputAmount, isFromBase, slippageTolerance);
    
    // Use debounced simulation for frequent calls
    const debouncedSimulation = this.debounce(
      `simulate_${baseToken}_${quoteToken}`,
      () => raydiumSwapService.simulateSwap(baseToken, quoteToken, inputAmount, isFromBase, slippageTolerance),
      300 // 300ms debounce
    );

    return this.withCache(
      cacheKey,
      this.CACHE_DURATIONS.SIMULATION,
      debouncedSimulation
    );
  }

  async getTokenBalance(mintAddress: string, ownerAddress: string) {
    const cacheKey = this.getCacheKey('getTokenBalance', mintAddress, ownerAddress);
    return this.withCache(
      cacheKey,
      this.CACHE_DURATIONS.BALANCE,
      () => raydiumSwapService.getTokenBalance(mintAddress, ownerAddress)
    );
  }

  // Pass-through methods that shouldn't be cached
  async swapIccToSol(wallet: any, amountIn: number, slippageTolerance?: number) {
    return raydiumSwapService.swapIccToSol(wallet, amountIn, slippageTolerance);
  }

  async initialize() {
    return raydiumSwapService.initialize();
  }

  // Cache management methods
  clearCache(): void {
    this.cache.clear();
    this.requestQueue.clear();
    console.log('Raydium service cache cleared');
  }

  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach(entry => {
      if (this.isCacheValid(entry)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      activeRequests: this.requestQueue.size,
      activeDebounceTimers: this.debounceTimers.size
    };
  }

  // Memory optimization
  dispose(): void {
    this.clearCache();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

export const optimizedRaydiumService = new OptimizedRaydiumService();
