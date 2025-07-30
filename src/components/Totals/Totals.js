import React, { useState, useEffect } from 'react';
import { Filter, Eye, EyeOff, Settings as SettingsIcon } from 'lucide-react';
import DistanceThresholdGraph from '../Graphs/DistanceThresholdGraph';
import firebaseService from '../../services/firebaseService';
import { TIME_FILTERS, DISTANCES } from '../../utils/constants';
import { formatTime } from '../../utils/timeUtils';

const Totals = () => {
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalDistance: 0,
    totalTime: 0,
    totalRuns: 0
  });

  // Distance threshold graph settings
  const [distanceThresholdSettings, setDistanceThresholdSettings] = useState({
    chartType: 'bar',
    color: '#f97316',
    visibleDistances: null,
    visible: true,
    showSettings: false
  });

  const [allDistances, setAllDistances] = useState([]);

  // Load distances and settings on mount
  useEffect(() => {
    // Load all available distances
    const customDistances = localStorage.getItem('customDistances');
    const baseDistances = DISTANCES.filter(d => d !== 'Custom');
    if (customDistances) {
      const custom = JSON.parse(customDistances);
      const allDistancesList = [...baseDistances, ...custom.map(d => d.label)];
      setAllDistances(allDistancesList);
    } else {
      setAllDistances(baseDistances);
    }

    // Load saved settings
    const savedDistanceSettings = localStorage.getItem('distanceThresholdSettings');
    if (savedDistanceSettings) {
      setDistanceThresholdSettings(prev => ({
        ...prev,
        ...JSON.parse(savedDistanceSettings)
      }));
    }
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('distanceThresholdSettings', JSON.stringify(distanceThresholdSettings));
  }, [distanceThresholdSettings]);

  // Load total statistics
  const loadTotalStats = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get all activities for the time period
      const activities = await firebaseService.getActivities(timeFilter, customDateFrom, customDateTo);
      
      // Filter running activities
      const runningActivities = activities.filter(activity => 
        ['Run', 'TrailRun'].includes(activity.type)
      );

      // Calculate totals
      const totalDistance = runningActivities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
      const totalTime = runningActivities.reduce((sum, activity) => sum + (activity.elapsed_time || activity.moving_time || 0), 0);
      const totalRuns = runningActivities.length;

      setTotalStats({
        totalDistance,
        totalTime,
        totalRuns
      });
    } catch (error) {
      console.error('Error loading total stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    loadTotalStats();
  }, [loadTotalStats]);

  const formatDistance = (meters) => {
    const km = meters / 1000;
    if (km >= 1000) {
      return `${(km / 1000).toFixed(1)}k km`;
    }
    return `${km.toFixed(1)} km`;
  };

  const toggleDistanceVisibility = (distance) => {
    const currentVisible = distanceThresholdSettings.visibleDistances || allDistances;
    let newVisible;
    
    if (currentVisible.includes(distance)) {
      newVisible = currentVisible.filter(d => d !== distance);
    } else {
      newVisible = [...currentVisible, distance];
    }
    
    // If all distances are selected, set to null (show all)
    if (newVisible.length === allDistances.length) {
      newVisible = null;
    }
    
    setDistanceThresholdSettings(prev => ({
      ...prev,
      visibleDistances: newVisible
    }));
  };

  const resetDistanceFilter = () => {
    setDistanceThresholdSettings(prev => ({
      ...prev,
      visibleDistances: null
    }));
  };

  const visibleDistances = distanceThresholdSettings.visibleDistances || allDistances;

  return (
    <div className="mt-6 space-y-6 mx-4">
      <div className="athletic-card-gradient p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Running Totals
          </h2>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2 px-3 py-2 athletic-button-secondary text-slate-300 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Date Filter</span>
          </button>
        </div>

        {isFilterOpen && (
          <div className="mb-6 p-4 athletic-card rounded-lg">
            <h3 className="font-medium text-white mb-3">Date Filter</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm text-white"
                >
                  {TIME_FILTERS.map(filter => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
              </div>
              
              {timeFilter === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">From Date</label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">To Date</label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm text-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Total Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="athletic-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Total Distance</h3>
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">🏃</span>
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-white">
                {formatDistance(totalStats.totalDistance)}
              </div>
            )}
            <div className="text-sm text-slate-400 mt-1">
              Cumulative running distance
            </div>
          </div>

          <div className="athletic-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Total Time</h3>
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-white">
                {formatTime(totalStats.totalTime)}
              </div>
            )}
            <div className="text-sm text-slate-400 mt-1">
              Total time running
            </div>
          </div>

          <div className="athletic-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Total Runs</h3>
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-white">
                {totalStats.totalRuns.toLocaleString()}
              </div>
            )}
            <div className="text-sm text-slate-400 mt-1">
              Total completed runs
            </div>
          </div>
        </div>

        {/* Distance Analysis Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Distance Analysis</h3>
              <p className="text-sm text-slate-300">See how many runs exceed each distance threshold</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setDistanceThresholdSettings(prev => ({
                  ...prev,
                  visible: !prev.visible
                }))}
                className="p-2 athletic-button-secondary rounded-lg"
              >
                {distanceThresholdSettings.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setDistanceThresholdSettings(prev => ({
                  ...prev,
                  showSettings: !prev.showSettings
                }))}
                className="p-2 athletic-button-secondary rounded-lg"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              <select
                value={distanceThresholdSettings.chartType}
                onChange={(e) => setDistanceThresholdSettings(prev => ({
                  ...prev,
                  chartType: e.target.value
                }))}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value="bar">Bar Chart</option>
                <option value="column">Column Chart</option>
              </select>
            </div>
          </div>

          {/* Distance Filter Settings */}
          {distanceThresholdSettings.showSettings && (
            <div className="mb-4 p-4 athletic-card rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">Distance Visibility</h4>
                <button
                  onClick={resetDistanceFilter}
                  className="text-sm text-orange-400 hover:text-orange-300"
                >
                  Show All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {allDistances.map(distance => (
                  <label
                    key={distance}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-blue-500/10 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleDistances.includes(distance)}
                      onChange={() => toggleDistanceVisibility(distance)}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-slate-600 bg-slate-700 rounded"
                    />
                    <span className="text-sm text-white">{distance}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {visibleDistances.length} of {allDistances.length} distances visible
              </div>
            </div>
          )}
          
          {distanceThresholdSettings.visible && (
            <DistanceThresholdGraph
              color={distanceThresholdSettings.color}
              timePeriod={timeFilter}
              customDateFrom={customDateFrom}
              customDateTo={customDateTo}
              chartType={distanceThresholdSettings.chartType}
              visibleDistances={distanceThresholdSettings.visibleDistances}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Totals;