
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
  console.log('Index component - Starting initialization...');
  
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Index component - useEffect triggered');
    try {
      console.log('Index component - Setting mounted to true');
      setMounted(true);
      console.log('Index component - Mounted successfully');
    } catch (err) {
      console.error('Index component - Error during mount:', err);
      setError(err instanceof Error ? err.message : 'Unknown error during mount');
    }
  }, []);

  console.log('Index component - Initializing wallet adapters...');
  
  let wallets;
  let endpoint;
  
  try {
    wallets = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ];
    console.log('Index component - Wallet adapters created successfully:', wallets.length);
    
    endpoint = clusterApiUrl('mainnet-beta');
    console.log('Index component - Endpoint created:', endpoint);
  } catch (err) {
    console.error('Index component - Error creating wallet configuration:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to initialize wallet configuration';
    setError(errorMessage);
  }

  if (error) {
    console.error('Index component - Rendering error state:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30 max-w-md mx-auto">
          <h3 className="text-2xl font-semibold text-white mb-4">Initialization Error</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!mounted) {
    console.log('Index component - Not mounted yet, showing loading...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading InfiniPay...</div>
      </div>
    );
  }

  if (!wallets || !endpoint) {
    console.error('Index component - Missing wallet configuration');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30 max-w-md mx-auto">
          <h3 className="text-2xl font-semibold text-white mb-4">Configuration Error</h3>
          <p className="text-red-300">Wallet configuration is missing</p>
        </div>
      </div>
    );
  }

  console.log('Index component - Rendering main app with:', { 
    walletsCount: wallets.length, 
    endpoint, 
    mounted 
  });

  try {
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
                    payment solution for Próspera
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
  } catch (renderError) {
    console.error('Index component - Error during render:', renderError);
    setError(renderError instanceof Error ? renderError.message : 'Unknown render error');
    return null;
  }
};

export default Index;
