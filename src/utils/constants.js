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
  { key: 'rank', label: 'Rank', default: true, description: 'Position in rankings' },
  { key: 'time', label: 'Time', default: true, description: 'Segment completion time' },
  { key: 'pace', label: 'Pace', default: true, description: 'Average pace per kilometer' },
  { key: 'date', label: 'Date', default: true, description: 'Date of the activity' },
  { key: 'runName', label: 'Run', default: true, description: 'Name of the activity' },
  { key: 'segment', label: 'PB Segment', default: true, description: 'Section of run where PB was achieved' },
  { key: 'fullRunDistance', label: 'Run Distance', default: true, description: 'Total distance of the full run' },
  { key: 'averageSpeed', label: 'Avg Speed', default: false, description: 'Average speed in m/s' },
  { key: 'fullRunTime', label: 'Total Time', default: false, description: 'Total time of the full run' },
  { key: 'activityId', label: 'Activity ID', default: false, description: 'Strava activity ID' }
];