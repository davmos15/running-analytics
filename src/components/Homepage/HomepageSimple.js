import React from 'react';
import { Timer, TrendingUp, Award, Activity } from 'lucide-react';
import { useHomepageSummary } from '../../hooks/useHomepageSummary';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';

const HomepageSimple = () => {
  const { totalStats, keyPBs, isLoading, error } = useHomepageSummary();

  if (isLoading && !totalStats) {
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

  if (error && !totalStats) {
    return (
      <div className="mt-6 space-y-6 mx-4">
        <div className="athletic-card p-6">
          <div className="text-red-400 text-center">
            {error}
          </div>
        </div>
      </div>
    );
  }

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
      {/* Welcome Header */}
      <div className="athletic-card-gradient p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Athletic Performance Hub
          </h1>
        </div>
      </div>

      {/* Total Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="athletic-card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm text-slate-400">Total Distance</p>
            <p className="text-2xl font-bold text-white">
              {totalStats?.totalDistance ? `${totalStats.totalDistance.toFixed(0)}km` : 'No data'}
            </p>
          </div>
        </div>
        
        <div className="athletic-card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3">
              <Timer className="w-6 h-6 text-orange-400" />
            </div>
            <p className="text-sm text-slate-400">Total Time</p>
            <p className="text-2xl font-bold text-white">
              {totalStats?.totalTime ? formatDuration(totalStats.totalTime) : 'No data'}
            </p>
          </div>
        </div>
        
        <div className="athletic-card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-sm text-slate-400">Total Runs</p>
            <p className="text-2xl font-bold text-white">
              {totalStats?.totalRuns || 'No data'}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Bests Cards */}
      <div>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Award className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Personal Bests
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['5K', '10K', '21.1K', '42.2K'].map((distance) => {
            const pb = keyPBs?.[distance];
            const distanceInfo = getDistanceInfo(distance);
            
            return (
              <div key={distance} className="athletic-card overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${distanceInfo.color}`}></div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <span className="text-xl">{distanceInfo.emoji}</span>
                    <span className="font-semibold text-white">{distanceInfo.name}</span>
                  </div>
                  
                  {pb ? (
                    <div>
                      <div className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {pb.time || 'No time'}
                      </div>
                      <div className="text-sm text-slate-400">
                        {pb.date ? formatDate(pb.date) : 'No date'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {pb.pace || 'No pace'}/km
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
    </div>
  );
};

export default HomepageSimple;