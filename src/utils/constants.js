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