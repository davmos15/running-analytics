import firebaseService from './firebaseService';

class PredictionServiceDebug {
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
   * Debug version to test enhanced prediction with logging
   */
  async debugPredictions(weeksBack = 16, customDistances = [], daysUntilRace = null) {
    console.log('🔍 Starting enhanced prediction debug...');
    
    try {
      const predictionData = await firebaseService.getPredictionData(weeksBack);
      
      console.log('📊 Prediction Data:', {
        races: predictionData?.recentRaces?.length || 0,
        activities: predictionData?.activities?.length || 0,
        recentRaces: predictionData?.recentRaces?.slice(0, 3) // First 3 races for inspection
      });
      
      if (!predictionData || predictionData.recentRaces.length === 0) {
        console.error('❌ Insufficient data for predictions');
        throw new Error('Insufficient data for predictions. Need at least 2 recent races.');
      }

      // Test endurance parameter calculation
      console.log('🧮 Calculating endurance parameters...');
      const enduranceParams = this.calculatePersonalEnduranceParameters(predictionData);
      console.log('📈 Endurance Params:', enduranceParams);
      
      // Check for NaN in endurance params
      if (isNaN(enduranceParams.alpha) || isNaN(enduranceParams.exponent)) {
        console.error('❌ NaN detected in endurance parameters!', enduranceParams);
        return null;
      }

      // Test single distance prediction
      console.log('🎯 Testing 5K prediction...');
      const testPrediction = await this.predictDistanceEnhanced(
        5000,
        predictionData,
        enduranceParams,
        daysUntilRace
      );
      console.log('🏃 5K Test Prediction:', testPrediction);
      
      // Check for NaN in prediction
      if (isNaN(testPrediction.prediction)) {
        console.error('❌ NaN detected in prediction!', testPrediction);
        return null;
      }

      return {
        success: true,
        enduranceParams,
        testPrediction,
        dataQuality: this.assessDataQuality(predictionData)
      };
      
    } catch (error) {
      console.error('❌ Debug prediction failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate personalized endurance parameters with extensive logging
   */
  calculatePersonalEnduranceParameters(data) {
    console.log('📊 Raw race data:', data.recentRaces.length, 'races');
    
    const validRaces = data.recentRaces
      .filter(race => {
        const isValid = race.distanceMeters >= 1000 && race.time > 0;
        if (!isValid) {
          console.log('⚠️ Filtered out race:', race);
        }
        return isValid;
      })
      .map(race => ({
        distance: race.distanceMeters,
        time: race.time,
        logD: Math.log(race.distanceMeters),
        logT: Math.log(race.time),
        date: new Date(race.date),
        name: race.name || 'Unknown'
      }));

    console.log('✅ Valid races for analysis:', validRaces.length);
    validRaces.forEach((race, i) => {
      console.log(`  ${i + 1}. ${race.name}: ${race.distance}m in ${race.time}s (${new Date(race.date).toLocaleDateString()})`);
      console.log(`     logD: ${race.logD.toFixed(3)}, logT: ${race.logT.toFixed(3)}`);
      
      // Check for NaN in log calculations
      if (isNaN(race.logD) || isNaN(race.logT)) {
        console.error('❌ NaN in log calculations for race:', race);
      }
    });

    if (validRaces.length < 2) {
      console.log('⚠️ Using default parameters due to insufficient races');
      return {
        alpha: 0,
        exponent: 1.06,
        criticalSpeed: null,
        anaerobic: null,
        confidence: 0.3
      };
    }

    // Calculate weights
    const weights = validRaces.map((race, idx) => {
      const daysSince = (new Date() - race.date) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-daysSince / 60);
      const qualityWeight = 1.0; // Simplified for debugging
      const totalWeight = recencyWeight * qualityWeight;
      
      console.log(`  Weight ${idx + 1}: recency=${recencyWeight.toFixed(3)}, total=${totalWeight.toFixed(3)}`);
      
      if (isNaN(totalWeight)) {
        console.error('❌ NaN weight for race:', race);
      }
      
      return totalWeight;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    console.log('📊 Total weight:', totalWeight);
    
    if (totalWeight === 0 || isNaN(totalWeight)) {
      console.error('❌ Invalid total weight:', totalWeight);
      return {
        alpha: 0,
        exponent: 1.06,
        criticalSpeed: null,
        anaerobic: null,
        confidence: 0.3
      };
    }
    
    // Weighted means
    const meanLogD = validRaces.reduce((sum, race, idx) => 
      sum + race.logD * weights[idx], 0) / totalWeight;
    const meanLogT = validRaces.reduce((sum, race, idx) => 
      sum + race.logT * weights[idx], 0) / totalWeight;

    console.log('📊 Weighted means:', { meanLogD: meanLogD.toFixed(3), meanLogT: meanLogT.toFixed(3) });
    
    if (isNaN(meanLogD) || isNaN(meanLogT)) {
      console.error('❌ NaN in weighted means:', { meanLogD, meanLogT });
    }

    // Calculate slope (personalized Riegel exponent)
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < validRaces.length; i++) {
      const dLogD = validRaces[i].logD - meanLogD;
      const dLogT = validRaces[i].logT - meanLogT;
      const contribution = weights[i] * dLogD * dLogT;
      const denominatorContrib = weights[i] * dLogD * dLogD;
      
      console.log(`  Regression ${i + 1}: dLogD=${dLogD.toFixed(3)}, dLogT=${dLogT.toFixed(3)}, contrib=${contribution.toFixed(4)}`);
      
      numerator += contribution;
      denominator += denominatorContrib;
    }

    console.log('📊 Regression terms:', { numerator: numerator.toFixed(4), denominator: denominator.toFixed(4) });

    const personalExponent = denominator > 0 ? numerator / denominator : 1.06;
    const alpha = meanLogT - personalExponent * meanLogD;

    console.log('📊 Calculated params:', { 
      personalExponent: personalExponent.toFixed(4), 
      alpha: alpha.toFixed(4) 
    });

    // Check for NaN in final calculations
    if (isNaN(personalExponent) || isNaN(alpha)) {
      console.error('❌ NaN in final parameters:', { personalExponent, alpha });
    }

    // Bound the exponent
    const boundedExponent = Math.max(1.02, Math.min(1.12, personalExponent));

    console.log('✅ Final bounded exponent:', boundedExponent.toFixed(4));

    return {
      alpha,
      exponent: boundedExponent,
      rawExponent: personalExponent,
      criticalSpeed: null, // Simplified for debugging
      anaerobic: null,
      confidence: Math.min(0.9, validRaces.length / 5),
      baseRaces: validRaces.length
    };
  }

  /**
   * Enhanced prediction with extensive logging
   */
  async predictDistanceEnhanced(targetDistance, data, enduranceParams, daysUntilRace) {
    console.log(`🎯 Predicting ${targetDistance/1000}K...`);
    
    // 1. Base prediction from personalized power law
    const logBasePrediction = enduranceParams.alpha + 
                             enduranceParams.exponent * Math.log(targetDistance);
    const basePrediction = Math.exp(logBasePrediction);
    
    console.log('📊 Base prediction calculation:', {
      alpha: enduranceParams.alpha.toFixed(4),
      exponent: enduranceParams.exponent.toFixed(4),
      logTargetDistance: Math.log(targetDistance).toFixed(4),
      logBasePrediction: logBasePrediction.toFixed(4),
      basePrediction: basePrediction.toFixed(1)
    });
    
    if (isNaN(basePrediction)) {
      console.error('❌ NaN in base prediction!', { logBasePrediction, basePrediction });
    }

    // 2. Feature adjustments (simplified for debugging)
    const featureAdjustment = 0; // Skip complex features for now
    const combinedLogPrediction = logBasePrediction + featureAdjustment;
    
    console.log('📊 After feature adjustment:', {
      featureAdjustment,
      combinedLogPrediction: combinedLogPrediction.toFixed(4)
    });

    // 3. Apply taper adjustment if race date provided
    if (daysUntilRace !== null) {
      const taperAdjustment = this.calculateSimpleTaperAdjustment(daysUntilRace);
      console.log('📊 Taper adjustment:', taperAdjustment.toFixed(4));
    }

    // 4. Convert back to time
    const finalPrediction = Math.exp(combinedLogPrediction);
    
    console.log('📊 Final prediction:', {
      combinedLogPrediction: combinedLogPrediction.toFixed(4),
      finalPrediction: finalPrediction.toFixed(1),
      formattedTime: this.formatTime(finalPrediction)
    });
    
    if (isNaN(finalPrediction)) {
      console.error('❌ NaN in final prediction!', { combinedLogPrediction, finalPrediction });
    }

    // 5. Simple confidence calculation
    const confidence = Math.min(0.85, Math.max(0.4, data.recentRaces.length / 10));
    
    console.log('📊 Confidence:', confidence.toFixed(2));
    
    if (isNaN(confidence)) {
      console.error('❌ NaN in confidence!', confidence);
    }

    // 6. Simple interval calculation
    const errorMargin = finalPrediction * 0.05; // 5% margin for debugging
    const interval = {
      lower: Math.round(finalPrediction - errorMargin),
      upper: Math.round(finalPrediction + errorMargin),
      margin: Math.round(errorMargin)
    };
    
    console.log('📊 Prediction interval:', interval);

    return {
      prediction: Math.round(finalPrediction),
      confidence,
      range: interval,
      method: 'Enhanced Debug',
      factors: [],
      thirtyDayChange: null, // Skip for debugging
      enduranceProfile: {
        personalExponent: enduranceParams.exponent
      }
    };
  }

  calculateSimpleTaperAdjustment(daysUntilRace) {
    if (daysUntilRace <= 14) {
      return -0.01; // 1% improvement
    } else if (daysUntilRace <= 56) {
      return -0.005; // 0.5% improvement
    }
    return 0;
  }

  assessDataQuality(data) {
    return {
      score: Math.min(100, data.recentRaces.length * 20),
      level: data.recentRaces.length > 3 ? 'high' : 'medium'
    };
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

const debugPredictionService = new PredictionServiceDebug();
export default debugPredictionService;