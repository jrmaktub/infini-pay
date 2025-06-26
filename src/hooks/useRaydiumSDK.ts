
import { useState, useEffect, useCallback, useRef } from 'react';
import { raydiumSwapService } from '@/utils/raydiumSwap';

export type RaydiumSDKStatus = 'idle' | 'initializing' | 'ready' | 'error' | 'retrying';

export interface RaydiumSDKState {
  status: RaydiumSDKStatus;
  error: string | null;
  isReady: boolean;
  retryCount: number;
}

export interface UseRaydiumSDKReturn extends RaydiumSDKState {
  retry: () => void;
  canRetry: boolean;
}

export const useRaydiumSDK = (): UseRaydiumSDKReturn => {
  const [state, setState] = useState<RaydiumSDKState>({
    status: 'idle' as RaydiumSDKStatus,
    error: null,
    isReady: false,
    retryCount: 0
  });

  // Use ref to prevent unnecessary re-initializations
  const initializationRef = useRef<Promise<void> | null>(null);
  const isInitializingRef = useRef(false);

  const initialize = useCallback(async (isRetry = false) => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('🔄 useRaydiumSDK - Initialization already in progress, skipping');
      return;
    }

    isInitializingRef.current = true;
    console.log('🔄 useRaydiumSDK - Starting initialization...', { isRetry });
    
    setState(prev => ({
      ...prev,
      status: (isRetry ? 'retrying' : 'initializing') as RaydiumSDKStatus,
      error: null,
      retryCount: isRetry ? prev.retryCount + 1 : prev.retryCount
    }));

    try {
      // Add delay to ensure polyfills are loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const success = await raydiumSwapService.initialize();
      
      if (success) {
        setState({
          status: 'ready' as RaydiumSDKStatus,
          error: null,
          isReady: true,
          retryCount: 0
        });
        console.log('✅ useRaydiumSDK - Initialization successful');
      } else {
        throw new Error('SDK initialization returned false');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('❌ useRaydiumSDK - Initialization failed:', error);
      
      setState(prev => ({
        status: 'error' as RaydiumSDKStatus,
        error: errorMessage,
        isReady: false,
        retryCount: isRetry ? prev.retryCount + 1 : prev.retryCount
      }));
    } finally {
      isInitializingRef.current = false;
    }
  }, []);

  const retry = useCallback(() => {
    if (state.retryCount < 3 && !isInitializingRef.current) {
      console.log('🔄 useRaydiumSDK - Retrying initialization...');
      initialize(true);
    }
  }, [initialize, state.retryCount]);

  // Initialize only once on mount
  useEffect(() => {
    if (!initializationRef.current && state.status === 'idle') {
      console.log('🚀 useRaydiumSDK - Effect triggered, starting initial initialization');
      initializationRef.current = initialize();
    }
  }, []); // Empty dependency array to run only once

  const result: UseRaydiumSDKReturn = {
    ...state,
    retry,
    canRetry: state.retryCount < 3 && state.status === 'error' && !isInitializingRef.current
  };

  return result;
};
