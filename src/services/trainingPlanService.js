import firebaseService from './firebaseService';

class TrainingPlanService {
  constructor() {
    this.workoutTypes = {
      EASY: 'Easy Run',
      LONG: 'Long Run',
      TEMPO: 'Tempo Run',
      INTERVALS: 'Intervals',
      FARTLEK: 'Fartlek',
      RECOVERY: 'Recovery Run',
      RACE_PACE: 'Race Pace',
      PROGRESSION: 'Progression Run',
      HILLS: 'Hill Repeats',
      REST: 'Rest Day',
      CROSS_TRAINING: 'Cross Training'
    };
  }

  /**
   * Generate a complete training plan
   */
  async generateTrainingPlan(planConfig) {
    const {
      raceDate,
      raceDistance,
      goalType,
      goalTime,
      runsPerWeek,
      availableDays,
      longRunDay
    } = planConfig;

    // Calculate plan duration
    const weeksUntilRace = this.calculateWeeksUntilRace(raceDate);
    if (weeksUntilRace < 4) {
      throw new Error('Need at least 4 weeks to create a training plan');
    }
    if (weeksUntilRace > 24) {
      throw new Error('Plan is limited to 24 weeks maximum');
    }

    // Get user's training history and capabilities
    const userData = await this.analyzeUserCapabilities();
    
    // Generate base plan structure
    const plan = this.generateBasePlan(
      weeksUntilRace,
      raceDistance,
      goalType,
      goalTime,
      runsPerWeek,
      availableDays,
      longRunDay,
      userData
    );

    return plan;
  }

  /**
   * Analyze user's recent training to determine capabilities
   */
  async analyzeUserCapabilities() {
    const activities = await firebaseService.getActivities();
    const recentActivities = activities.filter(activity => {
      const daysSince = (new Date() - new Date(activity.start_date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 90 && ['Run', 'TrailRun'].includes(activity.type);
    });

    if (recentActivities.length < 5) {
      // Default values for new runners
      return {
        currentWeeklyVolume: 20,
        longestRun: 10,
        averagePacePerKm: 360, // 6:00/km
        speedworkExperience: false,
        consistencyScore: 0.5
      };
    }

    // Calculate current fitness metrics
    const last4Weeks = recentActivities.filter(a => {
      const daysSince = (new Date() - new Date(a.start_date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 28;
    });

    const weeklyVolume = this.calculateWeeklyAverage(last4Weeks);
    const longestRun = Math.max(...recentActivities.map(a => a.distance / 1000));
    const averagePace = this.calculateAveragePace(last4Weeks);
    const hasSpeedwork = this.detectSpeedwork(recentActivities);
    const consistency = this.calculateConsistency(recentActivities);

    return {
      currentWeeklyVolume: weeklyVolume,
      longestRun: longestRun,
      averagePacePerKm: averagePace,
      speedworkExperience: hasSpeedwork,
      consistencyScore: consistency
    };
  }

  /**
   * Generate the base training plan
   */
  generateBasePlan(weeks, raceDistance, goalType, goalTime, runsPerWeek, availableDays, longRunDay, userData) {
    const plan = {
      metadata: {
        raceDistance,
        goalType,
        goalTime,
        totalWeeks: weeks,
        runsPerWeek,
        createdAt: new Date()
      },
      weeks: []
    };

    // Calculate target paces based on goal
    const paces = this.calculateTrainingPaces(raceDistance, goalType, goalTime, userData);
    
    // Divide plan into phases
    const phases = this.dividePlanIntoPhases(weeks);
    
    // Generate each week
    for (let week = 1; week <= weeks; week++) {
      const phase = this.determinePhase(week, phases);
      const weekPlan = this.generateWeekPlan(
        week,
        phase,
        raceDistance,
        runsPerWeek,
        availableDays,
        longRunDay,
        userData,
        paces,
        weeks
      );
      plan.weeks.push(weekPlan);
    }

    // Add taper for final weeks
    this.applyTaper(plan.weeks, raceDistance);

    return plan;
  }

  /**
   * Generate a single week's training plan
   */
  generateWeekPlan(weekNumber, phase, raceDistance, runsPerWeek, availableDays, longRunDay, userData, paces, totalWeeks) {
    const weekStart = this.getWeekStartDate(weekNumber);
    const volume = this.calculateWeeklyVolume(weekNumber, phase, raceDistance, userData, totalWeeks);
    
    const week = {
      weekNumber,
      startDate: weekStart,
      phase,
      totalKm: volume,
      runs: []
    };

    // Distribute runs across available days
    const runDays = this.selectRunDays(availableDays, runsPerWeek, longRunDay);
    
    // Allocate workout types based on phase
    const workouts = this.allocateWorkouts(phase, runsPerWeek, weekNumber);
    
    // Generate each run
    runDays.forEach((day, index) => {
      const isLongRun = day === longRunDay;
      const workoutType = isLongRun ? this.workoutTypes.LONG : workouts[index];
      const run = this.generateRun(
        day,
        workoutType,
        volume,
        runsPerWeek,
        isLongRun,
        paces,
        phase,
        weekNumber,
        userData
      );
      week.runs.push(run);
    });

    return week;
  }

  /**
   * Generate a single run workout
   */
  generateRun(day, workoutType, weeklyVolume, runsPerWeek, isLongRun, paces, phase, weekNumber, userData) {
    let distance, description, segments;

    if (workoutType === this.workoutTypes.REST) {
      return {
        day,
        type: workoutType,
        distance: 0,
        description: 'Rest Day',
        segments: []
      };
    }

    // Calculate distance based on workout type
    if (isLongRun) {
      distance = this.calculateLongRunDistance(weeklyVolume, phase, weekNumber, userData);
      segments = this.generateLongRunSegments(distance, paces);
      description = `Long run at easy pace. Focus on maintaining consistent effort.`;
    } else if (workoutType === this.workoutTypes.TEMPO) {
      distance = weeklyVolume * 0.25;
      segments = this.generateTempoSegments(distance, paces);
      description = `Tempo run at threshold pace. Comfortably hard effort.`;
    } else if (workoutType === this.workoutTypes.INTERVALS) {
      distance = weeklyVolume * 0.2;
      segments = this.generateIntervalSegments(distance, paces, phase);
      description = `Interval training. Focus on form during fast segments.`;
    } else if (workoutType === this.workoutTypes.FARTLEK) {
      distance = weeklyVolume * 0.2;
      segments = this.generateFartlekSegments(distance, paces);
      description = `Fartlek run with varied pace. Play with speed.`;
    } else if (workoutType === this.workoutTypes.RACE_PACE) {
      distance = weeklyVolume * 0.2;
      segments = this.generateRacePaceSegments(distance, paces);
      description = `Race pace practice. Lock into goal pace.`;
    } else if (workoutType === this.workoutTypes.PROGRESSION) {
      distance = weeklyVolume * 0.22;
      segments = this.generateProgressionSegments(distance, paces);
      description = `Progression run. Start easy, finish fast.`;
    } else if (workoutType === this.workoutTypes.HILLS) {
      distance = weeklyVolume * 0.18;
      segments = this.generateHillSegments(distance, paces);
      description = `Hill repeats for strength and power.`;
    } else if (workoutType === this.workoutTypes.RECOVERY) {
      distance = weeklyVolume * 0.15;
      segments = this.generateRecoverySegments(distance, paces);
      description = `Recovery run. Very easy effort.`;
    } else {
      // Easy run
      distance = weeklyVolume / runsPerWeek;
      segments = this.generateEasySegments(distance, paces);
      description = `Easy run. Conversational pace.`;
    }

    return {
      day,
      type: workoutType,
      distance: Math.round(distance * 10) / 10,
      description,
      segments
    };
  }

  /**
   * Generate workout segments with warm-up and cool-down
   */
  generateTempoSegments(totalDistance, paces) {
    const warmup = Math.min(2, totalDistance * 0.2);
    const cooldown = Math.min(2, totalDistance * 0.2);
    const tempo = totalDistance - warmup - cooldown;

    return [
      { type: 'Warm-up', distance: warmup, pace: paces.easy },
      { type: 'Tempo', distance: tempo, pace: paces.tempo },
      { type: 'Cool-down', distance: cooldown, pace: paces.easy }
    ];
  }

  generateIntervalSegments(totalDistance, paces, phase) {
    const warmup = 2;
    const cooldown = 1.5;
    const workDistance = totalDistance - warmup - cooldown;
    
    // Vary interval length based on phase
    const intervalOptions = phase === 'peak' ? 
      [0.4, 0.8, 1.0] : // Shorter, faster intervals in peak phase
      [0.8, 1.0, 1.6]; // Longer intervals in build phase
    
    const intervalDistance = intervalOptions[Math.floor(Math.random() * intervalOptions.length)];
    const recoveryDistance = intervalDistance * 0.5;
    const reps = Math.floor(workDistance / (intervalDistance + recoveryDistance));

    const segments = [
      { type: 'Warm-up', distance: warmup, pace: paces.easy }
    ];

    for (let i = 0; i < reps; i++) {
      segments.push(
        { type: `Interval ${i + 1}`, distance: intervalDistance, pace: paces.interval },
        { type: 'Recovery', distance: recoveryDistance, pace: paces.recovery }
      );
    }

    segments.push({ type: 'Cool-down', distance: cooldown, pace: paces.easy });
    return segments;
  }

  generateFartlekSegments(totalDistance, paces) {
    const warmup = 1.5;
    const cooldown = 1.5;
    const segments = [
      { type: 'Warm-up', distance: warmup, pace: paces.easy }
    ];

    let remainingDistance = totalDistance - warmup - cooldown;
    let segmentCount = 0;

    while (remainingDistance > 0.5) {
      const isFast = segmentCount % 2 === 0;
      const distance = Math.min(remainingDistance, Math.random() * 1 + 0.5);
      segments.push({
        type: isFast ? 'Fast' : 'Easy',
        distance: Math.round(distance * 10) / 10,
        pace: isFast ? paces.tempo : paces.easy
      });
      remainingDistance -= distance;
      segmentCount++;
    }

    segments.push({ type: 'Cool-down', distance: cooldown, pace: paces.easy });
    return segments;
  }

  generateProgressionSegments(totalDistance, paces) {
    const thirds = totalDistance / 3;
    return [
      { type: 'Easy', distance: thirds, pace: paces.easy },
      { type: 'Moderate', distance: thirds, pace: paces.marathon },
      { type: 'Fast', distance: thirds, pace: paces.tempo }
    ];
  }

  generateRacePaceSegments(totalDistance, paces) {
    const warmup = 2;
    const cooldown = 1;
    const racePaceDistance = totalDistance - warmup - cooldown;

    return [
      { type: 'Warm-up', distance: warmup, pace: paces.easy },
      { type: 'Race Pace', distance: racePaceDistance, pace: paces.race },
      { type: 'Cool-down', distance: cooldown, pace: paces.easy }
    ];
  }

  generateHillSegments(totalDistance, paces) {
    const warmup = 2;
    const cooldown = 1;
    const hillWork = totalDistance - warmup - cooldown;
    const reps = Math.floor(hillWork / 0.5);

    const segments = [
      { type: 'Warm-up', distance: warmup, pace: paces.easy }
    ];

    for (let i = 0; i < reps; i++) {
      segments.push(
        { type: `Hill ${i + 1}`, distance: 0.2, pace: paces.interval },
        { type: 'Recovery', distance: 0.3, pace: paces.recovery }
      );
    }

    segments.push({ type: 'Cool-down', distance: cooldown, pace: paces.easy });
    return segments;
  }

  generateLongRunSegments(distance, paces) {
    return [{ type: 'Long Run', distance, pace: paces.easy }];
  }

  generateEasySegments(distance, paces) {
    return [{ type: 'Easy Run', distance, pace: paces.easy }];
  }

  generateRecoverySegments(distance, paces) {
    return [{ type: 'Recovery', distance, pace: paces.recovery }];
  }

  /**
   * Calculate training paces based on goal
   */
  calculateTrainingPaces(raceDistance, goalType, goalTime, userData) {
    let racePacePerKm;
    
    if (goalType === 'time' && goalTime) {
      // Calculate pace from goal time
      racePacePerKm = (goalTime * 60) / (raceDistance / 1000); // seconds per km
    } else {
      // Use current fitness for completion goal
      racePacePerKm = userData.averagePacePerKm * 1.1; // Slightly slower than current average
    }

    return {
      recovery: this.formatPace(racePacePerKm * 1.25),
      easy: this.formatPace(racePacePerKm * 1.15),
      marathon: this.formatPace(racePacePerKm * 1.05),
      race: this.formatPace(racePacePerKm),
      tempo: this.formatPace(racePacePerKm * 0.95),
      interval: this.formatPace(racePacePerKm * 0.90)
    };
  }

  /**
   * Format pace from seconds to mm:ss
   */
  formatPace(secondsPerKm) {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Divide plan into training phases
   */
  dividePlanIntoPhases(totalWeeks) {
    const baseWeeks = Math.floor(totalWeeks * 0.4);
    const buildWeeks = Math.floor(totalWeeks * 0.35);
    const peakWeeks = Math.floor(totalWeeks * 0.15);

    return {
      base: { start: 1, end: baseWeeks },
      build: { start: baseWeeks + 1, end: baseWeeks + buildWeeks },
      peak: { start: baseWeeks + buildWeeks + 1, end: baseWeeks + buildWeeks + peakWeeks },
      taper: { start: baseWeeks + buildWeeks + peakWeeks + 1, end: totalWeeks }
    };
  }

  /**
   * Determine which phase a week belongs to
   */
  determinePhase(weekNumber, phases) {
    if (weekNumber <= phases.base.end) return 'base';
    if (weekNumber <= phases.build.end) return 'build';
    if (weekNumber <= phases.peak.end) return 'peak';
    return 'taper';
  }

  /**
   * Calculate weekly volume based on phase and progression
   */
  calculateWeeklyVolume(weekNumber, phase, raceDistance, userData, totalWeeks) {
    const baseVolume = userData.currentWeeklyVolume || 20;
    const targetPeakVolume = this.calculatePeakVolume(raceDistance, userData);
    
    let multiplier;
    switch (phase) {
      case 'base':
        // Gradual build from current volume
        multiplier = 1 + (weekNumber / totalWeeks) * 0.3;
        break;
      case 'build':
        // Continue building toward peak
        multiplier = 1.3 + (weekNumber / totalWeeks) * 0.4;
        break;
      case 'peak':
        // Maintain high volume
        multiplier = 1.6 + Math.sin(weekNumber / 2) * 0.1;
        break;
      case 'taper':
        // Reduce volume for race
        const weeksUntilRace = totalWeeks - weekNumber + 1;
        multiplier = 0.6 + (weeksUntilRace / 3) * 0.4;
        break;
      default:
        multiplier = 1;
    }

    const volume = Math.min(baseVolume * multiplier, targetPeakVolume);
    
    // Apply 10% rule - don't increase more than 10% per week
    const maxIncrease = baseVolume * Math.pow(1.1, weekNumber - 1);
    
    return Math.min(volume, maxIncrease);
  }

  /**
   * Calculate peak training volume based on race distance
   */
  calculatePeakVolume(raceDistance, userData) {
    const distanceKm = raceDistance / 1000;
    const currentVolume = userData.currentWeeklyVolume;
    
    // Target peak volumes by race distance
    const targets = {
      5: 35,
      10: 45,
      21.1: 65,
      42.2: 85
    };

    let target = targets[distanceKm] || distanceKm * 2;
    
    // Don't increase too dramatically from current volume
    return Math.min(target, currentVolume * 2.5);
  }

  /**
   * Calculate long run distance
   */
  calculateLongRunDistance(weeklyVolume, phase, weekNumber, userData) {
    const baseLength = userData.longestRun || 10;
    let multiplier;

    switch (phase) {
      case 'base':
        multiplier = 0.3;
        break;
      case 'build':
        multiplier = 0.35;
        break;
      case 'peak':
        multiplier = 0.4;
        break;
      case 'taper':
        multiplier = 0.25;
        break;
      default:
        multiplier = 0.3;
    }

    const longRunDistance = weeklyVolume * multiplier;
    
    // Progressive increase from current longest
    const progression = baseLength * (1 + (weekNumber / 20) * 0.5);
    
    return Math.min(longRunDistance, progression, 35); // Cap at 35km
  }

  /**
   * Allocate workout types for the week
   */
  allocateWorkouts(phase, runsPerWeek, weekNumber) {
    const workouts = [];
    const isRecoveryWeek = weekNumber % 4 === 0; // Every 4th week is easier

    if (isRecoveryWeek) {
      // Recovery week - mostly easy runs
      for (let i = 0; i < runsPerWeek - 1; i++) {
        workouts.push(i === 0 ? this.workoutTypes.RECOVERY : this.workoutTypes.EASY);
      }
    } else {
      switch (phase) {
        case 'base':
          // Focus on easy miles and building endurance
          workouts.push(this.workoutTypes.EASY);
          if (runsPerWeek >= 3) workouts.push(this.workoutTypes.FARTLEK);
          if (runsPerWeek >= 4) workouts.push(this.workoutTypes.EASY);
          if (runsPerWeek >= 5) workouts.push(this.workoutTypes.TEMPO);
          break;
          
        case 'build':
          // Add more quality workouts
          workouts.push(this.workoutTypes.TEMPO);
          if (runsPerWeek >= 3) workouts.push(this.workoutTypes.INTERVALS);
          if (runsPerWeek >= 4) workouts.push(this.workoutTypes.EASY);
          if (runsPerWeek >= 5) workouts.push(this.workoutTypes.PROGRESSION);
          break;
          
        case 'peak':
          // Race-specific training
          workouts.push(this.workoutTypes.RACE_PACE);
          if (runsPerWeek >= 3) workouts.push(this.workoutTypes.INTERVALS);
          if (runsPerWeek >= 4) workouts.push(this.workoutTypes.TEMPO);
          if (runsPerWeek >= 5) workouts.push(this.workoutTypes.EASY);
          break;
          
        case 'taper':
          // Maintain fitness, reduce volume
          workouts.push(this.workoutTypes.RACE_PACE);
          if (runsPerWeek >= 3) workouts.push(this.workoutTypes.EASY);
          if (runsPerWeek >= 4) workouts.push(this.workoutTypes.FARTLEK);
          break;
          
        default:
          // Default to easy runs for unknown phases
          workouts.push(this.workoutTypes.EASY);
          break;
      }
    }

    // Fill remaining with easy runs
    while (workouts.length < runsPerWeek - 1) {
      workouts.push(this.workoutTypes.EASY);
    }

    return workouts;
  }

  /**
   * Apply taper to final weeks
   */
  applyTaper(weeks, raceDistance) {
    const taperWeeks = raceDistance >= 42000 ? 3 : 2;
    const startTaper = weeks.length - taperWeeks;

    for (let i = startTaper; i < weeks.length; i++) {
      const week = weeks[i];
      const reduction = 1 - ((i - startTaper + 1) / (taperWeeks + 1)) * 0.5;
      
      week.totalKm *= reduction;
      week.runs.forEach(run => {
        if (run.distance > 0) {
          run.distance *= reduction;
          run.segments.forEach(segment => {
            segment.distance *= reduction;
          });
        }
      });
    }
  }

  /**
   * Helper functions
   */
  calculateWeeksUntilRace(raceDate) {
    const today = new Date();
    const race = new Date(raceDate);
    const diffTime = race - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  }

  getWeekStartDate(weekNumber) {
    const today = new Date();
    const daysUntilMonday = (today.getDay() + 6) % 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() - daysUntilMonday + (weekNumber - 1) * 7);
    return nextMonday;
  }

  selectRunDays(availableDays, runsPerWeek, longRunDay) {
    const days = [...availableDays];
    
    // Ensure long run day is included
    if (!days.includes(longRunDay)) {
      days.push(longRunDay);
    }

    // Select run days evenly distributed
    while (days.length > runsPerWeek) {
      const removeIndex = Math.floor(Math.random() * days.length);
      if (days[removeIndex] !== longRunDay) {
        days.splice(removeIndex, 1);
      }
    }

    return days.sort((a, b) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return dayOrder.indexOf(a) - dayOrder.indexOf(b);
    });
  }

  calculateWeeklyAverage(activities) {
    if (activities.length === 0) return 20;
    
    const totalDistance = activities.reduce((sum, a) => sum + (a.distance / 1000), 0);
    return totalDistance / 4; // 4 weeks
  }

  calculateAveragePace(activities) {
    if (activities.length === 0) return 360; // 6:00/km default
    
    const totalPace = activities.reduce((sum, a) => {
      const pace = a.moving_time / (a.distance / 1000);
      return sum + pace;
    }, 0);
    
    return totalPace / activities.length;
  }

  detectSpeedwork(activities) {
    // Look for high-intensity efforts
    return activities.some(activity => {
      const pace = activity.moving_time / (activity.distance / 1000);
      const avgHR = activity.average_heartrate;
      return pace < 300 || (avgHR && avgHR > 160); // Fast pace or high HR
    });
  }

  calculateConsistency(activities) {
    // Group by week and check consistency
    const weeks = {};
    activities.forEach(activity => {
      const week = Math.floor((new Date() - new Date(activity.start_date)) / (7 * 24 * 60 * 60 * 1000));
      weeks[week] = (weeks[week] || 0) + 1;
    });
    
    const activeWeeks = Object.keys(weeks).length;
    const totalWeeks = 12; // Last 12 weeks
    
    return activeWeeks / totalWeeks;
  }

  /**
   * Export plan to CSV format with detailed workout information
   */
  exportToCSV(plan) {
    const headers = ['Week', 'Start Date', 'Phase', 'Total Km', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const rows = [headers];

    plan.weeks.forEach(week => {
      const row = [
        `Week ${week.weekNumber}`,
        new Date(week.startDate).toLocaleDateString(),
        week.phase.charAt(0).toUpperCase() + week.phase.slice(1),
        `${week.totalKm.toFixed(1)}km`
      ];

      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      dayOrder.forEach(day => {
        const run = week.runs.find(r => r.day === day);
        if (run && run.distance > 0) {
          // Create detailed workout description
          let workoutDetails = `${run.type} - ${run.distance.toFixed(1)}km\n`;
          workoutDetails += `Description: ${run.description}\n`;
          
          if (run.segments && run.segments.length > 0) {
            workoutDetails += `Workout Structure:\n`;
            run.segments.forEach((segment, index) => {
              workoutDetails += `  ${index + 1}. ${segment.type}: ${segment.distance.toFixed(1)}km @ ${segment.pace}/km\n`;
            });
            
            // Calculate total workout time estimate
            const totalTime = run.segments.reduce((sum, segment) => {
              const paceSeconds = this.paceToSeconds(segment.pace);
              return sum + (segment.distance * paceSeconds);
            }, 0);
            
            const hours = Math.floor(totalTime / 3600);
            const minutes = Math.floor((totalTime % 3600) / 60);
            const seconds = Math.floor(totalTime % 60);
            
            workoutDetails += `Estimated Time: `;
            if (hours > 0) workoutDetails += `${hours}h `;
            if (minutes > 0) workoutDetails += `${minutes}m `;
            if (seconds > 0 || (hours === 0 && minutes === 0)) workoutDetails += `${seconds}s`;
          }
          
          row.push(workoutDetails.trim());
        } else {
          row.push('Rest Day\nNo training scheduled');
        }
      });

      rows.push(row);
    });

    // Add summary information at the end
    rows.push([]);
    rows.push(['TRAINING PLAN SUMMARY']);
    rows.push(['Race Distance:', plan.metadata.raceDistance ? `${plan.metadata.raceDistance / 1000}K` : 'N/A']);
    rows.push(['Goal Type:', plan.metadata.goalType === 'time' ? `Time Goal: ${Math.floor(plan.metadata.goalTime / 60)}:${String(plan.metadata.goalTime % 60).padStart(2, '0')}` : 'Completion']);
    rows.push(['Total Weeks:', plan.metadata.totalWeeks]);
    rows.push(['Runs Per Week:', plan.metadata.runsPerWeek]);
    rows.push(['Plan Created:', new Date(plan.metadata.createdAt).toLocaleDateString()]);
    
    // Calculate total volume
    const totalVolume = plan.weeks.reduce((sum, week) => sum + week.totalKm, 0);
    rows.push(['Total Volume:', `${totalVolume.toFixed(1)}km`]);
    
    // Phase breakdown
    const phases = {};
    plan.weeks.forEach(week => {
      phases[week.phase] = (phases[week.phase] || 0) + 1;
    });
    
    rows.push([]);
    rows.push(['PHASE BREAKDOWN']);
    Object.entries(phases).forEach(([phase, weeks]) => {
      rows.push([`${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase:`, `${weeks} weeks`]);
    });

    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        if (cell === undefined || cell === null) return '';
        // Escape quotes and wrap in quotes if contains comma or newline
        const escaped = String(cell).replace(/"/g, '""');
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(',')
    ).join('\n');

    return csvContent;
  }

  /**
   * Convert pace string (MM:SS) to seconds
   */
  paceToSeconds(paceString) {
    const parts = paceString.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  }
}

const trainingPlanService = new TrainingPlanService();
export default trainingPlanService;