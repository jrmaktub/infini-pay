
interface ErrorReport {
  error: Error | string;
  context: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

interface ErrorMetrics {
  totalErrors: number;
  criticalErrors: number;
  errorsByType: Record<string, number>;
  recentErrors: ErrorReport[];
}

class ErrorReportingService {
  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    criticalErrors: 0,
    errorsByType: {},
    recentErrors: []
  };

  private readonly MAX_RECENT_ERRORS = 50;
  private readonly CRITICAL_ERROR_KEYWORDS = [
    'network',
    'timeout',
    'connection',
    'insufficient',
    'failed to fetch',
    'raydium',
    'swap',
    'transaction'
  ];

  constructor() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError(event.error || event.message, 'global_error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(event.reason, 'unhandled_promise_rejection', {
        promise: event.promise
      });
    });

    // Monitor console errors (for debugging)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.reportError(args.join(' '), 'console_error');
      originalConsoleError.apply(console, args);
    };
  }

  reportError(
    error: Error | string,
    context: string,
    additionalData?: Record<string, any>
  ): void {
    const errorReport: ErrorReport = {
      error,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData
    };

    // Update metrics
    this.updateMetrics(errorReport);

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Report [${context}]`);
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Additional Data:', additionalData);
      console.log('Timestamp:', new Date(errorReport.timestamp).toISOString());
      console.groupEnd();
    }

    // Store recent errors
    this.errorMetrics.recentErrors.unshift(errorReport);
    if (this.errorMetrics.recentErrors.length > this.MAX_RECENT_ERRORS) {
      this.errorMetrics.recentErrors = this.errorMetrics.recentErrors.slice(0, this.MAX_RECENT_ERRORS);
    }

    // Check if this is a critical error
    if (this.isCriticalError(error)) {
      this.handleCriticalError(errorReport);
    }

    // Send to external service (if configured)
    this.sendToExternalService(errorReport);
  }

  private updateMetrics(errorReport: ErrorReport): void {
    this.errorMetrics.totalErrors++;

    // Categorize error type
    const errorType = this.categorizeError(errorReport.error);
    this.errorMetrics.errorsByType[errorType] = (this.errorMetrics.errorsByType[errorType] || 0) + 1;

    if (this.isCriticalError(errorReport.error)) {
      this.errorMetrics.criticalErrors++;
    }
  }

  private categorizeError(error: Error | string): string {
    const errorMessage = error instanceof Error ? error.message : error;
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'network_error';
    }
    if (lowerMessage.includes('raydium') || lowerMessage.includes('sdk')) {
      return 'sdk_error';
    }
    if (lowerMessage.includes('swap') || lowerMessage.includes('transaction')) {
      return 'transaction_error';
    }
    if (lowerMessage.includes('wallet') || lowerMessage.includes('connect')) {
      return 'wallet_error';
    }
    if (error instanceof TypeError) {
      return 'type_error';
    }
    if (error instanceof ReferenceError) {
      return 'reference_error';
    }

    return 'unknown_error';
  }

  private isCriticalError(error: Error | string): boolean {
    const errorMessage = error instanceof Error ? error.message : error;
    const lowerMessage = errorMessage.toLowerCase();

    return this.CRITICAL_ERROR_KEYWORDS.some(keyword => 
      lowerMessage.includes(keyword)
    );
  }

  private handleCriticalError(errorReport: ErrorReport): void {
    // Log critical error with higher visibility
    console.error('🔥 CRITICAL ERROR DETECTED:', errorReport);

    // Could trigger additional actions like:
    // - Showing user notification
    // - Sending immediate alert
    // - Disabling certain features
    
    // For now, just ensure it's logged prominently
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('criticalError', {
        detail: errorReport
      }));
    }
  }

  private async sendToExternalService(errorReport: ErrorReport): Promise<void> {
    // In a production environment, you would send this to a service like:
    // - Sentry
    // - LogRocket
    // - Custom logging endpoint
    // - Supabase edge function for logging

    try {
      // Example: Send to a custom logging endpoint
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });

      // For now, just log that we would send it
      console.log('Would send error report to external service:', {
        context: errorReport.context,
        timestamp: errorReport.timestamp,
        isCritical: this.isCriticalError(errorReport.error)
      });
    } catch (sendError) {
      console.warn('Failed to send error report to external service:', sendError);
    }
  }

  getMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;

    // Check error rate
    const recentErrorCount = this.errorMetrics.recentErrors.filter(
      error => Date.now() - error.timestamp < 300000 // Last 5 minutes
    ).length;

    if (recentErrorCount > 10) {
      issues.push(`High error rate: ${recentErrorCount} errors in last 5 minutes`);
      score -= 30;
    } else if (recentErrorCount > 5) {
      issues.push(`Elevated error rate: ${recentErrorCount} errors in last 5 minutes`);
      score -= 15;
    }

    // Check critical errors
    if (this.errorMetrics.criticalErrors > 0) {
      issues.push(`${this.errorMetrics.criticalErrors} critical errors detected`);
      score -= this.errorMetrics.criticalErrors * 10;
    }

    // Determine status
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: Math.max(score, 0),
      issues
    };
  }

  clearMetrics(): void {
    this.errorMetrics = {
      totalErrors: 0,
      criticalErrors: 0,
      errorsByType: {},
      recentErrors: []
    };
  }
}

export const errorReportingService = new ErrorReportingService();

// Helper function for manual error reporting
export const reportError = (
  error: Error | string,
  context: string,
  additionalData?: Record<string, any>
) => {
  errorReportingService.reportError(error, context, additionalData);
};

// Helper function for tracking performance issues as errors
export const reportPerformanceIssue = (
  metric: string,
  value: number,
  threshold: number,
  additionalData?: Record<string, any>
) => {
  const message = `Performance issue: ${metric} (${value}) exceeded threshold (${threshold})`;
  errorReportingService.reportError(message, 'performance_issue', {
    metric,
    value,
    threshold,
    ...additionalData
  });
};
