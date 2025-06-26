
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

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
const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export const useWalletData = () => {
  const { publicKey, connected } = useWallet();
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [balances, setBalances] = useState<WalletBalances>({ 
    icc_balance: 0, 
    usdc_balance: 0,
    sol_balance: 0 
  });
  const [loading, setLoading] = useState(false);
  const [lastBalanceCheck, setLastBalanceCheck] = useState<number>(0);
  const { toast } = useToast();

  console.log('useWalletData hook - connected:', connected, 'publicKey:', publicKey?.toString());

  // Insert wallet on connection
  const insertWallet = async (walletAddress: string) => {
    try {
      console.log('Inserting wallet:', walletAddress);
      const { error } = await supabase
        .from('wallets')
        .insert([{ wallet: walletAddress }])
        .select();
      
      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error inserting wallet:', error);
      } else {
        console.log('Wallet inserted successfully');
      }
    } catch (error) {
      console.error('Error inserting wallet:', error);
    }
  };

  // Fetch REAL on-chain balances
  const fetchRealBalances = async (): Promise<WalletBalances> => {
    if (!publicKey) {
      console.log('No public key available for balance fetch');
      return { icc_balance: 0, usdc_balance: 0, sol_balance: 0 };
    }

    console.log('🔍 Fetching REAL on-chain balances for:', publicKey.toString());
    const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
    const balances: WalletBalances = { icc_balance: 0, usdc_balance: 0, sol_balance: 0 };

    try {
      // 1. Get SOL balance
      const solBalance = await connection.getBalance(publicKey);
      balances.sol_balance = solBalance / 1000000000; // Convert lamports to SOL
      console.log('✅ SOL Balance:', balances.sol_balance);

      // 2. Get ICC token balance
      try {
        const iccTokenAccount = await getAssociatedTokenAddress(ICC_MINT, publicKey);
        const iccAccount = await getAccount(connection, iccTokenAccount);
        balances.icc_balance = Number(iccAccount.amount) / Math.pow(10, 9); // Assuming 9 decimals
        console.log('✅ ICC Balance:', balances.icc_balance);
      } catch (error) {
        console.log('ℹ️ ICC token account not found or empty:', error);
        balances.icc_balance = 0;
      }

      // 3. Get USDC token balance
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        const usdcAccount = await getAccount(connection, usdcTokenAccount);
        balances.usdc_balance = Number(usdcAccount.amount) / Math.pow(10, 6); // USDC has 6 decimals
        console.log('✅ USDC Balance:', balances.usdc_balance);
      } catch (error) {
        console.log('ℹ️ USDC token account not found or empty:', error);
        balances.usdc_balance = 0;
      }

      console.log('📊 Final Real Balances:', balances);
      return balances;

    } catch (error) {
      console.error('❌ Error fetching real balances:', error);
      toast({
        title: "Balance Fetch Error",
        description: "Could not fetch real-time balances from blockchain",
        variant: "destructive"
      });
      return balances;
    }
  };

  // Fetch wallet balances (now uses real on-chain data)
  const fetchBalances = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      console.log('🚀 Starting balance fetch for wallet:', publicKey.toString());
      
      // Get real on-chain balances
      const realBalances = await fetchRealBalances();
      
      // Update state with real balances
      setBalances(realBalances);
      setLastBalanceCheck(Date.now());
      
      // Also update database with real balances for consistency
      const walletAddress = publicKey.toString();
      await supabase
        .from('wallets')
        .upsert({
          wallet: walletAddress,
          icc_balance: realBalances.icc_balance,
          usdc_balance: realBalances.usdc_balance
        });

      console.log('✅ Balances updated successfully:', realBalances);
      
      toast({
        title: "Balances Updated",
        description: "Real-time balances fetched from blockchain",
      });

    } catch (error) {
      console.error('❌ Error in fetchBalances:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wallet balances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Update wallet balances
  const updateBalances = async (newBalances: WalletBalances) => {
    if (!publicKey) return false;

    try {
      const walletAddress = publicKey.toString();
      
      const { error } = await supabase
        .from('wallets')
        .update({
          icc_balance: newBalances.icc_balance,
          usdc_balance: newBalances.usdc_balance
        })
        .eq('wallet', walletAddress);

      if (error) {
        console.error('Error updating balances:', error);
        return false;
      }

      setBalances(newBalances);
      return true;
    } catch (error) {
      console.error('Error updating balances:', error);
      return false;
    }
  };

  // Insert swap transaction with balance management
  const insertSwap = async (
    tokenFrom: string,
    tokenTo: string,
    amount: number,
    note?: string
  ) => {
    if (!publicKey) return false;

    try {
      setLoading(true);
      const walletAddress = publicKey.toString();
      
      // Insert swap record first
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
        console.error('Error inserting swap:', error);
        toast({
          title: "Error",
          description: "Failed to record swap transaction",
          variant: "destructive"
        });
        return false;
      }

      // After successful swap, refresh balances from blockchain
      console.log('🔄 Swap recorded, refreshing balances from blockchain...');
      await fetchBalances();
      await fetchSwaps();
      
      return true;
    } catch (error) {
      console.error('Error inserting swap:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fetch swaps for connected wallet
  const fetchSwaps = async () => {
    if (!publicKey) return;

    try {
      const walletAddress = publicKey.toString();
      
      console.log('Fetching swaps for wallet:', walletAddress);
      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .eq('wallet', walletAddress)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching swaps:', error);
        return;
      }

      console.log('Swaps fetched:', data?.length || 0);
      setSwaps(data || []);
    } catch (error) {
      console.error('Error fetching swaps:', error);
    }
  };

  // Auto-refresh balances every 30 seconds when connected
  useEffect(() => {
    if (!connected || !publicKey) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing balances...');
      fetchBalances();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [connected, publicKey]);

  // Handle wallet connection
  useEffect(() => {
    console.log('useWalletData effect triggered - connected:', connected, 'publicKey exists:', !!publicKey);
    
    if (connected && publicKey) {
      const walletAddress = publicKey.toString();
      console.log('Wallet connected, initializing data for:', walletAddress);
      insertWallet(walletAddress);
      fetchBalances();
      fetchSwaps();
    } else {
      console.log('Wallet not connected, resetting data');
      setSwaps([]);
      setBalances({ icc_balance: 0, usdc_balance: 0, sol_balance: 0 });
      setLastBalanceCheck(0);
    }
  }, [connected, publicKey]);

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
