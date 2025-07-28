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

      let q = query(
        collection(db, 'segments'),
        where('distance', '==', queryDistance),
        orderBy('time', 'asc'),
        limit(10)
      );

      // Add date filters
      if (timeFilter !== 'all-time' && timeFilter !== 'custom') {
        const startDate = this.getDateFromFilter(timeFilter);
        q = query(
          collection(db, 'segments'),
          where('distance', '==', queryDistance),
          where('date', '>=', startDate),
          orderBy('time', 'asc'),
          limit(10)
        );
      } else if (timeFilter === 'custom' && customDateFrom && customDateTo) {
        q = query(
          collection(db, 'segments'),
          where('distance', '==', queryDistance),
          where('date', '>=', new Date(customDateFrom)),
          where('date', '<=', new Date(customDateTo)),
          orderBy('time', 'asc'),
          limit(10)
        );
      }

      const querySnapshot = await getDocs(q);
      let results = await Promise.all(querySnapshot.docs.map(async (doc, index) => {
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
  async processActivityForSegments(activity) {
    try {
      // Only process running activities
      if (!['Run', 'TrailRun'].includes(activity.type)) {
        return;
      }

      // Extract basic segments from activity data
      const segments = this.extractSegmentsFromActivity(activity);
      
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
          createdAt: new Date()
        });
      }
    });

    return segments;
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
}

const firebaseService = new FirebaseService();
export default firebaseService;