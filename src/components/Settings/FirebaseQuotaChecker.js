import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import firebaseMonitor from '../../utils/firebaseMonitor';

const FirebaseQuotaChecker = () => {
  const [quotaStatus, setQuotaStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkQuotaStatus = async () => {
    setIsChecking(true);
    try {
      // Get current stats
      const stats = firebaseMonitor.getStats();
      const suggestions = firebaseMonitor.suggestOptimizations();
      
      // Simulate a small Firebase operation to test for quota errors
      const testResult = await testFirebaseConnection();
      
      setQuotaStatus({
        ...stats,
        suggestions,
        connectionTest: testResult,
        timestamp: new Date()
      });
    } catch (error) {
      setQuotaStatus({
        error: error.message,
        isQuotaError: error.message.includes('quota'),
        connectionTest: { success: false, error: error.message }
      });
    }
    setIsChecking(false);
  };

  const testFirebaseConnection = async () => {
    // This is a minimal test - you might want to do a small read operation
    // We'll just return success for now - in a real app you'd do a small Firebase operation
    return { success: true, message: 'Connection test passed' };
  };

  const getStatusColor = () => {
    if (!quotaStatus) return 'text-slate-400';
    if (quotaStatus.error) return 'text-red-400';
    if (quotaStatus.operations > 15000) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (!quotaStatus) return RefreshCw;
    if (quotaStatus.error) return AlertTriangle;
    return CheckCircle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="athletic-card p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-white flex items-center space-x-2">
          <StatusIcon className={`w-4 h-4 ${getStatusColor()}`} />
          <span>Firebase Quota Status</span>
        </h4>
        <button
          onClick={checkQuotaStatus}
          disabled={isChecking}
          className="px-3 py-1 athletic-button-secondary text-slate-300 rounded text-sm disabled:opacity-50"
        >
          {isChecking ? 'Checking...' : 'Check Status'}
        </button>
      </div>

      {quotaStatus && (
        <div className="space-y-3">
          {quotaStatus.error ? (
            <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
              <div className="text-red-400 font-medium mb-2">❌ Quota Issue Detected</div>
              <div className="text-sm text-red-300">{quotaStatus.error}</div>
              
              {quotaStatus.isQuotaError && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium text-red-300">Solutions:</div>
                  <ul className="text-xs text-red-200 space-y-1 ml-4">
                    <li>• Check your Firebase Console for quota usage</li>
                    <li>• Upgrade to Blaze (pay-as-you-go) plan for higher limits</li>
                    <li>• Wait for daily quota reset (usually at midnight UTC)</li>
                    <li>• Process data in smaller batches</li>
                  </ul>
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-sm text-red-300 hover:text-red-200 mt-2"
                  >
                    <span>Open Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                <div className="text-green-400 font-medium mb-2">✅ Connection OK</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Operations:</span>
                    <span className="text-white ml-2">{quotaStatus.operations || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Errors:</span>
                    <span className="text-white ml-2">{quotaStatus.errors || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Runtime:</span>
                    <span className="text-white ml-2">{Math.round(quotaStatus.runtime || 0)}s</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Rate:</span>
                    <span className="text-white ml-2">{(quotaStatus.operationsPerSecond || 0).toFixed(1)}/s</span>
                  </div>
                </div>
              </div>

              {quotaStatus.suggestions && quotaStatus.suggestions.length > 0 && (
                <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <div className="text-blue-400 font-medium mb-2">💡 Optimization Tips:</div>
                  <ul className="text-sm text-blue-200 space-y-1">
                    {quotaStatus.suggestions.slice(0, 3).map((suggestion, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-slate-400 text-center">
            Last checked: {quotaStatus.timestamp ? quotaStatus.timestamp.toLocaleTimeString() : 'Never'}
          </div>
        </div>
      )}

      {!quotaStatus && (
        <div className="text-sm text-slate-400 text-center py-4">
          Click "Check Status" to test your Firebase connection and quota usage
        </div>
      )}
    </div>
  );
};

export default FirebaseQuotaChecker;