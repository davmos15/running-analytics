import React, { useState, useEffect } from 'react';
import { Timer, TrendingUp, Award, Activity } from 'lucide-react';

const HomepageLite = () => {
  const [homepageSettings, setHomepageSettings] = useState({
    showGraphs: true,
    showTotals: true,
    showPBs: true,
    selectedGraphs: ['avg-speed', 'total-distance'],
    pbDistances: ['5K', '10K', '21.1K', '42.2K']
  });

  useEffect(() => {
    // Load homepage settings only
    const savedSettings = localStorage.getItem('homepageSettings');
    if (savedSettings) {
      setHomepageSettings(JSON.parse(savedSettings));
    }
  }, []);

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

      {/* Quick Stats Placeholder */}
      {homepageSettings.showTotals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="athletic-card p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Distance</p>
                <p className="text-2xl font-bold text-white">Loading...</p>
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
                <p className="text-2xl font-bold text-white">Loading...</p>
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
                <p className="text-2xl font-bold text-white">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Bests Placeholder */}
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
              const getDistanceInfo = (distance) => {
                const info = {
                  '5K': { name: '5K', emoji: '🏃‍♂️', color: 'from-green-500 to-emerald-600' },
                  '10K': { name: '10K', emoji: '🏃‍♀️', color: 'from-blue-500 to-cyan-600' },
                  '21.1K': { name: 'Half Marathon', emoji: '🏃', color: 'from-orange-500 to-red-600' },
                  '42.2K': { name: 'Marathon', emoji: '🏃‍♂️', color: 'from-purple-500 to-pink-600' }
                };
                return info[distance] || { name: distance, emoji: '🏃', color: 'from-gray-500 to-slate-600' };
              };
              
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
                    
                    <div>
                      <div className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        Loading...
                      </div>
                      <div className="text-sm text-slate-400">
                        -
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Graphs Placeholder */}
      {homepageSettings.showGraphs && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Performance Overview
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {homepageSettings.selectedGraphs.includes('avg-speed') && (
              <div className="athletic-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Average Speed</h3>
                <div className="h-64 flex items-center justify-center text-slate-400">
                  Loading graph...
                </div>
              </div>
            )}
            
            {homepageSettings.selectedGraphs.includes('total-distance') && (
              <div className="athletic-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Monthly Distance</h3>
                <div className="h-64 flex items-center justify-center text-slate-400">
                  Loading graph...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageLite;