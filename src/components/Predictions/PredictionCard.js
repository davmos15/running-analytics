import React, { useState } from 'react';
import { Timer, ChevronDown, ChevronUp, Zap, TrendingUp, Info, Calculator, Activity } from 'lucide-react';
import predictionService from '../../services/predictionService';

const PredictionCard = ({ distance, prediction, raceConditions }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);

  const formatTime = (seconds) => {
    return predictionService.formatTime(seconds);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDistanceInfo = (distance) => {
    const distanceInfo = {
      '5K': { name: '5 Kilometer', emoji: '🏃‍♂️', description: 'Fast-paced endurance race' },
      '10K': { name: '10 Kilometer', emoji: '🏃‍♀️', description: 'Classic road race distance' },
      '21.1K': { name: 'Half Marathon', emoji: '🏃', description: 'Popular long-distance challenge' },
      '42.2K': { name: 'Marathon', emoji: '🏃‍♂️', description: 'Ultimate endurance test' }
    };
    return distanceInfo[distance] || { name: distance, emoji: '🏃', description: 'Race distance' };
  };

  const distanceInfo = getDistanceInfo(distance);

  return (
    <div className="athletic-card-gradient overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-blue-500/20">
        <div className="flex items-center space-x-3 mb-4">
          <div className="text-2xl">{distanceInfo.emoji}</div>
          <div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {distanceInfo.name}
            </h3>
            <p className="text-sm text-slate-400">{distanceInfo.description}</p>
          </div>
        </div>

        {/* Main Prediction - Simplified */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Timer className="w-5 h-5 text-orange-400" />
            <span className="text-lg font-medium text-orange-400">Predicted Time</span>
          </div>
          <div className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {formatTime(prediction.prediction)}
          </div>
          
          {/* Key Metrics Row */}
          <div className="flex items-center justify-center space-x-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-300">
                ±{Math.round(prediction.range.margin / 60)}:{String(Math.round(prediction.range.margin % 60)).padStart(2, '0')}
              </div>
              <div className="text-xs text-slate-400">Margin</div>
            </div>
            
            <div className="w-px h-8 bg-slate-600"></div>
            
            <div className="text-center">
              <div className={`text-lg font-semibold ${getConfidenceColor(prediction.confidence)}`}>
                {Math.round(prediction.confidence * 100)}%
              </div>
              <div className="text-xs text-slate-400">Confidence</div>
            </div>
          </div>

          {/* Optimal Conditions Note */}
          {prediction.optimalPrediction && prediction.optimalPrediction.improvement > 0 && (
            <div className="mt-3 text-xs text-orange-400 flex items-center justify-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Optimal: {formatTime(prediction.optimalPrediction.time)} (-{formatTime(prediction.optimalPrediction.improvement)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-b border-blue-500/20">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-left hover:bg-blue-500/10 p-4 transition-colors"
        >
          <span className="text-sm font-medium text-white">Additional Details</span>
          {showDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showDetails && (
          <div className="px-4 pb-4 space-y-4">
            {/* Prediction Range */}
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-orange-400" />
                <span>Prediction Range</span>
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Full Range:</span>
                  <span className="text-white font-medium">
                    {formatTime(prediction.range.lower)} - {formatTime(prediction.range.upper)}
                  </span>
                </div>
                {prediction.range.percentile_80_lower && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">80% Likely:</span>
                    <span className="text-white font-medium">
                      {formatTime(prediction.range.percentile_80_lower)} - {formatTime(prediction.range.percentile_80_upper)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 30-Day Change */}
            {prediction.thirtyDayChange !== null && prediction.thirtyDayChange !== undefined && (
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <span>30-Day Trend</span>
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Change from 30 days ago:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      prediction.thirtyDayChange < 0 ? 'text-green-400' : 
                      prediction.thirtyDayChange > 0 ? 'text-red-400' : 'text-slate-300'
                    }`}>
                      {prediction.thirtyDayChange < 0 ? '' : '+'}
                      {Math.floor(Math.abs(prediction.thirtyDayChange) / 60)}:
                      {String(Math.abs(prediction.thirtyDayChange) % 60).padStart(2, '0')}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      prediction.thirtyDayChange < 0 ? 'bg-green-500' : 
                      prediction.thirtyDayChange > 0 ? 'bg-red-500' : 'bg-slate-500'
                    }`} />
                  </div>
                </div>
              </div>
            )}

            {/* Key Factors */}
            {prediction.factors && prediction.factors.length > 0 && (
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Key Performance Factors</h4>
                <div className="space-y-1">
                  {prediction.factors.slice(0, 3).map((factor, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        factor.impact === 'positive' ? 'bg-green-500' : 'bg-red-500'
                      } opacity-75`} />
                      <span className="text-slate-300">{factor.factor}</span>
                      <span className={`text-xs px-1 rounded ${
                        factor.strength === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        factor.strength === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {factor.strength}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applied Race Conditions */}
            {prediction.raceConditions && Object.keys(prediction.raceConditions).some(key => 
              prediction.raceConditions[key] === true || 
              (prediction.raceConditions[key] && prediction.raceConditions[key] !== '')) && (
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Applied Conditions</h4>
                <div className="space-y-1 text-sm">
                  {prediction.raceConditions.optimalTaper && (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-slate-300">Optimal taper</span>
                    </div>
                  )}
                  {prediction.raceConditions.optimalWeather && (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-slate-300">Optimal weather</span>
                    </div>
                  )}
                  {prediction.raceConditions.flatCourse && (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-slate-300">Flat course</span>
                    </div>
                  )}
                  {prediction.raceConditions.elevation && (
                    <div className="text-slate-300">
                      Elevation: {prediction.raceConditions.elevation}m gain
                    </div>
                  )}
                  {prediction.raceConditions.temperature && (
                    <div className="text-slate-300">
                      Temperature: {prediction.raceConditions.temperature}°C
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Breakdown Button */}
            <button
              onClick={() => setShowFullBreakdown(!showFullBreakdown)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition-colors"
            >
              <Calculator className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">
                {showFullBreakdown ? 'Hide' : 'Show'} Detailed Breakdown
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Full Calculation Breakdown */}
      {showDetails && showFullBreakdown && (
        <div className="p-4 bg-slate-900/50">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-4 h-4 text-orange-400" />
              <h4 className="text-sm font-bold text-white">How This Prediction Was Calculated</h4>
            </div>

            {/* Model Components */}
            {prediction.models && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Prediction Models</div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                    <span className="text-sm text-slate-300">Power Law Model:</span>
                    <span className="text-sm font-mono text-white">{formatTime(prediction.models.powerLaw)}</span>
                  </div>
                  
                  {prediction.models.criticalSpeed && (
                    <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                      <span className="text-sm text-slate-300">Critical Speed Model:</span>
                      <span className="text-sm font-mono text-white">{formatTime(prediction.models.criticalSpeed)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                    <span className="text-sm text-slate-300">Weighted Race Average:</span>
                    <span className="text-sm font-mono text-white">{formatTime(prediction.models.weightedRaces)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Endurance Profile */}
            {prediction.enduranceProfile && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Your Endurance Profile</div>
                <div className="p-3 bg-slate-800/30 rounded space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Personal Exponent:</span>
                    <span className="font-mono text-white">{prediction.enduranceProfile.personalExponent.toFixed(3)}</span>
                  </div>
                  {prediction.enduranceProfile.criticalSpeed && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Critical Speed:</span>
                      <span className="font-mono text-white">
                        {(prediction.enduranceProfile.criticalSpeed * 3.6).toFixed(2)} km/h
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-2">
                    Exponent indicates endurance: Lower (1.02-1.05) = better endurance, Higher (1.08-1.12) = more speed-oriented
                  </div>
                </div>
              </div>
            )}

            {/* Calculation Method */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Calculation Method</div>
              <div className="p-3 bg-slate-800/30 rounded">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {prediction.method || 'Enhanced Multi-Model'} approach combining:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  <li>• Personalized power law based on your race history</li>
                  <li>• Critical speed model for aerobic capacity</li>
                  <li>• Weighted average of recent similar-distance performances</li>
                  <li>• Machine learning adjustments for training patterns</li>
                  <li>• Environmental and course condition factors</li>
                </ul>
              </div>
            </div>

            {/* Data Source */}
            <div className="p-3 bg-slate-800/30 rounded">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Data Source:</span>
                <span className="text-slate-300">{prediction.dataSource || 'Recent race data'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionCard;