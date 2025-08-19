import React, { useState } from 'react';
import { Timer, ChevronDown, ChevronUp } from 'lucide-react';
import ConfidenceIndicator from './ConfidenceIndicator';
import predictionService from '../../services/predictionService';

const PredictionCard = ({ distance, prediction }) => {
  const [showDetails, setShowDetails] = useState(false);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{distanceInfo.emoji}</div>
            <div>
              <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {distanceInfo.name}
              </h3>
              <p className="text-sm text-slate-400">{distanceInfo.description}</p>
            </div>
          </div>
          <ConfidenceIndicator confidence={prediction.confidence} />
        </div>

        {/* Main Prediction */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Timer className="w-5 h-5 text-orange-400" />
            <span className="text-lg font-medium text-orange-400">Predicted Time</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {formatTime(prediction.prediction)}
          </div>
          <div className="text-sm text-slate-300">
            Range: {formatTime(prediction.range.lower)} - {formatTime(prediction.range.upper)}
          </div>
        </div>

        {/* Quick Factors */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center">
            <div className={`text-lg font-semibold ${getConfidenceColor(prediction.confidence)}`}>
              {Math.round(prediction.confidence * 100)}%
            </div>
            <div className="text-xs text-slate-400">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-300">
              ±{Math.round(prediction.range.margin / 60)}m {Math.round(prediction.range.margin % 60)}s
            </div>
            <div className="text-xs text-slate-400">Margin</div>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="p-4 border-b border-blue-500/20">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-left hover:bg-blue-500/10 p-2 rounded transition-colors"
        >
          <span className="text-sm font-medium text-white">Prediction Details</span>
          {showDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-4">
            {/* Confidence Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Confidence Factors</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Data Quality:</span>
                  <span className="text-white">{Math.round(prediction.confidence * 100)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Prediction Range:</span>
                  <span className="text-white">±{Math.round(prediction.range.margin / 60)}m {Math.round(prediction.range.margin % 60)}s</span>
                </div>
              </div>
            </div>

            {/* 30-Day Change Analysis */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">30-Day Prediction Change</h4>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                {prediction.thirtyDayChange !== null && prediction.thirtyDayChange !== undefined ? (
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
                ) : (
                  <div className="text-sm text-slate-400">
                    Not enough historical data for trend analysis
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-2">
                  Based on recent race performance trends
                </div>
              </div>
            </div>

            {/* Key Factors */}
            {prediction.factors && prediction.factors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Key Factors</h4>
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
          </div>
        )}
      </div>

    </div>
  );
};

export default PredictionCard;