
import { useWallet } from '@solana/wallet-adapter-react';
import BalanceCard from './BalanceCard';
import SwapInterface from './SwapInterface';
import VirtualCard from './VirtualCard';
import TransactionHistory from './TransactionHistory';
import BuilderPassLink from './BuilderPassLink';

const Dashboard = () => {
  const { connected } = useWallet();

  if (!connected) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <BalanceCard />
        <SwapInterface />
        <BuilderPassLink />
      </div>
      
      <div className="space-y-6">
        <VirtualCard />
        <TransactionHistory />
      </div>
    </div>
  );
};

export default Dashboard;
