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
      let q = query(
        collection(db, 'segments'),
        where('distance', '==', distance),
        orderBy('time', 'asc'),
        limit(10)
      );

      // Add date filters
      if (timeFilter !== 'all-time' && timeFilter !== 'custom') {
        const startDate = this.getDateFromFilter(timeFilter);
        q = query(
          collection(db, 'segments'),
          where('distance', '==', distance),
          where('date', '>=', startDate),
          orderBy('time', 'asc'),
          limit(10)
        );
      } else if (timeFilter === 'custom' && customDateFrom && customDateTo) {
        q = query(
          collection(db, 'segments'),
          where('distance', '==', distance),
          where('date', '>=', new Date(customDateFrom)),
          where('date', '<=', new Date(customDateTo)),
          orderBy('time', 'asc'),
          limit(10)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc, index) => ({ 
        rank: index + 1,
        id: doc.id, 
        ...doc.data() 
      }));
    } catch (error) {
      console.error('Error getting personal bests:', error);
      throw error;
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

  extractSegmentsFromActivity(activity) {
    const segments = [];
    const activityDate = new Date(activity.start_date);
    const distance = activity.distance; // in meters
    const time = activity.moving_time; // in seconds
    
    // Define distances to track (in meters)
    const distances = [
      { name: '1K', meters: 1000 },
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
          createdAt: new Date()
        });
      }
    });

    return segments;
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
}

const firebaseService = new FirebaseService();
export default firebaseService;