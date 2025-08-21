class CacheService {
  constructor() {
    this.CACHE_KEYS = {
      TOTAL_STATS: 'athletic_total_stats',
      PERSONAL_BESTS: 'athletic_personal_bests',
      PREDICTIONS: 'athletic_predictions',
      RECENT_ACTIVITIES: 'athletic_recent_activities',
      HOMEPAGE_DATA: 'athletic_homepage_data'
    };
    this.CACHE_EXPIRY = {
      TOTAL_STATS: 30 * 60 * 1000, // 30 minutes
      PERSONAL_BESTS: 60 * 60 * 1000, // 1 hour  
      PREDICTIONS: 2 * 60 * 60 * 1000, // 2 hours
      RECENT_ACTIVITIES: 15 * 60 * 1000, // 15 minutes
      HOMEPAGE_DATA: 30 * 60 * 1000 // 30 minutes
    };
  }

  // Set data in cache with timestamp
  setCache(key, data) {
    try {
      const cacheEntry = {
        data: data,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache updated: ${key}`);
      }
    } catch (error) {
      console.warn('Cache storage failed:', error);
    }
  }

  // Get data from cache if not expired
  getCache(key, maxAge = this.CACHE_EXPIRY.TOTAL_STATS) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      const age = Date.now() - cacheEntry.timestamp;

      if (age > maxAge) {
        // Cache expired, remove it
        localStorage.removeItem(key);
        if (process.env.NODE_ENV === 'development') {
          console.log(`Cache expired and removed: ${key}`);
        }
        return null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache hit: ${key} (age: ${Math.round(age / 1000)}s)`);
      }
      return cacheEntry.data;
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
      return null;
    }
  }

  // Check if cache exists and is valid
  isCacheValid(key, maxAge = this.CACHE_EXPIRY.TOTAL_STATS) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return false;

      const cacheEntry = JSON.parse(cached);
      const age = Date.now() - cacheEntry.timestamp;
      return age <= maxAge;
    } catch (error) {
      return false;
    }
  }

  // Clear specific cache
  clearCache(key) {
    localStorage.removeItem(key);
    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache cleared: ${key}`);
    }
  }

  // Clear all athletic caches
  clearAllCache() {
    Object.values(this.CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('All athletic caches cleared');
    }
  }

  // Get cache info for debugging
  getCacheInfo() {
    const info = {};
    Object.entries(this.CACHE_KEYS).forEach(([name, key]) => {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const cacheEntry = JSON.parse(cached);
          const age = Date.now() - cacheEntry.timestamp;
          info[name] = {
            age: Math.round(age / 1000),
            valid: age <= this.CACHE_EXPIRY[name],
            size: cached.length
          };
        } catch (error) {
          info[name] = { error: 'Parse failed' };
        }
      } else {
        info[name] = { status: 'Not cached' };
      }
    });
    return info;
  }

  // Cache total stats
  cacheTotalStats(stats) {
    this.setCache(this.CACHE_KEYS.TOTAL_STATS, stats);
  }

  getCachedTotalStats() {
    return this.getCache(this.CACHE_KEYS.TOTAL_STATS, this.CACHE_EXPIRY.TOTAL_STATS);
  }

  // Cache personal bests
  cachePersonalBests(distance, pbs) {
    const key = `${this.CACHE_KEYS.PERSONAL_BESTS}_${distance}`;
    this.setCache(key, pbs);
  }

  getCachedPersonalBests(distance) {
    const key = `${this.CACHE_KEYS.PERSONAL_BESTS}_${distance}`;
    return this.getCache(key, this.CACHE_EXPIRY.PERSONAL_BESTS);
  }

  // Cache homepage data
  cacheHomepageData(data) {
    this.setCache(this.CACHE_KEYS.HOMEPAGE_DATA, data);
  }

  getCachedHomepageData() {
    return this.getCache(this.CACHE_KEYS.HOMEPAGE_DATA, this.CACHE_EXPIRY.HOMEPAGE_DATA);
  }

  // Cache predictions
  cachePredictions(predictions) {
    this.setCache(this.CACHE_KEYS.PREDICTIONS, predictions);
  }

  getCachedPredictions() {
    return this.getCache(this.CACHE_KEYS.PREDICTIONS, this.CACHE_EXPIRY.PREDICTIONS);
  }
}

const cacheService = new CacheService();
export default cacheService;