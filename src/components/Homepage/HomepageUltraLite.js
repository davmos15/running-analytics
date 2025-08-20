import React from 'react';
import { Timer, TrendingUp, Award, Activity } from 'lucide-react';

const HomepageUltraLite = () => {
  return (
    <div className="mt-6 space-y-6 mx-4">
      {/* Welcome Header - Immediate render */}
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

      {/* Instant Stats Cards - No API calls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="athletic-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Distance</p>
              <p className="text-2xl font-bold text-white">Ready</p>
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
              <p className="text-2xl font-bold text-white">Ready</p>
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
              <p className="text-2xl font-bold text-white">Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick PB Cards - No API calls */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Award className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Personal Bests
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { distance: '5K', emoji: '🏃‍♂️', color: 'from-green-500 to-emerald-600', name: '5K' },
            { distance: '10K', emoji: '🏃‍♀️', color: 'from-blue-500 to-cyan-600', name: '10K' },
            { distance: '21.1K', emoji: '🏃', color: 'from-orange-500 to-red-600', name: 'Half Marathon' },
            { distance: '42.2K', emoji: '🏃‍♂️', color: 'from-purple-500 to-pink-600', name: 'Marathon' }
          ].map((pb) => (
            <div key={pb.distance} className="athletic-card overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${pb.color}`}></div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{pb.emoji}</span>
                    <span className="font-semibold text-white">{pb.name}</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    Ready
                  </div>
                  <div className="text-sm text-slate-400">
                    Click any tab to start
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Notice */}
      <div className="athletic-card p-6">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-5 h-5 text-green-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Ultra Performance Mode</h3>
            <p className="text-slate-300 mb-3">
              This homepage loads instantly with zero API calls for maximum performance. 
              Your actual data will load when you navigate to specific pages.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="text-sm">
                <span className="text-green-400 font-medium">✓ Personal Bests:</span>
                <span className="text-slate-300 ml-2">View your fastest times</span>
              </div>
              <div className="text-sm">
                <span className="text-blue-400 font-medium">✓ Recent Runs:</span>
                <span className="text-slate-300 ml-2">Latest activities</span>
              </div>
              <div className="text-sm">
                <span className="text-orange-400 font-medium">✓ Graphs:</span>
                <span className="text-slate-300 ml-2">Performance analytics</span>
              </div>
              <div className="text-sm">
                <span className="text-purple-400 font-medium">✓ Predictions:</span>
                <span className="text-slate-300 ml-2">Race time estimates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomepageUltraLite;