
import { useWallet } from '@solana/wallet-adapter-react';
import BalanceCard from './BalanceCard';
import SwapInterface from './SwapInterface';
import VirtualCard from './VirtualCard';
import SwapHistoryTable from './SwapHistoryTable';
import BuilderPassLink from './BuilderPassLink';

const Dashboard = () => {
  console.log('Dashboard component rendering...');
  
  const { connected } = useWallet();
  
  console.log('Dashboard - wallet connected:', connected);

  if (!connected) {
    console.log('Dashboard - wallet not connected, showing connect prompt');
    return (
      <div className="text-center py-12">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 max-w-md mx-auto">
          <h3 className="text-2xl font-semibold text-white mb-4">Connect Your Wallet</h3>
          <p className="text-gray-300">
            Connect your Solana wallet to access InfiniPay features and manage your ICC tokens.
          </p>
        </div>
      </div>
    );
  }

  console.log('Dashboard - wallet connected, rendering main dashboard');

  try {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <BalanceCard />
          <SwapInterface />
          <BuilderPassLink />
        </div>
        
        <div className="space-y-6">
          <VirtualCard />
          <SwapHistoryTable />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Dashboard - Error during render:', error);
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30 max-w-md mx-auto">
          <h3 className="text-2xl font-semibold text-white mb-4">Dashboard Error</h3>
          <p className="text-red-300">
            {error instanceof Error ? error.message : 'Unknown dashboard error'}
          </p>
        </div>
      </div>
    );
  }
};

export default Dashboard;
