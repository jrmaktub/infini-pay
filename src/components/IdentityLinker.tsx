
import { useState, useEffect } from 'react';
import { Shield, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';

interface IdentityLinkerProps {
  onVerificationComplete?: () => void;
}

const IdentityLinker = ({ onVerificationComplete }: IdentityLinkerProps) => {
  const [passCode, setPassCode] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [existingPass, setExistingPass] = useState<string | null>(null);
  const { toast } = useToast();
  const { publicKey, connected } = useWallet();

  // Check if user already has a linked pass
  useEffect(() => {
    const checkExistingPass = async () => {
      if (!connected || !publicKey) return;

      try {
        const walletAddress = publicKey.toString();
        
        const { data, error } = await supabase
          .from('wallets')
          .select('builder_pass')
          .eq('wallet', walletAddress)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking existing pass:', error);
          return;
        }

        if (data?.builder_pass) {
          setExistingPass(data.builder_pass);
          setIsLinked(true);
        }
      } catch (error) {
        console.error('Error checking existing pass:', error);
      }
    };

    checkExistingPass();
  }, [connected, publicKey]);

  const handleLinkPass = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    if (!passCode.trim()) {
      toast({
        title: "Missing Pass Code",
        description: "Please enter your Builder's Pass code",
        variant: "destructive"
      });
      return;
    }

    setIsLinking(true);
    
    try {
      const walletAddress = publicKey.toString();
      const sanitizedPassCode = passCode.trim().toLowerCase();
      
      // Update the wallet record with builder pass
      const { error } = await supabase
        .from('wallets')
        .update({ builder_pass: sanitizedPassCode })
        .eq('wallet', walletAddress);

      if (error) {
        console.error('Error linking builder pass:', error);
        toast({
          title: "Error",
          description: "Failed to link Builder's Pass",
          variant: "destructive"
        });
        return;
      }

      setExistingPass(sanitizedPassCode);
      setIsLinked(true);
      toast({
        title: "Builder's Pass Linked!",
        description: "Your Próspera identity has been verified",
      });
      
      onVerificationComplete?.();
    } catch (error) {
      console.error('Error linking builder pass:', error);
      toast({
        title: "Error",
        description: "Failed to link Builder's Pass",
        variant: "destructive"
      });
    } finally {
      setIsLinking(false);
    }
  };

  if (isLinked && existingPass) {
    return (
      <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-green-400" size={24} />
          <h3 className="text-xl font-semibold text-white">Builder's Pass</h3>
          <div className="ml-auto flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full">
            <Check className="text-green-400" size={16} />
            <span className="text-green-400 text-sm font-medium">Verified</span>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-gray-300 text-sm mb-1">Pass Code</p>
          <p className="text-white font-mono">{existingPass}</p>
        </div>
        
        <p className="text-gray-300 text-sm mt-4">
          ✅ <strong>Verified Próspera Citizen</strong> - Your Builder's Pass is linked to your wallet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Shield className="text-orange-400" size={24} />
        Link Builder's Pass
      </h3>

      <div className="space-y-4">
        <div>
          <label className="text-gray-300 text-sm block mb-2">
            Enter your Builder's Pass code
          </label>
          <input
            type="text"
            value={passCode}
            onChange={(e) => setPassCode(e.target.value)}
            placeholder="Enter your pass code"
            className="w-full px-4 py-3 bg-white/20 text-white rounded-xl border border-white/30 focus:border-orange-400 focus:outline-none placeholder-gray-400"
          />
        </div>

        <button
          onClick={handleLinkPass}
          disabled={isLinking || !connected}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLinking ? 'Linking...' : connected ? 'Verify Identity' : 'Connect Wallet First'}
        </button>

        <p className="text-gray-400 text-sm">
          Link your Infinita Builder's Pass to verify your Próspera citizenship and unlock additional features.
        </p>
      </div>
    </div>
  );
};

export default IdentityLinker;
