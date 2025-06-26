
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

  console.log('useWalletData - Wallet State:', {
    connected,
    publicKey: publicKey?.toString(),
    walletName: wallet?.adapter?.name
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

  // Fetch REAL on-chain balances with robust error handling
  const fetchRealBalances = useCallback(async (): Promise<WalletBalances> => {
    if (!publicKey) {
      console.log('ℹ️ No public key available for balance fetch');
      return { icc_balance: 0, usdc_balance: 0, sol_balance: 0 };
    }

    console.log('🔍 Fetching REAL balances for:', publicKey.toString());
    
    try {
      const connection = await rpcService.getConnection();
      const balances: WalletBalances = { icc_balance: 0, usdc_balance: 0, sol_balance: 0 };

      // 1. Get SOL balance
      console.log('📡 Fetching SOL balance...');
      const solBalance = await connection.getBalance(publicKey);
      balances.sol_balance = solBalance / 1000000000; // Convert lamports to SOL
      console.log('✅ SOL Balance:', balances.sol_balance);

      // 2. Get ICC token balance
      try {
        console.log('📡 Fetching ICC balance...');
        const iccTokenAccount = await getAssociatedTokenAddress(ICC_MINT, publicKey);
        const iccAccount = await getAccount(connection, iccTokenAccount);
        balances.icc_balance = Number(iccAccount.amount) / Math.pow(10, 9); // Assuming 9 decimals
        console.log('✅ ICC Balance:', balances.icc_balance);
      } catch (error) {
        console.log('ℹ️ ICC token account not found or empty');
        balances.icc_balance = 0;
      }

      // 3. Get USDC token balance
      try {
        console.log('📡 Fetching USDC balance...');
        const usdcTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        const usdcAccount = await getAccount(connection, usdcTokenAccount);
        balances.usdc_balance = Number(usdcAccount.amount) / Math.pow(10, 6); // USDC has 6 decimals
        console.log('✅ USDC Balance:', balances.usdc_balance);
      } catch (error) {
        console.log('ℹ️ USDC token account not found or empty');
        balances.usdc_balance = 0;
      }

      console.log('📊 Final Real Balances:', balances);
      return balances;

    } catch (error) {
      console.error('❌ Error fetching real balances:', error);
      toast({
        title: "Balance Fetch Error",
        description: `Could not fetch balances from blockchain`,
        variant: "destructive"
      });
      return { icc_balance: 0, usdc_balance: 0, sol_balance: 0 };
    }
  }, [publicKey, toast]);

  // Fetch wallet balances (now uses real on-chain data)
  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connected) {
      console.log('ℹ️ Cannot fetch balances - wallet not connected');
      return;
    }

    // Prevent multiple simultaneous calls
    if (loading) {
      console.log('⏳ Balance fetch already in progress, skipping');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Starting balance fetch for wallet:', publicKey.toString());
      
      // Get real on-chain balances
      const realBalances = await fetchRealBalances();
      
      // Update state with real balances
      setBalances(realBalances);
      setLastBalanceCheck(Date.now());
      
      console.log('✅ Balances updated successfully:', realBalances);
      
    } catch (error) {
      console.error('❌ Error in fetchBalances:', error);
      toast({
        title: "Error",
        description: `Failed to fetch wallet balances`,
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

  // Handle wallet connection with debouncing
  useEffect(() => {
    console.log('🔄 useWalletData effect triggered - connected:', connected, 'publicKey exists:', !!publicKey);
    
    if (connected && publicKey) {
      const walletAddress = publicKey.toString();
      console.log('🔗 Wallet connected, initializing data for:', walletAddress);
      
      // Insert wallet and fetch data with small delay to ensure stability
      const initializeWalletData = async () => {
        await insertWallet(walletAddress);
        await fetchBalances();
        await fetchSwaps();
      };
      
      const timeoutId = setTimeout(initializeWalletData, 1000);
      return () => clearTimeout(timeoutId);
    } else {
      console.log('🔌 Wallet disconnected, resetting data');
      setSwaps([]);
      setBalances({ icc_balance: 0, usdc_balance: 0, sol_balance: 0 });
      setLastBalanceCheck(0);
    }
  }, [connected, publicKey, insertWallet, fetchBalances, fetchSwaps]);

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
