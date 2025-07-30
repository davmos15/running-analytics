import React from 'react';
import { TrendingUp, Users, Calendar, Target, Lightbulb, ArrowRight } from 'lucide-react';

const TrainingInsights = ({ dataQuality, predictions }) => {
  const getOverallConfidence = () => {
    const confidences = Object.values(predictions).map(p => p.confidence);
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  };

  const getTrainingRecommendations = () => {
    const recommendations = new Set();
    
    // Collect unique recommendations from data quality
    if (dataQuality.recommendations) {
      dataQuality.recommendations.forEach(rec => recommendations.add(rec));
    }
    
    // Add prediction-specific recommendations
    const overallConfidence = getOverallConfidence();
    
    if (overallConfidence < 0.7) {
      recommendations.add('Complete more recent time trials or races for better accuracy');
    }
    
    // Check for specific distance weaknesses
    Object.entries(predictions).forEach(([distance, prediction]) => {
      if (prediction.confidence < 0.6) {
        if (distance === '42.2K') {
          recommendations.add('Include more long runs (20K+) in your training for marathon preparation');
        } else if (distance === '5K') {
          recommendations.add('Add speed work and interval training for better 5K predictions');
        }
      }
    });
    
    return Array.from(recommendations);
  };

  const getStrengthsAndWeaknesses = () => {
    const sorted = Object.entries(predictions)
      .sort((a, b) => b[1].confidence - a[1].confidence);
    
    return {
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1]
    };
  };

  const formatConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'Very Strong';
    if (confidence >= 0.6) return 'Good';
    if (confidence >= 0.4) return 'Fair';
    return 'Limited';
  };

  const overallConfidence = getOverallConfidence();
  const recommendations = getTrainingRecommendations();
  const { strongest, weakest } = getStrengthsAndWeaknesses();

  return (
    <div className="athletic-card-gradient p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Lightbulb className="w-5 h-5 text-orange-400" />
        <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Training Insights
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Summary */}
        <div className="space-y-4">
          <div className="athletic-card p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span>Prediction Summary</span>
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Overall Confidence:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-white">
                    {formatConfidenceText(overallConfidence)}
                  </span>
                  <span className="text-sm text-slate-400">
                    ({Math.round(overallConfidence * 100)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Data Quality:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-white capitalize">
                    {dataQuality.level}
                  </span>
                  <span className="text-sm text-slate-400">
                    ({dataQuality.score}%)
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-500/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Strongest prediction:</span>
                  <span className="text-green-400">{strongest[0]} ({Math.round(strongest[1].confidence * 100)}%)</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-400">Needs improvement:</span>
                  <span className="text-yellow-400">{weakest[0]} ({Math.round(weakest[1].confidence * 100)}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Distance Breakdown */}
          <div className="athletic-card p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
              <Target className="w-4 h-4 text-orange-400" />
              <span>Distance Analysis</span>
            </h4>
            
            <div className="space-y-2">
              {Object.entries(predictions)
                .sort((a, b) => b[1].confidence - a[1].confidence)
                .map(([distance, prediction]) => (
                  <div key={distance} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{distance}:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            prediction.confidence >= 0.8 ? 'bg-green-500' :
                            prediction.confidence >= 0.6 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{
                            width: `${prediction.confidence * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-slate-400 w-12 text-right">
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-4">
          <div className="athletic-card p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
              <ArrowRight className="w-4 h-4 text-orange-400" />
              <span>Recommendations</span>
            </h4>
            
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.slice(0, 4).map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-500/10 rounded-lg">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <div className="text-sm text-slate-300 leading-relaxed">
                      {recommendation}
                    </div>
                  </div>
                ))}
                
                {recommendations.length > 4 && (
                  <div className="text-xs text-slate-400 text-center pt-2">
                    +{recommendations.length - 4} more recommendations available
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-4">
                Great job! Your training data looks comprehensive. 
                Keep up the consistent training for optimal predictions.
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="athletic-card p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-3 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-orange-400" />
              <span>Prediction Tips</span>
            </h4>
            
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-start space-x-2">
                <span className="text-orange-400 mt-1">•</span>
                <span>Predictions improve with more recent race data</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-orange-400 mt-1">•</span>
                <span>Consistent training volume increases accuracy</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-orange-400 mt-1">•</span>
                <span>Distance-specific preparation boosts confidence</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-orange-400 mt-1">•</span>
                <span>Heart rate data enhances prediction quality</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingInsights;