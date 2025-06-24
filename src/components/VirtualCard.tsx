
import { useState } from 'react';
import { CreditCard, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const VirtualCard = () => {
  const [spendAmount, setSpendAmount] = useState('');
  const [isSpending, setIsSpending] = useState(false);
  const { toast } = useToast();

  const handleSpend = async () => {
    if (!spendAmount || parseFloat(spendAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to spend",
        variant: "destructive"
      });
      return;
    }

    setIsSpending(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Payment Successful!",
      description: `Spent $${spendAmount} USDC`,
    });
    
    setIsSpending(false);
    setSpendAmount('');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <CreditCard className="text-indigo-400" size={24} />
        Virtual Debit Card
      </h2>

      {/* Virtual Card Design */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm opacity-80">InfiniPay</p>
              <p className="text-lg font-semibold">Virtual Card</p>
            </div>
            <div className="w-12 h-8 bg-white/20 rounded backdrop-blur-sm"></div>
          </div>
          
          <div className="mb-6">
            <p className="font-mono text-lg tracking-wider">
              **** **** **** 1234
            </p>
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs opacity-80">VALID THRU</p>
              <p className="font-mono">12/28</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80">BALANCE</p>
              <p className="font-bold">$250.75</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spend Interface */}
      <div className="space-y-4">
        <div>
          <label className="text-gray-300 text-sm block mb-2">Amount to Spend</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 bg-white/20 text-white rounded-xl border border-white/30 focus:border-indigo-400 focus:outline-none placeholder-gray-400"
            />
          </div>
        </div>

        <button
          onClick={handleSpend}
          disabled={isSpending || !spendAmount}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ShoppingBag size={20} />
          {isSpending ? 'Processing...' : 'Spend'}
        </button>
      </div>
    </div>
  );
};

export default VirtualCard;
