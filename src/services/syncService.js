import stravaApi from './stravaApi';
import firebaseService from './firebaseService';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
  }

  async syncAllActivities(progressCallback = null) {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    try {
      this.isSyncing = true;
      console.log('Starting full activity sync...');

      let page = 1;
      let allActivities = [];
      let hasMoreData = true;

      // Fetch all activities from Strava
      while (hasMoreData) {
        if (progressCallback) {
          progressCallback({ 
            stage: 'fetching', 
            message: `Fetching page ${page} from Strava...` 
          });
        }

        const activities = await stravaApi.getActivities(page, 50);
        
        if (activities.length === 0) {
          hasMoreData = false;
        } else {
          allActivities = [...allActivities, ...activities];
          page++;
          
          // Prevent hitting rate limits
          await this.delay(100);
        }
      }

      console.log(`Found ${allActivities.length} total activities`);

      // Filter for running activities
      const runningActivities = allActivities.filter(activity => 
        ['Run', 'TrailRun'].includes(activity.type)
      );

      console.log(`Processing ${runningActivities.length} running activities`);

      // Process each activity
      let processedCount = 0;
      for (const activity of runningActivities) {
        if (progressCallback) {
          progressCallback({ 
            stage: 'processing', 
            message: `Processing activity ${processedCount + 1}/${runningActivities.length}`,
            progress: (processedCount / runningActivities.length) * 100
          });
        }

        const exists = await firebaseService.activityExists(activity.id);
        if (!exists) {
          // Try to get streams for better segment detection
          let streams = null;
          try {
            streams = await stravaApi.getActivityStreams(activity.id, ['time', 'distance']);
          } catch (streamError) {
            console.log(`Could not fetch streams for activity ${activity.id}, using basic extraction`);
          }
          
          // Save activity and process segments with streams if available
          await firebaseService.saveActivity(activity.id, activity);
          await firebaseService.processActivityForSegments(activity, streams);
          console.log(`Processed new activity: ${activity.name}`);
        }

        processedCount++;
        
        // Small delay to prevent overwhelming Firebase
        await this.delay(50);
      }

      this.lastSyncTime = new Date();
      
      if (progressCallback) {
        progressCallback({ 
          stage: 'complete', 
          message: `Sync complete! Processed ${processedCount} activities.`
        });
      }

      console.log('Sync completed successfully');
      return { success: true, processedCount };

    } catch (error) {
      console.error('Sync failed:', error);
      if (progressCallback) {
        progressCallback({ 
          stage: 'error', 
          message: `Sync failed: ${error.message}`
        });
      }
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async syncRecentActivities() {
    try {
      console.log('Syncing recent activities...');
      
      // Get recent activities from Strava
      const activities = await stravaApi.getActivities(1, 20);
      const runningActivities = activities.filter(activity => 
        ['Run', 'TrailRun'].includes(activity.type)
      );

      let newActivitiesCount = 0;
      for (const activity of runningActivities) {
        const exists = await firebaseService.activityExists(activity.id);
        if (!exists) {
          await firebaseService.saveActivityWithSegments(activity.id, activity);
          newActivitiesCount++;
        }
      }

      console.log(`Synced ${newActivitiesCount} new activities`);
      return { success: true, newActivitiesCount };

    } catch (error) {
      console.error('Recent sync failed:', error);
      throw error;
    }
  }

  async getLastSyncTime() {
    return this.lastSyncTime;
  }

  isCurrentlySyncing() {
    return this.isSyncing;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const syncService = new SyncService();
export default syncService;