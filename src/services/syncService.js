import stravaApi from './stravaApi';
import firebaseService from './firebaseService';
import firebaseMonitor from '../utils/firebaseMonitor';

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
      
      // Estimate Firebase quota usage
      const quotaEstimate = firebaseMonitor.estimateQuotaUsage(runningActivities.length);
      if (quotaEstimate.exceedsFreeTier) {
        console.warn('⚠️ This sync may exceed Firebase free tier limits');
        if (progressCallback) {
          progressCallback({
            stage: 'warning',
            message: `Warning: This sync may exceed Firebase free tier limits. Consider upgrading to Blaze plan.`
          });
        }
      }

      // OPTIMIZATION: Batch check which activities already exist to reduce Firebase reads
      console.log('🚀 OPTIMIZATION: Batch checking activity existence...');
      const existingActivities = new Set();
      
      // Get existing activity IDs in batches of 10
      const activityIds = runningActivities.map(a => a.id.toString());
      for (let i = 0; i < activityIds.length; i += 10) {
        const batch = activityIds.slice(i, i + 10);
        try {
          // Check if activities exist - this is still expensive but better than one-by-one
          for (const id of batch) {
            const exists = await firebaseService.activityExists(id);
            if (exists) {
              existingActivities.add(id);
            }
          }
          firebaseMonitor.trackOperation(`batch_check_${batch.length}_activities`);
        } catch (error) {
          console.error('Error in batch existence check:', error);
        }
      }
      
      console.log(`📊 Found ${existingActivities.size} existing activities out of ${runningActivities.length}`);

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

        // Use batch-checked existence to avoid duplicate Firebase reads
        const exists = existingActivities.has(activity.id.toString());
        if (!exists) {
          // Try to get streams for better segment detection and enhanced metrics
          let streams = null;
          try {
            streams = await stravaApi.getActivityStreams(activity.id, [
              'time', 'distance', 'heartrate', 'cadence', 'altitude'
            ]);
          } catch (streamError) {
            console.log(`Could not fetch streams for activity ${activity.id}, using basic extraction`);
          }
          
          // Save activity and process segments with streams if available
          await firebaseService.saveActivity(activity.id, activity, streams);
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
      
      console.log('🚀 OPTIMIZATION: Batch checking recent activity existence...');
      const existingRecentActivities = new Set();
      for (const activity of runningActivities) {
        const exists = await firebaseService.activityExists(activity.id);
        if (exists) {
          existingRecentActivities.add(activity.id.toString());
        }
      }
      
      for (const activity of runningActivities) {
        const exists = existingRecentActivities.has(activity.id.toString());
        if (!exists) {
          // Try to get enhanced streams for new activities
          let streams = null;
          try {
            streams = await stravaApi.getActivityStreams(activity.id, [
              'time', 'distance', 'heartrate', 'cadence', 'altitude'
            ]);
          } catch (streamError) {
            console.log(`Could not fetch streams for activity ${activity.id}, using basic processing`);
          }
          
          // Save activity and process segments with streams if available
          await firebaseService.saveActivity(activity.id, activity, streams);
          await firebaseService.processActivityForSegments(activity, streams);
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

  async backfillHistoricalStreamData(progressCallback = null) {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    try {
      this.isSyncing = true;
      console.log('Starting historical stream data backfill...');

      if (progressCallback) {
        progressCallback({
          stage: 'analyzing',
          message: 'Analyzing activities that need stream data...'
        });
      }

      // Get all activities from Firebase that don't have heart rate data
      const allActivities = await firebaseService.getActivities();
      const activitiesNeedingStreams = allActivities.filter(activity => {
        if (!['Run', 'TrailRun'].includes(activity.type)) return false;
        
        // Check for any form of heart rate data (multiple field names used)
        const hasHeartRateData = !!(
          activity.average_heartrate || 
          activity.averageHeartRate || 
          activity.max_heartrate || 
          activity.maxHeartRate
        );
        
        return !hasHeartRateData;
      });

      console.log(`Found ${activitiesNeedingStreams.length} activities without heart rate data`);
      console.log('Sample activities needing streams:', activitiesNeedingStreams.slice(0, 3).map(a => ({
        id: a.id,
        name: a.name,
        date: a.start_date,
        hasAvgHR: !!a.average_heartrate,
        hasAvgHeartRate: !!a.averageHeartRate,
        hasMaxHR: !!a.max_heartrate,
        hasMaxHeartRate: !!a.maxHeartRate
      })));

      if (activitiesNeedingStreams.length === 0) {
        if (progressCallback) {
          progressCallback({
            stage: 'complete',
            message: 'All activities already have stream data!'
          });
        }
        return { success: true, updatedCount: 0 };
      }

      // Estimate quota usage
      const quotaEstimate = firebaseMonitor.estimateQuotaUsage(activitiesNeedingStreams.length * 2); // 2 operations per activity
      if (quotaEstimate.exceedsFreeTier) {
        console.warn('⚠️ Stream backfill may exceed Firebase free tier limits');
        if (progressCallback) {
          progressCallback({
            stage: 'warning',
            message: `Warning: This may use ~${quotaEstimate.estimatedReads} Firebase reads. Continue?`
          });
        }
      }

      // Process activities in batches to avoid overwhelming APIs
      let processedCount = 0;
      let updatedCount = 0;
      const batchSize = 5;

      for (let i = 0; i < activitiesNeedingStreams.length; i += batchSize) {
        const batch = activitiesNeedingStreams.slice(i, i + batchSize);
        
        for (const activity of batch) {
          if (progressCallback) {
            progressCallback({
              stage: 'processing',
              message: `Fetching stream data for activity ${processedCount + 1}/${activitiesNeedingStreams.length}`,
              progress: (processedCount / activitiesNeedingStreams.length) * 100
            });
          }

          try {
            // Try to get streams for this activity
            const streams = await stravaApi.getActivityStreams(activity.id, [
              'time', 'distance', 'heartrate', 'cadence', 'altitude'
            ]);

            if (streams && (streams.heartrate || streams.cadence || streams.altitude)) {
              // Re-save activity with enhanced stream data
              await firebaseService.saveActivity(activity.id, activity, streams);
              
              // Re-process segments with stream data for more accurate metrics
              await firebaseService.processActivityForSegments(activity, streams);
              
              updatedCount++;
              console.log(`Enhanced activity ${activity.id} with stream data`);
            }
          } catch (streamError) {
            console.log(`Could not fetch streams for activity ${activity.id}:`, streamError.message);
            // Continue with next activity - some activities might not have stream data available
          }

          processedCount++;
          
          // Rate limiting: small delay between requests
          await this.delay(200);
        }

        // Longer delay between batches
        await this.delay(1000);
      }

      if (progressCallback) {
        progressCallback({
          stage: 'complete',
          message: `Backfill complete! Enhanced ${updatedCount} activities with stream data.`
        });
      }

      console.log(`Historical stream backfill completed: ${updatedCount} activities enhanced`);
      return { success: true, updatedCount };

    } catch (error) {
      console.error('Stream backfill failed:', error);
      if (progressCallback) {
        progressCallback({
          stage: 'error',
          message: `Backfill failed: ${error.message}`
        });
      }
      throw error;
    } finally {
      this.isSyncing = false;
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