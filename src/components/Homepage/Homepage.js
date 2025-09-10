import React, { useState, useEffect, useCallback } from 'react';
import { Timer, TrendingUp, Award, Activity } from 'lucide-react';
import firebaseService from '../../services/firebaseService';
import BarGraph from '../Graphs/BarGraph';
import DistanceThresholdGraph from '../Graphs/DistanceThresholdGraph';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatTime } from '../../utils/timeUtils';

const Homepage = () => {
  const [totalStats, setTotalStats] = useState({
    totalDistance: 0,
    totalTime: 0,
    totalRuns: 0
  });
  const [keyPBs, setKeyPBs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [homepageSettings, setHomepageSettings] = useState({
    showGraphs: true,
    showTotals: true,
    showPBs: true,
    selectedGraphs: ['total-distance'],
    pbDistances: ['5K', '10K', '21.1K', '42.2K']
  });
  const [distanceGraphPeriod, setDistanceGraphPeriod] = useState('monthly');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load data in parallel instead of sequential
      const [statsResponse, ...pbResponses] = await Promise.allSettled([
        // Load summary stats (optimized method)
        firebaseService.getRunningStatsSummary(),
        // Load PBs in parallel
        ...homepageSettings.pbDistances.map(distance => 
          firebaseService.getPersonalBests(distance, 'all-time').catch(error => {
            console.error(`Error loading PB for ${distance}:`, error);
            return [];
          })
        )
      ]);
      
      // Process total stats
      if (statsResponse.status === 'fulfilled') {
        setTotalStats(statsResponse.value);
      }
      
      // Process PBs
      const pbMap = {};
      pbResponses.forEach((response, index) => {
        const distance = homepageSettings.pbDistances[index];
        if (response.status === 'fulfilled' && response.value && response.value.length > 0) {
          pbMap[distance] = response.value[0];
        } else {
          pbMap[distance] = null;
        }
      });
      setKeyPBs(pbMap);
      
    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [homepageSettings.pbDistances]);

  useEffect(() => {
    // Load homepage settings first
    const savedSettings = localStorage.getItem('homepageSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setHomepageSettings(settings);
    }
  }, []);

  // Separate effect for loading data only when settings are loaded
  useEffect(() => {
    // Only load data if we have settings loaded (avoid loading with default settings)
    if (homepageSettings.pbDistances && homepageSettings.pbDistances.length > 0) {
      loadData();
    }
  }, [homepageSettings.pbDistances, loadData]);

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

  if (isLoading) {
    return (
      <div className="mt-6 space-y-6 mx-4">
        <div className="athletic-card-gradient p-6">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6 mx-4">
      {/* Welcome Header */}
      <div className="athletic-card-gradient p-6 text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
            <Timer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Athletic Performance Hub
          </h1>
        </div>
        <p className="text-slate-300">
          Your personalized running dashboard with insights, records, and performance analytics
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
                <p className="text-2xl font-bold text-white">{totalStats.totalDistance.toFixed(0)}km</p>
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
                <p className="text-2xl font-bold text-white">{formatDuration(totalStats.totalTime)}</p>
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
                <p className="text-2xl font-bold text-white">{totalStats.totalRuns}</p>
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
                          {typeof pb.time === 'string' ? pb.time : formatTime(pb.time)}
                        </div>
                        <div className="text-sm text-slate-400">
                          {(() => {
                            if (!pb.date) return 'Date not available';
                            const date = new Date(pb.date);
                            const isValidDate = !isNaN(date.getTime()) && date.toString() !== 'Invalid Date';
                            return isValidDate ? date.toLocaleDateString() : 'Date not available';
                          })()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {pb.pace}/km
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-sm">
                        No PB recorded
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Graphs Section */}
      {homepageSettings.showGraphs && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Performance Overview
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {homepageSettings.selectedGraphs.includes('total-distance') && (
              <div className="athletic-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {distanceGraphPeriod === 'weekly' ? 'Weekly' : 
                     distanceGraphPeriod === 'monthly' ? 'Monthly' : 
                     'Yearly'} Distance
                  </h3>
                  <select
                    value={distanceGraphPeriod}
                    onChange={(e) => setDistanceGraphPeriod(e.target.value)}
                    className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-orange-400"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <BarGraph
                  metric="distance"
                  period={distanceGraphPeriod}
                  color="#F59E0B"
                  timeFilter={distanceGraphPeriod === 'weekly' ? 'last-12-weeks' : 
                              distanceGraphPeriod === 'monthly' ? 'last-12-months' : 
                              'last-5-years'}
                  isTotal={true}
                />
              </div>
            )}
            
            {homepageSettings.selectedGraphs.includes('distance-threshold') && (
              <div className="athletic-card p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Distance Analysis</h3>
                <DistanceThresholdGraph
                  color="#10B981"
                  timePeriod="last-12-months"
                  chartType="bar"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Homepage;