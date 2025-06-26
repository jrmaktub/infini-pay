
import { useState, useEffect } from 'react';
import { Shield, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/integrations/supabase/client';

const BuilderPassLink = () => {
  const [passId, setPassId] = useState('');
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
          setPassId(data.builder_pass);
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

    if (!passId.trim()) {
      toast({
        title: "Missing Pass ID",
        description: "Please enter your Builder's Pass ID",
        variant: "destructive"
      });
      return;
    }

    setIsLinking(true);
    
    try {
      const walletAddress = publicKey.toString();
      const sanitizedPassId = passId.trim().toLowerCase();
      
      // Update the wallet record with builder pass
      const { error } = await supabase
        .from('wallets')
        .update({ builder_pass: sanitizedPassId })
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

      setExistingPass(sanitizedPassId);
      setIsLinked(true);
      toast({
        title: "Builder's Pass Linked!",
        description: "Your civic identity has been verified",
      });
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

  if (isLinked) {
    return (
      <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-green-400" size={24} />
          <h2 className="text-xl font-semibold text-white">Builder's Pass</h2>
          <div className="ml-auto flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full">
            <Check className="text-green-400" size={16} />
            <span className="text-green-400 text-sm font-medium">Verified</span>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-gray-300 text-sm mb-1">Pass ID</p>
          <p className="text-white font-mono">{existingPass}</p>
        </div>
        
        <p className="text-gray-300 text-sm mt-4">
          Your Builder's Pass is linked to your wallet. You now have verified civic identity in Próspera.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Shield className="text-orange-400" size={24} />
        Link Builder's Pass
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-gray-300 text-sm block mb-2">
            Pass ID or Bracelet Code
          </label>
          <input
            type="text"
            value={passId}
            onChange={(e) => setPassId(e.target.value)}
            placeholder="Enter your unique pass code"
            className="w-full px-4 py-3 bg-white/20 text-white rounded-xl border border-white/30 focus:border-orange-400 focus:outline-none placeholder-gray-400"
          />
        </div>

        <button
          onClick={handleLinkPass}
          disabled={isLinking || !connected}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLinking ? 'Linking...' : connected ? 'Link Builder\'s Pass' : 'Connect Wallet First'}
        </button>

        <p className="text-gray-400 text-sm">
          Link your Builder's Pass to your wallet to verify civic identity and unlock additional features.
        </p>
      </div>
    </div>
  );
};

export default BuilderPassLink;
