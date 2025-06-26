
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Zap, TrendingUp } from 'lucide-react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { optimizedRaydiumService } from '@/utils/optimizedRaydiumService';

const PerformanceMonitor = () => {
  const { metrics, alerts, clearAlerts, getHealthScore } = usePerformanceMonitor();
  const [isExpanded, setIsExpanded] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(optimizedRaydiumService.getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const healthScore = getHealthScore();
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle size={16} />;
    if (score >= 60) return <Clock size={16} />;
    return <AlertTriangle size={16} />;
  };

  const formatTime = (time: number | null) => {
    if (!time) return 'N/A';
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  };

  return (
    <div className="bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Zap className="text-blue-400" size={20} />
          <div>
            <h3 className="text-white font-medium">Performance Monitor</h3>
            <div className={`flex items-center gap-2 text-sm ${getHealthColor(healthScore)}`}>
              {getHealthIcon(healthScore)}
              <span>Health Score: {healthScore}/100</span>
            </div>
          </div>
        </div>
        <TrendingUp className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={16} />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Performance Metrics */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Performance Metrics</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-gray-400">SDK Init Time</p>
                <p className="text-white font-mono">{formatTime(metrics.sdkInitTime)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-gray-400">Simulation Time</p>
                <p className="text-white font-mono">{formatTime(metrics.swapSimulationTime)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-gray-400">Execution Time</p>
                <p className="text-white font-mono">{formatTime(metrics.swapExecutionTime)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-gray-400">Memory Usage</p>
                <p className="text-white font-mono">{formatMemory(metrics.memoryUsage)}</p>
              </div>
            </div>
          </div>

          {/* Cache Statistics */}
          {cacheStats && (
            <div>
              <h4 className="text-gray-300 text-sm font-medium mb-2">Cache Performance</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-gray-400">Cache Entries</p>
                  <p className="text-white font-mono">{cacheStats.validEntries}/{cacheStats.totalEntries}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-gray-400">Active Requests</p>
                  <p className="text-white font-mono">{cacheStats.activeRequests}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Information */}
          <div>
            <h4 className="text-gray-300 text-sm font-medium mb-2">Error Information</h4>
            <div className="bg-white/5 rounded-lg p-2 text-xs">
              <p className="text-gray-400">Error Count: <span className="text-white">{metrics.errorCount}</span></p>
              {metrics.lastError && (
                <p className="text-red-400 mt-1 font-mono text-xs break-all">
                  Last Error: {metrics.lastError}
                </p>
              )}
            </div>
          </div>

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-gray-300 text-sm font-medium">Recent Alerts</h4>
                <button
                  onClick={clearAlerts}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {alerts.slice(-5).map((alert, index) => (
                  <div
                    key={index}
                    className={`text-xs p-2 rounded border ${
                      alert.type === 'critical'
                        ? 'bg-red-500/20 border-red-500/30 text-red-300'
                        : alert.type === 'error'
                        ? 'bg-orange-500/20 border-orange-500/30 text-orange-300'
                        : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                    }`}
                  >
                    <p>{alert.message}</p>
                    <p className="text-xs opacity-70">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => optimizedRaydiumService.clearCache()}
              className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-1 rounded border border-blue-600/30"
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
