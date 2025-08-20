import React, { useState, useEffect, useMemo } from 'react';
import { Settings as SettingsIcon, Calendar, Database, Globe, Download } from 'lucide-react';
import firebaseService from '../../services/firebaseService';
import syncService from '../../services/syncService';
import cacheService from '../../services/cacheService';
import { AVAILABLE_COLUMNS, COLUMN_CATEGORIES } from '../../utils/constants';

const SettingsOptimized = () => {
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [customDistances, setCustomDistances] = useState([]);
  const [newDistance, setNewDistance] = useState('');
  const [unitSystem, setUnitSystem] = useState('metric');
  const [isImportingRuns, setIsImportingRuns] = useState(false);
  const [columnSettings, setColumnSettings] = useState({});
  const [homepageSettings, setHomepageSettings] = useState({
    showGraphs: true,
    showTotals: true,
    showPBs: true,
    selectedGraphs: ['avg-speed', 'total-distance'],
    pbDistances: ['5K', '10K', '21.1K', '42.2K']
  });

  // Memoize available columns to prevent re-renders
  const availableColumns = useMemo(() => AVAILABLE_COLUMNS, []);

  // Load settings from localStorage with error handling
  useEffect(() => {
    try {
      // Date format
      const savedDateFormat = localStorage.getItem('dateFormat');
      if (savedDateFormat) {
        setDateFormat(savedDateFormat);
      }
      
      // Custom distances
      const savedDistances = localStorage.getItem('customDistances');
      if (savedDistances) {
        const parsedDistances = JSON.parse(savedDistances);
        if (Array.isArray(parsedDistances)) {
          setCustomDistances(parsedDistances);
        }
      }
      
      // Unit system
      const savedUnitSystem = localStorage.getItem('unitSystem');
      if (savedUnitSystem) {
        setUnitSystem(savedUnitSystem);
      }

      // Column settings with safety check
      const savedColumnSettings = localStorage.getItem('columnSettings');
      if (savedColumnSettings) {
        const parsedSettings = JSON.parse(savedColumnSettings);
        if (parsedSettings && typeof parsedSettings === 'object') {
          setColumnSettings(parsedSettings);
        }
      } else {
        // Initialize with default enabled state
        const initialSettings = {};
        availableColumns.forEach(col => {
          initialSettings[col.key] = col.enabled || false;
        });
        setColumnSettings(initialSettings);
      }
      
      // Homepage settings
      const savedHomepageSettings = localStorage.getItem('homepageSettings');
      if (savedHomepageSettings) {
        const parsedHomepage = JSON.parse(savedHomepageSettings);
        if (parsedHomepage && typeof parsedHomepage === 'object') {
          setHomepageSettings(parsedHomepage);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [availableColumns]);

  const handleDateFormatChange = (format) => {
    setDateFormat(format);
    localStorage.setItem('dateFormat', format);
    showSuccess();
  };

  const showSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleReprocessActivities = async () => {
    if (window.confirm('This will reprocess your recent activities to find the correct fastest segments (PBs). This fixes the issue where PBs were only detected from the start of runs. Continue?')) {
      setIsReprocessing(true);
      try {
        // Clear cache before reprocessing
        cacheService.clearAllCache();
        
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

  
  
  const handleUnitSystemChange = (newSystem) => {
    setUnitSystem(newSystem);
    localStorage.setItem('unitSystem', newSystem);
    showSuccess();
  };



  const handleImportRecentRuns = async () => {
    if (window.confirm('This will import your recent activities from Strava. Continue?')) {
      setIsImportingRuns(true);
      try {
        // Clear cache before importing new data
        cacheService.clearAllCache();
        
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

  const handleClearCache = () => {
    if (window.confirm('This will clear all cached data and force fresh data loading. Continue?')) {
      cacheService.clearAllCache();
      alert('Cache cleared successfully! Pages will load fresh data on next visit.');
      showSuccess();
    }
  };

  const dateFormatOptions = [
    { value: 'DD MMM YYYY', label: '28 Jan 2025' },
    { value: 'MM/DD/YYYY', label: '01/28/2025' },
    { value: 'DD/MM/YYYY', label: '28/01/2025' },
    { value: 'YYYY-MM-DD', label: '2025-01-28' },
    { value: 'MMM DD, YYYY', label: 'Jan 28, 2025' },
    { value: 'DD.MM.YYYY', label: '28.12.2025' }
  ];

  return (
    <div className="mt-6 space-y-6 mx-4">
      <div className="athletic-card-gradient p-6">
        <div className="flex items-center space-x-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-orange-400" />
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Settings</h2>
        </div>

        {showSuccessMessage && (
          <div className="mb-4 p-3 bg-green-500/20 text-green-300 rounded-lg border border-green-500/30">
            Settings saved successfully!
          </div>
        )}

        {/* Cache Management */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-3">
            <Database className="w-4 h-4 text-orange-400" />
            <h3 className="text-md font-medium text-white">Performance Cache</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Manage cached data for improved performance
          </p>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Clear All Cache
          </button>
        </div>

        {/* Date Format Settings */}
        <div className="mb-8 border-t border-blue-500/20 pt-6">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-4 h-4 text-orange-400" />
            <h3 className="text-md font-medium text-white">Date Format</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Choose how dates are displayed throughout the application
          </p>
          <select
            value={dateFormat}
            onChange={(e) => handleDateFormatChange(e.target.value)}
            className="w-full md:w-1/2 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
          >
            {dateFormatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.value})
              </option>
            ))}
          </select>
        </div>

        {/* Unit System Settings */}
        <div className="border-t border-blue-500/20 pt-6 mb-8">
          <div className="flex items-center space-x-2 mb-3">
            <Globe className="w-4 h-4 text-orange-400" />
            <h3 className="text-md font-medium text-white">Unit System</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Choose between metric (kilometers) and imperial (miles) units
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => handleUnitSystemChange('metric')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                unitSystem === 'metric'
                  ? 'athletic-button-primary text-white'
                  : 'athletic-button-secondary text-slate-300'
              }`}
            >
              Metric (km)
            </button>
            <button
              onClick={() => handleUnitSystemChange('imperial')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                unitSystem === 'imperial'
                  ? 'athletic-button-primary text-white'
                  : 'athletic-button-secondary text-slate-300'
              }`}
            >
              Imperial (miles)
            </button>
          </div>
        </div>

        {/* Homepage Customization */}
        <div className="border-t border-blue-500/20 pt-6 mb-8">
          <div className="flex items-center space-x-2 mb-3">
            <SettingsIcon className="w-4 h-4 text-orange-400" />
            <h3 className="text-md font-medium text-white">Homepage Customization</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Customize what appears on your homepage dashboard
          </p>
          
          <div className="space-y-4">
            {/* Show/Hide Sections */}
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Display Sections</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={homepageSettings.showTotals}
                    onChange={(e) => {
                      const newSettings = { ...homepageSettings, showTotals: e.target.checked };
                      setHomepageSettings(newSettings);
                      localStorage.setItem('homepageSettings', JSON.stringify(newSettings));
                    }}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded"
                  />
                  <span className="text-sm text-white">Total Statistics Cards</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={homepageSettings.showPBs}
                    onChange={(e) => {
                      const newSettings = { ...homepageSettings, showPBs: e.target.checked };
                      setHomepageSettings(newSettings);
                      localStorage.setItem('homepageSettings', JSON.stringify(newSettings));
                    }}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded"
                  />
                  <span className="text-sm text-white">Personal Best Cards</span>
                </label>
              </div>
            </div>
            
            {/* PB Distance Selection */}
            {homepageSettings.showPBs && (
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Personal Best Distances</h4>
                <div className="space-y-2">
                  {[
                    { id: '5K', label: '5K' },
                    { id: '10K', label: '10K' },
                    { id: '21.1K', label: 'Half Marathon' },
                    { id: '42.2K', label: 'Marathon' }
                  ].map(distance => (
                    <label key={distance.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={homepageSettings.pbDistances?.includes(distance.id) || false}
                        onChange={(e) => {
                          let newDistances;
                          if (e.target.checked) {
                            newDistances = [...(homepageSettings.pbDistances || []), distance.id];
                          } else {
                            newDistances = (homepageSettings.pbDistances || []).filter(d => d !== distance.id);
                          }
                          const newSettings = { ...homepageSettings, pbDistances: newDistances };
                          setHomepageSettings(newSettings);
                          localStorage.setItem('homepageSettings', JSON.stringify(newSettings));
                        }}
                        className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded"
                      />
                      <span className="text-sm text-white">{distance.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div className="border-t border-blue-500/20 pt-6">
          <div className="flex items-center space-x-2 mb-3">
            <Database className="w-4 h-4 text-orange-400" />
            <h3 className="text-md font-medium text-white">Data Management</h3>
          </div>
          
          <div className="space-y-4">
            <div>
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

            <div>
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
                className="px-4 py-2 athletic-button-primary text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
              >
                {isReprocessing ? 'Processing...' : 'Reprocess All Activities'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsOptimized;