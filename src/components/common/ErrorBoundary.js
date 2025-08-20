import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Also log to help debug null property errors
    if (error.message && error.message.includes('Cannot read properties of null')) {
      console.error('NULL PROPERTY ERROR DETECTED:', {
        message: error.message,
        stack: error.stack,
        component: errorInfo.componentStack
      });
    }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="athletic-card-gradient p-6 m-4">
          <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong!</h2>
          <details className="text-white">
            <summary className="cursor-pointer text-orange-400">Click for error details</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 athletic-button-primary text-white rounded"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;