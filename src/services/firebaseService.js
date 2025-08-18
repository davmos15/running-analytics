import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class FirebaseService {
  constructor() {
    // Simple in-memory cache to prevent duplicate reads
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get from cache or execute query
   */
  async getCachedQuery(cacheKey, queryFunction) {
    const cached = this.queryCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      console.log(`📋 Cache HIT for ${cacheKey} - saved Firebase read`);
      return cached.data;
    }
    
    console.log(`🔍 Cache MISS for ${cacheKey} - executing Firebase query`);
    const data = await queryFunction();
    this.queryCache.set(cacheKey, { data, timestamp: now });
    
    return data;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.queryCache.clear();
    console.log('🗑️ Firebase query cache cleared');
  }

  // Activities
  async saveActivity(activityId, activityData, streams = null) {
    try {
      // Calculate enhanced activity metrics from streams if available
      const enhancedData = { ...activityData };
      
      if (streams) {
        const activityMetrics = this.calculateActivityMetrics(streams);
        Object.assign(enhancedData, activityMetrics);
        console.log(`Enhanced activity ${activityId} with streams:`, {
          hasHeartRate: !!streams.heartrate,
          hasCadence: !!streams.cadence,
          hasAltitude: !!streams.altitude,
          calculatedMetrics: Object.keys(activityMetrics)
        });
      }
      
      await setDoc(doc(db, 'activities', activityId.toString()), {
        ...enhancedData,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error saving activity:', error);
      if (error.code === 'resource-exhausted') {
        console.error('🚨 Firebase quota exceeded! Consider upgrading your Firebase plan.');
        throw new Error('Firebase quota exceeded. Please check your Firebase console and consider upgrading your plan.');
      }
      throw error;
    }
  }
  
  // Calculate activity-level metrics from streams
  calculateActivityMetrics(streams) {
    const metrics = {};
    
    // Heart rate metrics
    if (streams.heartrate?.data) {
      const hrData = streams.heartrate.data.filter(hr => hr && hr > 0);
      if (hrData.length > 0) {
        metrics.average_heartrate = Math.round(hrData.reduce((sum, hr) => sum + hr, 0) / hrData.length);
        metrics.max_heartrate = Math.max(...hrData);
      }
    }
    
    // Cadence metrics
    if (streams.cadence?.data) {
      const cadenceData = streams.cadence.data.filter(cad => cad && cad > 0);
      if (cadenceData.length > 0) {
        metrics.average_cadence = Math.round(cadenceData.reduce((sum, cad) => sum + cad, 0) / cadenceData.length);
      }
    }
    
    // Elevation metrics
    if (streams.altitude?.data) {
      const altData = streams.altitude.data.filter(alt => alt !== null && alt !== undefined);
      if (altData.length > 1) {
        let totalElevationGain = 0;
        for (let i = 1; i < altData.length; i++) {
          const gain = altData[i] - altData[i - 1];
          if (gain > 0) {
            totalElevationGain += gain;
          }
        }
        metrics.total_elevation_gain_calculated = Math.round(totalElevationGain);
        metrics.start_elevation = Math.round(altData[0]);
        metrics.end_elevation = Math.round(altData[altData.length - 1]);
      }
    }
    
    return metrics;
  }

  async getActivity(activityId) {
    try {
      const docSnap = await getDoc(doc(db, 'activities', activityId.toString()));
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data();
      const activity = { ...data };
      
      // Handle heart rate field naming inconsistency
      if (data.average_heartrate && !data.averageHeartRate) {
        activity.averageHeartRate = data.average_heartrate;
      }
      if (data.max_heartrate && !data.maxHeartRate) {
        activity.maxHeartRate = data.max_heartrate;
      }
      if (data.average_cadence && !data.averageCadence) {
        activity.averageCadence = data.average_cadence;
      }
      
      return activity;
    } catch (error) {
      console.error('Error getting activity:', error);
      throw error;
    }
  }

  async getActivities(timeFilter = 'all-time', customDateFrom = null, customDateTo = null) {
    try {
      // Create cache key for activities
      const cacheKey = `activities_${timeFilter}_${customDateFrom}_${customDateTo}`;
      
      const querySnapshot = await this.getCachedQuery(cacheKey, async () => {
        return await getDocs(
          query(collection(db, 'activities'), orderBy('start_date', 'desc'))
        );
      });
      
      let activities = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const activity = { id: doc.id, ...data };
        
        // Handle heart rate field naming inconsistency
        if (data.average_heartrate && !data.averageHeartRate) {
          activity.averageHeartRate = data.average_heartrate;
        }
        if (data.max_heartrate && !data.maxHeartRate) {
          activity.maxHeartRate = data.max_heartrate;
        }
        if (data.average_cadence && !data.averageCadence) {
          activity.averageCadence = data.average_cadence;
        }
        
        return activity;
      });

      // Apply date filters in memory
      if (timeFilter !== 'all-time') {
        let startDate, endDate;
        
        if (timeFilter === 'custom' && customDateFrom && customDateTo) {
          startDate = new Date(customDateFrom);
          endDate = new Date(customDateTo);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = this.getDateFromFilter(timeFilter);
          endDate = new Date();
        }
        
        activities = activities.filter(activity => {
          const activityDate = new Date(activity.start_date);
          return activityDate >= startDate && activityDate <= endDate;
        });
      }

      return activities;
    } catch (error) {
      console.error('Error getting activities:', error);
      throw error;
    }
  }

  // Segments
  async saveSegment(segmentData) {
    try {
      const segmentId = `${segmentData.activityId}_${segmentData.distance}_${segmentData.startTime}`;
      await setDoc(doc(db, 'segments', segmentId), {
        ...segmentData,
        lastUpdated: new Date()
      });
      
      // Check and update PB for this distance
      await this.updatePersonalBestIfNeeded(segmentData);
    } catch (error) {
      console.error('Error saving segment:', error);
      if (error.code === 'resource-exhausted') {
        console.error('🚨 Firebase quota exceeded during segment save!');
        throw new Error('Firebase quota exceeded. Segment processing stopped.');
      }
      throw error;
    }
  }

  async updatePersonalBestIfNeeded(segmentData) {
    try {
      // Query for the current PB for this distance
      const pbQuery = query(
        collection(db, 'segments'),
        where('distance', '==', segmentData.distance),
        orderBy('time', 'asc'),
        limit(1)
      );
      
      const pbSnapshot = await getDocs(pbQuery);
      
      // If no PB exists yet, this segment is the first one for this distance
      if (pbSnapshot.empty) {
        console.log(`First segment for ${segmentData.distance} - automatically a PB`);
        return;
      }
      
      const currentPB = pbSnapshot.docs[0].data();
      
      // Check if this segment is faster than the current PB
      if (segmentData.time < currentPB.time) {
        console.log(`New PB for ${segmentData.distance}! Time: ${segmentData.time}s (previous: ${currentPB.time}s)`);
        // The segment is already saved, and will be picked up as the new PB in queries
      }
    } catch (error) {
      console.error('Error checking/updating PB:', error);
      // Don't throw here - we still want the segment to be saved even if PB check fails
    }
  }

  async getPersonalBests(distance, timeFilter, customDateFrom, customDateTo) {
    try {
      // Handle custom distance parsing
      let queryDistance = distance;
      if (distance && !['100m', '200m', '400m', '800m', '1K', '1.5K', '2K', '3K', '5K', '10K', '15K', '21.1K', '42.2K'].includes(distance)) {
        const parsed = this.parseCustomDistance(distance);
        if (parsed) {
          queryDistance = parsed.name;
        } else {
          return []; // Invalid custom distance
        }
      }

      // Create cache key
      const cacheKey = `segments_${queryDistance}_${timeFilter}_${customDateFrom}_${customDateTo}`;
      
      // Use cached query to prevent duplicate Firebase reads
      const querySnapshot = await this.getCachedQuery(cacheKey, async () => {
        const q = query(
          collection(db, 'segments'),
          where('distance', '==', queryDistance)
        );
        return await getDocs(q);
      });
      
      // Convert to array and apply date filters in memory
      let allSegments = querySnapshot.docs.map(doc => ({
        doc: doc,
        data: doc.data()
      }));

      // Apply date filters
      if (timeFilter !== 'all-time') {
        let startDate, endDate;
        
        if (timeFilter === 'custom' && customDateFrom && customDateTo) {
          startDate = new Date(customDateFrom);
          endDate = new Date(customDateTo);
          endDate.setHours(23, 59, 59, 999); // Include the entire end date
        } else {
          startDate = this.getDateFromFilter(timeFilter);
          endDate = new Date(); // Today
        }
        
        allSegments = allSegments.filter(segment => {
          const segmentDate = segment.data.date?.toDate ? segment.data.date.toDate() : new Date(segment.data.date);
          return segmentDate >= startDate && segmentDate <= endDate;
        });
      }
      
      // Sort by time
      allSegments.sort((a, b) => a.data.time - b.data.time);
      
      // Filter out overlapping segments from the same activity
      const nonOverlappingSegments = [];
      const usedRanges = new Map(); // activityId -> array of used ranges
      
      for (const segment of allSegments) {
        const activityId = segment.data.activityId;
        const segmentStart = segment.data.segmentStart || 0;
        const segmentEnd = segment.data.segmentEnd || segment.data.distanceMeters;
        
        // Check if this segment overlaps with any already selected from the same activity
        if (!usedRanges.has(activityId)) {
          usedRanges.set(activityId, []);
        }
        
        const activityRanges = usedRanges.get(activityId);
        let overlaps = false;
        
        for (const range of activityRanges) {
          if (segmentStart < range.end && segmentEnd > range.start) {
            overlaps = true;
            break;
          }
        }
        
        if (!overlaps) {
          nonOverlappingSegments.push(segment);
          activityRanges.push({ start: segmentStart, end: segmentEnd });
          
          // Stop if we have 10 segments
          if (nonOverlappingSegments.length >= 10) {
            break;
          }
        }
      }
      
      const topSegments = nonOverlappingSegments;
      let results = await Promise.all(topSegments.map(async (segment, index) => {
        const doc = segment.doc;
        const data = segment.data;
        
        // Get the full run distance from the activity if not in segment
        let fullDistance = data.fullRunDistance || data.totalDistance;
        
        // If we don't have the full distance, fetch it from the activity
        if (!fullDistance && data.activityId) {
          try {
            const activity = await this.getActivity(data.activityId);
            if (activity && activity.distance) {
              fullDistance = `${Math.round(activity.distance / 1000 * 100) / 100}K`;
            }
          } catch (err) {
            console.error('Error fetching activity for distance:', err);
          }
        }
        
        // Format segment range
        let segmentRange = 'Full Run';
        if (data.segmentStart !== undefined && data.segmentEnd !== undefined) {
          const startKm = (data.segmentStart / 1000).toFixed(2);
          const endKm = (data.segmentEnd / 1000).toFixed(2);
          segmentRange = `${startKm}km - ${endKm}km`;
        }
        
        // Map underscore field names to camelCase for frontend consistency
        const result = {
          rank: index + 1,
          id: doc.id,
          time: data.time,
          pace: data.pace,
          date: data.date,
          runName: data.activityName || 'Unknown Run',
          segment: segmentRange,
          fullRunDistance: fullDistance || 'N/A',
          ...data
        };
        
        // Handle heart rate field naming inconsistency
        if (data.average_heartrate && !data.averageHeartRate) {
          result.averageHeartRate = data.average_heartrate;
        }
        if (data.max_heartrate && !data.maxHeartRate) {
          result.maxHeartRate = data.max_heartrate;
        }
        if (data.average_cadence && !data.averageCadence) {
          result.averageCadence = data.average_cadence;
        }
        
        return result;
      }));

      // If no results found for custom distance, try to create segments from existing activities
      if (results.length === 0 && queryDistance !== distance) {
        const parsed = this.parseCustomDistance(distance);
        if (parsed) {
          const activities = await this.getActivities();
          const runningActivities = activities.filter(activity => 
            activity.type && ['Run', 'TrailRun'].includes(activity.type) && 
            activity.distance >= parsed.meters
          );

          for (const activity of runningActivities) {
            await this.createCustomSegment(activity, distance);
          }

          // Re-query for the newly created segments
          const newQuery = query(
            collection(db, 'segments'),
            where('distance', '==', queryDistance)
          );
          const newQuerySnapshot = await getDocs(newQuery);
          results = await Promise.all(newQuerySnapshot.docs.map(async (doc, index) => {
            const data = doc.data();
            
            // Get the full run distance from the activity if not in segment
            let fullDistance = data.fullRunDistance || data.totalDistance;
            
            // If we don't have the full distance, fetch it from the activity
            if (!fullDistance && data.activityId) {
              try {
                const activity = await this.getActivity(data.activityId);
                if (activity && activity.distance) {
                  fullDistance = `${Math.round(activity.distance / 1000 * 100) / 100}K`;
                }
              } catch (err) {
                console.error('Error fetching activity for distance:', err);
              }
            }
            
            // Map underscore field names to camelCase for frontend consistency
            const result = {
              rank: index + 1,
              id: doc.id,
              time: data.time,
              pace: data.pace,
              date: data.date,
              runName: data.activityName || 'Unknown Run',
              fullRunDistance: fullDistance || 'N/A',
              ...data
            };
            
            // Handle heart rate field naming inconsistency
            if (data.average_heartrate && !data.averageHeartRate) {
              result.averageHeartRate = data.average_heartrate;
            }
            if (data.max_heartrate && !data.maxHeartRate) {
              result.maxHeartRate = data.max_heartrate;
            }
            if (data.average_cadence && !data.averageCadence) {
              result.averageCadence = data.average_cadence;
            }
            
            return result;
          }));
        }
      }

      // Format times based on whether the 10th fastest is under an hour
      const shouldShowHours = results.length > 0 && results[Math.min(9, results.length - 1)].time >= 3600;
      
      return results.map(result => ({
        ...result,
        time: this.formatTime(result.time, shouldShowHours)
      }));
    } catch (error) {
      console.error('Error getting personal bests:', error);
      throw error;
    }
  }

  async getProgressionData(distance, timeFilter, customDateFrom, customDateTo) {
    try {
      // Handle custom distance parsing
      let queryDistance = distance;
      if (distance && !['100m', '200m', '400m', '800m', '1K', '1.5K', '2K', '3K', '5K', '10K', '15K', '21.1K', '42.2K'].includes(distance)) {
        const parsed = this.parseCustomDistance(distance);
        if (parsed) {
          queryDistance = parsed.name;
        } else {
          return []; // Invalid custom distance
        }
      }

      // Get all segments for the distance
      const q = query(
        collection(db, 'segments'),
        where('distance', '==', queryDistance)
      );

      const querySnapshot = await getDocs(q);
      
      // Convert to array for filtering
      let allResults = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply date filters in memory
      if (timeFilter !== 'all-time') {
        let startDate, endDate;
        
        if (timeFilter === 'custom' && customDateFrom && customDateTo) {
          startDate = new Date(customDateFrom);
          endDate = new Date(customDateTo);
          endDate.setHours(23, 59, 59, 999); // Include the entire end date
        } else {
          startDate = this.getDateFromFilter(timeFilter);
          endDate = new Date(); // Today
        }
        
        allResults = allResults.filter(result => {
          const resultDate = result.date?.toDate ? result.date.toDate() : new Date(result.date);
          return resultDate >= startDate && resultDate <= endDate;
        });
      }
      
      // Sort by date ascending for progression tracking
      allResults.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
      });

      // If no results found for custom distance, try to create segments from existing activities
      if (allResults.length === 0 && queryDistance !== distance) {
        const parsed = this.parseCustomDistance(distance);
        if (parsed) {
          const activities = await this.getActivities();
          const runningActivities = activities.filter(activity => 
            activity.type && ['Run', 'TrailRun'].includes(activity.type) && 
            activity.distance >= parsed.meters
          );

          for (const activity of runningActivities) {
            await this.createCustomSegment(activity, distance);
          }

          // Re-query for the newly created segments
          const newQuery = query(
            collection(db, 'segments'),
            where('distance', '==', queryDistance)
          );
          const newQuerySnapshot = await getDocs(newQuery);
          return newQuerySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }
      }

      // Track personal best progression over time
      const progressionData = [];
      let bestTime = Infinity;

      allResults.forEach(result => {
        if (result.time < bestTime) {
          bestTime = result.time;
          progressionData.push({
            time: result.time,
            date: result.date,
            activityName: result.activityName,
            id: result.id,
            pace: result.pace
          });
        }
      });

      return progressionData;
    } catch (error) {
      console.error('Error getting progression data:', error);
      throw error;
    }
  }

  formatTime(seconds, forceHours = false) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (forceHours || hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  getDateFromFilter(filter) {
    const now = new Date();
    switch (filter) {
      case 'this-year':
        return new Date(now.getFullYear(), 0, 1);
      case 'last-12-months':
        return new Date(now.setMonth(now.getMonth() - 12));
      case 'last-6-months':
        return new Date(now.setMonth(now.getMonth() - 6));
      case 'last-3-months':
        return new Date(now.setMonth(now.getMonth() - 3));
      default:
        return new Date(0);
    }
  }

  // Segment processing methods
  async processActivityForSegments(activity, streams = null) {
    try {
      // Only process running activities
      if (!activity.type || !['Run', 'TrailRun'].includes(activity.type)) {
        return;
      }

      // Use streams if available, otherwise fall back to basic extraction
      const segments = streams 
        ? await this.findBestSegmentsFromStreams(activity, streams)
        : this.extractSegmentsFromActivity(activity);
      
      // Save each segment
      for (const segment of segments) {
        await this.saveSegment(segment);
      }
    } catch (error) {
      console.error('Error processing activity for segments:', error);
    }
  }

  parseCustomDistance(distanceString) {
    if (!distanceString) return null;
    
    const trimmed = distanceString.trim().toLowerCase();
    
    // Handle patterns like "5K", "10k"
    if (trimmed.endsWith('k')) {
      const num = parseFloat(trimmed.slice(0, -1));
      return isNaN(num) ? null : { name: trimmed.toUpperCase(), meters: num * 1000 };
    }
    
    // Handle patterns like "5000m", "3000M"
    if (trimmed.endsWith('m')) {
      const num = parseFloat(trimmed.slice(0, -1));
      return isNaN(num) ? null : { name: trimmed, meters: num };
    }
    
    // Handle just numbers (assume meters)
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return { name: `${num}m`, meters: num };
    }
    
    return null;
  }

  extractSegmentsFromActivity(activity) {
    const segments = [];
    const activityDate = new Date(activity.start_date);
    const distance = activity.distance; // in meters
    const time = activity.moving_time; // in seconds
    
    // Define common distances to track (in meters)
    const distances = [
      { name: '100m', meters: 100 },
      { name: '200m', meters: 200 },
      { name: '400m', meters: 400 },
      { name: '800m', meters: 800 },
      { name: '1K', meters: 1000 },
      { name: '1.5K', meters: 1500 },
      { name: '2K', meters: 2000 },
      { name: '3K', meters: 3000 },
      { name: '4K', meters: 4000 },
      { name: '5K', meters: 5000 },
      { name: '6K', meters: 6000 },
      { name: '7K', meters: 7000 },
      { name: '8K', meters: 8000 },
      { name: '9K', meters: 9000 },
      { name: '10K', meters: 10000 },
      { name: '11K', meters: 11000 },
      { name: '12K', meters: 12000 },
      { name: '13K', meters: 13000 },
      { name: '14K', meters: 14000 },
      { name: '15K', meters: 15000 },
      { name: '16K', meters: 16000 },
      { name: '17K', meters: 17000 },
      { name: '18K', meters: 18000 },
      { name: '19K', meters: 19000 },
      { name: '20K', meters: 20000 },
      { name: '21.1K', meters: 21097.5 }, // Half marathon
      { name: '25K', meters: 25000 },
      { name: '30K', meters: 30000 },
      { name: '35K', meters: 35000 },
      { name: '40K', meters: 40000 },
      { name: '42.2K', meters: 42195 }    // Marathon
    ];

    // For each distance, check if the activity is long enough
    distances.forEach(distanceObj => {
      if (distance >= distanceObj.meters) {
        // Calculate estimated time for this distance (simple linear estimation)
        const estimatedTime = (time * distanceObj.meters) / distance;
        
        // Create segment with basic data
        const segment = {
          activityId: activity.id,
          activityName: activity.name,
          distance: distanceObj.name,
          distanceMeters: distanceObj.meters,
          time: Math.round(estimatedTime),
          pace: this.calculatePace(estimatedTime, distanceObj.meters),
          date: activityDate,
          startTime: activity.start_date,
          averageSpeed: distanceObj.meters / estimatedTime, // m/s
          fullRunDistance: `${Math.round(distance / 1000 * 100) / 100}K`,
          fullRunTime: time,
          createdAt: new Date(),
          // Add placeholder for segment bounds - will be updated when we have GPS data
          segmentStart: 0,
          segmentEnd: distanceObj.meters
        };

        // Inherit heart rate data from parent activity if available
        if (activity.average_heartrate || activity.averageHeartRate) {
          segment.average_heartrate = activity.average_heartrate || activity.averageHeartRate;
        }
        if (activity.max_heartrate || activity.maxHeartRate) {
          segment.max_heartrate = activity.max_heartrate || activity.maxHeartRate;
        }
        if (activity.average_cadence || activity.averageCadence) {
          segment.average_cadence = activity.average_cadence || activity.averageCadence;
        }

        segments.push(segment);
      }
    });

    return segments;
  }

  // New method to find best segments using GPS streams
  async findBestSegmentsFromStreams(activity, streams) {
    if (!streams || !streams.distance || !streams.time) {
      return this.extractSegmentsFromActivity(activity);
    }

    const segments = [];
    const activityDate = new Date(activity.start_date);
    const distanceStream = streams.distance.data;
    const timeStream = streams.time.data;
    
    // Extract additional stream data if available
    const heartRateStream = streams.heartrate?.data || null;
    const cadenceStream = streams.cadence?.data || null;
    const altitudeStream = streams.altitude?.data || null;
    
    // Define common distances to track (in meters)
    const distances = [
      { name: '100m', meters: 100 },
      { name: '200m', meters: 200 },
      { name: '400m', meters: 400 },
      { name: '800m', meters: 800 },
      { name: '1K', meters: 1000 },
      { name: '1.5K', meters: 1500 },
      { name: '2K', meters: 2000 },
      { name: '3K', meters: 3000 },
      { name: '4K', meters: 4000 },
      { name: '5K', meters: 5000 },
      { name: '6K', meters: 6000 },
      { name: '7K', meters: 7000 },
      { name: '8K', meters: 8000 },
      { name: '9K', meters: 9000 },
      { name: '10K', meters: 10000 },
      { name: '11K', meters: 11000 },
      { name: '12K', meters: 12000 },
      { name: '13K', meters: 13000 },
      { name: '14K', meters: 14000 },
      { name: '15K', meters: 15000 },
      { name: '16K', meters: 16000 },
      { name: '17K', meters: 17000 },
      { name: '18K', meters: 18000 },
      { name: '19K', meters: 19000 },
      { name: '20K', meters: 20000 },
      { name: '21.1K', meters: 21097.5 }, // Half marathon
      { name: '25K', meters: 25000 },
      { name: '30K', meters: 30000 },
      { name: '35K', meters: 35000 },
      { name: '40K', meters: 40000 },
      { name: '42.2K', meters: 42195 }    // Marathon
    ];

    // For each distance, find the fastest segment
    distances.forEach(distanceObj => {
      if (activity.distance >= distanceObj.meters) {
        const bestSegment = this.findFastestSegment(
          distanceStream, 
          timeStream, 
          distanceObj.meters
        );
        
        if (bestSegment) {
          // Calculate additional metrics from streams
          const segmentMetrics = this.calculateSegmentMetrics(
            bestSegment,
            heartRateStream,
            cadenceStream,
            altitudeStream
          );
          
          segments.push({
            activityId: activity.id,
            activityName: activity.name,
            distance: distanceObj.name,
            distanceMeters: distanceObj.meters,
            time: Math.round(bestSegment.time),
            pace: this.calculatePace(bestSegment.time, distanceObj.meters),
            date: activityDate,
            startTime: activity.start_date,
            averageSpeed: distanceObj.meters / bestSegment.time, // m/s
            fullRunDistance: `${Math.round(activity.distance / 1000 * 100) / 100}K`,
            fullRunTime: activity.moving_time,
            createdAt: new Date(),
            segmentStart: bestSegment.startDistance,
            segmentEnd: bestSegment.endDistance,
            // Enhanced metrics from streams
            ...segmentMetrics
          });
        }
      }
    });

    return segments;
  }

  // Calculate enhanced metrics for a segment from stream data
  calculateSegmentMetrics(segment, heartRateStream, cadenceStream, altitudeStream) {
    const metrics = {};
    
    if (heartRateStream && segment.startIndex !== undefined && segment.endIndex !== undefined) {
      const hrSlice = heartRateStream.slice(segment.startIndex, segment.endIndex + 1);
      const validHR = hrSlice.filter(hr => hr && hr > 0);
      
      if (validHR.length > 0) {
        metrics.averageHeartRate = Math.round(validHR.reduce((sum, hr) => sum + hr, 0) / validHR.length);
        metrics.maxHeartRate = Math.max(...validHR);
      }
    }
    
    if (cadenceStream && segment.startIndex !== undefined && segment.endIndex !== undefined) {
      const cadenceSlice = cadenceStream.slice(segment.startIndex, segment.endIndex + 1);
      const validCadence = cadenceSlice.filter(cad => cad && cad > 0);
      
      if (validCadence.length > 0) {
        metrics.averageCadence = Math.round(validCadence.reduce((sum, cad) => sum + cad, 0) / validCadence.length);
      }
    }
    
    if (altitudeStream && segment.startIndex !== undefined && segment.endIndex !== undefined) {
      const altSlice = altitudeStream.slice(segment.startIndex, segment.endIndex + 1);
      const validAltitude = altSlice.filter(alt => alt !== null && alt !== undefined);
      
      if (validAltitude.length > 1) {
        // Calculate elevation gain during the segment
        let elevationGain = 0;
        for (let i = 1; i < validAltitude.length; i++) {
          const gain = validAltitude[i] - validAltitude[i - 1];
          if (gain > 0) {
            elevationGain += gain;
          }
        }
        metrics.elevationGain = Math.round(elevationGain);
        
        // Also store start and end elevation
        metrics.startElevation = Math.round(validAltitude[0]);
        metrics.endElevation = Math.round(validAltitude[validAltitude.length - 1]);
      }
    }
    
    return metrics;
  }

  // Sliding window algorithm to find fastest segment
  findFastestSegment(distanceStream, timeStream, targetDistance) {
    let bestTime = Infinity;
    let bestSegment = null;
    
    for (let i = 0; i < distanceStream.length; i++) {
      // Find the end point for this segment
      const startDistance = distanceStream[i];
      const targetEndDistance = startDistance + targetDistance;
      
      // Binary search or linear search for the end point
      let j = i + 1;
      while (j < distanceStream.length && distanceStream[j] < targetEndDistance) {
        j++;
      }
      
      // If we found a valid segment
      if (j < distanceStream.length) {
        // Interpolate if needed for exact distance
        const segmentTime = timeStream[j] - timeStream[i];
        
        if (segmentTime < bestTime) {
          bestTime = segmentTime;
          bestSegment = {
            time: segmentTime,
            startDistance: startDistance,
            endDistance: distanceStream[j],
            startIndex: i,
            endIndex: j
          };
        }
      }
    }
    
    return bestSegment;
  }

  // Method to create segment for any custom distance
  async createCustomSegment(activity, customDistanceString) {
    const parsed = this.parseCustomDistance(customDistanceString);
    if (!parsed || activity.distance < parsed.meters) {
      return null;
    }

    const activityDate = new Date(activity.start_date);
    const distance = activity.distance;
    const time = activity.moving_time;
    const estimatedTime = (time * parsed.meters) / distance;

    const segment = {
      activityId: activity.id,
      activityName: activity.name,
      distance: parsed.name,
      distanceMeters: parsed.meters,
      time: Math.round(estimatedTime),
      pace: this.calculatePace(estimatedTime, parsed.meters),
      date: activityDate,
      startTime: activity.start_date,
      averageSpeed: parsed.meters / estimatedTime,
      fullRunDistance: `${Math.round(distance / 1000 * 100) / 100}K`,
      fullRunTime: time,
      createdAt: new Date()
    };

    await this.saveSegment(segment);
    return segment;
  }

  calculatePace(timeSeconds, distanceMeters) {
    // Calculate pace in minutes per kilometer
    const pacePerKm = (timeSeconds / 60) / (distanceMeters / 1000);
    const minutes = Math.floor(pacePerKm);
    const seconds = Math.round((pacePerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Enhanced activity saving with segment processing
  async saveActivityWithSegments(activityId, activityData) {
    try {
      // Save the activity
      await this.saveActivity(activityId, activityData);
      
      // Process segments
      await this.processActivityForSegments(activityData);
    } catch (error) {
      console.error('Error saving activity with segments:', error);
      throw error;
    }
  }

  // Check if activity already exists to avoid reprocessing
  async activityExists(activityId) {
    try {
      const activity = await this.getActivity(activityId);
      return activity !== null;
    } catch (error) {
      console.error('Error checking if activity exists:', error);
      return false;
    }
  }

  // Reprocess all activities to ensure all distance segments exist
  async reprocessAllActivitiesForSegments() {
    try {
      console.log('Reprocessing all activities for segments...');
      const activities = await this.getActivities();
      const runningActivities = activities.filter(activity => 
        ['Run', 'TrailRun'].includes(activity.type)
      );

      let processed = 0;
      for (const activity of runningActivities) {
        await this.processActivityForSegments(activity);
        processed++;
        console.log(`Processed ${processed}/${runningActivities.length} activities`);
      }

      console.log('Finished reprocessing activities');
      return processed;
    } catch (error) {
      console.error('Error reprocessing activities:', error);
      throw error;
    }
  }

  // Generate segments for a specific distance across all activities
  async generateSegmentsForDistance(distanceMeters) {
    try {
      console.log(`Generating segments for ${distanceMeters}m distance...`);
      const activities = await this.getActivities();
      const runningActivities = activities.filter(activity => 
        ['Run', 'TrailRun'].includes(activity.type) && activity.distance >= distanceMeters
      );

      const distanceLabel = distanceMeters >= 1000 ? `${distanceMeters / 1000}K` : `${distanceMeters}m`;
      
      for (const activity of runningActivities) {
        const activityDate = new Date(activity.start_date);
        const distance = activity.distance;
        const time = activity.moving_time;
        const estimatedTime = (time * distanceMeters) / distance;

        const segment = {
          activityId: activity.id,
          activityName: activity.name,
          distance: distanceLabel,
          distanceMeters: distanceMeters,
          time: Math.round(estimatedTime),
          pace: this.calculatePace(estimatedTime, distanceMeters),
          date: activityDate,
          startTime: activity.start_date,
          averageSpeed: distanceMeters / estimatedTime,
          fullRunDistance: `${Math.round(distance / 1000 * 100) / 100}K`,
          fullRunTime: time,
          createdAt: new Date()
        };

        await this.saveSegment(segment);
      }

      console.log(`Generated segments for ${runningActivities.length} activities`);
      return runningActivities.length;
    } catch (error) {
      console.error('Error generating segments for distance:', error);
      throw error;
    }
  }

  // Ensure all distances have PBs calculated from existing segments
  async ensureAllDistancesHavePBs() {
    try {
      console.log('Checking and updating PBs for all distances...');
      
      // Get all unique distances from segments
      const segmentsSnapshot = await getDocs(collection(db, 'segments'));
      const distanceMap = new Map();
      
      segmentsSnapshot.forEach(doc => {
        const segment = doc.data();
        if (!distanceMap.has(segment.distance)) {
          distanceMap.set(segment.distance, []);
        }
        distanceMap.get(segment.distance).push(segment);
      });
      
      console.log(`Found ${distanceMap.size} unique distances with segments`);
      
      // For each distance, ensure PB is identified
      for (const [distance, segments] of distanceMap) {
        // Sort segments by time to find the fastest
        const sortedSegments = segments.sort((a, b) => a.time - b.time);
        const fastestSegment = sortedSegments[0];
        
        console.log(`Distance ${distance}: PB is ${fastestSegment.time}s from ${new Date(fastestSegment.date).toLocaleDateString()}`);
      }
      
      return { distancesChecked: distanceMap.size };
    } catch (error) {
      console.error('Error ensuring all distances have PBs:', error);
      throw error;
    }
  }

  // Prediction-related methods
  
  /**
   * Get comprehensive data for race predictions
   */
  async getPredictionData(weeksBack = 16) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));

      // Get all activities and segments from the time period
      const activities = await this.getActivities();
      const recentActivities = activities.filter(activity => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= cutoffDate && activity.type && ['Run', 'TrailRun'].includes(activity.type);
      });

      // Get race performances (longer efforts that could be used for prediction)
      const raceActivities = recentActivities.filter(activity => {
        return activity.distance >= 3000 && // At least 3K
               activity.moving_time >= 600;   // At least 10 minutes
      });

      // Get personal bests that could serve as race times
      const personalBests = await this.getAllPersonalBests(weeksBack);
      
      // Combine race activities and PBs into race performances
      const recentRaces = [];
      
      // Add race activities
      raceActivities.forEach(activity => {
        recentRaces.push({
          activityId: activity.id,
          date: activity.start_date,
          distanceMeters: activity.distance,
          time: activity.moving_time,
          pace: activity.moving_time / (activity.distance / 1000),
          type: 'activity',
          name: activity.name,
          averageHeartRate: activity.averageHeartRate || activity.average_heartrate,
          elevationGain: activity.total_elevation_gain_calculated || activity.total_elevation_gain
        });
      });

      // Add personal best segments as race equivalents
      personalBests.forEach(pb => {
        recentRaces.push({
          activityId: pb.activityId,
          date: pb.date,
          distanceMeters: pb.distanceMeters,
          time: pb.time,
          pace: pb.pace,
          type: 'segment',
          name: `${pb.distance} PB from ${pb.activityName}`,
          averageHeartRate: pb.averageHeartRate,
          elevationGain: pb.elevationGain
        });
      });

      // Sort by date (most recent first) and remove duplicates
      const uniqueRaces = this.deduplicateRaces(recentRaces)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        activities: recentActivities,
        recentRaces: uniqueRaces,
        trainingVolume: this.calculateTrainingVolume(recentActivities),
        consistency: await this.getTrainingConsistency(weeksBack),
        dataRange: {
          startDate: cutoffDate,
          endDate: new Date(),
          weeksBack
        }
      };
    } catch (error) {
      console.error('Error getting prediction data:', error);
      throw error;
    }
  }

  /**
   * Get all personal bests for prediction analysis - OPTIMIZED VERSION
   * This does ONE Firebase query instead of 13+ separate queries
   */
  async getAllPersonalBests(weeksBack = 16) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));

      console.log('🔥 OPTIMIZED: Fetching all segments with single query instead of 13+ separate queries');
      
      // Single query to get ALL segments within date range
      const querySnapshot = await getDocs(
        query(
          collection(db, 'segments'),
          where('date', '>=', cutoffDate),
          orderBy('date', 'desc')
        )
      );
      
      console.log(`📊 Retrieved ${querySnapshot.docs.length} segments with 1 read operation`);
      
      const personalBests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return personalBests;
    } catch (error) {
      console.error('Error getting all personal bests (optimized):', error);
      // Fallback to empty array to prevent cascade failures
      return [];
    }
  }

  /**
   * Remove duplicate race performances
   */
  deduplicateRaces(races) {
    const seen = new Set();
    return races.filter(race => {
      const key = `${race.activityId}-${race.distanceMeters}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate training volume metrics
   */
  calculateTrainingVolume(activities) {
    const now = new Date();
    const volumes = {
      week1: 0,
      week2: 0,
      week3: 0,
      week4: 0,
      total: 0
    };

    activities.forEach(activity => {
      const daysSince = (now - new Date(activity.start_date)) / (1000 * 60 * 60 * 24);
      volumes.total += activity.distance;
      
      if (daysSince <= 7) volumes.week1 += activity.distance;
      else if (daysSince <= 14) volumes.week2 += activity.distance;
      else if (daysSince <= 21) volumes.week3 += activity.distance;
      else if (daysSince <= 28) volumes.week4 += activity.distance;
    });

    return {
      ...volumes,
      weeklyAverage: volumes.total / 4,
      consistency: this.calculateVolumeConsistency([
        volumes.week1, volumes.week2, volumes.week3, volumes.week4
      ])
    };
  }

  /**
   * Calculate volume consistency from weekly volumes
   */
  calculateVolumeConsistency(weeklyVolumes) {
    if (weeklyVolumes.length < 2) return 0;
    
    const mean = weeklyVolumes.reduce((sum, vol) => sum + vol, 0) / weeklyVolumes.length;
    if (mean === 0) return 0;
    
    const variance = weeklyVolumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / weeklyVolumes.length;
    const cv = Math.sqrt(variance) / mean; // Coefficient of variation
    
    return Math.max(0, Math.min(1, 1 - cv)); // Convert to 0-1 scale
  }

  /**
   * Get training consistency metrics
   */
  async getTrainingConsistency(weeksBack = 12) {
    try {
      const activities = await this.getActivities();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));

      const recentActivities = activities.filter(activity => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= cutoffDate && activity.type && ['Run', 'TrailRun'].includes(activity.type);
      });

      // Group activities by week
      const weeklyData = {};
      recentActivities.forEach(activity => {
        const week = this.getWeekKey(new Date(activity.start_date));
        if (!weeklyData[week]) {
          weeklyData[week] = { runs: 0, distance: 0, time: 0 };
        }
        weeklyData[week].runs++;
        weeklyData[week].distance += activity.distance;
        weeklyData[week].time += activity.moving_time;
      });

      const weeks = Object.values(weeklyData);
      
      return {
        averageRunsPerWeek: weeks.reduce((sum, w) => sum + w.runs, 0) / Math.max(1, weeks.length),
        averageDistancePerWeek: weeks.reduce((sum, w) => sum + w.distance, 0) / Math.max(1, weeks.length),
        consistencyScore: this.calculateConsistencyScore(weeks),
        activeWeeks: weeks.length,
        totalWeeks: weeksBack
      };
    } catch (error) {
      console.error('Error getting training consistency:', error);
      return {
        averageRunsPerWeek: 0,
        averageDistancePerWeek: 0,
        consistencyScore: 0,
        activeWeeks: 0,
        totalWeeks: weeksBack
      };
    }
  }

  /**
   * Calculate consistency score from weekly training data
   */
  calculateConsistencyScore(weeklyData) {
    if (weeklyData.length < 4) return 0;

    const distances = weeklyData.map(w => w.distance);
    const runs = weeklyData.map(w => w.runs);

    // Calculate coefficient of variation for both distance and run frequency
    const distanceCV = this.coefficientOfVariation(distances);
    const runsCV = this.coefficientOfVariation(runs);

    // Lower CV = higher consistency
    const distanceConsistency = Math.max(0, 1 - distanceCV);
    const runsConsistency = Math.max(0, 1 - runsCV);

    // Weight distance consistency more heavily
    return (distanceConsistency * 0.7 + runsConsistency * 0.3);
  }

  /**
   * Calculate coefficient of variation
   */
  coefficientOfVariation(values) {
    if (values.length === 0) return 1;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    if (mean === 0) return 1;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  /**
   * Get distance-specific experience
   */
  async getDistanceExperience(targetDistance) {
    try {
      const personalBests = await this.getAllPersonalBests(52); // Look back 1 year
      
      // Count experiences at similar distances (50%-150% of target)
      const similarExperiences = personalBests.filter(pb => {
        const ratio = targetDistance / pb.distanceMeters;
        return ratio >= 0.5 && ratio <= 1.5;
      });

      const exactExperiences = personalBests.filter(pb => 
        Math.abs(pb.distanceMeters - targetDistance) < targetDistance * 0.1
      );

      return {
        total: similarExperiences.length,
        exact: exactExperiences.length,
        score: Math.min(1, similarExperiences.length / 5), // Max score at 5+ experiences
        mostRecent: similarExperiences.length > 0 ? 
          Math.max(...similarExperiences.map(pb => new Date(pb.date))) : null
      };
    } catch (error) {
      console.error('Error getting distance experience:', error);
      return { total: 0, exact: 0, score: 0, mostRecent: null };
    }
  }

  /**
   * Get recent form trend analysis
   */
  async getRecentFormTrend(weeksBack = 6) {
    try {
      const activities = await this.getActivities();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));

      const recentActivities = activities.filter(activity => {
        const activityDate = new Date(activity.start_date);
        return activityDate >= cutoffDate && 
               ['Run', 'TrailRun'].includes(activity.type) &&
               activity.distance >= 3000; // Focus on meaningful distances
      });

      if (recentActivities.length < 4) {
        return { trend: 'insufficient_data', score: 0, confidence: 0 };
      }

      // Sort by date and calculate pace trends
      const sortedActivities = recentActivities
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

      const paces = sortedActivities.map(activity => 
        activity.moving_time / (activity.distance / 1000) // seconds per km
      );

      // Calculate trend using linear regression
      const trend = this.calculateTrend(paces);
      
      return {
        trend: trend.slope < -1 ? 'improving' : trend.slope > 1 ? 'declining' : 'stable',
        score: -trend.slope / 10, // Negative slope = improvement
        confidence: trend.r2,
        paceChange: trend.slope,
        sampleSize: paces.length
      };
    } catch (error) {
      console.error('Error getting recent form trend:', error);
      return { trend: 'unknown', score: 0, confidence: 0 };
    }
  }

  /**
   * Calculate linear trend from data points
   */
  calculateTrend(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, r2: 0 };

    const x = values.map((_, i) => i);
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = values.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denominator = 0;
    let ssTotal = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = values[i] - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
      ssTotal += yDiff * yDiff;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Calculate R²
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i] + intercept;
      ssRes += Math.pow(values[i] - predicted, 2);
    }

    const r2 = ssTotal === 0 ? 0 : 1 - (ssRes / ssTotal);

    return { slope, intercept, r2: Math.max(0, r2) };
  }

  /**
   * Get week key for grouping activities
   */
  getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.floor((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week}`;
  }
}

const firebaseService = new FirebaseService();
export default firebaseService;