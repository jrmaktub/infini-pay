
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary details:', error, errorInfo);
    console.error('Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-white mb-4">Something went wrong!</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-red-300 mb-2">Error Details:</h3>
                <p className="text-red-200 text-sm font-mono">
                  {this.state.error?.name || 'Unknown Error'}
                </p>
                <p className="text-red-200 text-sm">
                  {this.state.error?.message || 'No error message available'}
                </p>
              </div>
              
              {this.state.error?.stack && (
                <div>
                  <h3 className="text-lg font-medium text-red-300 mb-2">Stack Trace:</h3>
                  <pre className="text-xs text-red-200 bg-red-900/20 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
              
              {this.state.errorInfo?.componentStack && (
                <div>
                  <h3 className="text-lg font-medium text-red-300 mb-2">Component Stack:</h3>
                  <pre className="text-xs text-red-200 bg-red-900/20 p-2 rounded overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="mt-6 space-x-4">
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                onClick={() => {
                  console.log('Attempting to recover from error...');
                  this.setState({ hasError: false, error: undefined, errorInfo: undefined });
                }}
              >
                Try again
              </button>
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
