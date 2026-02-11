import firebaseService from './firebaseService';

class TrainingMetricsService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get user training metrics settings from localStorage
   */
  getSettings() {
    try {
      const saved = localStorage.getItem('trainingMetricsSettings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Invalid training metrics settings in localStorage, using defaults');
    }
    return {
      restingHR: 60,
      maxHR: 190,
      gender: 'male'
    };
  }

  /**
   * Calculate TRIMP (Training Impulse) for a single activity
   * TRIMP = duration_min * HR_ratio * gender_multiplier
   */
  calculateTRIMP(activity, settings = null) {
    if (!settings) settings = this.getSettings();

    const avgHR = activity.average_heartrate || activity.averageHeartRate;
    const duration = activity.moving_time; // seconds

    if (!avgHR || !duration || isNaN(avgHR) || isNaN(duration)) return 0;

    const durationMin = duration / 60;
    const hrRange = (settings.maxHR || 190) - (settings.restingHR || 60);
    if (hrRange <= 0) return 0;
    const hrRatio = (avgHR - (settings.restingHR || 60)) / hrRange;

    // Clamp HR ratio to valid range
    const clampedHR = Math.max(0, Math.min(1, hrRatio));
    if (isNaN(clampedHR)) return 0;

    // Gender-specific multiplier (Banister 1991)
    let trimp;
    if (settings.gender === 'female') {
      trimp = durationMin * clampedHR * 0.86 * Math.exp(1.67 * clampedHR);
    } else {
      trimp = durationMin * clampedHR * 0.64 * Math.exp(1.92 * clampedHR);
    }

    return isNaN(trimp) ? 0 : Math.round(trimp * 10) / 10;
  }

  /**
   * Aggregate daily TRIMP from activities
   */
  getDailyTRIMP(activities, settings = null) {
    if (!settings) settings = this.getSettings();

    const dailyMap = {};

    activities.forEach(activity => {
      const trimp = this.calculateTRIMP(activity, settings);
      if (trimp <= 0) return;

      const date = new Date(activity.start_date);
      if (isNaN(date.getTime())) return;
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = 0;
      }
      dailyMap[dateKey] += trimp;
    });

    // Convert to sorted array and fill in zero days
    const dates = Object.keys(dailyMap).sort();
    if (dates.length === 0) return [];

    const result = [];
    const startDate = new Date(dates[0]);
    const endDate = new Date();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        trimp: dailyMap[dateKey] || 0
      });
    }

    return result;
  }

  /**
   * Calculate CTL (Chronic Training Load / Fitness)
   * 42-day exponential moving average of daily TRIMP
   */
  calculateCTL(dailyTRIMP) {
    const decay = 42;
    let ctl = 0;
    return dailyTRIMP.map(day => {
      const trimp = isNaN(day.trimp) ? 0 : day.trimp;
      ctl = ctl + (trimp - ctl) / decay;
      if (isNaN(ctl)) ctl = 0;
      return { date: day.date, ctl: Math.round(ctl * 10) / 10 };
    });
  }

  /**
   * Calculate ATL (Acute Training Load / Fatigue)
   * 7-day exponential moving average of daily TRIMP
   */
  calculateATL(dailyTRIMP) {
    const decay = 7;
    let atl = 0;
    return dailyTRIMP.map(day => {
      const trimp = isNaN(day.trimp) ? 0 : day.trimp;
      atl = atl + (trimp - atl) / decay;
      if (isNaN(atl)) atl = 0;
      return { date: day.date, atl: Math.round(atl * 10) / 10 };
    });
  }

  /**
   * Calculate TSB (Training Stress Balance / Form)
   * TSB = CTL - ATL
   * Positive = fresh, Negative = fatigued
   */
  calculateTSB(ctlData, atlData) {
    return ctlData.map((ctlDay, i) => {
      const atl = atlData[i]?.atl || 0;
      const ctl = ctlDay.ctl || 0;
      const tsb = Math.round((ctl - atl) * 10) / 10;
      return {
        date: ctlDay.date,
        tsb: isNaN(tsb) ? 0 : tsb,
        ctl: isNaN(ctl) ? 0 : ctl,
        atl: isNaN(atl) ? 0 : atl
      };
    });
  }

  /**
   * Estimate VO2 Max (VDOT) using Jack Daniels formula
   * Based on a single performance (distance in meters, time in seconds)
   */
  estimateVDOT(distanceMeters, timeSeconds) {
    const timeMinutes = timeSeconds / 60;
    const velocity = distanceMeters / timeMinutes; // meters per minute

    // Oxygen cost of running at this velocity
    const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity;

    // Fraction of VO2max for this duration
    const fractionVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes)
      + 0.2989558 * Math.exp(-0.1932605 * timeMinutes);

    if (fractionVO2max <= 0) return null;

    const vdot = vo2 / fractionVO2max;

    // Sanity check: VDOT should be between 15 and 85 for most runners
    if (vdot < 15 || vdot > 85) return null;

    return Math.round(vdot * 10) / 10;
  }

  /**
   * Get current VDOT estimate from recent best performances
   * Uses best performances at standard distances from the last 12 weeks
   */
  async getCurrentVDOT() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 84); // 12 weeks

      const personalBests = await firebaseService.getAllPersonalBests(12);

      // Group by distance and find best time per distance
      const bestByDistance = {};
      personalBests.forEach(pb => {
        if (!pb.distanceMeters || !pb.time) return;
        // Only use distances >= 1500m and <= 42.2K for reliable VDOT
        if (pb.distanceMeters < 1500 || pb.distanceMeters > 42200) return;

        const time = typeof pb.time === 'string' ? this.parseTimeString(pb.time) : pb.time;
        if (!time || time <= 0) return;

        const key = pb.distance;
        if (!bestByDistance[key] || time < bestByDistance[key].time) {
          bestByDistance[key] = {
            distance: pb.distance,
            distanceMeters: pb.distanceMeters,
            time: time,
            date: pb.date
          };
        }
      });

      // Calculate VDOT from each best performance
      const vdotEstimates = [];
      Object.values(bestByDistance).forEach(perf => {
        const vdot = this.estimateVDOT(perf.distanceMeters, perf.time);
        if (vdot) {
          // Weight longer distances more heavily (more reliable for VDOT)
          const weight = Math.min(2, perf.distanceMeters / 5000);
          vdotEstimates.push({ vdot, weight, distance: perf.distance });
        }
      });

      if (vdotEstimates.length === 0) {
        return { vdot: null, confidence: 0, basedOn: [] };
      }

      // Weighted average
      const totalWeight = vdotEstimates.reduce((sum, e) => sum + e.weight, 0);
      const weightedVDOT = vdotEstimates.reduce((sum, e) => sum + e.vdot * e.weight, 0) / totalWeight;

      return {
        vdot: Math.round(weightedVDOT * 10) / 10,
        confidence: Math.min(1, vdotEstimates.length / 3), // Full confidence at 3+ distances
        basedOn: vdotEstimates.map(e => ({ distance: e.distance, vdot: e.vdot }))
      };
    } catch (error) {
      console.error('Error calculating VDOT:', error);
      return { vdot: null, confidence: 0, basedOn: [] };
    }
  }

  /**
   * Parse a time string like "25:30" or "1:25:30" to seconds
   */
  parseTimeString(timeStr) {
    if (typeof timeStr === 'number') return timeStr;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseFloat(timeStr) || 0;
  }

  /**
   * Estimate recovery time based on activity TRIMP relative to fitness
   */
  estimateRecovery(lastActivityTRIMP, currentCTL) {
    // Ratio of session load to chronic load
    const loadRatio = currentCTL > 0 ? lastActivityTRIMP / currentCTL : 2;

    if (lastActivityTRIMP < 30 || loadRatio < 0.5) {
      return { hours: 24, level: 'light', label: 'Easy Recovery' };
    } else if (lastActivityTRIMP < 80 || loadRatio < 1.0) {
      return { hours: 36, level: 'moderate', label: 'Moderate Recovery' };
    } else if (lastActivityTRIMP < 150 || loadRatio < 1.5) {
      return { hours: 48, level: 'hard', label: 'Hard Session Recovery' };
    } else {
      return { hours: 72, level: 'very_hard', label: 'Extended Recovery' };
    }
  }

  /**
   * Get VDOT history over time (one estimate per 4-week window)
   */
  async getVDOTHistory(weeksBack = 52) {
    try {
      const allPBs = await firebaseService.getAllPersonalBests(weeksBack);

      // Group PBs into 4-week windows
      const windowSize = 28; // days
      const now = new Date();
      const history = [];

      for (let w = weeksBack; w >= 0; w -= 4) {
        const windowEnd = new Date(now);
        windowEnd.setDate(windowEnd.getDate() - w * 7);
        const windowStart = new Date(windowEnd);
        windowStart.setDate(windowStart.getDate() - windowSize);

        const windowPBs = allPBs.filter(pb => {
          const pbDate = pb.date?.toDate ? pb.date.toDate() : new Date(pb.date);
          return pbDate >= windowStart && pbDate <= windowEnd;
        });

        // Find best VDOT in this window
        let bestVDOT = null;
        windowPBs.forEach(pb => {
          if (!pb.distanceMeters || pb.distanceMeters < 1500 || pb.distanceMeters > 42200) return;
          const time = typeof pb.time === 'string' ? this.parseTimeString(pb.time) : pb.time;
          if (!time || time <= 0) return;
          const vdot = this.estimateVDOT(pb.distanceMeters, time);
          if (vdot && (!bestVDOT || vdot > bestVDOT)) {
            bestVDOT = vdot;
          }
        });

        if (bestVDOT) {
          history.push({
            date: windowEnd.toISOString().split('T')[0],
            vdot: bestVDOT
          });
        }
      }

      return history;
    } catch (error) {
      console.error('Error getting VDOT history:', error);
      return [];
    }
  }

  /**
   * Main method: compute all training metrics
   */
  async getTrainingMetrics() {
    // Check cache
    const now = Date.now();
    if (this.cache && (now - this.cacheTimestamp) < this.cacheTTL) {
      return this.cache;
    }

    try {
      const settings = this.getSettings();

      // Get all activities
      const activities = await firebaseService.getActivities();
      const runActivities = activities.filter(activity =>
        activity.type && ['Run', 'TrailRun', 'VirtualRun'].includes(activity.type)
      );

      // Calculate daily TRIMP
      const dailyTRIMP = this.getDailyTRIMP(runActivities, settings);

      // Calculate CTL, ATL, TSB
      const ctlData = this.calculateCTL(dailyTRIMP);
      const atlData = this.calculateATL(dailyTRIMP);
      const tsbData = this.calculateTSB(ctlData, atlData);

      // Current values (last entry)
      const currentCTL = ctlData.length > 0 ? ctlData[ctlData.length - 1].ctl : 0;
      const currentATL = atlData.length > 0 ? atlData[atlData.length - 1].atl : 0;
      const currentTSB = tsbData.length > 0 ? tsbData[tsbData.length - 1].tsb : 0;

      // VDOT
      const vdotResult = await this.getCurrentVDOT();

      // VDOT history
      const vdotHistory = await this.getVDOTHistory(52);

      // Last activity + recovery
      const sortedActivities = runActivities
        .filter(a => a.start_date)
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      const lastActivity = sortedActivities[0] || null;
      const lastTRIMP = lastActivity ? this.calculateTRIMP(lastActivity, settings) : 0;
      const recovery = this.estimateRecovery(lastTRIMP, currentCTL);

      // Calculate time since last activity
      let recoveryRemaining = null;
      if (lastActivity) {
        const lastDate = new Date(lastActivity.start_date);
        const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
        recoveryRemaining = Math.max(0, recovery.hours - hoursSince);
      }

      const metrics = {
        fitness: {
          ctl: currentCTL,
          atl: currentATL,
          tsb: currentTSB,
          tsbData: tsbData.slice(-90), // Last 90 days for charting
          formStatus: currentTSB > 10 ? 'fresh' :
                      currentTSB > -10 ? 'optimal' :
                      currentTSB > -25 ? 'tired' : 'fatigued'
        },
        vdot: vdotResult,
        vdotHistory,
        recovery: {
          ...recovery,
          lastActivity: lastActivity ? {
            name: lastActivity.name,
            date: lastActivity.start_date,
            trimp: lastTRIMP
          } : null,
          hoursRemaining: recoveryRemaining !== null ? Math.round(recoveryRemaining) : null
        },
        weeklyTRIMP: this.getWeeklyTRIMP(dailyTRIMP),
        lastUpdated: new Date().toISOString()
      };

      // Cache results
      this.cache = metrics;
      this.cacheTimestamp = now;

      return metrics;
    } catch (error) {
      console.error('Error computing training metrics:', error);
      throw error;
    }
  }

  /**
   * Get weekly TRIMP totals for the last 12 weeks
   */
  getWeeklyTRIMP(dailyTRIMP) {
    const weeks = [];
    const now = new Date();

    for (let w = 11; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekStartKey = weekStart.toISOString().split('T')[0];
      const weekEndKey = weekEnd.toISOString().split('T')[0];

      const weekTrimp = dailyTRIMP
        .filter(d => d.date >= weekStartKey && d.date < weekEndKey)
        .reduce((sum, d) => sum + d.trimp, 0);

      weeks.push({
        weekStart: weekStartKey,
        weekEnd: weekEndKey,
        trimp: Math.round(weekTrimp)
      });
    }

    return weeks;
  }

  /**
   * Clear cache (call after settings change)
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

const trainingMetricsService = new TrainingMetricsService();
export default trainingMetricsService;
