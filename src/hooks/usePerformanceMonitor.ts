
import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  sdkInitTime: number | null;
  swapSimulationTime: number | null;
  swapExecutionTime: number | null;
  memoryUsage: number | null;
  errorCount: number;
  lastError: string | null;
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metric?: string;
  value?: number;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    sdkInitTime: null,
    swapSimulationTime: null,
    swapExecutionTime: null,
    memoryUsage: null,
    errorCount: 0,
    lastError: null
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const performanceObserver = useRef<PerformanceObserver | null>(null);

  // Thresholds for performance alerts
  const THRESHOLDS = {
    SDK_INIT_TIME: 5000, // 5 seconds
    SWAP_SIMULATION_TIME: 3000, // 3 seconds
    SWAP_EXECUTION_TIME: 10000, // 10 seconds
    MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
    ERROR_RATE: 5 // 5 errors in a session
  };

  const addAlert = (alert: Omit<PerformanceAlert, 'timestamp'>) => {
    const newAlert: PerformanceAlert = {
      ...alert,
      timestamp: Date.now()
    };
    
    setAlerts(prev => [...prev.slice(-9), newAlert]); // Keep last 10 alerts
    
    // Log critical alerts
    if (alert.type === 'critical') {
      console.error('CRITICAL PERFORMANCE ALERT:', alert);
    } else if (alert.type === 'error') {
      console.warn('PERFORMANCE ERROR:', alert);
    }
  };

  const trackMetric = (metricName: keyof PerformanceMetrics, value: number | string) => {
    setMetrics(prev => {
      const newMetrics = { ...prev };
      
      if (metricName === 'lastError') {
        newMetrics.lastError = value as string;
        newMetrics.errorCount = prev.errorCount + 1;
        
        if (newMetrics.errorCount >= THRESHOLDS.ERROR_RATE) {
          addAlert({
            type: 'critical',
            message: `High error rate detected: ${newMetrics.errorCount} errors`,
            metric: 'errorCount',
            value: newMetrics.errorCount
          });
        }
      } else if (typeof value === 'number') {
        (newMetrics as any)[metricName] = value;
        
        // Check thresholds and create alerts
        if (metricName === 'sdkInitTime' && value > THRESHOLDS.SDK_INIT_TIME) {
          addAlert({
            type: 'warning',
            message: `SDK initialization took ${(value / 1000).toFixed(2)}s`,
            metric: metricName,
            value
          });
        } else if (metricName === 'swapSimulationTime' && value > THRESHOLDS.SWAP_SIMULATION_TIME) {
          addAlert({
            type: 'warning',
            message: `Swap simulation took ${(value / 1000).toFixed(2)}s`,
            metric: metricName,
            value
          });
        } else if (metricName === 'swapExecutionTime' && value > THRESHOLDS.SWAP_EXECUTION_TIME) {
          addAlert({
            type: 'error',
            message: `Swap execution took ${(value / 1000).toFixed(2)}s`,
            metric: metricName,
            value
          });
        } else if (metricName === 'memoryUsage' && value > THRESHOLDS.MEMORY_USAGE) {
          addAlert({
            type: 'critical',
            message: `High memory usage: ${(value / 1024 / 1024).toFixed(2)}MB`,
            metric: metricName,
            value
          });
        }
      }
      
      return newMetrics;
    });
  };

  const measurePerformance = async <T>(
    operation: () => Promise<T>,
    metricName: keyof PerformanceMetrics
  ): Promise<T> => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      trackMetric(metricName, duration);
      
      // Track memory usage if available
      if ((performance as any).memory) {
        const endMemory = (performance as any).memory.usedJSHeapSize;
        const memoryDelta = endMemory - startMemory;
        if (memoryDelta > 0) {
          trackMetric('memoryUsage', endMemory);
        }
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      trackMetric(metricName, duration);
      trackMetric('lastError', error instanceof Error ? error.message : 'Unknown error');
      
      throw error;
    }
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const getHealthScore = (): number => {
    let score = 100;
    
    // Deduct points for slow performance
    if (metrics.sdkInitTime && metrics.sdkInitTime > THRESHOLDS.SDK_INIT_TIME) {
      score -= 20;
    }
    if (metrics.swapSimulationTime && metrics.swapSimulationTime > THRESHOLDS.SWAP_SIMULATION_TIME) {
      score -= 15;
    }
    if (metrics.swapExecutionTime && metrics.swapExecutionTime > THRESHOLDS.SWAP_EXECUTION_TIME) {
      score -= 25;
    }
    
    // Deduct points for errors
    score -= Math.min(metrics.errorCount * 5, 30);
    
    // Deduct points for high memory usage
    if (metrics.memoryUsage && metrics.memoryUsage > THRESHOLDS.MEMORY_USAGE) {
      score -= 10;
    }
    
    return Math.max(score, 0);
  };

  // Initialize performance monitoring
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('raydium') || entry.name.includes('swap')) {
            console.log('Performance entry:', entry.name, entry.duration);
          }
        });
      });
      
      try {
        performanceObserver.current.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('Performance observer not fully supported:', error);
      }
    }

    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, []);

  return {
    metrics,
    alerts,
    trackMetric,
    measurePerformance,
    clearAlerts,
    getHealthScore,
    addAlert
  };
};
