
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';
import VerificationBadge from './VerificationBadge';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const WalletConnection = () => {
  const { connected, publicKey } = useWallet();
  const [isVerified, setIsVerified] = useState(false);
  const [passCode, setPassCode] = useState<string | null>(null);

  // Check verification status when wallet connects
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!connected || !publicKey) {
        setIsVerified(false);
        setPassCode(null);
        return;
      }

      try {
        const walletAddress = publicKey.toString();
        
        const { data, error } = await supabase
          .from('wallets')
          .select('builder_pass')
          .eq('wallet', walletAddress)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking verification status:', error);
          return;
        }

        if (data?.builder_pass) {
          setIsVerified(true);
          setPassCode(data.builder_pass);
        } else {
          setIsVerified(false);
          setPassCode(null);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkVerificationStatus();
  }, [connected, publicKey]);

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="text-purple-400" size={24} />
          <h2 className="text-xl font-semibold text-white">Wallet Connection</h2>
        </div>
        
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 !rounded-xl !border-0 !h-12 !px-6 !text-white !font-semibold hover:!from-purple-700 hover:!to-blue-700 transition-all duration-300" />
        
        {connected && publicKey && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <p className="text-green-300 text-sm">
                Connected: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
              </p>
            </div>
            
            <VerificationBadge 
              isVerified={isVerified} 
              passCode={passCode}
              className="w-full justify-center"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletConnection;
