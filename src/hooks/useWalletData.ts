
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

export const useWalletData = () => {
  const { publicKey, connected } = useWallet();
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [balances, setBalances] = useState<WalletBalances>({ icc_balance: 0, usdc_balance: 0 });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Insert wallet on connection
  const insertWallet = async (walletAddress: string) => {
    try {
      const { error } = await supabase
        .from('wallets')
        .insert([{ wallet: walletAddress }])
        .select();
      
      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error inserting wallet:', error);
      }
    } catch (error) {
      console.error('Error inserting wallet:', error);
    }
  };

  // Fetch wallet balances
  const fetchBalances = async () => {
    if (!publicKey) return;

    try {
      const walletAddress = publicKey.toString();
      
      const { data, error } = await supabase
        .from('wallets')
        .select('icc_balance, usdc_balance')
        .eq('wallet', walletAddress)
        .single();

      if (error) {
        console.error('Error fetching balances:', error);
        return;
      }

      if (data) {
        setBalances({
          icc_balance: data.icc_balance || 0,
          usdc_balance: data.usdc_balance || 0
        });
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
        .update(newBalances)
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
      
      // Check if user has sufficient balance
      const fromBalance = tokenFrom === 'ICC' ? balances.icc_balance : balances.usdc_balance;
      if (fromBalance < amount) {
        toast({
          title: "Insufficient Balance",
          description: `You don't have enough ${tokenFrom} to complete this swap`,
          variant: "destructive"
        });
        return false;
      }

      // Calculate new balances
      const EXCHANGE_RATE = 0.95;
      let newIccBalance = balances.icc_balance;
      let newUsdcBalance = balances.usdc_balance;

      if (tokenFrom === 'ICC') {
        newIccBalance -= amount;
        newUsdcBalance += amount * EXCHANGE_RATE;
      } else {
        newUsdcBalance -= amount;
        newIccBalance += amount / EXCHANGE_RATE;
      }

      const newBalances = {
        icc_balance: newIccBalance,
        usdc_balance: newUsdcBalance
      };

      // Update balances first
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
        // Rollback balance update
        await updateBalances(balances);
        toast({
          title: "Error",
          description: "Failed to record swap transaction",
          variant: "destructive"
        });
        return false;
      }

      // Refresh swaps after successful insert
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
      
      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .eq('wallet', walletAddress)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching swaps:', error);
        return;
      }

      setSwaps(data || []);
    } catch (error) {
      console.error('Error fetching swaps:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle wallet connection
  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toString();
      insertWallet(walletAddress);
      fetchBalances();
      fetchSwaps();
    } else {
      setSwaps([]);
      setBalances({ icc_balance: 0, usdc_balance: 0 });
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
