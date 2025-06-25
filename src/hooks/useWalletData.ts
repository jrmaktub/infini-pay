
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { raydiumSwapService } from '@/utils/raydiumSwap';
import { PublicKey } from '@solana/web3.js';

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
  sol_balance?: number; // Add SOL balance
}

const ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');

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

  // Fetch wallet balances (including real on-chain balances)
  const fetchBalances = async () => {
    if (!publicKey) return;

    try {
      const walletAddress = publicKey.toString();
      
      // Fetch database balances
      const { data, error } = await supabase
        .from('wallets')
        .select('icc_balance, usdc_balance')
        .eq('wallet', walletAddress)
        .maybeSingle();

      if (error) {
        console.error('Error fetching balances:', error);
        return;
      }

      // Fetch real on-chain ICC balance
      const realIccBalance = await raydiumSwapService.getTokenBalance(ICC_MINT, publicKey);
      
      // Get SOL balance from wallet
      const connection = raydiumSwapService['connection'];
      const solBalance = await connection.getBalance(publicKey);
      const solBalanceInSol = solBalance / 1e9; // Convert lamports to SOL

      if (data) {
        setBalances({
          icc_balance: data.icc_balance || 0,
          usdc_balance: data.usdc_balance || 0,
          sol_balance: solBalanceInSol
        });
      } else {
        // If no database record, use on-chain balance
        setBalances({
          icc_balance: realIccBalance,
          usdc_balance: 0,
          sol_balance: solBalanceInSol
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
      
      // For real swaps, we don't need to manage database balances for SOL
      // as it's managed on-chain. We'll only update ICC/USDC in our database.
      
      let newBalances = { ...balances };
      
      if (tokenFrom === 'ICC' && tokenTo === 'SOL') {
        // Real swap already executed, just update our database record
        newBalances.icc_balance -= amount;
        // SOL balance will be updated by fetching from chain
      } else if (tokenFrom === 'ICC' && tokenTo === 'USDC') {
        // Simulated swap logic for ICC <-> USDC
        const EXCHANGE_RATE = 0.95;
        newBalances.icc_balance -= amount;
        newBalances.usdc_balance += amount * EXCHANGE_RATE;
      } else if (tokenFrom === 'USDC' && tokenTo === 'ICC') {
        // Simulated swap logic for USDC <-> ICC
        const EXCHANGE_RATE = 0.95;
        newBalances.usdc_balance -= amount;
        newBalances.icc_balance += amount / EXCHANGE_RATE;
      }

      // Update balances in database
      const balanceUpdateSuccess = await updateBalances(newBalances);
      if (!balanceUpdateSuccess && tokenTo !== 'SOL') {
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

      // Refresh balances and swaps after successful insert
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
