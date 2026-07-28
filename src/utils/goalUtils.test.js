const { getPeriodWindow } = require('./goalUtils');

const MS_DAY = 24 * 60 * 60 * 1000;

test('yearly window starts Jan 1 and spans the whole year', () => {
  const now = new Date('2026-07-28T12:00:00');
  const w = getPeriodWindow('yearly', now);
  expect(w.start).toEqual(new Date(2026, 0, 1));
  expect(w.daysInPeriod).toBe(365); // 2026 is not a leap year
  expect(Math.round(w.daysElapsed)).toBe(Math.round((now - new Date(2026, 0, 1)) / MS_DAY));
});

test('monthly window starts on the 1st and spans days in the month', () => {
  const now = new Date('2026-07-28T12:00:00');
  const w = getPeriodWindow('monthly', now);
  expect(w.start).toEqual(new Date(2026, 6, 1));
  expect(w.daysInPeriod).toBe(31); // July
});

test('weekly window starts Monday and spans 7 days', () => {
  const now = new Date('2026-07-28T12:00:00'); // Tuesday
  const w = getPeriodWindow('weekly', now);
  expect(w.start).toEqual(new Date(2026, 6, 27)); // Monday 27 July
  expect(w.daysInPeriod).toBe(7);
});

// append to src/utils/goalUtils.test.js
const { computeGoalProgress } = require('./goalUtils');

// Helper: build a run activity on a given date with distance (km) and time (min).
function run(dateStr, km, min) {
  return { type: 'Run', start_date: dateStr, distance: km * 1000, moving_time: min * 60 };
}

test('distance progress: total, percent, remaining', () => {
  const now = new Date('2026-01-11T00:00:00'); // day 10 of the year
  const acts = [run('2026-01-02', 100, 600), run('2026-01-05', 150, 900)];
  const r = computeGoalProgress(acts, { period: 'yearly', metric: 'distance', target: 2000 }, now);
  expect(r.periodTotal).toBeCloseTo(250, 5);
  expect(r.percent).toBeCloseTo(12.5, 5);
  expect(r.remaining).toBeCloseTo(1750, 5);
});

test('pace-to-date projection extrapolates linearly', () => {
  const now = new Date('2026-01-11T00:00:00'); // ~10 days elapsed
  const acts = [run('2026-01-02', 100, 0), run('2026-01-05', 150, 0)];
  const r = computeGoalProgress(acts, { period: 'yearly', metric: 'distance', target: 2000 }, now);
  // 250 km over ~10 days -> ~25/day * 365
  const expected = (250 / r.daysElapsed) * r.daysInPeriod;
  expect(r.projections.paceToDate).toBeCloseTo(expected, 3);
});

test('recent-trend projection = current + recent daily rate * days remaining', () => {
  const now = new Date('2026-02-01T00:00:00');
  // one 28 km run 7 days ago is the only run in the last 28 days
  const acts = [run('2026-01-25', 28, 0)];
  const r = computeGoalProgress(acts, { period: 'yearly', metric: 'distance', target: 2000 }, now);
  const recentRate = 28 / 28; // 1 km/day
  const expected = r.periodTotal + recentRate * (r.daysInPeriod - r.daysElapsed);
  expect(r.projections.recentTrend).toBeCloseTo(expected, 3);
});

test('time metric sums hours', () => {
  const now = new Date('2026-01-11T00:00:00');
  const acts = [run('2026-01-02', 0, 120)]; // 2 hours
  const r = computeGoalProgress(acts, { period: 'yearly', metric: 'time', target: 200 }, now);
  expect(r.periodTotal).toBeCloseTo(2, 5);
});

test('empty data is safe (no divide-by-zero)', () => {
  const now = new Date('2026-01-01T00:00:01');
  const r = computeGoalProgress([], { period: 'yearly', metric: 'distance', target: 2000 }, now);
  expect(r.periodTotal).toBe(0);
  expect(Number.isFinite(r.projections.paceToDate)).toBe(true);
  expect(Number.isFinite(r.projections.recentTrend)).toBe(true);
});
