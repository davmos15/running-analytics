import { DISTANCE_METERS } from '../utils/constants';

class SegmentProcessor {
  // Calculate distance between two GPS points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Find best segments within an activity
  findBestSegments(activityStreams, targetDistances = Object.keys(DISTANCE_METERS)) {
    const { time, distance, latlng } = activityStreams;
    
    if (!time || !distance || !latlng) {
      throw new Error('Required stream data missing');
    }

    const segments = [];

    targetDistances.forEach(distanceKey => {
      const targetDistance = DISTANCE_METERS[distanceKey];
      const bestSegment = this.findBestSegmentForDistance(
        time.data, 
        distance.data, 
        latlng.data, 
        targetDistance
      );

      if (bestSegment) {
        segments.push({
          distance: distanceKey,
          ...bestSegment
        });
      }
    });

    return segments;
  }

  findBestSegmentForDistance(timeData, distanceData, latlngData, targetDistance) {
    let bestTime = Infinity;
    let bestSegment = null;

    for (let startIdx = 0; startIdx < distanceData.length; startIdx++) {
      const startDistance = distanceData[startIdx];
      const targetEndDistance = startDistance + targetDistance;

      // Find the end index for this target distance
      let endIdx = startIdx + 1;
      while (endIdx < distanceData.length && distanceData[endIdx] < targetEndDistance) {
        endIdx++;
      }

      if (endIdx >= distanceData.length) break;

      // Calculate time for this segment
      const segmentTime = timeData[endIdx] - timeData[startIdx];

      if (segmentTime < bestTime) {
        bestTime = segmentTime;
        bestSegment = {
          startTime: timeData[startIdx],
          endTime: timeData[endIdx],
          time: segmentTime,
          startDistance: distanceData[startIdx],
          endDistance: distanceData[endIdx],
          startLatLng: latlngData[startIdx],
          endLatLng: latlngData[endIdx],
          pace: this.calculatePace(targetDistance, segmentTime)
        };
      }
    }

    return bestSegment;
  }

  calculatePace(distanceMeters, timeSeconds) {
    const paceSecondsPerKm = (timeSeconds / distanceMeters) * 1000;
    const minutes = Math.floor(paceSecondsPerKm / 60);
    const seconds = Math.floor(paceSecondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

export default new SegmentProcessor();