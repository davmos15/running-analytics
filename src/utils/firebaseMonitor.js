/**
 * Firebase Quota Monitoring Utilities
 */

class FirebaseMonitor {
  constructor() {
    this.operationCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  /**
   * Track Firebase operations
   */
  trackOperation(operation) {
    this.operationCount++;
    console.log(`Firebase operation ${this.operationCount}: ${operation}`);
    
    // Warn if approaching common free tier limits
    if (this.operationCount % 1000 === 0) {
      console.warn(`⚠️ Firebase: ${this.operationCount} operations completed. Monitor your quota usage.`);
    }
  }

  /**
   * Track Firebase errors
   */
  trackError(error, operation) {
    this.errorCount++;
    
    if (error.code === 'resource-exhausted') {
      console.error('🚨 FIREBASE QUOTA EXCEEDED 🚨');
      console.error('This means you\'ve hit your Firebase plan limits.');
      console.error('Solutions:');
      console.error('1. Check Firebase Console > Usage tab');
      console.error('2. Upgrade to Blaze (pay-as-you-go) plan');
      console.error('3. Wait for quota reset (usually daily)');
      console.error('4. Optimize queries to reduce operations');
      
      return {
        isQuotaError: true,
        userMessage: 'Firebase storage quota exceeded. Please check your Firebase console and consider upgrading your plan, or try again tomorrow when quotas reset.'
      };
    }
    
    if (error.code === 'permission-denied') {
      console.error('🚨 FIREBASE PERMISSION DENIED 🚨');
      console.error('Check your Firestore security rules.');
      
      return {
        isPermissionError: true,
        userMessage: 'Firebase permission denied. Please check your database configuration.'
      };
    }
    
    console.error(`Firebase error in ${operation}:`, error);
    return {
      isQuotaError: false,
      userMessage: `Database error: ${error.message}`
    };
  }

  /**
   * Get operation statistics
   */
  getStats() {
    const runtime = (Date.now() - this.startTime) / 1000;
    return {
      operations: this.operationCount,
      errors: this.errorCount,
      runtime: runtime,
      operationsPerSecond: this.operationCount / runtime
    };
  }

  /**
   * Estimate quota usage for sync operations
   */
  estimateQuotaUsage(activityCount) {
    // Rough estimates for Firebase operations:
    // - 1 read per activity check (activityExists)
    // - 1 write per activity (saveActivity)  
    // - ~13 writes per activity for segments (standard distances)
    // - Additional reads for getPersonalBests queries
    
    const readsPerActivity = 2; // activityExists + some queries
    const writesPerActivity = 14; // activity + ~13 segments
    
    const estimatedReads = activityCount * readsPerActivity;
    const estimatedWrites = activityCount * writesPerActivity;
    const totalOperations = estimatedReads + estimatedWrites;
    
    console.log('📊 Estimated Firebase Usage:');
    console.log(`Activities to process: ${activityCount}`);
    console.log(`Estimated reads: ${estimatedReads}`);
    console.log(`Estimated writes: ${estimatedWrites}`);
    console.log(`Total operations: ${totalOperations}`);
    
    // Firebase Spark (free) plan limits:
    // - 50,000 reads/day
    // - 20,000 writes/day
    
    if (estimatedWrites > 20000) {
      console.warn('⚠️ Estimated writes exceed free tier limit (20,000/day)');
      console.warn('Consider upgrading to Blaze plan or processing in smaller batches');
    }
    
    if (estimatedReads > 50000) {
      console.warn('⚠️ Estimated reads exceed free tier limit (50,000/day)');
    }
    
    return {
      estimatedReads,
      estimatedWrites,
      totalOperations,
      exceedsFreeTier: estimatedWrites > 20000 || estimatedReads > 50000
    };
  }

  /**
   * Suggest optimization strategies
   */
  suggestOptimizations() {
    const stats = this.getStats();
    const suggestions = [];
    
    if (stats.operationsPerSecond > 10) {
      suggestions.push('Consider adding delays between operations to avoid rate limiting');
    }
    
    if (this.errorCount > this.operationCount * 0.1) {
      suggestions.push('High error rate detected. Check network connection and Firebase status');
    }
    
    suggestions.push('Use batch operations where possible to reduce operation count');
    suggestions.push('Implement pagination for large data sets');
    suggestions.push('Consider caching frequently accessed data');
    
    return suggestions;
  }
}

// Create singleton instance
const firebaseMonitor = new FirebaseMonitor();

export default firebaseMonitor;