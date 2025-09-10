import stravaApi from './stravaApi';

class StravaRouteService {
  /**
   * Parse segment/route ID from mobile link path
   * Mobile links often follow patterns like:
   * - https://strava.app.link/XXX (where XXX encodes the segment/route)
   * - The link ID sometimes contains the segment ID encoded within
   */
  parseMobileLinkId(url) {
    // Common patterns for Strava mobile links
    // Sometimes the segment ID is embedded in the link code
    const linkCode = url.split('/').pop();
    
    // Try to decode if it looks like base64 or similar encoding
    if (linkCode) {
      // Check if the code contains numbers that might be a segment ID
      // Strava segment IDs are typically 7-8 digits
      const numbers = linkCode.match(/\d{5,}/);
      if (numbers) {
        return { id: numbers[0], type: 'segment' };
      }
    }
    
    return null;
  }

  /**
   * Extract route or segment ID from Strava URL
   */
  extractRouteId(url) {
    try {
      // Handle different Strava URL formats
      // Routes: https://www.strava.com/routes/3357221206441249674
      // Segments: https://www.strava.com/segments/5971450
      // Mobile app links: https://strava.app.link/LucTgwtyvWb
      
      // Check if it's a mobile app link
      if (url.includes('strava.app.link')) {
        // Try to parse segment ID from the link pattern first
        const parsedFromLink = this.parseMobileLinkId(url);
        if (parsedFromLink) {
          return parsedFromLink;
        }
        
        // If we can't parse from the link, try to extract from any embedded patterns
        const mobileSegmentMatch = url.match(/segments?\/(\d+)/);
        const mobileRouteMatch = url.match(/routes?\/(\d+)/);
        
        if (mobileSegmentMatch) {
          return { id: mobileSegmentMatch[1], type: 'segment' };
        } else if (mobileRouteMatch) {
          return { id: mobileRouteMatch[1], type: 'route' };
        }
        
        // For mobile links, we need to provide better guidance to users
        return null;
      }
      
      // Standard desktop URL patterns
      const routeMatch = url.match(/strava\.com\/routes\/(\d+)/);
      const segmentMatch = url.match(/strava\.com\/segments\/(\d+)/);
      
      if (routeMatch) {
        return { id: routeMatch[1], type: 'route' };
      } else if (segmentMatch) {
        return { id: segmentMatch[1], type: 'segment' };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting route/segment ID:', error);
      return null;
    }
  }

  /**
   * Fetch route or segment details from Strava
   * Note: This will use web scraping or require Strava API authentication
   */
  async fetchRouteDetails(routeInfo) {
    try {
      // routeInfo is now an object with { id, type } or legacy string
      const routeId = typeof routeInfo === 'string' ? routeInfo : routeInfo.id;
      const routeType = typeof routeInfo === 'string' ? 'route' : routeInfo.type;
      
      // For now, return structured data that would come from Strava
      // This will be replaced with actual API integration
      
      // Simulate API call with realistic data structure
      return await this.fetchViaWebProxy(routeId, routeType);
    } catch (error) {
      console.error('Error fetching route details:', error);
      throw new Error('Failed to fetch route details. Please check the URL and try again.');
    }
  }

  /**
   * Fetch route via web proxy or backend service
   */
  async fetchViaWebProxy(routeId, routeType = 'route') {
    try {
      // Only log errors, not every fetch attempt
      
      // Check if user is authenticated with Strava
      if (stravaApi.isAuthenticated()) {
        try {
          // Try to fetch real data from Strava API
          let apiData;
          if (routeType === 'segment') {
            apiData = await stravaApi.getSegment(routeId);
            return {
              name: apiData.name,
              distance: apiData.distance,
              elevation_gain: apiData.total_elevation_gain || 0,
              elevation_loss: apiData.total_elevation_gain || 0,
              max_elevation: apiData.maximum_elevation || 100,
              min_elevation: apiData.minimum_elevation || 50,
              elevation_profile: this.generateMockElevationProfile(apiData.distance, apiData.total_elevation_gain || 0),
              surface_type: apiData.surface_type || 'road',
              estimated_moving_time: apiData.effort_count ? Math.floor(apiData.distance / 200) : null,
              description: apiData.city ? `${apiData.city}, ${apiData.state || apiData.country}` : 'Strava Segment',
              location: `${apiData.city || 'Unknown'}, ${apiData.state || apiData.country || 'Unknown'}`,
              terrain: this.getTerrainDescription(apiData.total_elevation_gain || 0, apiData.distance),
              routeId: routeId,
              routeType: 'segment',
              fromApi: true,
              apiError: null
            };
          } else {
            apiData = await stravaApi.getRoute(routeId);
            return {
              name: apiData.name,
              distance: apiData.distance,
              elevation_gain: apiData.elevation_gain || 0,
              elevation_loss: apiData.elevation_gain || 0,
              max_elevation: 100 + (apiData.elevation_gain || 0),
              min_elevation: 50,
              elevation_profile: this.generateMockElevationProfile(apiData.distance, apiData.elevation_gain || 0),
              surface_type: apiData.type === 1 ? 'trail' : apiData.type === 2 ? 'road' : 'mixed',
              estimated_moving_time: apiData.estimated_moving_time,
              description: apiData.description || 'Strava Route',
              location: 'Via Strava API',
              terrain: this.getTerrainDescription(apiData.elevation_gain || 0, apiData.distance),
              routeId: routeId,
              routeType: 'route',
              fromApi: true,
              apiError: null
            };
          }
        } catch (apiError) {
          console.error('Failed to fetch from Strava API:', apiError);
          console.error('Error details:', {
            message: apiError.message,
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            data: apiError.response?.data
          });
          
          // Return mock data with error info
          const routeData = this.generateRouteFromId(routeId, routeType);
          routeData.routeId = routeId;
          routeData.routeType = routeType;
          routeData.fromApi = false;
          routeData.apiError = apiError.response?.status === 404 ? 
            'Route not found. It may be deleted or the ID is incorrect.' : 
            apiError.response?.status === 403 ? 
            'This route is private. Only the creator can access it. Try using a Strava segment URL instead (segments are usually public).' :
            apiError.response?.status === 401 ? 
            'Authentication expired - please reconnect Strava' :
            `API Error: ${apiError.message}`;
          
          return routeData;
        }
      } else {
      }
      
      // Fall back to mock data if not authenticated
      const routeData = this.generateRouteFromId(routeId, routeType);
      
      // Add the actual route ID to the data for debugging
      routeData.routeId = routeId;
      routeData.routeType = routeType;
      routeData.fromApi = false;

      // Simulate network delay for mock data
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
  generateRouteFromId(routeId, routeType = 'route') {
    // Sample routes with more realistic data for demonstration
    const sampleRoutes = {
      '3392786518229903608': {
        name: 'Melbourne Marathon Course',
        distance: 42195,
        elevation_gain: 265,
        elevation_loss: 268,
        description: 'Official Melbourne Marathon route through the city',
        terrain: 'Mostly flat city streets with some gentle hills'
      },
      '3357221206441249674': {
        name: 'Tan Track Loop',
        distance: 3827,
        elevation_gain: 35,
        elevation_loss: 35,
        description: 'Popular 3.8km loop around the Royal Botanic Gardens',
        terrain: 'Flat gravel path with one small hill (Anderson St)'
      },
      '2958374629384756': {
        name: 'Albert Park Lake Circuit',
        distance: 4900,
        elevation_gain: 15,
        elevation_loss: 15,
        description: 'Flat loop around Albert Park Lake',
        terrain: 'Completely flat lakeside path'
      }
    };
    
    // Check if this is a known sample route
    if (sampleRoutes[routeId]) {
      const sample = sampleRoutes[routeId];
      return {
        name: `${sample.name} (Sample Data)`,
        distance: sample.distance,
        elevation_gain: sample.elevation_gain,
        elevation_loss: sample.elevation_loss,
        max_elevation: 50 + sample.elevation_gain,
        min_elevation: 50,
        elevation_profile: this.generateRealisticElevationProfile(sample.distance, sample.elevation_gain, 'road'),
        surface_type: 'asphalt',
        estimated_moving_time: Math.floor(sample.distance / 1000 * 330), // ~5:30 min/km estimate
        description: sample.description,
        location: 'Melbourne, Australia',
        terrain: sample.terrain
      };
    }
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
    
    // Generate distance based on route ID patterns and type
    // Use route ID digits to determine distance ranges
    const firstDigits = parseInt(routeId.substring(0, 2), 10);
    let baseDistance;
    
    if (routeType === 'segment') {
      // Segments are typically shorter (0.5-10K)
      if (firstDigits < 25) {
        baseDistance = 500 + deterministicRandom() * 1500; // 0.5-2K
      } else if (firstDigits < 50) {
        baseDistance = 1000 + deterministicRandom() * 3000; // 1-4K
      } else if (firstDigits < 75) {
        baseDistance = 2000 + deterministicRandom() * 4000; // 2-6K
      } else {
        baseDistance = 3000 + deterministicRandom() * 7000; // 3-10K
      }
    } else {
      // Routes are typically longer (3-50K)
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
    
    // Generate realistic route/segment name that includes the actual ID
    const distanceKmRounded = Math.round(distance / 100) / 10; // Round to nearest 100m, display as decimal
    
    // Always include the route ID in the name for clarity
    let name;
    if (routeType === 'segment') {
      name = `Segment #${routeId} (${distanceKmRounded}K ${terrainType})`;
    } else {
      name = `Route #${routeId} (${distanceKmRounded}K ${terrainType})`;
    }
    
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
      description: `Mock data for ${routeType} ID: ${routeId} (In production, this would fetch real Strava data)`,
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