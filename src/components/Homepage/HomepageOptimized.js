import React, { useState, useEffect, useCallback } from 'react';
import { Timer, TrendingUp, Award, Activity, RefreshCw } from 'lucide-react';
import firebaseService from '../../services/firebaseService';
import cacheService from '../../services/cacheService';
import { formatTime } from '../../utils/timeUtils';

const HomepageOptimized = () => {
  const [totalStats, setTotalStats] = useState({
    totalDistance: 0,
    totalTime: 0,
    totalRuns: 0
  });
  const [keyPBs, setKeyPBs] = useState({});
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [homepageSettings, setHomepageSettings] = useState({
    showGraphs: true,
    showTotals: true,
    showPBs: true,
    selectedGraphs: ['avg-speed', 'total-distance'],
    pbDistances: ['5K', '10K', '21.1K', '42.2K']
  });

  // Load settings immediately
  useEffect(() => {
    const savedSettings = localStorage.getItem('homepageSettings');
    if (savedSettings) {
      setHomepageSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Load cached data immediately, then fetch fresh data
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      // 1. Load cached data first for instant display
      if (!forceRefresh) {
        const cachedData = cacheService.getCachedHomepageData();
        if (cachedData) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Loading cached homepage data');
          }
          setTotalStats(cachedData.totalStats || totalStats);
          setKeyPBs(cachedData.keyPBs || {});
          setLastUpdated(cachedData.lastUpdated);
          
          // If we have valid cached data and it's not a force refresh, don't fetch fresh data
          if (!forceRefresh) {
            return;
          }
        }
      }

      // 2. Fetch fresh data in background
      setIsLoadingFresh(true);
      
      // Load total stats
      const activities = await firebaseService.getActivities();
      const runActivities = activities.filter(activity => 
        activity.type && ['Run', 'TrailRun', 'VirtualRun'].includes(activity.type)
      );
      
      const freshStats = {
        totalDistance: runActivities.reduce((sum, activity) => sum + (activity.distance || 0), 0) / 1000,
        totalTime: runActivities.reduce((sum, activity) => sum + (activity.moving_time || 0), 0),
        totalRuns: runActivities.length
      };
      
      // Load PBs efficiently in parallel
      const pbPromises = homepageSettings.pbDistances.map(async (distance) => {
        try {
          // Check cache first
          const cachedPB = cacheService.getCachedPersonalBests(distance);
          if (cachedPB && !forceRefresh) {
            return { distance, pb: cachedPB.length > 0 ? cachedPB[0] : null };
          }
          
          // Fetch fresh if no cache or force refresh
          const pbs = await firebaseService.getPersonalBests(distance, 'all-time');
          cacheService.cachePersonalBests(distance, pbs); // Cache the result
          return { distance, pb: pbs.length > 0 ? pbs[0] : null };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading PB for ${distance}:`, error);
          }
          return { distance, pb: null };
        }
      });
      
      const pbResults = await Promise.all(pbPromises);
      const freshPBs = {};
      pbResults.forEach(({ distance, pb }) => {
        freshPBs[distance] = pb;
      });

      // 3. Update UI with fresh data
      setTotalStats(freshStats);
      setKeyPBs(freshPBs);
      const now = new Date().toISOString();
      setLastUpdated(now);

      // 4. Cache the fresh data
      const homepageData = {
        totalStats: freshStats,
        keyPBs: freshPBs,
        lastUpdated: now
      };
      cacheService.cacheHomepageData(homepageData);
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading homepage data:', error);
      }
    } finally {
      setIsLoadingFresh(false);
    }
  }, [homepageSettings.pbDistances, totalStats]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);


  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDistanceInfo = (distance) => {
    const info = {
      '5K': { name: '5K', emoji: '🏃‍♂️', color: 'from-green-500 to-emerald-600' },
      '10K': { name: '10K', emoji: '🏃‍♀️', color: 'from-blue-500 to-cyan-600' },
      '21.1K': { name: 'Half Marathon', emoji: '🏃', color: 'from-orange-500 to-red-600' },
      '42.2K': { name: 'Marathon', emoji: '🏃‍♂️', color: 'from-purple-500 to-pink-600' }
    };
    return info[distance] || { name: distance, emoji: '🏃', color: 'from-gray-500 to-slate-600' };
  };

  return (
    <div className="mt-6 space-y-6 mx-4">
      {/* Welcome Header with Refresh */}
      <div className="athletic-card-gradient p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
              <Timer className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Athletic Performance Hub
              </h1>
              {lastUpdated && (
                <p className="text-sm text-slate-400">
                  Updated: {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={isLoadingFresh}
            className="px-4 py-2 athletic-button-secondary text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingFresh ? 'animate-spin' : ''}`} />
            <span>{isLoadingFresh ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
        <p className="text-slate-300">
          Your personalized running dashboard with cached data for optimal performance
        </p>
      </div>

      {/* Total Stats Cards */}
      {homepageSettings.showTotals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="athletic-card p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Distance</p>
                <p className="text-2xl font-bold text-white">
                  {totalStats.totalDistance > 0 ? `${totalStats.totalDistance.toFixed(0)}km` : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="athletic-card p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Timer className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Time</p>
                <p className="text-2xl font-bold text-white">
                  {totalStats.totalTime > 0 ? formatDuration(totalStats.totalTime) : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="athletic-card p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Runs</p>
                <p className="text-2xl font-bold text-white">
                  {totalStats.totalRuns > 0 ? totalStats.totalRuns : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Bests Cards */}
      {homepageSettings.showPBs && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Award className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Personal Bests
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {homepageSettings.pbDistances.map((distance) => {
              const pb = keyPBs[distance];
              const distanceInfo = getDistanceInfo(distance);
              
              return (
                <div key={distance} className="athletic-card overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${distanceInfo.color}`}></div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{distanceInfo.emoji}</span>
                        <span className="font-semibold text-white">{distanceInfo.name}</span>
                      </div>
                    </div>
                    
                    {pb ? (
                      <div>
                        <div className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {formatTime(pb.time)}
                        </div>
                        <div className="text-sm text-slate-400">
                          {new Date(pb.date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {pb.pace}/km
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-sm">
                        {keyPBs[distance] === undefined ? 'Loading...' : 'No PB recorded'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageOptimized;