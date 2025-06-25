
import { useState, useEffect } from 'react';
import { WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import WalletConnection from '@/components/WalletConnection';
import Dashboard from '@/components/Dashboard';
import '@solana/wallet-adapter-react-ui/styles.css';

const Index = () => {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Index component mounting...');
    try {
      setMounted(true);
      console.log('Index component mounted successfully');
    } catch (err) {
      console.error('Error during Index mount:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];

  const endpoint = clusterApiUrl('mainnet-beta');
  console.log('Using endpoint:', endpoint);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30 max-w-md mx-auto">
          <h3 className="text-2xl font-semibold text-white mb-4">Error</h3>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    console.log('Index component not mounted yet');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  console.log('Rendering main app with wallets:', wallets.length);

  return (
    <ConnectionProvider endpoint={endpoint}>
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
    </ConnectionProvider>
  );
};

export default Index;
