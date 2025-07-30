import React, { useState } from 'react';
import { RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import firebaseService from '../../services/firebaseService';

const CacheManager = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const clearCache = async () => {
    setIsClearing(true);
    try {
      // Clear Firebase query cache
      firebaseService.clearCache();
      
      // Clear localStorage caches that might exist
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache_') || key.includes('query_'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
    setIsClearing(false);
  };

  return (
    <div className="athletic-card p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-white flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 text-orange-400" />
          <span>Query Cache Management</span>
        </h4>
        <button
          onClick={clearCache}
          disabled={isClearing}
          className="px-3 py-1 athletic-button-secondary text-slate-300 rounded text-sm disabled:opacity-50 flex items-center space-x-1"
        >
          {isClearing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Clearing...</span>
            </>
          ) : cleared ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Cleared!</span>
            </>
          ) : (
            <>
              <Trash2 className="w-3 h-3" />
              <span>Clear Cache</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-slate-300">
          <p className="mb-2">
            The app caches Firebase queries for 5 minutes to reduce database reads and improve performance.
          </p>
          <div className="space-y-1 text-xs text-slate-400">
            <p>• <strong>Personal Bests queries</strong> are cached by distance and date filter</p>
            <p>• <strong>Activities queries</strong> are cached by time period</p>
            <p>• <strong>Prediction data</strong> uses optimized single queries instead of multiple reads</p>
          </div>
        </div>

        {cleared && (
          <div className="p-3 bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="text-green-400 text-sm">
              ✅ Cache cleared successfully! Next queries will fetch fresh data from Firebase.
            </div>
          </div>
        )}

        <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <div className="text-blue-400 text-sm font-medium mb-1">💡 Cache Benefits:</div>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Reduces Firebase read operations by up to 90%</li>
            <li>• Faster loading when switching between pages</li>
            <li>• Helps stay within free tier quota limits</li>
            <li>• Automatically expires after 5 minutes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CacheManager;