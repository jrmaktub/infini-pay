
import { History, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';

const TransactionHistory = () => {
  // Simulated transaction data
  const transactions = [
    {
      id: 1,
      type: 'spend',
      amount: 25.50,
      token: 'USDC',
      timestamp: '2024-06-24T10:30:00Z',
      note: 'Coffee at Próspera Café'
    },
    {
      id: 2,
      type: 'swap',
      amount: 100,
      token_from: 'ICC',
      token_to: 'USDC',
      timestamp: '2024-06-24T09:15:00Z',
      note: 'ICC → USDC swap'
    },
    {
      id: 3,
      type: 'spend',
      amount: 45.75,
      token: 'USDC',
      timestamp: '2024-06-23T18:20:00Z',
      note: 'Grocery shopping'
    },
    {
      id: 4,
      type: 'swap',
      amount: 200,
      token_from: 'USDC',
      token_to: 'ICC',
      timestamp: '2024-06-23T14:45:00Z',
      note: 'USDC → ICC swap'
    }
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'spend':
        return <ArrowUpRight className="text-red-400" size={20} />;
      case 'swap':
        return <RefreshCw className="text-blue-400" size={20} />;
      default:
        return <ArrowDownLeft className="text-green-400" size={20} />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <History className="text-gray-400" size={24} />
        Transaction History
      </h2>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-white/10 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {getTransactionIcon(tx.type)}
                <div>
                  <p className="text-white font-medium capitalize">{tx.type}</p>
                  <p className="text-gray-300 text-sm">{tx.note}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">
                  {tx.type === 'swap' 
                    ? `${tx.amount} ${tx.token_from} → ${tx.token_to}`
                    : `$${tx.amount} ${tx.token}`
                  }
                </p>
                <p className="text-gray-400 text-sm">{formatTimestamp(tx.timestamp)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center">
        <p className="text-gray-400 text-sm">
          Connect Supabase to enable persistent transaction logging
        </p>
      </div>
    </div>
  );
};

export default TransactionHistory;
