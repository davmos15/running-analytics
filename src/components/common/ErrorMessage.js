import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="athletic-card-gradient p-8 text-center max-w-md" role="alert">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2
          className="text-xl font-bold text-white mb-2"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          Something went wrong
        </h2>
        <p className="text-slate-400 mb-6">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-6 py-3 athletic-button-primary text-white rounded-lg font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
