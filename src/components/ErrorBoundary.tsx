import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    
    // Log error to console for debugging
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={24} />
              <h1 className="text-xl font-semibold">Something went wrong</h1>
            </div>
            
            <div className="bg-slate-800 rounded-lg p-4 space-y-2">
              <p className="text-red-400">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              
              {this.state.errorInfo && (
                <pre className="text-sm text-slate-400 overflow-x-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Reload Page
              </button>
              
              <a
                href="/"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
