
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';

const WalletConnection = () => {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="text-purple-400" size={24} />
          <h2 className="text-xl font-semibold text-white">Wallet Connection</h2>
        </div>
        
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 !rounded-xl !border-0 !h-12 !px-6 !text-white !font-semibold hover:!from-purple-700 hover:!to-blue-700 transition-all duration-300" />
        
        {connected && publicKey && (
          <div className="mt-4 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
            <p className="text-green-300 text-sm">
              Connected: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnection;
