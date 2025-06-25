
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// Temporarily comment out Raydium import to isolate issues
// import { raydiumSwapService } from '@/utils/raydiumSwap';
// import { PublicKey } from '@solana/web3.js';

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
  sol_balance?: number;
}

// Temporarily comment out to isolate issues
// const ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');

export const useWalletData = () => {
  const { publicKey, connected } = useWallet();
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [balances, setBalances] = useState<WalletBalances>({ 
    icc_balance: 0, 
    usdc_balance: 0,
    sol_balance: 0 
  });
  const [loading, setLoading] = useState(false);
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

  // Fetch wallet balances (simplified version without on-chain calls)
  const fetchBalances = async () => {
    if (!publicKey) return;

    try {
      console.log('Fetching balances for wallet:', publicKey.toString());
      const walletAddress = publicKey.toString();
      
      // Fetch database balances only for now
      const { data, error } = await supabase
        .from('wallets')
        .select('icc_balance, usdc_balance')
        .eq('wallet', walletAddress)
        .maybeSingle();

      if (error) {
        console.error('Error fetching balances:', error);
        return;
      }

      // Temporarily use mock balances to avoid on-chain calls
      if (data) {
        setBalances({
          icc_balance: data.icc_balance || 1000, // Mock balance
          usdc_balance: data.usdc_balance || 500, // Mock balance
          sol_balance: 2.5 // Mock SOL balance
        });
        console.log('Balances set from database:', data);
      } else {
        // If no database record, use mock balances
        setBalances({
          icc_balance: 1000,
          usdc_balance: 500,
          sol_balance: 2.5
        });
        console.log('Using mock balances');
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
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
      
      let newBalances = { ...balances };
      
      // Simplified swap logic for testing
      if (tokenFrom === 'ICC' && tokenTo === 'USDC') {
        const EXCHANGE_RATE = 0.95;
        newBalances.icc_balance -= amount;
        newBalances.usdc_balance += amount * EXCHANGE_RATE;
      } else if (tokenFrom === 'USDC' && tokenTo === 'ICC') {
        const EXCHANGE_RATE = 0.95;
        newBalances.usdc_balance -= amount;
        newBalances.icc_balance += amount / EXCHANGE_RATE;
      }

      // Update balances in database
      const balanceUpdateSuccess = await updateBalances(newBalances);
      if (!balanceUpdateSuccess) {
        toast({
          title: "Error",
          description: "Failed to update balances",
          variant: "destructive"
        });
        return false;
      }

      // Insert swap record
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

      // Refresh data after successful insert
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
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

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
    }
  }, [connected, publicKey]);

  return {
    swaps,
    balances,
    loading,
    insertSwap,
    fetchSwaps,
    fetchBalances
  };
};
