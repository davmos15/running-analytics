import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Calendar, Database, Download, RefreshCw, Eye, EyeOff, Plus, X } from 'lucide-react';
import firebaseService from '../../services/firebaseService';
import syncService from '../../services/syncService';
import { DISTANCES } from '../../utils/constants';

const SettingsWorking = () => {
  const [isImportingRuns, setIsImportingRuns] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [visibleDistances, setVisibleDistances] = useState(DISTANCES);
  const [customDistances, setCustomDistances] = useState([]);
  const [newDistance, setNewDistance] = useState('');
  const [showAddDistance, setShowAddDistance] = useState(false);

  const showSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  // Load settings on mount
  useEffect(() => {
    const savedVisibleDistances = localStorage.getItem('visibleDistances');
    if (savedVisibleDistances) {
      setVisibleDistances(JSON.parse(savedVisibleDistances));
    }
    
    const savedCustomDistances = localStorage.getItem('customDistances');
    if (savedCustomDistances) {
      const parsed = JSON.parse(savedCustomDistances);
      // Handle both old string format and new object format
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        // Convert old string format to new object format
        const objectFormat = parsed.map(distance => ({
          label: distance,
          meters: distance.includes('K') ? parseFloat(distance) * 1000 : parseFloat(distance)
        }));
        setCustomDistances(objectFormat);
        localStorage.setItem('customDistances', JSON.stringify(objectFormat));
      } else {
        setCustomDistances(parsed);
      }
    }
  }, []);

  const toggleDistanceVisibility = (distance) => {
    // Handle both string distances and object distances
    const distanceLabel = typeof distance === 'string' ? distance : distance.label;
    
    const newVisibleDistances = visibleDistances.includes(distanceLabel)
      ? visibleDistances.filter(d => d !== distanceLabel)
      : [...visibleDistances, distanceLabel];
    
    setVisibleDistances(newVisibleDistances);
    localStorage.setItem('visibleDistances', JSON.stringify(newVisibleDistances));
    showSuccess();
  };

  const handleAddCustomDistance = () => {
    const distanceValue = parseFloat(newDistance);
    if (!isNaN(distanceValue) && distanceValue > 0) {
      const distanceMeters = distanceValue * 1000;
      const distanceLabel = distanceValue >= 1 ? `${distanceValue}K` : `${distanceMeters.toFixed(0)}m`;
      
      // Check if distance already exists (by label)
      const existingDistance = customDistances.find(d => d.label === distanceLabel);
      const isStandardDistance = DISTANCES.includes(distanceLabel);
      
      if (!existingDistance && !isStandardDistance) {
        const newDistanceObject = {
          label: distanceLabel,
          meters: distanceMeters
        };
        
        const newCustomDistances = [...customDistances, newDistanceObject];
        setCustomDistances(newCustomDistances);
        localStorage.setItem('customDistances', JSON.stringify(newCustomDistances));
        
        // Also add to visible distances
        const newVisibleDistances = [...visibleDistances, distanceLabel];
        setVisibleDistances(newVisibleDistances);
        localStorage.setItem('visibleDistances', JSON.stringify(newVisibleDistances));
        
        setNewDistance('');
        setShowAddDistance(false);
        showSuccess();
      }
    }
  };

  const handleRemoveCustomDistance = (distance) => {
    // Handle both string and object formats
    const distanceLabel = typeof distance === 'string' ? distance : distance.label;
    
    const newCustomDistances = customDistances.filter(d => d.label !== distanceLabel);
    setCustomDistances(newCustomDistances);
    localStorage.setItem('customDistances', JSON.stringify(newCustomDistances));
    
    // Also remove from visible distances
    const newVisibleDistances = visibleDistances.filter(d => d !== distanceLabel);
    setVisibleDistances(newVisibleDistances);
    localStorage.setItem('visibleDistances', JSON.stringify(newVisibleDistances));
    
    showSuccess();
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

          {/* PB Distance Settings */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Eye className="w-4 h-4 text-orange-400" />
              <h3 className="text-lg font-medium text-white">Personal Best Distances</h3>
            </div>
            
            <div className="border border-slate-600 rounded-lg p-4">
              <p className="text-sm text-slate-300 mb-4">
                Choose which distances to show on the Personal Bests page
              </p>
              
              {/* Standard Distances */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-white mb-2">Standard Distances</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DISTANCES.map(distance => (
                    <button
                      key={distance}
                      onClick={() => toggleDistanceVisibility(distance)}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                        visibleDistances.includes(distance)
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      <span>{distance}</span>
                      {visibleDistances.includes(distance) ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Distances */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">Custom Distances</h4>
                  <button
                    onClick={() => setShowAddDistance(!showAddDistance)}
                    className="px-2 py-1 bg-orange-600 text-white rounded text-xs flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
                
                {showAddDistance && (
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Distance in km"
                      value={newDistance}
                      onChange={(e) => setNewDistance(e.target.value)}
                      className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <button
                      onClick={handleAddCustomDistance}
                      className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddDistance(false);
                        setNewDistance('');
                      }}
                      className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                
                {customDistances.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {customDistances.map(distance => (
                      <div key={distance.label} className="flex items-center space-x-1 px-3 py-1 bg-slate-700 rounded-lg">
                        <button
                          onClick={() => toggleDistanceVisibility(distance.label)}
                          className={`text-sm ${
                            visibleDistances.includes(distance.label) ? 'text-green-400' : 'text-slate-400'
                          }`}
                        >
                          {visibleDistances.includes(distance.label) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <span className="text-sm text-white">{distance.label}</span>
                        <button
                          onClick={() => handleRemoveCustomDistance(distance)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No custom distances added</p>
                )}
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