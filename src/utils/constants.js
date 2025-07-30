export const DISTANCES = [
  '100m', '200m', '400m', '800m', '1K', '1.5K', '2K', '3K', 
  '5K', '10K', '15K', '21.1K', '42.2K', 'Custom'
];

export const DISTANCE_METERS = {
  '100m': 100,
  '200m': 200,
  '400m': 400,
  '800m': 800,
  '1K': 1000,
  '1.5K': 1500,
  '2K': 2000,
  '3K': 3000,
  '5K': 5000,
  '10K': 10000,
  '15K': 15000,
  '21.1K': 21100,
  '42.2K': 42200
};

export const TIME_FILTERS = [
  { value: 'all-time', label: 'All Time' },
  { value: 'this-year', label: 'This Year' },
  { value: 'last-12-months', label: 'Last 12 Months' },
  { value: 'last-6-months', label: 'Last 6 Months' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' }
];

export const STRAVA_ACTIVITY_TYPES = {
  RUNNING: 'Run',
  TRAIL_RUNNING: 'TrailRun',
  RACE: 'Race'
};

export const AVAILABLE_COLUMNS = [
  { key: 'rank', label: 'Rank', default: true, description: 'Position in rankings', category: 'core', enabled: true },
  { key: 'time', label: 'Time', default: true, description: 'Segment completion time', category: 'core', enabled: true },
  { key: 'pace', label: 'Pace', default: true, description: 'Average pace per kilometer', category: 'core', enabled: true },
  { key: 'date', label: 'Date', default: true, description: 'Date of the activity', category: 'core', enabled: true },
  { key: 'runName', label: 'Run', default: true, description: 'Name of the activity', category: 'core', enabled: true },
  { key: 'segment', label: 'PB Segment', default: true, description: 'Section of run where PB was achieved', category: 'core', enabled: true },
  { key: 'fullRunDistance', label: 'Run Distance', default: true, description: 'Total distance of the full run', category: 'activity', enabled: true },
  { key: 'averageSpeed', label: 'Avg Speed', default: false, description: 'Average speed in m/s', category: 'performance', enabled: true },
  { key: 'fullRunTime', label: 'Total Time', default: false, description: 'Total time of the full run', category: 'activity', enabled: true },
  { key: 'activityId', label: 'Activity ID', default: false, description: 'Strava activity ID', category: 'technical', enabled: true },
  // Additional performance columns
  { key: 'elevation', label: 'Elevation Gain', default: false, description: 'Total elevation gain during run', category: 'performance', enabled: false },
  { key: 'heartRate', label: 'Avg Heart Rate', default: false, description: 'Average heart rate during segment', category: 'performance', enabled: false },
  { key: 'maxHeartRate', label: 'Max Heart Rate', default: false, description: 'Maximum heart rate during segment', category: 'performance', enabled: false },
  { key: 'cadence', label: 'Avg Cadence', default: false, description: 'Average steps per minute', category: 'performance', enabled: false },
  { key: 'strideLength', label: 'Stride Length', default: false, description: 'Average stride length', category: 'performance', enabled: false },
  // Weather columns
  { key: 'temperature', label: 'Temperature', default: false, description: 'Temperature during run', category: 'conditions', enabled: false },
  { key: 'weather', label: 'Weather', default: false, description: 'Weather conditions', category: 'conditions', enabled: false },
  // Activity details
  { key: 'activityType', label: 'Activity Type', default: false, description: 'Type of activity (Run, TrailRun)', category: 'activity', enabled: false },
  { key: 'startTime', label: 'Start Time', default: false, description: 'Time when activity started', category: 'activity', enabled: false },
  { key: 'location', label: 'Location', default: false, description: 'Starting location of run', category: 'activity', enabled: false },
  // Technical columns
  { key: 'gpsAccuracy', label: 'GPS Accuracy', default: false, description: 'GPS tracking accuracy', category: 'technical', enabled: false },
  { key: 'deviceType', label: 'Device', default: false, description: 'Recording device used', category: 'technical', enabled: false }
];

export const COLUMN_CATEGORIES = {
  core: { label: 'Core Metrics', description: 'Essential performance data' },
  performance: { label: 'Performance Data', description: 'Advanced performance metrics' },
  activity: { label: 'Activity Details', description: 'Information about the full activity' },
  conditions: { label: 'Environmental', description: 'Weather and environmental conditions' },
  technical: { label: 'Technical Data', description: 'Device and tracking information' }
};