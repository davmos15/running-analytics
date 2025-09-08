import gpxParser from 'gpxparser';

class GpxTcxParser {
  /**
   * Parse GPX file content
   */
  parseGPX(fileContent) {
    try {
      const gpx = new gpxParser();
      gpx.parse(fileContent);
      
      if (!gpx.tracks || gpx.tracks.length === 0) {
        throw new Error('No tracks found in GPX file');
      }
      
      const track = gpx.tracks[0];
      const points = track.points;
      
      if (!points || points.length === 0) {
        throw new Error('No track points found in GPX file');
      }
      
      // Calculate total distance and elevation
      let totalDistance = 0;
      let totalElevationGain = 0;
      let totalElevationLoss = 0;
      let minElevation = Infinity;
      let maxElevation = -Infinity;
      const elevationProfile = [];
      
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        // Track elevation
        if (point.ele !== undefined) {
          elevationProfile.push(point.ele);
          minElevation = Math.min(minElevation, point.ele);
          maxElevation = Math.max(maxElevation, point.ele);
          
          // Calculate elevation gain/loss
          if (i > 0 && points[i - 1].ele !== undefined) {
            const elevDiff = point.ele - points[i - 1].ele;
            if (elevDiff > 0) {
              totalElevationGain += elevDiff;
            } else {
              totalElevationLoss += Math.abs(elevDiff);
            }
          }
        }
      }
      
      // Use track distance if available, otherwise calculate from points
      totalDistance = track.distance?.total || this.calculateDistanceFromPoints(points);
      
      return {
        name: track.name || 'GPX Route',
        distance: Math.round(totalDistance),
        elevation_gain: Math.round(totalElevationGain),
        elevation_loss: Math.round(totalElevationLoss),
        min_elevation: Math.round(minElevation),
        max_elevation: Math.round(maxElevation),
        elevation_profile: this.simplifyElevationProfile(elevationProfile),
        points: points.length,
        fileType: 'gpx'
      };
    } catch (error) {
      console.error('Error parsing GPX:', error);
      throw new Error(`Failed to parse GPX file: ${error.message}`);
    }
  }

  /**
   * Parse TCX file content
   */
  parseTCX(fileContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, 'application/xml');
      
      const activities = doc.getElementsByTagName('Activity');
      if (activities.length === 0) {
        throw new Error('No activities found in TCX file');
      }
      
      const activity = activities[0];
      const laps = activity.getElementsByTagName('Lap');
      
      let totalDistance = 0;
      let totalElevationGain = 0;
      let totalElevationLoss = 0;
      let minElevation = Infinity;
      let maxElevation = -Infinity;
      const elevationProfile = [];
      let lastElevation = null;
      
      // Process all laps
      for (let i = 0; i < laps.length; i++) {
        const lap = laps[i];
        const distanceMeters = lap.getElementsByTagName('DistanceMeters')[0];
        if (distanceMeters) {
          totalDistance = parseFloat(distanceMeters.textContent);
        }
        
        const trackpoints = lap.getElementsByTagName('Trackpoint');
        for (let j = 0; j < trackpoints.length; j++) {
          const trackpoint = trackpoints[j];
          const altitudeNode = trackpoint.getElementsByTagName('AltitudeMeters')[0];
          
          if (altitudeNode) {
            const elevation = parseFloat(altitudeNode.textContent);
            elevationProfile.push(elevation);
            minElevation = Math.min(minElevation, elevation);
            maxElevation = Math.max(maxElevation, elevation);
            
            if (lastElevation !== null) {
              const elevDiff = elevation - lastElevation;
              if (elevDiff > 0) {
                totalElevationGain += elevDiff;
              } else {
                totalElevationLoss += Math.abs(elevDiff);
              }
            }
            lastElevation = elevation;
          }
        }
      }
      
      // Get activity name if available
      const idNode = activity.getElementsByTagName('Id')[0];
      const activityName = idNode ? `TCX Activity ${new Date(idNode.textContent).toLocaleDateString()}` : 'TCX Route';
      
      return {
        name: activityName,
        distance: Math.round(totalDistance),
        elevation_gain: Math.round(totalElevationGain),
        elevation_loss: Math.round(totalElevationLoss),
        min_elevation: Math.round(minElevation),
        max_elevation: Math.round(maxElevation),
        elevation_profile: this.simplifyElevationProfile(elevationProfile),
        points: elevationProfile.length,
        fileType: 'tcx'
      };
    } catch (error) {
      console.error('Error parsing TCX:', error);
      throw new Error(`Failed to parse TCX file: ${error.message}`);
    }
  }

  /**
   * Calculate distance from GPS points
   */
  calculateDistanceFromPoints(points) {
    let totalDistance = 0;
    
    for (let i = 1; i < points.length; i++) {
      const lat1 = points[i - 1].lat;
      const lon1 = points[i - 1].lon;
      const lat2 = points[i].lat;
      const lon2 = points[i].lon;
      
      totalDistance += this.haversineDistance(lat1, lon1, lat2, lon2);
    }
    
    return totalDistance;
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Simplify elevation profile to 50 points for visualization
   */
  simplifyElevationProfile(profile) {
    if (profile.length <= 50) {
      return profile;
    }
    
    const simplified = [];
    const step = profile.length / 50;
    
    for (let i = 0; i < 50; i++) {
      const index = Math.floor(i * step);
      simplified.push(profile[index]);
    }
    
    return simplified;
  }

  /**
   * Parse file based on extension
   */
  async parseFile(file) {
    const fileName = file.name.toLowerCase();
    const fileContent = await this.readFileContent(file);
    
    if (fileName.endsWith('.gpx')) {
      return this.parseGPX(fileContent);
    } else if (fileName.endsWith('.tcx')) {
      return this.parseTCX(fileContent);
    } else {
      throw new Error('Unsupported file type. Please upload a GPX or TCX file.');
    }
  }

  /**
   * Read file content as text
   */
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

const gpxTcxParser = new GpxTcxParser();
export default gpxTcxParser;