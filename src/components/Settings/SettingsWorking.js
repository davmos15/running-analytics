import React, { useState } from 'react';
import { Settings as SettingsIcon, Calendar, Database, Download, RefreshCw } from 'lucide-react';
import firebaseService from '../../services/firebaseService';
import syncService from '../../services/syncService';

const SettingsWorking = () => {
  const [isImportingRuns, setIsImportingRuns] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const showSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleImportRecentRuns = async () => {
    if (window.confirm('This will import your recent activities from Strava. Continue?')) {
      setIsImportingRuns(true);
      try {
        const result = await syncService.syncRecentActivities();
        alert(`Import complete! Found ${result.newActivitiesCount} new activities. Personal Bests have been automatically updated.`);
        showSuccess();
      } catch (error) {
        alert('Error importing recent runs: ' + error.message);
      } finally {
        setIsImportingRuns(false);
      }
    }
  };

  const handleReprocessActivities = async () => {
    if (window.confirm('This will reprocess your recent activities to find the correct fastest segments (PBs). This fixes the issue where PBs were only detected from the start of runs. Continue?')) {
      setIsReprocessing(true);
      try {
        const result = await firebaseService.reprocessActivitiesForPBs(50);
        alert(`Activities reprocessed successfully! Processed ${result.processedCount} activities and updated ${result.segmentsUpdated} segments. Your Personal Bests should now be accurate!`);
        showSuccess();
      } catch (error) {
        alert('Error reprocessing activities: ' + error.message);
      } finally {
        setIsReprocessing(false);
      }
    }
  };

  const handleGenerateHomepageSummary = async () => {
    if (window.confirm('This will regenerate the homepage summary data. Continue?')) {
      try {
        await firebaseService.generateHomepageSummary();
        alert('Homepage summary regenerated successfully!');
        showSuccess();
      } catch (error) {
        alert('Error generating homepage summary: ' + error.message);
      }
    }
  };

  return (
    <div className="mt-6 space-y-6 mx-4">
      <div className="athletic-card-gradient p-6">
        <div className="flex items-center space-x-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-orange-400" />
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Settings
          </h2>
        </div>

        {showSuccessMessage && (
          <div className="mb-4 p-3 bg-green-500/20 text-green-300 rounded-lg border border-green-500/30">
            Settings saved successfully!
          </div>
        )}

        <p className="text-slate-300 mb-6">
          Manage your data and application settings
        </p>

        {/* Data Management */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Database className="w-4 h-4 text-orange-400" />
              <h3 className="text-lg font-medium text-white">Data Management</h3>
            </div>
            
            <div className="space-y-4">
              <div className="border border-slate-600 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">
                  Import Recent Activities
                </h4>
                <p className="text-sm text-slate-300 mb-3">
                  Import your latest activities from Strava (last 20 runs). 
                  This automatically calculates and updates Personal Bests for all distances.
                </p>
                <button
                  onClick={handleImportRecentRuns}
                  disabled={isImportingRuns}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isImportingRuns ? 'Importing...' : 'Import Recent Runs'}</span>
                </button>
              </div>

              <div className="border border-slate-600 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">
                  Reprocess All Activities
                </h4>
                <p className="text-sm text-slate-300 mb-3">
                  Re-analyze all your activities to regenerate segments and update Personal Bests.
                  Useful if you want to recalculate all data or fix any issues.
                </p>
                <button
                  onClick={handleReprocessActivities}
                  disabled={isReprocessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isReprocessing ? 'Processing...' : 'Reprocess All Activities'}</span>
                </button>
              </div>

              <div className="border border-slate-600 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-2">
                  Regenerate Homepage Data
                </h4>
                <p className="text-sm text-slate-300 mb-3">
                  Regenerate the homepage summary data with latest calculations.
                </p>
                <button
                  onClick={handleGenerateHomepageSummary}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center space-x-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Regenerate Homepage</span>
                </button>
              </div>
            </div>
          </div>

          {/* Basic Settings */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <SettingsIcon className="w-4 h-4 text-orange-400" />
              <h3 className="text-lg font-medium text-white">Application Info</h3>
            </div>
            <div className="border border-slate-600 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Version</p>
                  <p className="text-white">1.0.0</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Build</p>
                  <p className="text-white">Production</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Database</p>
                  <p className="text-white">Firebase Firestore</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Data Source</p>
                  <p className="text-white">Strava API</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsWorking;