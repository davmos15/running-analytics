import firebaseService from './firebaseService';

class PredictionService {
  constructor() {
    // Target distances for predictions (in meters)
    this.targetDistances = {
      '5K': 5000,
      '10K': 10000,
      '21.1K': 21100,
      '42.2K': 42200
    };
    
    // Algorithm weights
    this.algorithmWeights = {
      riegel: 0.40,
      vdot: 0.35,
      features: 0.25
    };
  }

  /**
   * Generate race predictions for all target distances
   */
  async generatePredictions(weeksBack = 16) {
    try {
      const predictionData = await firebaseService.getPredictionData(weeksBack);
      
      if (!predictionData || predictionData.recentRaces.length === 0) {
        throw new Error('Insufficient data for predictions. Need at least 3 recent races or time trials.');
      }

      const predictions = {};
      
      for (const [distanceLabel, distanceMeters] of Object.entries(this.targetDistances)) {
        predictions[distanceLabel] = await this.predictDistance(
          distanceMeters,
          predictionData
        );
      }

      return {
        predictions,
        dataQuality: this.assessDataQuality(predictionData),
        lastUpdated: new Date(),
        dataSource: `${predictionData.recentRaces.length} races, ${weeksBack} weeks`
      };
    } catch (error) {
      console.error('Error generating predictions:', error);
      throw error;
    }
  }

  /**
   * Predict time for a specific distance using ensemble method
   */
  async predictDistance(targetDistance, data) {
    const algorithms = {
      riegel: this.riegelPrediction(targetDistance, data),
      vdot: this.vdotPrediction(targetDistance, data),
      features: this.featureBasedPrediction(targetDistance, data)
    };

    // Calculate ensemble prediction
    let weightedSum = 0;
    let totalWeight = 0;
    const algorithmResults = {};

    for (const [name, result] of Object.entries(algorithms)) {
      if (result.prediction && result.confidence > 0.3) {
        const weight = this.algorithmWeights[name] * result.confidence;
        weightedSum += result.prediction * weight;
        totalWeight += weight;
        algorithmResults[name] = result;
      }
    }

    if (totalWeight === 0) {
      throw new Error('Insufficient confident predictions');
    }

    const prediction = weightedSum / totalWeight;
    const confidence = this.calculateEnsembleConfidence(algorithmResults, data);
    
    return {
      prediction: Math.round(prediction),
      confidence,
      range: this.calculateConfidenceInterval(prediction, confidence),
      algorithms: algorithmResults,
      factors: this.identifyPredictionFactors(targetDistance, data)
    };
  }

  /**
   * Enhanced Riegel Formula with dynamic exponent
   */
  riegelPrediction(targetDistance, data) {
    const recentRaces = data.recentRaces
      .filter(race => race.distanceMeters >= 1000) // Minimum 1K
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5); // Use top 5 recent races

    if (recentRaces.length === 0) {
      return { prediction: null, confidence: 0 };
    }

    let totalPrediction = 0;
    let totalWeight = 0;

    recentRaces.forEach((race, index) => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-daysSince / 30); // Exponential decay over 30 days
      
      // Dynamic exponent based on distance ratio and runner's data
      const distanceRatio = targetDistance / race.distanceMeters;
      const baseExponent = 1.06;
      const exponent = this.calculateDynamicExponent(baseExponent, distanceRatio, data);
      
      const prediction = race.time * Math.pow(distanceRatio, exponent);
      const weight = recencyWeight * (1 / (index + 1)); // Recent races weighted more
      
      totalPrediction += prediction * weight;
      totalWeight += weight;
    });

    const prediction = totalPrediction / totalWeight;
    const confidence = Math.min(0.9, totalWeight / 2); // Max confidence 0.9

    return {
      prediction,
      confidence,
      baseRaces: recentRaces.length
    };
  }

  /**
   * VDOT-based prediction system
   */
  vdotPrediction(targetDistance, data) {
    const recentRaces = data.recentRaces
      .filter(race => race.distanceMeters >= 3000) // VDOT works better with longer distances
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    if (recentRaces.length === 0) {
      return { prediction: null, confidence: 0 };
    }

    let totalVDOT = 0;
    let totalWeight = 0;

    recentRaces.forEach(race => {
      const vdot = this.calculateVDOT(race.time, race.distanceMeters);
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-daysSince / 45); // Longer decay for VDOT
      
      totalVDOT += vdot * weight;
      totalWeight += weight;
    });

    const avgVDOT = totalVDOT / totalWeight;
    const prediction = this.vdotToTime(avgVDOT, targetDistance);
    const confidence = Math.min(0.85, totalWeight / 1.5);

    return {
      prediction,
      confidence,
      vdot: Math.round(avgVDOT * 10) / 10,
      baseRaces: recentRaces.length
    };
  }

  /**
   * Feature-based ML approach
   */
  featureBasedPrediction(targetDistance, data) {
    const features = this.extractFeatures(targetDistance, data);
    
    if (!features.isValid) {
      return { prediction: null, confidence: 0 };
    }

    // Base prediction from recent average pace
    const basePrediction = (targetDistance / 1000) * features.recentPace * 60;
    
    // Apply feature adjustments
    let adjustmentFactor = 1.0;
    
    // Training volume adjustment
    adjustmentFactor *= (1 - features.volumeConsistency * 0.05);
    
    // Distance experience adjustment
    adjustmentFactor *= (1 - features.distanceExperience * 0.03);
    
    // Heart rate efficiency (if available)
    if (features.hrEfficiency) {
      adjustmentFactor *= (1 - features.hrEfficiency * 0.02);
    }
    
    // Recent form trend
    adjustmentFactor *= (1 - features.formTrend * 0.04);
    
    const prediction = basePrediction * adjustmentFactor;
    const confidence = Math.min(0.8, features.dataQuality);

    return {
      prediction,
      confidence,
      features,
      adjustmentFactor
    };
  }

  /**
   * Extract features for ML-based prediction
   */
  extractFeatures(targetDistance, data) {
    const now = new Date();
    const features = {};

    // Recent pace trends (4, 8, 12 week averages)
    const recentActivities = data.activities.filter(activity => {
      const daysSince = (now - new Date(activity.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 84; // 12 weeks
    });

    if (recentActivities.length < 5) {
      return { isValid: false };
    }

    // Calculate pace trends
    const paces4w = this.calculateAveragePace(recentActivities, 28);
    const paces8w = this.calculateAveragePace(recentActivities, 56);
    const paces12w = this.calculateAveragePace(recentActivities, 84);

    features.recentPace = paces4w.avg;
    features.formTrend = (paces4w.avg - paces12w.avg) / paces12w.avg; // Negative is improvement

    // Training volume consistency
    features.volumeConsistency = this.calculateVolumeConsistency(recentActivities);

    // Distance-specific experience
    features.distanceExperience = this.calculateDistanceExperience(targetDistance, data);

    // Heart rate efficiency (if available)
    const hrActivities = recentActivities.filter(a => a.averageHeartRate);
    if (hrActivities.length >= 3) {
      features.hrEfficiency = this.calculateHREfficiency(hrActivities);
    }

    // Data quality score
    features.dataQuality = Math.min(1.0, recentActivities.length / 20);

    features.isValid = true;
    return features;
  }

  /**
   * Calculate dynamic Riegel exponent
   */
  calculateDynamicExponent(baseExponent, distanceRatio, data) {
    // Adjust exponent based on distance ratio and runner's characteristics
    if (distanceRatio > 4) {
      return baseExponent + 0.01; // Slightly higher for big jumps
    } else if (distanceRatio < 0.5) {
      return baseExponent - 0.01; // Slightly lower for shorter distances
    }
    return baseExponent;
  }

  /**
   * Calculate VDOT from race performance
   */
  calculateVDOT(timeSeconds, distanceMeters) {
    // Simplified VDOT calculation - in production, use full Jack Daniels tables
    const velocity = distanceMeters / timeSeconds; // m/s
    const kmPace = 1000 / velocity; // seconds per km
    
    // Approximate VDOT formula (simplified)
    return Math.max(30, Math.min(85, 15.3 * Math.pow(velocity * 3.6, 1.06)));
  }

  /**
   * Convert VDOT to predicted time for distance
   */
  vdotToTime(vdot, distanceMeters) {
    // Simplified conversion - in production, use full VDOT tables
    const velocity = Math.pow(vdot / 15.3, 1 / 1.06) / 3.6; // m/s
    return distanceMeters / velocity;
  }

  /**
   * Calculate average pace for activities within days
   */
  calculateAveragePace(activities, maxDays) {
    const now = new Date();
    const filtered = activities.filter(activity => {
      const daysSince = (now - new Date(activity.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= maxDays;
    });

    if (filtered.length === 0) return { avg: 0, count: 0 };

    const totalPace = filtered.reduce((sum, activity) => {
      const pace = activity.time / (activity.distanceMeters / 1000); // seconds per km
      return sum + pace;
    }, 0);

    return {
      avg: totalPace / filtered.length,
      count: filtered.length
    };
  }

  /**
   * Calculate training volume consistency
   */
  calculateVolumeConsistency(activities) {
    if (activities.length < 4) return 0;

    // Group by week and calculate weekly volumes
    const weeklyVolumes = {};
    activities.forEach(activity => {
      const week = this.getWeekKey(new Date(activity.date));
      weeklyVolumes[week] = (weeklyVolumes[week] || 0) + activity.distanceMeters;
    });

    const volumes = Object.values(weeklyVolumes);
    if (volumes.length < 4) return 0;

    const mean = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
    const cv = Math.sqrt(variance) / mean; // Coefficient of variation

    return Math.max(0, 1 - cv); // Lower CV = higher consistency
  }

  /**
   * Calculate distance-specific experience
   */
  calculateDistanceExperience(targetDistance, data) {
    const similarRaces = data.recentRaces.filter(race => {
      const ratio = targetDistance / race.distanceMeters;
      return ratio >= 0.5 && ratio <= 2.0; // Within 50%-200% of target distance
    });

    return Math.min(1.0, similarRaces.length / 5); // Max experience at 5+ similar races
  }

  /**
   * Calculate heart rate efficiency
   */
  calculateHREfficiency(hrActivities) {
    // Calculate pace/HR ratio trend - improvement means better efficiency
    const ratios = hrActivities.map(activity => {
      const pace = activity.time / (activity.distanceMeters / 1000);
      return activity.averageHeartRate / pace; // Higher is better efficiency
    });

    if (ratios.length < 3) return 0;

    // Simple trend calculation
    const recent = ratios.slice(0, Math.floor(ratios.length / 2));
    const older = ratios.slice(Math.floor(ratios.length / 2));

    const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r, 0) / older.length;

    return Math.max(0, (recentAvg - olderAvg) / olderAvg);
  }

  /**
   * Calculate ensemble confidence
   */
  calculateEnsembleConfidence(algorithmResults, data) {
    const confidences = Object.values(algorithmResults).map(r => r.confidence);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // Adjust based on data quality
    const dataQualityFactor = Math.min(1.0, data.recentRaces.length / 5);
    
    return Math.min(0.95, avgConfidence * dataQualityFactor);
  }

  /**
   * Calculate confidence interval
   */
  calculateConfidenceInterval(prediction, confidence) {
    const errorMargin = prediction * (1 - confidence) * 0.15; // 15% max error at 0 confidence
    
    return {
      lower: Math.round(prediction - errorMargin),
      upper: Math.round(prediction + errorMargin),
      margin: Math.round(errorMargin)
    };
  }

  /**
   * Identify key factors affecting prediction
   */
  identifyPredictionFactors(targetDistance, data) {
    const factors = [];
    
    // Recent race availability
    const recentRaceCount = data.recentRaces.filter(race => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 60;
    }).length;
    
    if (recentRaceCount >= 2) {
      factors.push({ factor: 'Recent race data', impact: 'positive', strength: 'high' });
    } else {
      factors.push({ factor: 'Limited recent races', impact: 'negative', strength: 'medium' });
    }
    
    // Training volume
    const recentVolume = data.activities
      .filter(a => (new Date() - new Date(a.date)) / (1000 * 60 * 60 * 24) <= 28)
      .reduce((sum, a) => sum + a.distanceMeters, 0);
    
    if (recentVolume > targetDistance * 3) {
      factors.push({ factor: 'Good training volume', impact: 'positive', strength: 'medium' });
    } else if (recentVolume < targetDistance) {
      factors.push({ factor: 'Low training volume', impact: 'negative', strength: 'high' });
    }
    
    // Distance-specific preparation
    const longRuns = data.activities.filter(a => 
      a.distanceMeters >= targetDistance * 0.6 &&
      (new Date() - new Date(a.date)) / (1000 * 60 * 60 * 24) <= 42
    ).length;
    
    if (longRuns >= 3) {
      factors.push({ factor: 'Distance preparation', impact: 'positive', strength: 'medium' });
    } else if (longRuns === 0) {
      factors.push({ factor: 'Lack of long runs', impact: 'negative', strength: 'high' });
    }
    
    return factors;
  }

  /**
   * Assess overall data quality
   */
  assessDataQuality(data) {
    let score = 0;
    let maxScore = 0;
    
    // Recent race data (40% of score)
    const recentRaces = data.recentRaces.filter(race => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 90;
    });
    score += Math.min(40, recentRaces.length * 10);
    maxScore += 40;
    
    // Training consistency (30% of score)
    const recentActivities = data.activities.filter(activity => {
      const daysSince = (new Date() - new Date(activity.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 84;
    });
    score += Math.min(30, recentActivities.length * 1.5);
    maxScore += 30;
    
    // Data recency (20% of score)
    if (recentRaces.length > 0) {
      const mostRecentDays = (new Date() - new Date(recentRaces[0].date)) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 20 - mostRecentDays * 0.5);
    }
    maxScore += 20;
    
    // Distance variety (10% of score)
    const distanceVariety = new Set(data.recentRaces.map(r => Math.round(r.distanceMeters / 1000))).size;
    score += Math.min(10, distanceVariety * 2);
    maxScore += 10;
    
    return {
      score: Math.round((score / maxScore) * 100),
      level: score / maxScore > 0.8 ? 'high' : score / maxScore > 0.5 ? 'medium' : 'low',
      recommendations: this.getDataQualityRecommendations(data)
    };
  }

  /**
   * Get recommendations for improving data quality
   */
  getDataQualityRecommendations(data) {
    const recommendations = [];
    
    const recentRaceCount = data.recentRaces.filter(race => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 60;
    }).length;
    
    if (recentRaceCount < 2) {
      recommendations.push('Complete a recent time trial or race for more accurate predictions');
    }
    
    const longRunCount = data.activities.filter(a => 
      a.distanceMeters >= 15000 && 
      (new Date() - new Date(a.date)) / (1000 * 60 * 60 * 24) <= 42
    ).length;
    
    if (longRunCount < 2) {
      recommendations.push('Include more long runs in your training for better marathon predictions');
    }
    
    const weeklyRunCount = data.activities.filter(a => 
      (new Date() - new Date(a.date)) / (1000 * 60 * 60 * 24) <= 7
    ).length;
    
    if (weeklyRunCount < 3) {
      recommendations.push('Maintain more consistent weekly training for improved accuracy');
    }
    
    return recommendations;
  }

  /**
   * Get week key for grouping activities
   */
  getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.floor((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week}`;
  }

  /**
   * Format time in HH:MM:SS or MM:SS
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}

const predictionService = new PredictionService();
export default predictionService;