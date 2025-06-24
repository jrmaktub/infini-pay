
import { useState, useEffect } from 'react';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import WalletConnection from '@/components/WalletConnection';
import Dashboard from '@/components/Dashboard';
import '@solana/wallet-adapter-react-ui/styles.css';

const Index = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];

  const endpoint = clusterApiUrl('mainnet-beta');

  if (!mounted) {
    return null;
  }

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="container mx-auto px-4 py-8">
            <header className="text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                InfiniPay
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Your Solana-powered payment solution for Próspera
              </p>
            </header>
            
            <WalletConnection />
            <Dashboard />
          </div>
        </div>
      </WalletModalProvider>
    </WalletProvider>
  );
};

export default Index;
