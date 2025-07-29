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
  orderBy
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
  // Activities
  async saveActivity(activityId, activityData) {
    try {
      await setDoc(doc(db, 'activities', activityId.toString()), {
        ...activityData,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  }

  async getActivity(activityId) {
    try {
      const docSnap = await getDoc(doc(db, 'activities', activityId.toString()));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error getting activity:', error);
      throw error;
    }
  }

  async getActivities() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'activities'), orderBy('start_date', 'desc'))
      );
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    } catch (error) {
      console.error('Error saving segment:', error);
      throw error;
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

      // Get all segments for the distance
      const q = query(
        collection(db, 'segments'),
        where('distance', '==', queryDistance)
      );

      const querySnapshot = await getDocs(q);
      
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
        
        return {
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
      }));

      // If no results found for custom distance, try to create segments from existing activities
      if (results.length === 0 && queryDistance !== distance) {
        const parsed = this.parseCustomDistance(distance);
        if (parsed) {
          const activities = await this.getActivities();
          const runningActivities = activities.filter(activity => 
            ['Run', 'TrailRun'].includes(activity.type) && 
            activity.distance >= parsed.meters
          );

          for (const activity of runningActivities) {
            await this.createCustomSegment(activity, distance);
          }

          // Re-query for the newly created segments
          const newQuerySnapshot = await getDocs(q);
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
            
            return {
              rank: index + 1,
              id: doc.id,
              time: data.time,
              pace: data.pace,
              date: data.date,
              runName: data.activityName || 'Unknown Run',
              fullRunDistance: fullDistance || 'N/A',
              ...data
            };
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
            ['Run', 'TrailRun'].includes(activity.type) && 
            activity.distance >= parsed.meters
          );

          for (const activity of runningActivities) {
            await this.createCustomSegment(activity, distance);
          }

          // Re-query for the newly created segments
          const newQuerySnapshot = await getDocs(q);
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
      if (!['Run', 'TrailRun'].includes(activity.type)) {
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
      { name: '5K', meters: 5000 },
      { name: '10K', meters: 10000 },
      { name: '15K', meters: 15000 },
      { name: '21.1K', meters: 21097.5 }, // Half marathon
      { name: '42.2K', meters: 42195 }    // Marathon
    ];

    // For each distance, check if the activity is long enough
    distances.forEach(distanceObj => {
      if (distance >= distanceObj.meters) {
        // Calculate estimated time for this distance (simple linear estimation)
        const estimatedTime = (time * distanceObj.meters) / distance;
        
        segments.push({
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
        });
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
      { name: '5K', meters: 5000 },
      { name: '10K', meters: 10000 },
      { name: '15K', meters: 15000 },
      { name: '21.1K', meters: 21097.5 }, // Half marathon
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
            segmentEnd: bestSegment.endDistance
          });
        }
      }
    });

    return segments;
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
}

const firebaseService = new FirebaseService();
export default firebaseService;