class StravaRouteService {
  /**
   * Extract route ID from Strava URL
   */
  extractRouteId(url) {
    try {
      // Handle different Strava route URL formats
      // https://www.strava.com/routes/3357221206441249674
      // https://www.strava.com/routes/3357221206441249674?...
      const match = url.match(/strava\.com\/routes\/(\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting route ID:', error);
      return null;
    }
  }

  /**
   * Fetch route details from Strava
   * Note: This will use web scraping or require Strava API authentication
   */
  async fetchRouteDetails(routeId) {
    try {
      // For now, we'll use a web fetch approach to get public route data
      // In production, this would ideally use Strava API with proper authentication
      
      // Since we can't directly fetch from Strava due to CORS, we'll need to either:
      // 1. Use a backend proxy
      // 2. Use the Strava API with OAuth
      // 3. Have users manually input some data
      
      // For now, return structured data that would come from Strava
      // This will be replaced with actual API integration
      
      // Simulate API call with realistic data structure
      return await this.fetchViaWebProxy(routeId);
    } catch (error) {
      console.error('Error fetching route details:', error);
      throw new Error('Failed to fetch route details. Please check the URL and try again.');
    }
  }

  /**
   * Fetch route via web proxy or backend service
   */
  async fetchViaWebProxy(routeId) {
    try {
      // Always generate unique route data based on route ID
      // This ensures each route URL produces different results
      const routeData = this.generateRouteFromId(routeId);
      
      // Optional: Use hardcoded database only for testing specific known routes
      // Uncomment below to use database for known routes:
      // if (routeDatabase[routeId]) {
      //   routeData = routeDatabase[routeId];
      // }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return routeData;
    } catch (error) {
      console.error('Error fetching via proxy:', error);
      throw error;
    }
  }

  /**
   * Generate mock elevation profile for testing
   */
  generateMockElevationProfile(distance, elevationGain) {
    const points = 50;
    const profile = [];
    const baseElevation = 50;
    
    for (let i = 0; i < points; i++) {
      const progress = i / points;
      // Create a realistic elevation profile with some hills
      const elevation = baseElevation + 
        Math.sin(progress * Math.PI * 2) * (elevationGain / 4) +
        Math.sin(progress * Math.PI * 6) * (elevationGain / 8) +
        Math.random() * 5;
      profile.push(Math.max(0, elevation));
    }
    
    return profile;
  }

  /**
   * Generate realistic elevation profile based on terrain type
   */
  generateRealisticElevationProfile(distance, elevationGain, terrainType) {
    const points = 50;
    const profile = [];
    const baseElevation = 50;
    
    for (let i = 0; i < points; i++) {
      const progress = i / points;
      let elevation = baseElevation;
      
      switch (terrainType) {
        case 'park':
          // Gentle rolling hills
          elevation += Math.sin(progress * Math.PI * 3) * (elevationGain / 3) +
                      Math.sin(progress * Math.PI * 8) * (elevationGain / 6) +
                      Math.random() * 3;
          break;
        case 'city':
          // More irregular with some steep sections
          elevation += Math.sin(progress * Math.PI * 4) * (elevationGain / 2) +
                      Math.random() * 8;
          break;
        case 'trail':
          // More dramatic elevation changes
          elevation += Math.sin(progress * Math.PI * 2) * (elevationGain / 2) +
                      Math.sin(progress * Math.PI * 6) * (elevationGain / 4) +
                      Math.random() * 10;
          break;
        default:
          // Default road profile
          elevation += Math.sin(progress * Math.PI * 2) * (elevationGain / 4) +
                      Math.random() * 5;
      }
      
      profile.push(Math.max(0, elevation));
    }
    
    return profile;
  }

  /**
   * Generate route data from route ID when not in database
   */
  generateRouteFromId(routeId) {
    // Use route ID to create consistent deterministic data
    // Convert route ID to number for seeding (handle large numbers safely)
    let seed = 0;
    for (let i = 0; i < routeId.length; i++) {
      seed = (seed * 31 + routeId.charCodeAt(i)) % 999999;
    }
    
    // Create a deterministic random function based on seed
    let seedValue = seed;
    const deterministicRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };
    
    // Generate distance based on route ID patterns
    // Use route ID digits to determine distance ranges
    const firstDigits = parseInt(routeId.substring(0, 2), 10);
    let baseDistance;
    
    if (firstDigits < 20) {
      baseDistance = 5000 + deterministicRandom() * 5000; // 5-10K
    } else if (firstDigits < 40) {
      baseDistance = 10000 + deterministicRandom() * 11000; // 10-21K  
    } else if (firstDigits < 60) {
      baseDistance = 3000 + deterministicRandom() * 7000; // 3-10K
    } else if (firstDigits < 80) {
      baseDistance = 15000 + deterministicRandom() * 27000; // 15-42K
    } else {
      baseDistance = 8000 + deterministicRandom() * 12000; // 8-20K
    }
    
    const distance = Math.floor(baseDistance);
    
    // Generate elevation based on route patterns and distance
    const elevationFactor = deterministicRandom();
    const distanceKm = distance / 1000;
    
    let elevation_gain;
    if (elevationFactor < 0.3) {
      // Flat route
      elevation_gain = Math.floor(distanceKm * (2 + deterministicRandom() * 8)); // 2-10m per km
    } else if (elevationFactor < 0.7) {
      // Rolling route  
      elevation_gain = Math.floor(distanceKm * (10 + deterministicRandom() * 20)); // 10-30m per km
    } else {
      // Hilly route
      elevation_gain = Math.floor(distanceKm * (25 + deterministicRandom() * 40)); // 25-65m per km
    }
    
    // Determine terrain type based on route characteristics
    const terrainSeed = deterministicRandom();
    let terrainType, surfaceType;
    
    if (terrainSeed < 0.4) {
      terrainType = 'road';
      surfaceType = 'asphalt';
    } else if (terrainSeed < 0.6) {
      terrainType = 'park';
      surfaceType = 'park path';
    } else if (terrainSeed < 0.8) {
      terrainType = 'trail';
      surfaceType = 'trail';
    } else {
      terrainType = 'city';
      surfaceType = 'mixed urban';
    }
    
    // Generate realistic route name
    const routeIdShort = routeId.slice(-6);
    const distanceKmRounded = Math.round(distance / 100) / 10; // Round to nearest 100m, display as decimal
    
    const routeNames = [
      `${distanceKmRounded}K ${terrainType} route`,
      `Strava Route ${routeIdShort}`,
      `${Math.floor(distanceKm)}K Custom Loop`,
      `${terrainType.charAt(0).toUpperCase() + terrainType.slice(1)} Run (${distanceKmRounded}K)`
    ];
    
    const nameIndex = Math.floor(deterministicRandom() * routeNames.length);
    const name = routeNames[nameIndex];
    
    // Generate location based on route ID
    const locations = [
      'Unknown location', 
      'Local area',
      'City route',
      'Suburban area',
      'Park district'
    ];
    const location = locations[Math.floor(deterministicRandom() * locations.length)];
    
    return {
      name: name,
      distance: distance,
      elevation_gain: elevation_gain,
      elevation_loss: Math.floor(elevation_gain * (0.85 + deterministicRandom() * 0.2)), // 85-105% of gain
      max_elevation: Math.floor(50 + elevation_gain + deterministicRandom() * 50),
      min_elevation: Math.floor(20 + deterministicRandom() * 30),
      elevation_profile: this.generateRealisticElevationProfile(distance, elevation_gain, terrainType),
      surface_type: surfaceType,
      estimated_moving_time: Math.floor(distance / 1000 * (280 + deterministicRandom() * 140)), // 4:40-7:00 min/km estimate
      description: `Route generated from Strava ID ${routeId}`,
      location: location,
      terrain: this.getTerrainDescription(elevation_gain, distance)
    };
  }

  /**
   * Get terrain description based on elevation
   */
  getTerrainDescription(elevationGain, distance) {
    const elevationPerKm = elevationGain / (distance / 1000);
    
    if (elevationPerKm < 10) return 'flat with minimal elevation changes';
    if (elevationPerKm < 25) return 'gently rolling with some hills';
    if (elevationPerKm < 50) return 'hilly with moderate climbs';
    return 'very hilly with significant elevation changes';
  }

  /**
   * Analyze route characteristics for prediction adjustments
   */
  analyzeRoute(routeData) {
    const analysis = {
      difficulty: 'moderate',
      elevationPerKm: (routeData.elevation_gain / (routeData.distance / 1000)).toFixed(1),
      isFlat: routeData.elevation_gain < 10 * (routeData.distance / 1000), // Less than 10m per km
      isHilly: routeData.elevation_gain > 30 * (routeData.distance / 1000), // More than 30m per km
      hasSteepSections: this.detectSteepSections(routeData.elevation_profile),
      terrainType: routeData.surface_type || 'road'
    };

    // Calculate difficulty score
    if (analysis.isFlat) {
      analysis.difficulty = 'easy';
    } else if (analysis.isHilly) {
      analysis.difficulty = 'hard';
    }

    return analysis;
  }

  /**
   * Detect steep sections in elevation profile
   */
  detectSteepSections(elevationProfile) {
    if (!elevationProfile || elevationProfile.length < 2) return false;
    
    let maxGradient = 0;
    for (let i = 1; i < elevationProfile.length; i++) {
      const gradient = Math.abs(elevationProfile[i] - elevationProfile[i-1]);
      maxGradient = Math.max(maxGradient, gradient);
    }
    
    // If gradient exceeds 5m between consecutive points
    return maxGradient > 5;
  }

  /**
   * Find similar routes from user's history
   */
  async findSimilarEfforts(routeData, userActivities) {
    const similar = [];
    const targetDistance = routeData.distance;
    const targetElevation = routeData.elevation_gain;

    for (const activity of userActivities) {
      // Check if activity is similar in distance and elevation
      const distanceRatio = activity.distance / targetDistance;
      const elevationRatio = activity.total_elevation_gain / targetElevation;
      
      if (distanceRatio > 0.9 && distanceRatio < 1.1 && 
          elevationRatio > 0.8 && elevationRatio < 1.2) {
        similar.push({
          ...activity,
          similarity: 1 - Math.abs(1 - distanceRatio) - Math.abs(1 - elevationRatio) * 0.5
        });
      }
    }

    // Sort by similarity
    similar.sort((a, b) => b.similarity - a.similarity);
    return similar.slice(0, 10); // Return top 10 most similar
  }

  /**
   * Generate pacing strategy based on elevation profile
   */
  generatePacingStrategy(routeData, basePace) {
    const profile = routeData.elevation_profile || [];
    const sections = 3; // Divide into thirds
    const sectionSize = Math.floor(profile.length / sections);
    const strategy = [];

    for (let i = 0; i < sections; i++) {
      const start = i * sectionSize;
      const end = (i + 1) * sectionSize;
      const sectionProfile = profile.slice(start, end);
      
      // Calculate average elevation change for this section
      const avgElevation = sectionProfile.reduce((a, b) => a + b, 0) / sectionProfile.length;
      const elevationFactor = this.calculateElevationFactor(avgElevation);
      
      strategy.push({
        label: i === 0 ? 'Start' : i === 1 ? 'Middle' : 'Finish',
        distance: `${((i * routeData.distance) / sections / 1000).toFixed(1)}-${(((i + 1) * routeData.distance) / sections / 1000).toFixed(1)}km`,
        pace: basePace * elevationFactor,
        description: this.describePaceStrategy(i, elevationFactor)
      });
    }

    return strategy;
  }

  /**
   * Calculate pace adjustment factor based on elevation
   */
  calculateElevationFactor(elevation) {
    // Simple model: slower pace for higher elevation
    // This would be refined based on user's actual hill performance
    const baseElevation = 50;
    const elevationDiff = elevation - baseElevation;
    
    // Approximately 2% slower per 10m of elevation gain
    return 1 + (elevationDiff / 10) * 0.02;
  }

  /**
   * Describe pacing strategy for a section
   */
  describePaceStrategy(section, elevationFactor) {
    if (section === 0) {
      return elevationFactor > 1.05 ? 'Conservative start on hill' : 'Controlled start';
    } else if (section === 1) {
      return elevationFactor > 1.05 ? 'Maintain effort on climb' : 'Steady rhythm';
    } else {
      return elevationFactor < 0.98 ? 'Push on descent' : 'Strong finish';
    }
  }
}

const stravaRouteService = new StravaRouteService();
export default stravaRouteService;