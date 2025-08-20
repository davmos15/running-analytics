import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

const PredictionsPageLite = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [raceDate, setRaceDate] = useState(new Date().toISOString().split('T')[0]);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    // Simulate loading with a brief delay, then show placeholder content
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Set placeholder predictions to avoid heavy computation
      setPredictions({
        raceDate: raceDate,
        confidence: 75,
        distances: [
          { distance: '5K', time: 'Loading...', confidence: 75 },
          { distance: '10K', time: 'Loading...', confidence: 75 },
          { distance: '21.1K', time: 'Loading...', confidence: 75 },
          { distance: '42.2K', time: 'Loading...', confidence: 75 }
        ]
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [raceDate]);

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
      {/* Header */}
      <div className="athletic-card-gradient p-6">
        <div className="flex items-center space-x-3 mb-4">
          <TrendingUp className="w-8 h-8 text-orange-400" />
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Race Predictions (Lite Mode)
          </h1>
        </div>
        <p className="text-slate-300">
          AI-powered race time predictions based on your training data
        </p>
      </div>

      {/* Race Date Input */}
      <div className="athletic-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-semibold text-white">Target Race Date</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
            />
          </div>
        </div>
      </div>

      {/* Performance Notice */}
      <div className="athletic-card p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Performance Mode</h3>
            <p className="text-slate-300 mb-3">
              This is a lightweight version of the Predictions page. The full prediction calculations 
              are resource-intensive and have been temporarily simplified for better performance.
            </p>
            <p className="text-slate-400 text-sm">
              Full predictions with ML analysis will be restored after performance optimizations.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {predictions?.distances.map((prediction) => (
          <div key={prediction.distance} className="athletic-card overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🏃‍♂️</span>
                  <span className="font-semibold text-white">{prediction.distance}</span>
                </div>
              </div>
              
              <div className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {prediction.time}
              </div>
              
              <div className="text-sm text-slate-400">
                Confidence: {prediction.confidence}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionsPageLite;