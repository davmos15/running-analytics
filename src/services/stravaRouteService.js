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
      
      const routeUrl = `https://www.strava.com/routes/${routeId}`;
      
      // Since we can't directly fetch from Strava due to CORS, we'll need to either:
      // 1. Use a backend proxy
      // 2. Use the Strava API with OAuth
      // 3. Have users manually input some data
      
      // For now, return mock data structure that would come from Strava
      // This will be replaced with actual API integration
      console.log('Fetching route:', routeUrl);
      
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
      // This would call your backend service that can fetch Strava data
      // For now, returning a structured response that matches what we'd get
      
      // You could implement this using:
      // 1. A Firebase Cloud Function that fetches the route
      // 2. A proxy server that handles Strava API calls
      // 3. Direct Strava API integration with user OAuth tokens
      
      // Mock implementation for development
      const mockRoutes = {
        '3357221206441249674': {
          name: 'Princes Park 10K Loop',
          distance: 10550, // meters
          elevation_gain: 45, // meters
          elevation_loss: 45,
          max_elevation: 89,
          min_elevation: 44,
          elevation_profile: this.generateMockElevationProfile(10550, 45),
          surface_type: 'mixed',
          estimated_moving_time: 2400, // seconds
          description: 'Classic 10K loop around Princes Park',
          waypoints: [],
          segments: [] // Could include known Strava segments on this route
        }
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const routeData = mockRoutes[routeId] || {
        name: `Route ${routeId}`,
        distance: 5000,
        elevation_gain: 25,
        elevation_loss: 25,
        max_elevation: 100,
        min_elevation: 75,
        elevation_profile: this.generateMockElevationProfile(5000, 25),
        surface_type: 'road',
        estimated_moving_time: 1200,
        description: 'Custom route',
        waypoints: [],
        segments: []
      };

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