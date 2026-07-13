// Pure, dependency-free running-analytics segment/PB math.
// Shared by the browser (firebaseService.js) and the Node sync (computeSegments.js)
// so PBs are computed identically in both. NO firebase / browser imports here.

const DISTANCES = [
  { name: '100m', meters: 100 },
  { name: '200m', meters: 200 },
  { name: '400m', meters: 400 },
  { name: '800m', meters: 800 },
  { name: '1K', meters: 1000 },
  { name: 'Mile', meters: 1609 },
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

function calculatePace(timeSeconds, distanceMeters) {
  // Calculate pace in minutes per kilometer
  const pacePerKm = (timeSeconds / 60) / (distanceMeters / 1000);
  const minutes = Math.floor(pacePerKm);
  const seconds = Math.round((pacePerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Calculate activity-level metrics from streams
function calculateActivityMetrics(streams) {
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

  // Power metrics from watts stream
  if (streams.watts?.data) {
    const wattsData = streams.watts.data.filter(w => w && w > 0);
    if (wattsData.length > 0) {
      metrics.average_watts_calculated = Math.round(
        wattsData.reduce((sum, w) => sum + w, 0) / wattsData.length
      );
      metrics.max_watts_calculated = Math.max(...wattsData);
    }
  }

  // Stride length from cadence + velocity
  if (streams.cadence?.data && streams.velocity_smooth?.data) {
    const strideLengths = [];
    for (let i = 0; i < streams.cadence.data.length; i++) {
      const cad = streams.cadence.data[i]; // steps per minute (one leg)
      const speed = streams.velocity_smooth.data[i]; // m/s
      if (cad && cad > 0 && speed && speed > 0) {
        // Strava running cadence is per leg; full stride = speed / (cadence/60)
        const strideLen = (speed * 60) / cad;
        if (strideLen > 0.5 && strideLen < 4.0) {
          strideLengths.push(strideLen);
        }
      }
    }
    if (strideLengths.length > 0) {
      metrics.average_stride_length = parseFloat(
        (strideLengths.reduce((s, l) => s + l, 0) / strideLengths.length).toFixed(2)
      );
    }
  }

  return metrics;
}

function extractSegmentsFromActivity(activity) {
  const segments = [];
  const activityDate = new Date(activity.start_date);
  const distance = activity.distance; // in meters
  const time = activity.moving_time; // in seconds

  // Define common distances to track (in meters)
  const distances = DISTANCES;

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
        pace: calculatePace(estimatedTime, distanceObj.meters),
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

// Find best segments using GPS streams
async function findBestSegmentsFromStreams(activity, streams) {
  if (!streams || !streams.distance || !streams.time) {
    return extractSegmentsFromActivity(activity);
  }

  const segments = [];
  const activityDate = new Date(activity.start_date);
  const distanceStream = streams.distance.data;
  const timeStream = streams.time.data;

  // Extract additional stream data if available
  const heartRateStream = streams.heartrate?.data || null;
  const cadenceStream = streams.cadence?.data || null;
  const altitudeStream = streams.altitude?.data || null;
  const wattsStream = streams.watts?.data || null;
  const velocityStream = streams.velocity_smooth?.data || null;

  // Define common distances to track (in meters)
  const distances = DISTANCES;

  // For each distance, find the fastest segment
  distances.forEach(distanceObj => {
    if (activity.distance >= distanceObj.meters) {
      const bestSegment = findFastestSegment(
        distanceStream,
        timeStream,
        distanceObj.meters
      );

      if (bestSegment) {
        // Calculate additional metrics from streams
        const segmentMetrics = calculateSegmentMetrics(
          bestSegment,
          heartRateStream,
          cadenceStream,
          altitudeStream,
          wattsStream,
          velocityStream
        );

        segments.push({
          activityId: activity.id,
          activityName: activity.name,
          distance: distanceObj.name,
          distanceMeters: distanceObj.meters,
          time: Math.round(bestSegment.time),
          pace: calculatePace(bestSegment.time, distanceObj.meters),
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
function calculateSegmentMetrics(segment, heartRateStream, cadenceStream, altitudeStream, wattsStream = null, velocityStream = null) {
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

  // Power metrics per segment
  if (wattsStream && segment.startIndex !== undefined && segment.endIndex !== undefined) {
    const wattsSlice = wattsStream.slice(segment.startIndex, segment.endIndex + 1);
    const validWatts = wattsSlice.filter(w => w && w > 0);
    if (validWatts.length > 0) {
      metrics.averagePower = Math.round(validWatts.reduce((sum, w) => sum + w, 0) / validWatts.length);
      metrics.maxPower = Math.max(...validWatts);
    }
  }

  // Stride length per segment
  if (cadenceStream && velocityStream && segment.startIndex !== undefined && segment.endIndex !== undefined) {
    const cadSlice = cadenceStream.slice(segment.startIndex, segment.endIndex + 1);
    const velSlice = velocityStream.slice(segment.startIndex, segment.endIndex + 1);
    const strideLengths = [];
    for (let i = 0; i < cadSlice.length; i++) {
      if (cadSlice[i] > 0 && velSlice[i] > 0) {
        const sl = (velSlice[i] * 60) / cadSlice[i];
        if (sl > 0.5 && sl < 4.0) strideLengths.push(sl);
      }
    }
    if (strideLengths.length > 0) {
      metrics.strideLength = parseFloat(
        (strideLengths.reduce((s, l) => s + l, 0) / strideLengths.length).toFixed(2)
      );
    }
  }

  return metrics;
}

// Sliding window algorithm to find fastest segment
function findFastestSegment(distanceStream, timeStream, targetDistance) {
  let bestTime = Infinity;
  let bestSegment = null;

  // Try every possible starting point
  for (let i = 0; i < distanceStream.length - 1; i++) {
    const startDistance = distanceStream[i];

    // Find the first point that meets or exceeds our target distance
    for (let j = i + 1; j < distanceStream.length; j++) {
      const currentDistance = distanceStream[j] - startDistance;

      // If we've reached or exceeded the target distance
      if (currentDistance >= targetDistance) {
        // Calculate exact time using linear interpolation if needed
        let segmentTime;

        if (currentDistance === targetDistance) {
          // Exact match
          segmentTime = timeStream[j] - timeStream[i];
        } else if (j > i + 1) {
          // Interpolate between j-1 and j for exact distance
          const prevDistance = distanceStream[j-1] - startDistance;
          const distanceRatio = (targetDistance - prevDistance) / (currentDistance - prevDistance);
          const timeDiff = timeStream[j] - timeStream[j-1];
          segmentTime = (timeStream[j-1] - timeStream[i]) + (timeDiff * distanceRatio);
        } else {
          segmentTime = timeStream[j] - timeStream[i];
        }

        // Check if this is the best segment so far
        if (segmentTime < bestTime && segmentTime > 0) {
          bestTime = segmentTime;
          bestSegment = {
            time: segmentTime,
            startDistance: startDistance,
            endDistance: startDistance + targetDistance,
            actualEndDistance: distanceStream[j],
            startIndex: i,
            endIndex: j
          };
        }

        // Move to next starting point (no need to check further endpoints for this start)
        break;
      }
    }
  }

  return bestSegment;
}

module.exports = {
  DISTANCES,
  calculatePace,
  calculateActivityMetrics,
  extractSegmentsFromActivity,
  findBestSegmentsFromStreams,
  calculateSegmentMetrics,
  findFastestSegment,
};
