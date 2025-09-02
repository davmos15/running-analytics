import firebaseService from './firebaseService';

class EnhancedPredictionService {
  constructor() {
    // Default target distances for predictions (in meters)
    this.defaultDistances = {
      '5K': 5000,
      '10K': 10000,
      '21.1K': 21100,
      '42.2K': 42200
    };
    
    // Plausibility constraints
    this.RATIO_BOUNDS = {
      '5K_10K': { min: 2.05, max: 2.25 },      // 10K/5K ratio
      '10K_HM': { min: 2.12, max: 2.30 },      // HM/10K ratio  
      '5K_HM': { min: 4.35, max: 5.20 },       // HM/5K ratio
      'HM_FM': { min: 2.10, max: 2.30 }        // FM/HM ratio
    };
    
    // Temperature adjustment factors (Celsius)
    this.TEMP_ADJUSTMENTS = {
      5: 0.98,    // Cold: 2% slower
      10: 1.00,   // Optimal
      15: 1.00,   // Optimal
      20: 1.01,   // Slightly warm
      25: 1.03,   // Warm: 3% slower
      30: 1.06    // Hot: 6% slower
    };
  }

  /**
   * Generate race predictions for a specific race date
   */
  async generatePredictionsForRaceDate(raceDate, customDistances = [], raceConditions = {}) {
    const today = new Date();
    const race = new Date(raceDate);
    const daysUntilRace = Math.ceil((race - today) / (1000 * 60 * 60 * 24));
    const weeksBack = Math.min(24, Math.max(8, Math.ceil(daysUntilRace / 7) + 8));
    
    const predictions = await this.generatePredictions(weeksBack, customDistances, daysUntilRace, raceConditions);
    return predictions;
  }

  /**
   * Generate predictions with enhanced algorithm
   */
  async generatePredictions(weeksBack = 16, customDistances = [], daysUntilRace = null, raceConditions = {}) {
    try {
      const predictionData = await firebaseService.getPredictionData(weeksBack);
      
      if (!predictionData || predictionData.recentRaces.length === 0) {
        throw new Error('Insufficient data for predictions. Need at least 2 recent races.');
      }

      // Calculate personalized endurance parameters
      const enduranceParams = this.calculatePersonalEnduranceParameters(predictionData);
      
      // Combine distances
      const allDistances = { ...this.defaultDistances };
      customDistances.forEach(dist => {
        allDistances[dist.label] = dist.meters;
      });

      const predictions = {};
      const sortedDistances = Object.entries(allDistances).sort((a, b) => a[1] - b[1]);
      
      for (const [distanceLabel, distanceMeters] of sortedDistances) {
        predictions[distanceLabel] = await this.predictDistanceEnhanced(
          distanceMeters,
          predictionData,
          enduranceParams,
          daysUntilRace,
          raceConditions
        );
      }

      // Apply plausibility constraints
      this.applyPlausibilityBounds(predictions);

      return {
        predictions,
        dataQuality: this.assessDataQuality(predictionData),
        enduranceProfile: enduranceParams,
        lastUpdated: new Date(),
        dataSource: `${predictionData.recentRaces.length} races, ${weeksBack} weeks`
      };
    } catch (error) {
      console.error('Error generating predictions:', error);
      throw error;
    }
  }

  /**
   * Calculate personalized endurance parameters using power law fit
   */
  calculatePersonalEnduranceParameters(data) {
    const validRaces = data.recentRaces
      .filter(race => race.distanceMeters >= 1000 && race.time > 0)
      .map(race => {
        const logD = Math.log(race.distanceMeters);
        const logT = Math.log(race.time);
        
        // Skip races with invalid log values
        if (!isFinite(logD) || !isFinite(logT)) {
          return null;
        }
        
        return {
          distance: race.distanceMeters,
          time: race.time,
          logD,
          logT,
          date: new Date(race.date),
          quality: this.assessRaceQuality(race)
        };
      })
      .filter(race => race !== null);

    if (validRaces.length < 2) {
      // Default to typical recreational runner parameters
      // For a 22-minute 5K runner: ln(1320) = 7.185, with exponent 1.06
      // alpha = ln(time) - exponent * ln(distance)
      // alpha = 7.185 - 1.06 * ln(5000) = 7.185 - 1.06 * 8.517 = -1.843
      return {
        alpha: -1.843,  // Reasonable default for ~22min 5K runner
        exponent: 1.06,
        criticalSpeed: null,
        anaerobic: null,
        confidence: 0.3
      };
    }

    // Weighted linear regression in log-log space
    // ln(T) = alpha + b * ln(D)
    const weights = validRaces.map((race, idx) => {
      const daysSince = (new Date() - race.date) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-daysSince / 60); // 60-day half-life
      const qualityWeight = race.quality;
      return recencyWeight * qualityWeight;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    // Safety check for zero weight
    if (totalWeight === 0 || !isFinite(totalWeight)) {
      return {
        alpha: -1.843,  // Reasonable default for ~22min 5K runner
        exponent: 1.06,
        criticalSpeed: null,
        anaerobic: null,
        confidence: 0.3
      };
    }
    
    // Weighted means with safety checks
    const meanLogD = validRaces.reduce((sum, race, idx) => 
      sum + race.logD * weights[idx], 0) / totalWeight;
    const meanLogT = validRaces.reduce((sum, race, idx) => 
      sum + race.logT * weights[idx], 0) / totalWeight;
    
    // Verify means are finite
    if (!isFinite(meanLogD) || !isFinite(meanLogT)) {
      return {
        alpha: -1.843,  // Reasonable default for ~22min 5K runner
        exponent: 1.06,
        criticalSpeed: null,
        anaerobic: null,
        confidence: 0.3
      };
    }

    // Calculate slope (personalized Riegel exponent)
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < validRaces.length; i++) {
      const dLogD = validRaces[i].logD - meanLogD;
      const dLogT = validRaces[i].logT - meanLogT;
      numerator += weights[i] * dLogD * dLogT;
      denominator += weights[i] * dLogD * dLogD;
    }

    const personalExponent = (denominator > 0 && isFinite(numerator) && isFinite(denominator)) 
      ? numerator / denominator 
      : 1.06;
    
    // Safety check for NaN or Infinity
    const safePersonalExponent = isFinite(personalExponent) ? personalExponent : 1.06;
    
    const alpha = meanLogT - safePersonalExponent * meanLogD;
    
    // Safety check for alpha - use reasonable default if invalid
    const safeAlpha = isFinite(alpha) ? alpha : -1.843;

    // Bound the exponent to reasonable physiological limits
    const boundedExponent = Math.max(1.02, Math.min(1.12, safePersonalExponent));

    // Calculate Critical Speed model if we have enough short/medium distance data
    const criticalSpeedParams = this.calculateCriticalSpeed(validRaces);

    return {
      alpha: safeAlpha,
      exponent: boundedExponent,
      rawExponent: safePersonalExponent,
      criticalSpeed: criticalSpeedParams.CS,
      anaerobic: criticalSpeedParams.D_prime,
      confidence: Math.min(0.9, validRaces.length / 5),
      baseRaces: validRaces.length
    };
  }

  /**
   * Calculate Critical Speed parameters (CS and D')
   */
  calculateCriticalSpeed(races) {
    // Filter races between 3 and 30 minutes for CS model
    const csRaces = races.filter(race => 
      race.time >= 180 && race.time <= 1800
    );

    if (csRaces.length < 3) {
      return { CS: null, D_prime: null };
    }

    // Linear regression: Distance = CS * Time + D'
    const n = csRaces.length;
    const sumT = csRaces.reduce((sum, r) => sum + r.time, 0);
    const sumD = csRaces.reduce((sum, r) => sum + r.distance, 0);
    const sumTT = csRaces.reduce((sum, r) => sum + r.time * r.time, 0);
    const sumTD = csRaces.reduce((sum, r) => sum + r.time * r.distance, 0);

    const CS = (n * sumTD - sumT * sumD) / (n * sumTT - sumT * sumT);
    const D_prime = (sumD - CS * sumT) / n;

    // Validate CS is reasonable (2.5-6.0 m/s for most runners)
    if (CS < 2.5 || CS > 6.0) {
      return { CS: null, D_prime: null };
    }

    return { CS, D_prime: Math.max(0, D_prime) };
  }

  /**
   * Enhanced prediction using log-space modeling
   */
  async predictDistanceEnhanced(targetDistance, data, enduranceParams, daysUntilRace, raceConditions = {}) {
    // Apply race to training adjustment if we have the data
    const raceAdjustment = data.raceToTrainingRatio ? (1 - data.raceToTrainingRatio) : 0;
    // Debug logging to identify the issue
    console.log('🔍 Enhanced prediction debug:', {
      targetDistance,
      enduranceParams,
      hasData: !!data,
      racesCount: data?.recentRaces?.length
    });
    
    // 1. Base prediction from personalized power law with safety checks
    const logTargetDistance = Math.log(targetDistance);
    
    if (!isFinite(logTargetDistance) || !isFinite(enduranceParams.alpha) || !isFinite(enduranceParams.exponent)) {
      console.warn('⚠️ Using fallback due to invalid params');
      // Better fallback based on reasonable pace estimates
      const pacePerKm = targetDistance <= 5000 ? 240 : // 4:00/km for 5K
                        targetDistance <= 10000 ? 250 : // 4:10/km for 10K  
                        targetDistance <= 21100 ? 270 : // 4:30/km for HM
                        300; // 5:00/km for Marathon
      const fallbackTime = (targetDistance / 1000) * pacePerKm;
      return {
        prediction: Math.round(fallbackTime),
        confidence: 0.3,
        range: { lower: Math.round(fallbackTime * 0.9), upper: Math.round(fallbackTime * 1.1) },
        method: 'Fallback',
        factors: [],
        thirtyDayChange: null
      };
    }
    
    const logBasePrediction = enduranceParams.alpha + enduranceParams.exponent * logTargetDistance;
    
    console.log('📊 Prediction calculation:', {
      alpha: enduranceParams.alpha,
      exponent: enduranceParams.exponent,
      logTargetDistance,
      logBasePrediction,
      willPredict: Math.exp(logBasePrediction)
    });
    
    if (!isFinite(logBasePrediction) || logBasePrediction > 15) { // exp(15) is unreasonably large
      console.warn('⚠️ Invalid log prediction:', logBasePrediction);
      // Better fallback
      const pacePerKm = targetDistance <= 5000 ? 240 : 
                        targetDistance <= 10000 ? 250 :
                        targetDistance <= 21100 ? 270 :
                        300;
      const fallbackTime = (targetDistance / 1000) * pacePerKm;
      return {
        prediction: Math.round(fallbackTime),
        confidence: 0.3,
        range: { lower: Math.round(fallbackTime * 0.9), upper: Math.round(fallbackTime * 1.1) },
        method: 'Fallback',
        factors: [],
        thirtyDayChange: null
      };
    }
    
    let basePrediction = Math.exp(logBasePrediction);
    
    // Sanity check - no prediction should be more than 10 hours
    if (!isFinite(basePrediction) || basePrediction > 36000) {
      console.warn('⚠️ Unreasonable prediction:', basePrediction);
      const pacePerKm = targetDistance <= 5000 ? 240 :
                        targetDistance <= 10000 ? 250 :
                        targetDistance <= 21100 ? 270 :
                        300;
      basePrediction = (targetDistance / 1000) * pacePerKm;
    }

    // 2. Alternative: Critical Speed model (if available)
    let csPrediction = null;
    if (enduranceParams.criticalSpeed && targetDistance > enduranceParams.anaerobic) {
      csPrediction = (targetDistance - enduranceParams.anaerobic) / enduranceParams.criticalSpeed;
    }

    // 3. Weighted combination of recent race predictions (in log space)
    const riegelPredictions = this.getWeightedRacePredictions(targetDistance, data, enduranceParams);

    // 4. Combine predictions with safety checks
    let combinedLogPrediction;
    if (riegelPredictions.logPrediction && isFinite(riegelPredictions.logPrediction) && csPrediction && isFinite(csPrediction)) {
      // Weighted average of all three methods
      const logCS = Math.log(csPrediction);
      if (isFinite(logCS)) {
        combinedLogPrediction = 
          0.4 * logBasePrediction + 
          0.4 * riegelPredictions.logPrediction + 
          0.2 * logCS;
      } else {
        combinedLogPrediction = 
          0.5 * logBasePrediction + 
          0.5 * riegelPredictions.logPrediction;
      }
    } else if (riegelPredictions.logPrediction && isFinite(riegelPredictions.logPrediction)) {
      // Use power law and recent races
      combinedLogPrediction = 
        0.3 * logBasePrediction + 
        0.7 * riegelPredictions.logPrediction;
    } else {
      // Fall back to power law only
      combinedLogPrediction = logBasePrediction;
    }
    
    // Verify combined prediction is valid
    if (!isFinite(combinedLogPrediction)) {
      combinedLogPrediction = logBasePrediction;
    }

    // 5. Apply feature-based adjustments in log space
    const featureAdjustment = this.calculateLogSpaceFeatureAdjustment(targetDistance, data);
    combinedLogPrediction += featureAdjustment;

    // 6. Apply training/taper adjustment if race date provided
    if (daysUntilRace !== null) {
      const taperAdjustment = this.calculateTaperAdjustment(daysUntilRace, data, raceConditions);
      combinedLogPrediction += Math.log(1 + taperAdjustment);
    }

    // 7. Apply race conditions adjustments (weather, elevation, etc.)
    const conditionsAdjustment = this.calculateConditionsAdjustment(targetDistance, raceConditions);
    combinedLogPrediction += Math.log(1 + conditionsAdjustment);
    
    // 8. Apply race vs training adjustment (how much faster you run in races)
    if (raceAdjustment !== 0) {
      combinedLogPrediction += Math.log(1 + raceAdjustment);
    }

    // 9. Convert back to time with safety check
    let finalPrediction = Math.exp(combinedLogPrediction);
    
    if (!isFinite(finalPrediction) || finalPrediction <= 0) {
      // Last resort fallback based on rough pace estimates
      const pacePerKm = targetDistance <= 5000 ? 240 : // 4:00/km for 5K
                        targetDistance <= 10000 ? 250 : // 4:10/km for 10K
                        targetDistance <= 21100 ? 270 : // 4:30/km for HM
                        300; // 5:00/km for Marathon
      finalPrediction = (targetDistance / 1000) * pacePerKm;
    }

    // 10. Calculate confidence based on data quality and prediction agreement
    const confidence = this.calculateEnhancedConfidence(
      finalPrediction,
      basePrediction,
      csPrediction,
      riegelPredictions,
      data,
      targetDistance
    );

    // 11. Calculate uncertainty intervals using residual analysis with improved margins
    const interval = this.calculatePredictionInterval(finalPrediction, confidence, targetDistance, data, enduranceParams);

    // 12. Calculate 30-day trend
    const thirtyDayChange = await this.calculateEnhanced30DayChange(
      targetDistance, 
      finalPrediction,
      enduranceParams
    );

    return {
      prediction: Math.round(finalPrediction),
      confidence,
      range: interval,
      method: 'Enhanced Multi-Model',
      models: {
        powerLaw: Math.round(basePrediction),
        criticalSpeed: csPrediction ? Math.round(csPrediction) : null,
        weightedRaces: Math.round(Math.exp(riegelPredictions.logPrediction || logBasePrediction))
      },
      factors: this.identifyPredictionFactors(targetDistance, data),
      thirtyDayChange,
      enduranceProfile: {
        personalExponent: enduranceParams.exponent,
        criticalSpeed: enduranceParams.criticalSpeed
      },
      raceConditions: raceConditions || {},
      optimalPrediction: this.calculateOptimalConditionsPrediction(finalPrediction, targetDistance, raceConditions),
      dataSource: data.runClassification ? 
        `${data.runClassification.races} races, ${data.runClassification.hardEfforts} hard efforts from ${data.runClassification.totalRuns} runs` :
        `${data.recentRaces.length} performances`,
      raceTrainingAdjustment: raceAdjustment
    };
  }

  /**
   * Get weighted predictions from recent races using proper log-space averaging
   */
  getWeightedRacePredictions(targetDistance, data, enduranceParams) {
    const recentRaces = data.recentRaces
      .filter(race => race.distanceMeters >= 1000 && race.time > 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    if (recentRaces.length === 0) {
      return { logPrediction: null, confidence: 0 };
    }

    let sumWeightedLogTime = 0;
    let sumWeights = 0;

    recentRaces.forEach((race, index) => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      const distanceRatio = targetDistance / race.distanceMeters;
      
      // Skip if extrapolating too far or invalid values
      if (distanceRatio > 10 || distanceRatio < 0.1) return;
      if (!isFinite(race.time) || !isFinite(race.distanceMeters)) return;

      // Calculate predicted time using personalized exponent with safety checks
      const logRaceTime = Math.log(race.time);
      const logDistanceRatio = Math.log(distanceRatio);
      
      if (!isFinite(logRaceTime) || !isFinite(logDistanceRatio)) return;
      
      const logPredictedTime = logRaceTime + enduranceParams.exponent * logDistanceRatio;
      
      if (!isFinite(logPredictedTime)) return;

      // Calculate weights with safety checks
      const recencyWeight = Math.exp(-daysSince / 60); // 60-day decay
      const distanceWeight = Math.exp(-Math.abs(logDistanceRatio) / 2); // Prefer similar distances
      const qualityWeight = this.assessRaceQuality(race);
      
      const totalWeight = recencyWeight * distanceWeight * qualityWeight;
      
      if (!isFinite(totalWeight) || totalWeight <= 0) return;

      sumWeightedLogTime += logPredictedTime * totalWeight;
      sumWeights += totalWeight;
    });

    if (sumWeights === 0 || !isFinite(sumWeights)) {
      return { logPrediction: null, confidence: 0 };
    }

    const logPrediction = sumWeightedLogTime / sumWeights;
    
    if (!isFinite(logPrediction)) {
      return { logPrediction: null, confidence: 0 };
    }

    return {
      logPrediction,
      confidence: Math.min(0.9, sumWeights / 2),
      racesUsed: recentRaces.length
    };
  }

  /**
   * Calculate feature adjustments in log space
   */
  calculateLogSpaceFeatureAdjustment(targetDistance, data) {
    const features = this.extractEnhancedFeatures(targetDistance, data);
    
    if (!features.isValid) return 0;

    let logAdjustment = 0;

    // Training volume effect (log scale)
    logAdjustment += features.volumeConsistency * -0.03;

    // Distance-specific preparation
    logAdjustment += features.distanceExperience * -0.02;

    // Recent form trend
    logAdjustment += features.formTrend * -0.025;

    // HR efficiency if available
    if (features.hrEfficiency) {
      logAdjustment += features.hrEfficiency * -0.015;
    }

    // Long run preparation for longer distances
    if (targetDistance >= 21100) {
      logAdjustment += features.longRunPreparation * -0.02;
    }

    return logAdjustment;
  }

  /**
   * Enhanced feature extraction
   */
  extractEnhancedFeatures(targetDistance, data) {
    const now = new Date();
    const features = {};

    // Recent activities (12 weeks)
    const recentActivities = data.activities.filter(activity => {
      const daysSince = (now - new Date(activity.start_date || activity.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 84;
    });

    if (recentActivities.length < 5) {
      return { isValid: false };
    }

    // Volume consistency (coefficient of variation)
    features.volumeConsistency = this.calculateVolumeConsistency(recentActivities);

    // Distance-specific experience
    features.distanceExperience = this.calculateDistanceExperience(targetDistance, data);

    // Form trend (improvement rate)
    features.formTrend = this.calculateFormTrend(data);

    // HR efficiency
    const hrActivities = recentActivities.filter(a => a.averageHeartRate);
    if (hrActivities.length >= 3) {
      features.hrEfficiency = this.calculateHREfficiency(hrActivities);
    }

    // Long run preparation (for half marathon and marathon)
    if (targetDistance >= 21100) {
      features.longRunPreparation = this.calculateLongRunPreparation(targetDistance, recentActivities);
    }

    features.isValid = true;
    return features;
  }

  /**
   * Calculate form trend using power law normalization
   */
  calculateFormTrend(data) {
    const races = data.recentRaces
      .filter(r => r.distanceMeters >= 3000)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (races.length < 2) return 0;

    // Compare recent vs older performance
    const recentRaces = races.slice(0, Math.ceil(races.length / 2));
    const olderRaces = races.slice(Math.ceil(races.length / 2));

    // Calculate average pace normalized to 5K equivalent
    const normalizeToFiveK = (race) => {
      const ratio = 5000 / race.distanceMeters;
      // Use standard 1.06 exponent for normalization
      return (race.time / race.distanceMeters * 1000) * Math.pow(ratio, 0.06);
    };

    const recentAvgPace = recentRaces.reduce((sum, r) => 
      sum + normalizeToFiveK(r), 0) / recentRaces.length;
    const olderAvgPace = olderRaces.reduce((sum, r) => 
      sum + normalizeToFiveK(r), 0) / olderRaces.length;

    // Negative means improvement
    return (olderAvgPace - recentAvgPace) / olderAvgPace;
  }

  /**
   * Calculate long run preparation
   */
  calculateLongRunPreparation(targetDistance, activities) {
    const longRuns = activities.filter(a => {
      const distance = a.distanceMeters || a.distance || 0;
      return distance >= targetDistance * 0.6;
    });

    const veryLongRuns = activities.filter(a => {
      const distance = a.distanceMeters || a.distance || 0;
      return distance >= targetDistance * 0.8;
    });

    const preparation = (longRuns.length / 10) * 0.6 + (veryLongRuns.length / 5) * 0.4;
    return Math.min(1.0, preparation);
  }

  /**
   * Calculate conditions adjustment for weather, elevation, and course profile
   */
  calculateConditionsAdjustment(targetDistance, raceConditions = {}) {
    let totalAdjustment = 0;

    // Weather adjustment
    if (raceConditions.temperature !== undefined) {
      const temp = raceConditions.temperature;
      // Optimal temperature is 10-15°C
      if (temp >= 5 && temp <= 30) {
        const tempAdjustment = this.TEMP_ADJUSTMENTS[Math.round(temp / 5) * 5] || 1.0;
        totalAdjustment += tempAdjustment - 1;
      } else if (temp < 5) {
        totalAdjustment += 0.02; // 2% slower in very cold
      } else if (temp > 30) {
        totalAdjustment += 0.08; // 8% slower in very hot
      }
    } else if (raceConditions.optimalWeather) {
      // Optimal weather conditions: 10-15°C, low humidity, no wind
      totalAdjustment -= 0.015; // 1.5% faster
    }

    // Elevation adjustment (meters of elevation gain)
    if (raceConditions.elevation !== undefined && raceConditions.elevation > 0) {
      // Rule of thumb: 1.5-2 seconds per meter of elevation gain per km
      const elevationPerKm = raceConditions.elevation / (targetDistance / 1000);
      const elevationPenalty = elevationPerKm * 1.75 / 60; // Convert to minutes per km
      const avgPaceMin = 5; // Assume ~5 min/km average pace
      totalAdjustment += elevationPenalty / avgPaceMin; // Proportional adjustment
    } else if (raceConditions.flatCourse) {
      // Flat course advantage (compared to typical undulating course)
      totalAdjustment -= 0.01; // 1% faster on flat course
    }

    // Wind adjustment
    if (raceConditions.windSpeed !== undefined) {
      const windSpeed = raceConditions.windSpeed; // in km/h
      if (windSpeed > 20) {
        totalAdjustment += 0.03; // 3% slower in strong wind
      } else if (windSpeed > 10) {
        totalAdjustment += 0.015; // 1.5% slower in moderate wind
      }
    }

    // Altitude adjustment (for races at elevation)
    if (raceConditions.altitude !== undefined && raceConditions.altitude > 1000) {
      // Performance decreases ~2% per 1000m above sea level
      const altitudePenalty = (raceConditions.altitude / 1000) * 0.02;
      totalAdjustment += altitudePenalty;
    }

    return totalAdjustment;
  }

  /**
   * Calculate optimal conditions prediction
   */
  calculateOptimalConditionsPrediction(basePrediction, targetDistance, currentConditions = {}) {
    // Calculate what the prediction would be under optimal conditions
    const optimalConditions = {
      optimalTaper: true,
      optimalWeather: true,
      flatCourse: true,
      temperature: 12, // Optimal temperature
      windSpeed: 0,
      elevation: 0
    };

    // Calculate the difference between current and optimal conditions
    const currentAdjustment = this.calculateConditionsAdjustment(targetDistance, currentConditions);
    const optimalAdjustment = this.calculateConditionsAdjustment(targetDistance, optimalConditions);
    
    // Optimal prediction is base minus current adjustment plus optimal adjustment
    const optimalTime = basePrediction / (1 + currentAdjustment) * (1 + optimalAdjustment);
    
    return {
      time: Math.round(optimalTime),
      improvement: Math.round(basePrediction - optimalTime),
      improvementPercent: Math.round(((basePrediction - optimalTime) / basePrediction) * 100)
    };
  }

  /**
   * Calculate residual variance from recent race predictions
   */
  calculateResidualVariance(data, enduranceParams) {
    const recentRaces = data.recentRaces
      .filter(race => race.distanceMeters >= 1000 && race.time > 0)
      .slice(0, 10); // Use last 10 races

    if (recentRaces.length < 3) {
      return 1.0; // Default variance if not enough data
    }

    const residuals = recentRaces.map(race => {
      // Predict this race time using the model
      const logPrediction = enduranceParams.alpha + enduranceParams.exponent * Math.log(race.distanceMeters);
      const predictedTime = Math.exp(logPrediction);
      
      // Calculate relative error
      const relativeError = Math.abs(race.time - predictedTime) / race.time;
      return relativeError;
    });

    // Calculate mean absolute percentage error (MAPE)
    const mape = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
    
    // Convert to variance factor (lower MAPE = lower variance factor)
    // MAPE of 2% = factor of 0.5, MAPE of 5% = factor of 1.0, etc.
    return Math.max(0.3, Math.min(1.5, mape * 20));
  }

  /**
   * Calculate taper adjustment based on training load and optimal taper option
   */
  calculateTaperAdjustment(daysUntilRace, data, raceConditions = {}) {
    if (daysUntilRace <= 0) return 0;

    // Calculate recent training load
    const recentActivities = data.activities.filter(a => {
      const daysSince = (new Date() - new Date(a.start_date || a.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 28;
    });

    // Use activity count as a proxy for training load
    const trainingConsistency = Math.min(1.0, recentActivities.length / 12);

    // Check if optimal taper is enabled
    const optimalTaperBonus = raceConditions.optimalTaper ? -0.015 : 0; // 1.5% bonus for optimal taper

    // Taper benefit calculation based on training consistency
    if (daysUntilRace <= 14) {
      // In taper period - expect improvement from rest (scaled by consistency)
      const baseTaper = -0.01 * trainingConsistency; // Up to 1% improvement
      return baseTaper + optimalTaperBonus;
    } else if (daysUntilRace <= 56) {
      // Training period - gradual improvement possible
      const weeklyImprovement = 0.002 * trainingConsistency; // 0.2% per week if consistent
      const weeks = Math.min(6, daysUntilRace / 7);
      const baseImprovement = -Math.min(0.015, weeks * weeklyImprovement);
      return baseImprovement + (optimalTaperBonus * 0.5); // Partial taper benefit during training
    } else {
      // Far future - less certain, scale by training consistency
      return -0.01 * trainingConsistency; // Cap at 1%
    }
  }

  /**
   * Apply plausibility bounds to predictions
   */
  applyPlausibilityBounds(predictions) {
    // Ensure 10K pace doesn't exceed 5K pace
    if (predictions['5K'] && predictions['10K']) {
      const pace5K = predictions['5K'].prediction / 5000;
      const pace10K = predictions['10K'].prediction / 10000;
      
      if (pace10K < pace5K) {
        // 10K pace is faster than 5K - adjust
        predictions['10K'].prediction = Math.round(predictions['5K'].prediction * 2.08);
        predictions['10K'].confidence *= 0.8;
      }

      // Check ratio bounds
      const ratio = predictions['10K'].prediction / predictions['5K'].prediction;
      if (ratio < this.RATIO_BOUNDS['5K_10K'].min || ratio > this.RATIO_BOUNDS['5K_10K'].max) {
        predictions['10K'].confidence *= 0.7;
      }
    }

    // Similar checks for other distance pairs
    if (predictions['21.1K'] && predictions['10K']) {
      const paceHM = predictions['21.1K'].prediction / 21100;
      const pace10K = predictions['10K'].prediction / 10000;
      
      if (paceHM < pace10K) {
        predictions['21.1K'].prediction = Math.round(predictions['10K'].prediction * 2.15);
        predictions['21.1K'].confidence *= 0.8;
      }
    }
  }

  /**
   * Enhanced confidence calculation
   */
  calculateEnhancedConfidence(finalPrediction, powerLawPred, csPred, riegelPreds, data, targetDistance) {
    let confidence = 0;

    // Base confidence from data quantity and quality
    const dataConfidence = Math.min(0.3, data.recentRaces.length / 10);
    confidence += dataConfidence;

    // Model agreement
    const models = [powerLawPred];
    if (csPred) models.push(csPred);
    if (riegelPreds.logPrediction) models.push(Math.exp(riegelPreds.logPrediction));

    if (models.length > 1) {
      const mean = models.reduce((sum, p) => sum + p, 0) / models.length;
      const variance = models.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / models.length;
      const cv = Math.sqrt(variance) / mean;
      
      // Lower coefficient of variation = higher agreement
      const agreementConfidence = Math.max(0, 0.3 * (1 - cv * 2));
      confidence += agreementConfidence;
    }

    // Distance-specific experience
    const similarRaces = data.recentRaces.filter(race => {
      const ratio = targetDistance / race.distanceMeters;
      return ratio >= 0.7 && ratio <= 1.4;
    }).length;
    confidence += Math.min(0.2, similarRaces * 0.05);

    // Training consistency
    const consistencyScore = this.calculateVolumeConsistency(data.activities);
    confidence += consistencyScore * 0.2;

    return Math.min(0.85, Math.max(0.4, confidence));
  }

  /**
   * Calculate prediction intervals using improved statistical modeling
   */
  calculatePredictionInterval(prediction, confidence, targetDistance, data, enduranceParams) {
    // Calculate residual variance from recent races to get tighter margins
    const residualVariance = this.calculateResidualVariance(data, enduranceParams);
    
    // Base uncertainty varies by distance - reduced for better margins
    let baseUncertainty;
    if (targetDistance <= 5000) {
      baseUncertainty = 0.015; // 1.5% for 5K (reduced from 3%)
    } else if (targetDistance <= 10000) {
      baseUncertainty = 0.02; // 2% for 10K (reduced from 4%)
    } else if (targetDistance <= 21100) {
      baseUncertainty = 0.025; // 2.5% for HM (reduced from 5%)
    } else {
      baseUncertainty = 0.035; // 3.5% for Marathon (reduced from 7%)
    }

    // Adjust based on confidence and actual variance
    const varianceAdjustment = Math.min(1.5, Math.max(0.5, residualVariance));
    const adjustedUncertainty = baseUncertainty * (2 - confidence) * varianceAdjustment;

    // Calculate asymmetric bounds (runners more likely to run slower than faster)
    const lowerBound = prediction * (1 - adjustedUncertainty * 0.8); // Tighter lower bound
    const upperBound = prediction * (1 + adjustedUncertainty * 1.2); // Slightly wider upper bound

    return {
      lower: Math.round(lowerBound),
      upper: Math.round(upperBound),
      margin: Math.round((upperBound - lowerBound) / 2),
      percentile_80_lower: Math.round(prediction * (1 - adjustedUncertainty * 0.6)),
      percentile_80_upper: Math.round(prediction * (1 + adjustedUncertainty * 0.9)),
      confidence_level: Math.round(confidence * 100),
      uncertainty_percent: Math.round(adjustedUncertainty * 100)
    };
  }

  /**
   * Calculate 30-day trend using power law scaling
   */
  async calculateEnhanced30DayChange(targetDistance, currentPrediction, enduranceParams) {
    try {
      const data = await firebaseService.getPredictionData(12);
      
      if (!data || data.recentRaces.length < 2) {
        return null;
      }

      // Normalize all races to target distance using personal exponent
      const normalizedPerformances = data.recentRaces
        .filter(race => race.distanceMeters >= 1000)
        .map(race => {
          const ratio = targetDistance / race.distanceMeters;
          const normalizedTime = race.time * Math.pow(ratio, enduranceParams.exponent);
          return {
            time: normalizedTime,
            date: new Date(race.date)
          };
        })
        .sort((a, b) => b.date - a.date);

      if (normalizedPerformances.length < 2) {
        return null;
      }

      // Calculate trend over last 60 days
      const now = new Date();
      const recentPerf = normalizedPerformances.filter(p => 
        (now - p.date) / (1000 * 60 * 60 * 24) <= 30
      );
      const olderPerf = normalizedPerformances.filter(p => {
        const days = (now - p.date) / (1000 * 60 * 60 * 24);
        return days > 30 && days <= 60;
      });

      if (recentPerf.length === 0 || olderPerf.length === 0) {
        return null;
      }

      const recentAvg = recentPerf.reduce((sum, p) => sum + p.time, 0) / recentPerf.length;
      const olderAvg = olderPerf.reduce((sum, p) => sum + p.time, 0) / olderPerf.length;

      const change = recentAvg - olderAvg;
      
      // Cap at reasonable bounds
      const maxChange = currentPrediction * 0.1;
      return Math.round(Math.max(-maxChange, Math.min(maxChange, change)));
    } catch (error) {
      console.error('Error calculating 30-day change:', error);
      return null;
    }
  }

  /**
   * Assess race quality for weighting
   */
  assessRaceQuality(race) {
    let quality = 1.0;

    // Official races get higher weight
    if (race.name && race.name.toLowerCase().includes('race')) {
      quality *= 1.2;
    }

    // Parkrun or time trial
    if (race.name && (race.name.toLowerCase().includes('parkrun') || 
                      race.name.toLowerCase().includes('time trial'))) {
      quality *= 1.1;
    }

    // Check for GPS issues (unrealistic pace)
    const pace = race.time / (race.distanceMeters / 1000);
    if (pace < 120 || pace > 600) { // < 2:00/km or > 10:00/km
      quality *= 0.5;
    }

    // Standard distances are more reliable
    const standardDistances = [5000, 10000, 21097.5, 42195];
    const isStandard = standardDistances.some(d => 
      Math.abs(race.distanceMeters - d) / d < 0.01
    );
    if (isStandard) {
      quality *= 1.1;
    }

    return Math.min(1.5, quality);
  }

  /**
   * Helper functions from original service
   */
  calculateVolumeConsistency(activities) {
    if (activities.length < 4) return 0;

    const weeklyVolumes = {};
    activities.forEach(activity => {
      const week = this.getWeekKey(new Date(activity.start_date || activity.date));
      weeklyVolumes[week] = (weeklyVolumes[week] || 0) + (activity.distanceMeters || activity.distance || 0);
    });

    const volumes = Object.values(weeklyVolumes);
    if (volumes.length < 4) return 0;

    const mean = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
    const cv = Math.sqrt(variance) / mean;

    return Math.max(0, 1 - cv);
  }

  calculateDistanceExperience(targetDistance, data) {
    const similarRaces = data.recentRaces.filter(race => {
      const ratio = targetDistance / race.distanceMeters;
      return ratio >= 0.5 && ratio <= 2.0;
    });

    return Math.min(1.0, similarRaces.length / 5);
  }

  calculateHREfficiency(hrActivities) {
    const ratios = hrActivities.map(activity => {
      const time = activity.time || activity.moving_time;
      const distance = activity.distanceMeters || activity.distance;
      const pace = time / (distance / 1000);
      return activity.averageHeartRate / pace;
    });

    if (ratios.length < 3) return 0;

    const recent = ratios.slice(0, Math.floor(ratios.length / 2));
    const older = ratios.slice(Math.floor(ratios.length / 2));

    const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r, 0) / older.length;

    return Math.max(0, Math.min(1, (recentAvg - olderAvg) / olderAvg));
  }

  assessDataQuality(data) {
    let score = 0;
    let maxScore = 0;
    
    const recentRaces = data.recentRaces.filter(race => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 90;
    });
    score += Math.min(40, recentRaces.length * 10);
    maxScore += 40;
    
    const recentActivities = data.activities.filter(activity => {
      const daysSince = (new Date() - new Date(activity.start_date || activity.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 84;
    });
    score += Math.min(30, recentActivities.length * 1.5);
    maxScore += 30;
    
    if (recentRaces.length > 0) {
      const mostRecentDays = (new Date() - new Date(recentRaces[0].date)) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 20 - mostRecentDays * 0.5);
    }
    maxScore += 20;
    
    const distanceVariety = new Set(data.recentRaces.map(r => Math.round(r.distanceMeters / 1000))).size;
    score += Math.min(10, distanceVariety * 2);
    maxScore += 10;
    
    return {
      score: Math.round((score / maxScore) * 100),
      level: score / maxScore > 0.8 ? 'high' : score / maxScore > 0.5 ? 'medium' : 'low',
      recommendations: this.getDataQualityRecommendations(data)
    };
  }

  getDataQualityRecommendations(data) {
    const recommendations = [];
    
    const recentRaceCount = data.recentRaces.filter(race => {
      const daysSince = (new Date() - new Date(race.date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 60;
    }).length;
    
    if (recentRaceCount < 2) {
      recommendations.push('Complete a recent time trial or race for more accurate predictions');
    }
    
    return recommendations;
  }

  identifyPredictionFactors(targetDistance, data) {
    const factors = [];
    
    // Race data quality
    if (data.runClassification) {
      if (data.runClassification.races >= 3) {
        factors.push({ 
          factor: 'Strong race data', 
          impact: 'positive', 
          strength: 'high',
          value: `${data.runClassification.races} races`,
          percentage: 15 // 15% confidence boost
        });
      } else if (data.runClassification.races > 0) {
        factors.push({ 
          factor: 'Limited race data', 
          impact: 'negative', 
          strength: 'medium',
          value: `Only ${data.runClassification.races} race(s)`,
          percentage: -10 // 10% confidence reduction
        });
      }
      
      // Race to training ratio
      if (data.raceToTrainingRatio && data.raceToTrainingRatio < 0.9) {
        const improvement = Math.round((1 - data.raceToTrainingRatio) * 100);
        factors.push({ 
          factor: 'Race day performance boost', 
          impact: 'positive', 
          strength: 'high',
          value: `${improvement}% faster in races`,
          percentage: improvement
        });
      }
    }
    
    // Training volume
    const recentVolume = data.activities
      .filter(a => (new Date() - new Date(a.start_date || a.date)) / (1000 * 60 * 60 * 24) <= 28)
      .reduce((sum, a) => sum + (a.distanceMeters || a.distance || 0), 0);
    
    const volumeRatio = recentVolume / targetDistance;
    if (volumeRatio > 4) {
      factors.push({ 
        factor: 'Excellent training volume', 
        impact: 'positive', 
        strength: 'high',
        value: `${Math.round(volumeRatio)}x race distance`,
        percentage: 8 // 8% improvement
      });
    } else if (volumeRatio > 2.5) {
      factors.push({ 
        factor: 'Good training volume', 
        impact: 'positive', 
        strength: 'medium',
        value: `${Math.round(volumeRatio * 10) / 10}x race distance`,
        percentage: 5 // 5% improvement
      });
    } else if (volumeRatio < 1.5) {
      factors.push({ 
        factor: 'Low training volume', 
        impact: 'negative', 
        strength: 'high',
        value: `Only ${Math.round(volumeRatio * 10) / 10}x race distance`,
        percentage: -12 // 12% penalty
      });
    }
    
    // Distance-specific experience
    const similarRaces = data.recentRaces.filter(race => {
      const ratio = targetDistance / race.distanceMeters;
      return ratio >= 0.8 && ratio <= 1.2;
    }).length;
    
    if (similarRaces >= 3) {
      factors.push({ 
        factor: 'Strong distance experience', 
        impact: 'positive', 
        strength: 'medium',
        value: `${similarRaces} similar distance efforts`,
        percentage: 6 // 6% improvement
      });
    } else if (similarRaces === 0) {
      factors.push({ 
        factor: 'No recent distance experience', 
        impact: 'negative', 
        strength: 'medium',
        value: 'Extrapolating from other distances',
        percentage: -8 // 8% uncertainty
      });
    }
    
    return factors;
  }

  getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.floor((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week}`;
  }

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

const enhancedPredictionService = new EnhancedPredictionService();
export default enhancedPredictionService;