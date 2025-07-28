import React, { useState } from 'react';
import syncService from '../../services/syncService';

const SyncButton = ({ onSyncComplete = null }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const handleFullSync = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress({ stage: 'starting', message: 'Starting sync...' });

      const result = await syncService.syncAllActivities((progressUpdate) => {
        setProgress(progressUpdate);
      });

      if (onSyncComplete) {
        onSyncComplete(result);
      }

      setProgress({ 
        stage: 'complete', 
        message: `Sync complete! Processed ${result.processedCount} activities.` 
      });

      // Clear progress after 3 seconds
      setTimeout(() => {
        setProgress(null);
      }, 3000);

    } catch (err) {
      setError(err.message);
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecentSync = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress({ stage: 'syncing', message: 'Syncing recent activities...' });

      const result = await syncService.syncRecentActivities();

      if (onSyncComplete) {
        onSyncComplete(result);
      }

      setProgress({ 
        stage: 'complete', 
        message: `Found ${result.newActivitiesCount} new activities.` 
      });

      // Clear progress after 3 seconds
      setTimeout(() => {
        setProgress(null);
      }, 3000);

    } catch (err) {
      setError(err.message);
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Sync Activities</h3>
      
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleRecentSync}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {isLoading ? 'Syncing...' : 'Sync Recent'}
          </button>
          
          <button
            onClick={handleFullSync}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {isLoading ? 'Syncing...' : 'Full Sync'}
          </button>
        </div>

        {progress && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-sm text-blue-800">
              {progress.message}
            </div>
            {progress.progress && (
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">
              Error: {error}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          <p><strong>Sync Recent:</strong> Checks for new activities from the last 20 runs</p>
          <p><strong>Full Sync:</strong> Downloads all activities from Strava (may take several minutes)</p>
        </div>
      </div>
    </div>
  );
};

export default SyncButton;