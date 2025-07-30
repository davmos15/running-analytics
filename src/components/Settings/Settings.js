import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Calendar, Database, Plus, X, Globe, Download, ChevronDown, ChevronRight, Columns } from 'lucide-react';
import firebaseService from '../../services/firebaseService';
import syncService from '../../services/syncService';
import { AVAILABLE_COLUMNS, COLUMN_CATEGORIES } from '../../utils/constants';

const Settings = () => {
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [customDistances, setCustomDistances] = useState([]);
  const [newDistance, setNewDistance] = useState('');
  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' or 'imperial'
  const [isAddingDistance, setIsAddingDistance] = useState(false);
  const [isImportingRuns, setIsImportingRuns] = useState(false);
  const [columnSettings, setColumnSettings] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  // Load settings from localStorage
  useEffect(() => {
    const savedDateFormat = localStorage.getItem('dateFormat');
    if (savedDateFormat) {
      setDateFormat(savedDateFormat);
    }
    
    const savedDistances = localStorage.getItem('customDistances');
    if (savedDistances) {
      setCustomDistances(JSON.parse(savedDistances));
    }
    
    const savedUnitSystem = localStorage.getItem('unitSystem');
    if (savedUnitSystem) {
      setUnitSystem(savedUnitSystem);
    }

    // Load column settings
    const savedColumnSettings = localStorage.getItem('columnSettings');
    if (savedColumnSettings) {
      setColumnSettings(JSON.parse(savedColumnSettings));
    } else {
      // Initialize with default enabled state
      const initialSettings = {};
      AVAILABLE_COLUMNS.forEach(col => {
        initialSettings[col.key] = col.enabled;
      });
      setColumnSettings(initialSettings);
    }
  }, []);

  const handleDateFormatChange = (format) => {
    setDateFormat(format);
    localStorage.setItem('dateFormat', format);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleReprocessActivities = async () => {
    if (window.confirm('This will reprocess all your activities to create segments for all distances. This may take a few minutes. Continue?')) {
      setIsReprocessing(true);
      try {
        await firebaseService.reprocessAllActivitiesForSegments();
        alert('Activities reprocessed successfully!');
      } catch (error) {
        alert('Error reprocessing activities: ' + error.message);
      } finally {
        setIsReprocessing(false);
      }
    }
  };

  const handleAddDistance = async () => {
    if (!newDistance || isNaN(parseFloat(newDistance))) {
      alert('Please enter a valid distance in kilometers');
      return;
    }
    
    const distanceKm = parseFloat(newDistance);
    const distanceMeters = distanceKm * 1000;
    const distanceLabel = distanceKm >= 1 ? `${distanceKm}K` : `${distanceMeters}m`;
    
    if (customDistances.some(d => d.meters === distanceMeters)) {
      alert('This distance already exists');
      return;
    }
    
    setIsAddingDistance(true);
    try {
      // Add the new distance
      const newDistanceObj = { label: distanceLabel, meters: distanceMeters };
      const updatedDistances = [...customDistances, newDistanceObj].sort((a, b) => a.meters - b.meters);
      setCustomDistances(updatedDistances);
      localStorage.setItem('customDistances', JSON.stringify(updatedDistances));
      
      // Generate segments for this new distance
      await firebaseService.generateSegmentsForDistance(distanceMeters);
      
      setNewDistance('');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      alert('Error creating distance: ' + error.message);
    } finally {
      setIsAddingDistance(false);
    }
  };
  
  const handleDeleteDistance = (distanceToDelete) => {
    const updatedDistances = customDistances.filter(d => d.meters !== distanceToDelete.meters);
    setCustomDistances(updatedDistances);
    localStorage.setItem('customDistances', JSON.stringify(updatedDistances));
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };
  
  const handleUnitSystemChange = (newSystem) => {
    setUnitSystem(newSystem);
    localStorage.setItem('unitSystem', newSystem);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleColumnToggle = (columnKey) => {
    const newSettings = {
      ...columnSettings,
      [columnKey]: !columnSettings[columnKey]
    };
    setColumnSettings(newSettings);
    localStorage.setItem('columnSettings', JSON.stringify(newSettings));
  };

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };


  const handleImportRecentRuns = async () => {
    if (window.confirm('This will import your recent activities from Strava. Continue?')) {
      setIsImportingRuns(true);
      try {
        const result = await syncService.syncRecentActivities();
        alert(`Import complete! Found ${result.newActivitiesCount} new activities.`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } catch (error) {
        alert('Error importing recent runs: ' + error.message);
      } finally {
        setIsImportingRuns(false);
      }
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

        {/* Date Format Settings */}
        <div className="mb-8">
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
        <div className="border-t border-blue-500/20 pt-6">
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

        {/* Column Management Settings */}
        <div className="border-t border-blue-500/20 pt-6" id="column-management">
          <div className="flex items-center space-x-2 mb-3">
            <Columns className="w-4 h-4 text-orange-400" />
            <h3 className="text-md font-medium text-white">Column Management</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Control which columns are available in the Personal Bests table. Enabled columns will appear in the column selector.
          </p>
          
          <div className="space-y-3">
            {Object.entries(COLUMN_CATEGORIES).map(([categoryKey, category]) => {
              const categoryColumns = AVAILABLE_COLUMNS.filter(col => col.category === categoryKey);
              const isExpanded = expandedCategories[categoryKey];
              
              return (
                <div key={categoryKey} className="athletic-card rounded-lg">
                  <button
                    onClick={() => toggleCategory(categoryKey)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-500/10 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-white">{category.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{category.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500">
                        {categoryColumns.filter(col => columnSettings[col.key]).length}/{categoryColumns.length} enabled
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-blue-500/20">
                      {categoryColumns.map(column => (
                        <label
                          key={column.key}
                          className={`flex items-start space-x-3 p-2 rounded cursor-pointer hover:bg-blue-500/10 ${
                            column.key === 'rank' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={columnSettings[column.key] || false}
                            onChange={() => column.key !== 'rank' && handleColumnToggle(column.key)}
                            disabled={column.key === 'rank'}
                            className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded disabled:opacity-50"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-white">
                                {column.label}
                              </span>
                              {column.key === 'rank' && (
                                <span className="text-xs text-slate-500">(Always enabled)</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 mt-1">
                              {column.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Distances */}
        <div className="border-t border-blue-500/20 pt-6">
          <div className="flex items-center space-x-2 mb-3">
            <Plus className="w-4 h-4 text-orange-400" />
            <h3 className="text-md font-medium text-white">Custom Distances</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Add custom distances for Personal Bests tracking (enter values in kilometers)
          </p>
          
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.1"
                placeholder="Enter distance in km (e.g., 7.5)"
                value={newDistance}
                onChange={(e) => setNewDistance(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-slate-400"
              />
              <button
                onClick={handleAddDistance}
                disabled={isAddingDistance || !newDistance}
                className="px-4 py-2 athletic-button-primary text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingDistance ? 'Adding...' : 'Add'}</span>
              </button>
            </div>
            
            {customDistances.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium text-slate-300">Your custom distances:</p>
                {customDistances.map((distance) => (
                  <div key={distance.meters} className="flex items-center justify-between p-3 athletic-card rounded-lg">
                    <span className="font-medium text-white">{distance.label}</span>
                    <button
                      onClick={() => handleDeleteDistance(distance)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
                This is useful for keeping your data up to date without a full sync.
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
                Generate Segments for All Distances
              </h4>
              <p className="text-sm text-slate-300 mb-3">
                Process all your activities to create segments for every supported distance (100m to Marathon).
                This is useful if you're missing data for shorter distances.
              </p>
              <button
                onClick={handleReprocessActivities}
                disabled={isReprocessing}
                className="px-4 py-2 athletic-button-primary text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
              >
                {isReprocessing ? 'Processing...' : 'Reprocess All Activities'}
              </button>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2">
                Find Best Segments with GPS Data
              </h4>
              <p className="text-sm text-slate-300 mb-3">
                Re-analyze activities using GPS streams to find your actual fastest segments within each run.
                This will find your best efforts anywhere in the run, not just from the start.
              </p>
              <button
                onClick={() => alert('This feature will be available after syncing. Use the Sync button to fetch GPS data for new segments.')}
                className="px-4 py-2 athletic-button-secondary text-slate-300 rounded-lg text-sm"
              >
                Coming Soon - Use Sync for Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;