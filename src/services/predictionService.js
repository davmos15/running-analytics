import firebaseService from './firebaseService';
import enhancedPredictionService from './predictionServiceEnhanced';

class PredictionService {
  constructor() {
    // Default target distances for predictions (in meters)
    this.defaultDistances = {
      '5K': 5000,
      '10K': 10000,
      '21.1K': 21100,
      '42.2K': 42200
    };
  }

  /**
   * Generate race predictions for a specific race date
   */
  async generatePredictionsForRaceDate(raceDate, customDistances = [], raceConditions = {}) {
    try {
      // Use enhanced prediction service with NaN fixes
      return await enhancedPredictionService.generatePredictionsForRaceDate(raceDate, customDistances, raceConditions);
    } catch (error) {
      console.error('Enhanced prediction failed, falling back to original:', error);
      // Fallback to original implementation if enhanced fails
      const today = new Date();
      const race = new Date(raceDate);
      const daysUntilRace = Math.ceil((race - today) / (1000 * 60 * 60 * 24));
      const weeksBack = Math.min(24, Math.max(8, Math.ceil(daysUntilRace / 7) + 8));
      
      const predictions = await this.generatePredictionsOriginal(weeksBack, customDistances, daysUntilRace);
      return predictions;
    }
  }

  /**
   * Generate race predictions for all target distances
   */
  async generatePredictions(weeksBack = 52, customDistances = [], daysUntilRace = null, raceConditions = {}) {
    try {
      // Use enhanced prediction service
      return await enhancedPredictionService.generatePredictions(weeksBack, customDistances, daysUntilRace, raceConditions);
    } catch (error) {
      console.error('Enhanced prediction failed, falling back to original:', error);
      // Fallback to original implementation
      return await this.generatePredictionsOriginal(weeksBack, customDistances, daysUntilRace);
    }
  }

  /**
   * Original prediction implementation (fallback)
   */
  async generatePredictionsOriginal(weeksBack = 52, customDistances = [], daysUntilRace = null) {
    try {
      const predictionData = await firebaseService.getPredictionData(weeksBack);
      
      console.log(`🔍 Prediction data: ${predictionData?.recentRaces?.length || 0} races, ${predictionData?.activities?.length || 0} activities`);
      
      if (!predictionData || predictionData.recentRaces.length === 0) {
        throw new Error('Insufficient data for predictions. Need at least 3 recent races or time trials.');
      }

      // Combine default and custom distances
      const allDistances = { ...this.defaultDistances };
      customDistances.forEach(dist => {
        allDistances[dist.label] = dist.meters;
      });

      const predictions = {};
      
      // Sort distances by meters for proper ordering
      const sortedDistances = Object.entries(allDistances).sort((a, b) => a[1] - b[1]);
      
      for (const [distanceLabel, distanceMeters] of sortedDistances) {
        predictions[distanceLabel] = await this.predictDistance(
          distanceMeters,
          predictionData,
          daysUntilRace
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
   * Predict time for a specific distance using ML-based approach
   */
  async predictDistance(targetDistance, data, daysUntilRace = null, weeksBack = 52) {
    // Use ML feature-based prediction as primary method
    const mlPrediction = this.featureBasedPrediction(targetDistance, data, weeksBack);
    
    // Use simple Riegel as a baseline for comparison (not in final prediction)
    const baselinePrediction = this.simpleRiegelBaseline(targetDistance, data);
    
    if (!mlPrediction.prediction || mlPrediction.confidence < 0.2) {
      throw new Error('Insufficient data for confident prediction');
    }

    // Adjust prediction based on days until race if provided
    let adjustedPrediction = mlPrediction.prediction;
    if (daysUntilRace !== null && daysUntilRace > 0) {
      // Assume potential improvement based on training time available
      const weeksUntilRace = daysUntilRace / 7;
      const improvementFactor = Math.min(0.02, weeksUntilRace * 0.002); // Max 2% improvement
      adjustedPrediction = mlPrediction.prediction * (1 - improvementFactor);
    }
    
    // Calculate refined confidence based on multiple factors
    let confidence = this.calculateMLConfidence(mlPrediction, baselinePrediction, data, targetDistance);
    
    // Adjust confidence based on time until race
    if (daysUntilRace !== null) {
      if (daysUntilRace < 14) {
        confidence *= 0.95; // Very close to race, high confidence
      } else if (daysUntilRace > 180) {
        confidence *= 0.7; // Far from race, lower confidence
      } else {
        confidence *= (1 - (daysUntilRace - 14) / 500); // Gradual decrease
      }
    }
    
    return {
      prediction: Math.round(adjustedPrediction),
      confidence,
      range: this.calculateConfidenceInterval(adjustedPrediction, confidence),
      method: 'ML Feature Analysis',
      factors: this.identifyPredictionFactors(targetDistance, data),
      thirtyDayChange: await this.calculate30DayChange(targetDistance, Math.round(adjustedPrediction))
    };
  }

  /**
   * Simple Riegel baseline for comparison (not used in final prediction)
   */
  simpleRiegelBaseline(targetDistance, data) {
    const recentRaces = data.recentRaces
      .filter(race => race.distanceMeters >= 1000) // Minimum 1K
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5); // Use top 5 recent races

    if (recentRaces.length === 0) {
      return { prediction: null, confidence: 0 };
    }

    let totalPrediction = 0;
    let totalWeight = 0;
    const calculations = [];

    recentRaces.forEach((race, index) => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-daysSince / 30); // Exponential decay over 30 days
      
      // Dynamic exponent based on distance ratio and runner's data
      const distanceRatio = targetDistance / race.distanceMeters;
      const baseExponent = 1.06;
      const exponent = this.calculateDynamicExponent(baseExponent, distanceRatio, data);
      
      const prediction = race.time * Math.pow(distanceRatio, exponent);
      const weight = recencyWeight * (1 / (index + 1)); // Recent races weighted more
      
      calculations.push({
        raceName: race.name,
        raceTime: race.time,
        raceTimeFormatted: this.formatTime(race.time),
        raceDistance: race.distanceMeters,
        targetDistance,
        distanceRatio,
        exponent,
        prediction,
        predictionFormatted: this.formatTime(prediction),
        weight,
        daysSince: Math.round(daysSince)
      });
      
      totalPrediction += prediction * weight;
      totalWeight += weight;
    });

    const prediction = totalPrediction / totalWeight;
    const confidence = Math.min(0.9, totalWeight / 2); // Max confidence 0.9

    console.log(`🧮 Riegel ${targetDistance/1000}K: ${this.formatTime(prediction)} (${calculations.length} races, conf: ${confidence.toFixed(2)})`);

    return {
      prediction,
      confidence,
      baseRaces: recentRaces.length
    };
  }

  // VDOT prediction method removed - using only Enhanced Riegel + ML Features

  /**
   * Feature-based ML approach
   */
  featureBasedPrediction(targetDistance, data) {
    const features = this.extractFeatures(targetDistance, data);
    
    if (!features.isValid) {
      return { prediction: null, confidence: 0 };
    }

    // Base prediction from recent average pace (recentPace is already in seconds per km)
    const basePrediction = (targetDistance / 1000) * features.recentPace;
    
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

    const paceFormatted = `${Math.floor(features.recentPace / 60)}:${Math.floor(features.recentPace % 60).toString().padStart(2, '0')}/km`;
    console.log(`🤖 ML ${targetDistance/1000}K: ${this.formatTime(prediction)} (pace: ${paceFormatted}, adj: ${adjustmentFactor.toFixed(3)}, conf: ${confidence.toFixed(2)})`);

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
  extractFeatures(targetDistance, data, weeksBack = 52) {
    const now = new Date();
    const features = {};

    // Recent pace trends (using weeksBack parameter)
    const recentActivities = data.activities.filter(activity => {
      const daysSince = (now - new Date(activity.start_date || activity.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= (weeksBack * 7); // Use weeksBack parameter
    });

    if (recentActivities.length < 5) {
      return { isValid: false };
    }

    // Calculate pace trends
    const paces4w = this.calculateAveragePace(recentActivities, 28);
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

  // VDOT calculation methods removed - using only Enhanced Riegel + ML Features

  /**
   * Calculate average pace for activities within days
   */
  calculateAveragePace(activities, maxDays) {
    const now = new Date();
    const filtered = activities.filter(activity => {
      const daysSince = (now - new Date(activity.start_date || activity.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= maxDays;
    });

    if (filtered.length === 0) return { avg: 0, count: 0 };

    const totalPace = filtered.reduce((sum, activity) => {
      const time = activity.time || activity.moving_time;
      const distance = activity.distanceMeters || activity.distance;
      const pace = time / (distance / 1000); // seconds per km
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
      const week = this.getWeekKey(new Date(activity.start_date || activity.date));
      weeklyVolumes[week] = (weeklyVolumes[week] || 0) + (activity.distanceMeters || activity.distance || 0);
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
      const time = activity.time || activity.moving_time;
      const distance = activity.distanceMeters || activity.distance;
      const pace = time / (distance / 1000);
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
   * Calculate ML-based confidence with improved variability
   */
  calculateMLConfidence(mlPrediction, baselinePrediction, data, targetDistance) {
    let confidence = 0;
    
    // Factor 1: Data quantity and recency (25%)
    const recentRaces = data.recentRaces.filter(race => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 60;
    }).length;
    const dataFactor = Math.min(1.0, recentRaces / 3) * 0.25;
    confidence += dataFactor;
    
    // Factor 2: Distance-specific experience (20%)
    const similarDistanceRaces = data.recentRaces.filter(race => {
      const ratio = targetDistance / race.distanceMeters;
      return ratio >= 0.7 && ratio <= 1.3;
    }).length;
    const distanceFactor = Math.min(1.0, similarDistanceRaces / 2) * 0.20;
    confidence += distanceFactor;
    
    // Factor 3: Training consistency (20%)
    const recentActivities = data.activities.filter(activity => {
      const daysSince = (new Date() - new Date(activity.start_date || activity.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 28;
    }).length;
    const consistencyFactor = Math.min(1.0, recentActivities / 12) * 0.20;
    confidence += consistencyFactor;
    
    // Factor 4: Prediction stability - agreement with baseline (15%)
    if (baselinePrediction.prediction) {
      const deviation = Math.abs(mlPrediction.prediction - baselinePrediction.prediction) / mlPrediction.prediction;
      const agreementFactor = Math.max(0, 1 - deviation * 2) * 0.15;
      confidence += agreementFactor;
    }
    
    // Factor 5: Feature quality from ML model (20%)
    const featureQuality = mlPrediction.confidence * 0.20;
    confidence += featureQuality;
    
    // Add some variance based on distance from typical race distances
    const typicalDistances = [5000, 10000, 21100, 42200];
    const closestTypical = typicalDistances.reduce((closest, dist) => {
      return Math.abs(dist - targetDistance) < Math.abs(closest - targetDistance) ? dist : closest;
    });
    const distanceDeviation = Math.abs(targetDistance - closestTypical) / closestTypical;
    
    // Reduce confidence for unusual distances
    if (distanceDeviation > 0.1) {
      confidence *= (1 - distanceDeviation * 0.2);
    }
    
    // Scale confidence to be between 0.3 and 0.85 for more realistic variation
    confidence = Math.min(0.85, Math.max(0.3, confidence));
    
    return confidence;
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
      .filter(a => (new Date() - new Date(a.start_date || a.date)) / (1000 * 60 * 60 * 24) <= 28)
      .reduce((sum, a) => sum + (a.distanceMeters || a.distance || 0), 0);
    
    if (recentVolume > targetDistance * 3) {
      factors.push({ factor: 'Good training volume', impact: 'positive', strength: 'medium' });
    } else if (recentVolume < targetDistance) {
      factors.push({ factor: 'Low training volume', impact: 'negative', strength: 'high' });
    }
    
    // Distance-specific preparation
    const longRuns = data.activities.filter(a => {
      const distance = a.distanceMeters || a.distance || 0;
      return distance >= targetDistance * 0.6 &&
             (new Date() - new Date(a.start_date || a.date)) / (1000 * 60 * 60 * 24) <= 42;
    }).length;
    
    if (longRuns >= 3) {
      factors.push({ factor: 'Distance preparation', impact: 'positive', strength: 'medium' });
    } else if (longRuns === 0) {
      factors.push({ factor: 'Lack of long runs', impact: 'negative', strength: 'high' });
    }
    
    return factors;
  }

  /**
   * Calculate 30-day prediction change
   */
  async calculate30DayChange(targetDistance, currentPrediction) {
    try {
      // Get historical prediction data if available
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // For now, simulate based on recent training trends
      // In a full implementation, you'd store historical predictions
      const data = await firebaseService.getPredictionData(8); // Last 8 weeks for trend
      
      if (!data || data.recentRaces.length < 2) {
        return null; // Not enough data for trend analysis
      }
      
      // Calculate trend based on recent race improvements
      const recentRaces = data.recentRaces
        .filter(race => race.distanceMeters >= 1000)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4);
      
      if (recentRaces.length < 2) {
        return null;
      }
      
      // Calculate average improvement rate
      let totalImprovement = 0;
      let comparisons = 0;
      
      for (let i = 0; i < recentRaces.length - 1; i++) {
        const newer = recentRaces[i];
        const older = recentRaces[i + 1];
        
        // Normalize times to target distance
        const newerNormalized = newer.time * (targetDistance / newer.distanceMeters);
        const olderNormalized = older.time * (targetDistance / older.distanceMeters);
        
        const daysBetween = (new Date(newer.date) - new Date(older.date)) / (1000 * 60 * 60 * 24);
        
        if (daysBetween > 7 && daysBetween < 90) { // Valid comparison window
          const improvement = olderNormalized - newerNormalized; // Positive = improvement
          const dailyImprovement = improvement / daysBetween;
          totalImprovement += dailyImprovement * 30; // 30 day projection
          comparisons++;
        }
      }
      
      if (comparisons === 0) {
        return null;
      }
      
      const averageChange = totalImprovement / comparisons;
      
      // Cap the change to reasonable bounds
      const maxChange = currentPrediction * 0.15; // Max 15% change
      const boundedChange = Math.max(-maxChange, Math.min(maxChange, averageChange));
      
      return Math.round(boundedChange);
    } catch (error) {
      console.error('Error calculating 30-day change:', error);
      return null;
    }
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
      const daysSince = (new Date() - new Date(activity.start_date || activity.date)) / (1000 * 60 * 60 * 24);
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