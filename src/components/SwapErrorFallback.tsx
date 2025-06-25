
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface SwapErrorFallbackProps {
  error: string;
  onRetry: () => void;
  canRetry: boolean;
  retryCount: number;
}

const SwapErrorFallback = ({ error, onRetry, canRetry, retryCount }: SwapErrorFallbackProps) => {
  const getErrorIcon = () => {
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('connection')) {
      return <WifiOff className="text-red-400" size={24} />;
    }
    return <AlertCircle className="text-red-400" size={24} />;
  };

  const getErrorTitle = () => {
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('connection')) {
      return 'Connection Error';
    }
    return 'Swap Service Unavailable';
  };

  const getErrorDescription = () => {
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('connection')) {
      return 'Unable to connect to the swap service. Please check your internet connection.';
    }
    return 'The swap functionality is temporarily unavailable. This may be due to maintenance or high network load.';
  };

  return (
    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <RefreshCw className="text-blue-400" size={24} />
        Token Swap
        <span className="text-red-400 text-sm">(Service Error)</span>
      </h2>

      <div className="bg-red-500/20 rounded-xl p-6 border border-red-500/30 text-center">
        <div className="flex justify-center mb-4">
          {getErrorIcon()}
        </div>
        
        <h3 className="text-red-300 font-medium text-lg mb-2">
          {getErrorTitle()}
        </h3>
        
        <p className="text-red-200 mb-4">
          {getErrorDescription()}
        </p>
        
        <div className="text-sm text-red-300 mb-4 bg-red-500/10 rounded-lg p-3">
          <p className="font-mono text-xs break-all">
            Error: {error}
          </p>
        </div>

        <div className="space-y-3">
          {canRetry ? (
            <button
              onClick={onRetry}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Retry Connection {retryCount > 0 && `(${retryCount}/3)`}
            </button>
          ) : (
            <div className="text-red-300 text-sm">
              Maximum retry attempts reached. Please refresh the page or try again later.
            </div>
          )}

          <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="text-yellow-400" size={16} />
              <span className="text-yellow-300 font-medium text-sm">Limited Mode Available</span>
            </div>
            <p className="text-yellow-200 text-xs">
              While swap functionality is unavailable, you can still view your balances and transaction history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapErrorFallback;
