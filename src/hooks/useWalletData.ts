import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { rpcService } from '@/utils/rpcService';

interface SwapRecord {
  id: string;
  wallet: string;
  token_from: string;
  token_to: string;
  amount: number;
  timestamp: string;
  note: string | null;
}

interface WalletBalances {
  icc_balance: number;
  usdc_balance: number;
  sol_balance: number;
}

// Token mint addresses
const ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export const useWalletData = () => {
  const { publicKey, connected, wallet } = useWallet();
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [balances, setBalances] = useState<WalletBalances>({ 
    icc_balance: 0, 
    usdc_balance: 0,
    sol_balance: 0 
  });
  const [loading, setLoading] = useState(false);
  const [lastBalanceCheck, setLastBalanceCheck] = useState<number>(0);
  const { toast } = useToast();

  console.log('💳 useWalletData - Wallet State:', {
    connected,
    publicKey: publicKey?.toString(),
    walletName: wallet?.adapter?.name,
    rpcInfo: rpcService.getConnectionInfo()
  });

  // Insert wallet on connection
  const insertWallet = useCallback(async (walletAddress: string) => {
    try {
      console.log('📝 Inserting wallet:', walletAddress);
      const { error } = await supabase
        .from('wallets')
        .insert([{ wallet: walletAddress }])
        .select();
      
      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('❌ Error inserting wallet:', error);
      } else {
        console.log('✅ Wallet inserted successfully');
      }
    } catch (error) {
      console.error('❌ Error inserting wallet:', error);
    }
  }, []);

  // Fetch REAL on-chain balances with enhanced diagnostics
  const fetchRealBalances = useCallback(async (): Promise<WalletBalances> => {
    if (!publicKey) {
      console.log('ℹ️ No public key available for balance fetch');
      return { icc_balance: 0, usdc_balance: 0, sol_balance: 0 };
    }

    const walletAddress = publicKey.toString();
    console.log('🔍 Starting comprehensive balance fetch for:', walletAddress);
    
    try {
      // Test RPC connection first
      console.log('🧪 Testing RPC connection before balance fetch...');
      const isRpcWorking = await rpcService.testConnection();
      if (!isRpcWorking) {
        throw new Error('RPC connection test failed');
      }

      const connection = await rpcService.getConnection();
      const balances: WalletBalances = { icc_balance: 0, usdc_balance: 0, sol_balance: 0 };

      console.log('📡 RPC Connection Info:', {
        endpoint: rpcService.getCurrentEndpoint(),
        commitment: 'confirmed'
      });

      // 1. Get SOL balance with detailed logging
      try {
        console.log('💰 Fetching SOL balance...');
        const solBalanceLamports = await connection.getBalance(publicKey);
        balances.sol_balance = solBalanceLamports / 1000000000; // Convert lamports to SOL
        console.log('✅ SOL Balance Success:', {
          lamports: solBalanceLamports,
          sol: balances.sol_balance
        });
      } catch (error) {
        console.error('❌ SOL Balance Error:', error);
        throw new Error(`SOL balance fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 2. Get ICC token balance with detailed logging
      try {
        console.log('🪙 Fetching ICC token balance...');
        const iccTokenAccount = await getAssociatedTokenAddress(ICC_MINT, publicKey);
        console.log('🔍 ICC Token Account:', iccTokenAccount.toString());
        
        const iccAccountInfo = await connection.getAccountInfo(iccTokenAccount);
        if (iccAccountInfo) {
          const iccAccount = await getAccount(connection, iccTokenAccount);
          balances.icc_balance = Number(iccAccount.amount) / Math.pow(10, 9); // Assuming 9 decimals
          console.log('✅ ICC Balance Success:', {
            tokenAccount: iccTokenAccount.toString(),
            rawAmount: iccAccount.amount.toString(),
            balance: balances.icc_balance
          });
        } else {
          console.log('ℹ️ ICC token account not found - balance is 0');
          balances.icc_balance = 0;
        }
      } catch (error) {
        console.log('ℹ️ ICC token account fetch failed (likely no tokens):', error instanceof Error ? error.message : error);
        balances.icc_balance = 0;
      }

      // 3. Get USDC token balance with detailed logging
      try {
        console.log('💵 Fetching USDC token balance...');
        const usdcTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        console.log('🔍 USDC Token Account:', usdcTokenAccount.toString());
        
        const usdcAccountInfo = await connection.getAccountInfo(usdcTokenAccount);
        if (usdcAccountInfo) {
          const usdcAccount = await getAccount(connection, usdcTokenAccount);
          balances.usdc_balance = Number(usdcAccount.amount) / Math.pow(10, 6); // USDC has 6 decimals
          console.log('✅ USDC Balance Success:', {
            tokenAccount: usdcTokenAccount.toString(),
            rawAmount: usdcAccount.amount.toString(),
            balance: balances.usdc_balance
          });
        } else {
          console.log('ℹ️ USDC token account not found - balance is 0');
          balances.usdc_balance = 0;
        }
      } catch (error) {
        console.log('ℹ️ USDC token account fetch failed (likely no tokens):', error instanceof Error ? error.message : error);
        balances.usdc_balance = 0;
      }

      console.log('📊 Final Balance Summary:', {
        wallet: walletAddress,
        balances,
        rpcEndpoint: rpcService.getCurrentEndpoint()
      });
      
      return balances;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown balance fetch error';
      console.error('❌ Comprehensive Balance Fetch Error:', {
        wallet: walletAddress,
        error: errorMessage,
        rpcEndpoint: rpcService.getCurrentEndpoint(),
        rpcInfo: rpcService.getConnectionInfo()
      });
      
      // Reset RPC connection on error to try different endpoint next time
      rpcService.reset();
      
      throw new Error(`Balance fetch failed: ${errorMessage}`);
    }
  }, [publicKey]);

  // Fetch wallet balances with better error handling
  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connected) {
      console.log('ℹ️ Skipping balance fetch - wallet not connected');
      return;
    }

    if (loading) {
      console.log('⏳ Balance fetch already in progress, skipping');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Starting balance fetch for wallet:', publicKey.toString());
      
      const realBalances = await fetchRealBalances();
      
      setBalances(realBalances);
      setLastBalanceCheck(Date.now());
      
      console.log('✅ Balance fetch completed successfully:', realBalances);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch wallet balances';
      console.error('❌ Balance fetch failed:', {
        error: errorMessage,
        wallet: publicKey.toString(),
        rpcInfo: rpcService.getConnectionInfo()
      });
      
      toast({
        title: "Balance Fetch Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, loading, fetchRealBalances, toast]);

  // Insert swap transaction
  const insertSwap = useCallback(async (
    tokenFrom: string,
    tokenTo: string,
    amount: number,
    note?: string
  ) => {
    if (!publicKey) return false;

    try {
      setLoading(true);
      const walletAddress = publicKey.toString();
      
      const { error } = await supabase
        .from('swaps')
        .insert([{
          wallet: walletAddress,
          token_from: tokenFrom,
          token_to: tokenTo,
          amount: amount,
          note: note || null
        }]);

      if (error) {
        console.error('❌ Error inserting swap:', error);
        toast({
          title: "Error",
          description: "Failed to record swap transaction",
          variant: "destructive"
        });
        return false;
      }

      // After successful swap, refresh balances
      console.log('🔄 Swap recorded, refreshing balances...');
      await fetchBalances();
      await fetchSwaps();
      
      return true;
    } catch (error) {
      console.error('❌ Error inserting swap:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, fetchBalances, toast]);

  // Fetch swaps for connected wallet
  const fetchSwaps = useCallback(async () => {
    if (!publicKey) return;

    try {
      const walletAddress = publicKey.toString();
      
      console.log('📋 Fetching swaps for wallet:', walletAddress);
      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .eq('wallet', walletAddress)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Error fetching swaps:', error);
        return;
      }

      console.log('✅ Swaps fetched:', data?.length || 0);
      setSwaps(data || []);
    } catch (error) {
      console.error('❌ Error fetching swaps:', error);
    }
  }, [publicKey]);

  // Handle wallet connection with improved stability
  useEffect(() => {
    console.log('🔄 useWalletData effect triggered:', { 
      connected, 
      publicKeyExists: !!publicKey,
      walletName: wallet?.adapter?.name 
    });
    
    if (connected && publicKey) {
      const walletAddress = publicKey.toString();
      console.log('🔗 Wallet connected, initializing data for:', walletAddress);
      
      // Initialize wallet data with longer delay to ensure stability
      const initializeWalletData = async () => {
        try {
          await insertWallet(walletAddress);
          await fetchBalances();
          await fetchSwaps();
        } catch (error) {
          console.error('❌ Wallet data initialization failed:', error);
        }
      };
      
      const timeoutId = setTimeout(initializeWalletData, 2000); // Increased delay
      return () => clearTimeout(timeoutId);
    } else {
      console.log('🔌 Wallet disconnected, resetting data');
      setSwaps([]);
      setBalances({ icc_balance: 0, usdc_balance: 0, sol_balance: 0 });
      setLastBalanceCheck(0);
    }
  }, [connected, publicKey?.toString(), wallet?.adapter?.name]); // Stable dependencies

  return {
    swaps,
    balances,
    loading,
    insertSwap,
    fetchSwaps,
    fetchBalances,
    lastBalanceCheck
  };
};
