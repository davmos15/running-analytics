# Home Goals + Range Selector, Predictions Cache, PB Columns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable home-page goal card with progress + two projections and a totals range selector; stop the Predictions page recomputing on every visit; and make the Personal Bests columns honest against the Garmin data model.

**Architecture:** Pure projection/progress math lives in a new unit-tested `goalUtils.js`. The home page fetches all-time run activities once and derives range totals, year options, and the goal card client-side. Predictions gain an in-memory result cache in `predictionService.js`. PB column cleanup edits `AVAILABLE_COLUMNS` plus the two render components and adds localStorage hygiene.

**Tech Stack:** React (CRA / react-scripts), Jest (via `react-scripts test`), Firebase Firestore, localStorage for settings.

---

## Reference facts (read before starting)

- Test runner: `npx react-scripts test <path> --watchAll=false` (Jest globals `test`/`expect`, co-located `*.test.js`). Example existing test: `src/components/RoadCoverage/roadCoverageGeo.test.js`.
- Activities have Strava-shaped fields: `type` (`Run`/`TrailRun`/`VirtualRun`), `distance` (metres), `moving_time` / `elapsed_time` (seconds), `start_date` (ISO string).
- `firebaseService.getActivities('all-time')` returns all activities (Firebase read cached 5 min).
- Run-type filter used across the app: `['Run', 'TrailRun', 'VirtualRun']`.
- Settings + home config live in the `homepageSettings` localStorage object.
- `ResultsCards.js` already has render cases for `activityType`, `startTime`, `avgPower`, `maxPower`. `ResultsTable.js` has `avgPower`/`maxPower` cases but NOT `activityType`/`startTime` (they fall through to the `N/A` default).
- Garmin provides NO power/watts, weather, GPS-accuracy, or device data.

---

## Task 1: `goalUtils` — period window helper (pure, TDD)

**Files:**
- Create: `src/utils/goalUtils.js`
- Test: `src/utils/goalUtils.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/utils/goalUtils.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx react-scripts test src/utils/goalUtils.test.js --watchAll=false`
Expected: FAIL — `getPeriodWindow is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/utils/goalUtils.js
const MS_DAY = 24 * 60 * 60 * 1000;

function getPeriodWindow(period, now = new Date()) {
  const year = now.getFullYear();
  let start;
  let daysInPeriod;

  if (period === 'weekly') {
    // Monday as start of week
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const diffToMonday = (day === 0 ? 6 : day - 1);
    start = new Date(year, now.getMonth(), now.getDate() - diffToMonday);
    daysInPeriod = 7;
  } else if (period === 'monthly') {
    start = new Date(year, now.getMonth(), 1);
    daysInPeriod = new Date(year, now.getMonth() + 1, 0).getDate();
  } else {
    // yearly (default)
    start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    daysInPeriod = Math.round((end - start) / MS_DAY) + 1;
  }

  const daysElapsed = (now - start) / MS_DAY;
  return { start, end: now, daysElapsed, daysInPeriod };
}

module.exports = { getPeriodWindow };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx react-scripts test src/utils/goalUtils.test.js --watchAll=false`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/goalUtils.js src/utils/goalUtils.test.js
git commit -m "feat: goalUtils period window helper"
```

---

## Task 2: `goalUtils` — progress + projections (pure, TDD)

**Files:**
- Modify: `src/utils/goalUtils.js`
- Test: `src/utils/goalUtils.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx react-scripts test src/utils/goalUtils.test.js --watchAll=false`
Expected: FAIL — `computeGoalProgress is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// add to src/utils/goalUtils.js, above module.exports
const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun'];

function metricValue(activity, metric) {
  if (metric === 'time') return (activity.moving_time || activity.elapsed_time || 0) / 3600; // hours
  return (activity.distance || 0) / 1000; // km
}

function sumBetween(activities, metric, start, end) {
  return activities.reduce((sum, a) => {
    if (!a.type || !RUN_TYPES.includes(a.type)) return sum;
    const d = new Date(a.start_date);
    if (d >= start && d <= end) return sum + metricValue(a, metric);
    return sum;
  }, 0);
}

function computeGoalProgress(activities, goal, now = new Date()) {
  const { period, metric, target } = goal;
  const { start, end, daysElapsed, daysInPeriod } = getPeriodWindow(period, now);

  const periodTotal = sumBetween(activities, metric, start, end);
  const percent = target > 0 ? (periodTotal / target) * 100 : 0;
  const remaining = Math.max(target - periodTotal, 0);

  const paceToDate = daysElapsed > 0 ? (periodTotal / daysElapsed) * daysInPeriod : periodTotal;

  const trendStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recentTotal = sumBetween(activities, metric, trendStart, now);
  const recentRate = recentTotal / 28;
  const daysRemaining = Math.max(daysInPeriod - daysElapsed, 0);
  const recentTrend = periodTotal + recentRate * daysRemaining;

  return {
    periodTotal,
    percent,
    remaining,
    daysElapsed,
    daysInPeriod,
    projections: { paceToDate, recentTrend }
  };
}

// update the export line:
// module.exports = { getPeriodWindow, computeGoalProgress };
```

Then update the export at the bottom of the file:

```js
module.exports = { getPeriodWindow, computeGoalProgress };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx react-scripts test src/utils/goalUtils.test.js --watchAll=false`
Expected: PASS (8 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/utils/goalUtils.js src/utils/goalUtils.test.js
git commit -m "feat: goalUtils progress and projections"
```

---

## Task 3: `GoalCard` component

**Files:**
- Create: `src/components/Homepage/GoalCard.js`

The card takes all-time run `activities` and the `goal` config, and renders progress + both projections. It renders nothing when `goal.enabled === false`.

- [ ] **Step 1: Create the component**

```jsx
// src/components/Homepage/GoalCard.js
import React from 'react';
import { Target } from 'lucide-react';
import { computeGoalProgress } from '../../utils/goalUtils';

const PERIOD_LABEL = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

const GoalCard = ({ activities, goal }) => {
  if (!goal || goal.enabled === false || !goal.target) return null;

  const { metric, period, target } = goal;
  const r = computeGoalProgress(activities || [], goal, new Date());
  const unit = metric === 'time' ? 'h' : 'km';
  const fmt = (v) => `${Math.round(v).toLocaleString()}${unit}`;
  const pct = Math.min(r.percent, 100);
  const onTrack = (proj) => proj >= target;

  return (
    <div className="athletic-card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Target className="w-6 h-6 text-orange-400" />
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          {PERIOD_LABEL[period] || 'Yearly'} {metric === 'time' ? 'Time' : 'Distance'} Goal
        </h2>
      </div>

      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-white">{fmt(r.periodTotal)}</span>
        <span className="text-sm text-slate-400">of {fmt(target)} — {Math.round(r.percent)}%</span>
      </div>

      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-gradient-to-r from-orange-500 to-red-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-slate-400 mb-4">{fmt(r.remaining)} to go</div>

      <div className="grid grid-cols-2 gap-4">
        <div className="athletic-card-gradient p-3 rounded-lg">
          <div className="text-xs text-slate-400">Projected (pace to date)</div>
          <div className="text-lg font-bold text-white">{fmt(r.projections.paceToDate)}</div>
          <div className={`text-xs ${onTrack(r.projections.paceToDate) ? 'text-green-400' : 'text-red-400'}`}>
            {onTrack(r.projections.paceToDate) ? 'On track' : 'Behind'}
          </div>
        </div>
        <div className="athletic-card-gradient p-3 rounded-lg">
          <div className="text-xs text-slate-400">Projected (recent trend)</div>
          <div className="text-lg font-bold text-white">{fmt(r.projections.recentTrend)}</div>
          <div className={`text-xs ${onTrack(r.projections.recentTrend) ? 'text-green-400' : 'text-red-400'}`}>
            {onTrack(r.projections.recentTrend) ? 'On track' : 'Behind'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx eslint src/components/Homepage/GoalCard.js`
Expected: no errors (warnings about unused imports are acceptable to fix if any).

- [ ] **Step 3: Commit**

```bash
git add src/components/Homepage/GoalCard.js
git commit -m "feat: GoalCard component"
```

---

## Task 4: Home page — single activity fetch, range selector, goal card

**Files:**
- Modify: `src/components/Homepage/Homepage.js`

Replace the `getRunningStatsSummary()` totals with a single all-time run-activity fetch, then derive range totals + year options client-side, and mount `GoalCard`. Keep the existing PB loading logic.

- [ ] **Step 1: Add imports and new state**

At the top of `Homepage.js`, add imports:

```jsx
import GoalCard from './GoalCard';
```

Inside the component, add state (near the existing `useState` calls):

```jsx
  const [allRunActivities, setAllRunActivities] = useState([]);
  const [range, setRange] = useState('all-time'); // 'all-time' | 'this-year' | a 4-digit year string
```

- [ ] **Step 2: Load all-time run activities once and set default range from settings**

In the effect that reads `homepageSettings` from localStorage (currently around lines 67-74), also set the default range:

```jsx
  useEffect(() => {
    const savedSettings = localStorage.getItem('homepageSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setHomepageSettings(settings);
      if (settings.defaultHomeRange) setRange(settings.defaultHomeRange);
    }
  }, []);
```

Add a new effect to fetch all-time run activities once:

```jsx
  useEffect(() => {
    (async () => {
      try {
        const activities = await firebaseService.getActivities('all-time');
        setAllRunActivities(
          activities.filter(a => a.type && ['Run', 'TrailRun', 'VirtualRun'].includes(a.type))
        );
      } catch (e) {
        console.error('Error loading activities for home totals:', e);
      }
    })();
  }, []);
```

- [ ] **Step 3: Derive range totals + year options; drop getRunningStatsSummary for totals**

Remove the `firebaseService.getRunningStatsSummary()` entry from the `Promise.allSettled` in `loadData` (keep the PB loading). The `statsResponse` handling that calls `setTotalStats` is replaced by the derived totals below, so delete the `getRunningStatsSummary` call and its `setTotalStats(statsResponse.value)` block.

Add derived values in the render body (before the `return`):

```jsx
  const yearOptions = Array.from(
    new Set(allRunActivities.map(a => new Date(a.start_date).getFullYear()))
  ).sort((x, y) => y - x);

  const filteredForRange = allRunActivities.filter(a => {
    if (range === 'all-time') return true;
    const y = new Date(a.start_date).getFullYear();
    if (range === 'this-year') return y === new Date().getFullYear();
    return y === Number(range);
  });

  const rangeStats = {
    totalDistance: filteredForRange.reduce((s, a) => s + (a.distance || 0), 0) / 1000,
    totalTime: filteredForRange.reduce((s, a) => s + (a.elapsed_time || a.moving_time || 0), 0),
    totalRuns: filteredForRange.length
  };
```

Then change the three totals cards to read from `rangeStats` instead of `totalStats`:
`rangeStats.totalDistance`, `formatDuration(rangeStats.totalTime)`, `rangeStats.totalRuns`.

- [ ] **Step 4: Add the range selector UI above the totals cards**

Wrap the totals section. Immediately inside `{homepageSettings.showTotals && (` replace the opening `<div className="grid ...">` with a fragment that adds a selector row first:

```jsx
      {homepageSettings.showTotals && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-orange-400"
            >
              <option value="all-time">All Time</option>
              <option value="this-year">This Year</option>
              {yearOptions.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* existing three totals cards, now using rangeStats */}
          </div>
        </div>
      )}
```

(Keep the three existing card `<div>`s inside the inner grid; only their values change to `rangeStats`.)

- [ ] **Step 5: Mount the GoalCard**

Directly after the totals block (after the closing `)}` of `homepageSettings.showTotals`), add:

```jsx
      <GoalCard activities={allRunActivities} goal={homepageSettings.goal} />
```

- [ ] **Step 6: Manual verification**

Run: `npm start`, open the app home page.
Expected:
- A range dropdown appears above the totals; switching between All Time / This Year / a year changes the three totals.
- A goal card renders when `homepageSettings.goal` exists (it won't until Task 7 saves one; before that the card is absent, which is correct).
- No console errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Homepage/Homepage.js
git commit -m "feat: home range selector, client-side totals, mount GoalCard"
```

---

## Task 5: Settings — default range + goal config

**Files:**
- Modify: `src/components/Settings/SettingsWorking.js`

Add controls that write `defaultHomeRange` and `goal` into `homepageSettings`.

- [ ] **Step 1: Extend the homepageSettings default state**

In the `useState` for `homepageSettings` (around lines 20-26), add the new keys:

```jsx
  const [homepageSettings, setHomepageSettings] = useState({
    showGraphs: true,
    showTotals: true,
    showPBs: true,
    selectedGraphs: ['avg-speed', 'total-distance'],
    pbDistances: ['5K', '10K', '21.1K', '42.2K'],
    defaultHomeRange: 'all-time',
    goal: { enabled: true, period: 'yearly', metric: 'distance', target: 2000 }
  });
```

- [ ] **Step 2: Add a helper to persist homepageSettings**

Add near the other handlers:

```jsx
  const updateHomepageSettings = (patch) => {
    const next = { ...homepageSettings, ...patch };
    setHomepageSettings(next);
    localStorage.setItem('homepageSettings', JSON.stringify(next));
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const updateGoal = (patch) => {
    updateHomepageSettings({ goal: { ...(homepageSettings.goal || {}), ...patch } });
  };
```

- [ ] **Step 3: Add the Default Home Range + Goal UI**

Add a new settings section (place it near the other homepage-related settings in the JSX). Use existing card classes:

```jsx
        <div className="athletic-card-gradient p-6">
          <h3 className="text-lg font-bold text-white mb-4">Home Page</h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Default totals range</label>
            <select
              value={homepageSettings.defaultHomeRange || 'all-time'}
              onChange={(e) => updateHomepageSettings({ defaultHomeRange: e.target.value })}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              <option value="all-time">All Time</option>
              <option value="this-year">This Year</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={homepageSettings.goal?.enabled !== false}
                onChange={(e) => updateGoal({ enabled: e.target.checked })}
                className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded"
              />
              <span className="text-sm text-slate-300">Show goal card</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Period</label>
                <select
                  value={homepageSettings.goal?.period || 'yearly'}
                  onChange={(e) => updateGoal({ period: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Metric</label>
                <select
                  value={homepageSettings.goal?.metric || 'distance'}
                  onChange={(e) => updateGoal({ metric: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                >
                  <option value="distance">Distance (km)</option>
                  <option value="time">Time (hours)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target</label>
                <input
                  type="number"
                  value={homepageSettings.goal?.target ?? ''}
                  onChange={(e) => updateGoal({ target: e.target.value ? Number(e.target.value) : 0 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
```

- [ ] **Step 4: Manual verification**

Run: `npm start`, open Settings.
Expected: changing default range, goal period/metric/target persists (reload Settings shows saved values). Home page goal card reflects the target and updates progress. Success message shows on change.

- [ ] **Step 5: Commit**

```bash
git add src/components/Settings/SettingsWorking.js
git commit -m "feat: settings for default home range and goal config"
```

---

## Task 6: Predictions — in-memory result cache

**Files:**
- Modify: `src/services/predictionService.js`
- Modify: `src/components/Predictions/PredictionsPage.js`

- [ ] **Step 1: Add a module-level cache + clear function in predictionService.js**

At the top of `src/services/predictionService.js` (after imports), add:

```js
const _predictionCache = new Map();

function _cacheKey(raceDate, customDistances, raceConditions) {
  const dist = [...(customDistances || [])]
    .map(d => `${d.label}:${d.meters}`)
    .sort()
    .join(',');
  return JSON.stringify({ raceDate, dist, raceConditions: raceConditions || {} });
}

export function clearPredictionCache() {
  _predictionCache.clear();
}
```

Wrap the body of `generatePredictionsForRaceDate` (around line 18) so it checks the cache first:

```js
  async generatePredictionsForRaceDate(raceDate, customDistances = [], raceConditions = {}) {
    const key = _cacheKey(raceDate, customDistances, raceConditions);
    if (_predictionCache.has(key)) {
      return _predictionCache.get(key);
    }
    const result = await enhancedPredictionService.generatePredictionsForRaceDate(
      raceDate, customDistances, raceConditions
    );
    _predictionCache.set(key, result);
    return result;
  }
```

(Preserve any existing try/catch or logging currently in that method; only add the cache lookup/store around the delegation.)

- [ ] **Step 2: Make the Refresh button clear the cache**

In `src/components/Predictions/PredictionsPage.js`, update the import from predictionService:

```jsx
import predictionService, { clearPredictionCache } from '../../services/predictionService';
```

Change the Refresh button's `onClick` (currently `onClick={loadPredictionsCallback}`, around line 185) to clear the cache first:

```jsx
              onClick={() => { clearPredictionCache(); loadPredictionsCallback(); }}
```

Do the same for the "Try Again" button in the error branch (around line 139).

- [ ] **Step 3: Manual verification**

Run: `npm start`.
Expected:
- First visit to Predictions shows the spinner, then results.
- Navigate away and back: results appear immediately (no spinner) for the same race date.
- Click Refresh: spinner appears and results recompute.

- [ ] **Step 4: Commit**

```bash
git add src/services/predictionService.js src/components/Predictions/PredictionsPage.js
git commit -m "perf: cache prediction results in-memory; Refresh clears cache"
```

---

## Task 7: PB columns — remove dead columns from constants

**Files:**
- Modify: `src/utils/constants.js`

- [ ] **Step 1: Remove always-empty columns from AVAILABLE_COLUMNS**

Delete these entries from `AVAILABLE_COLUMNS` (no Garmin data source): `avgPower`, `maxPower`, `temperature`, `weather`, `location`, `gpsAccuracy`, `deviceType`.

Keep `activityType` and `startTime` (they have data). The resulting performance/activity/technical entries should be:

```js
  { key: 'fullRunDistance', label: 'Run Distance', default: true, description: 'Total distance of the full run', category: 'activity', enabled: true },
  { key: 'averageSpeed', label: 'Avg Speed', default: false, description: 'Average speed in m/s', category: 'performance', enabled: true },
  { key: 'fullRunTime', label: 'Total Time', default: false, description: 'Total time of the full run', category: 'activity', enabled: true },
  { key: 'activityId', label: 'Activity ID', default: false, description: 'Garmin activity ID', category: 'technical', enabled: true },
  { key: 'elevation', label: 'Elevation Gain', default: false, description: 'Elevation gain during segment', category: 'performance', enabled: true },
  { key: 'heartRate', label: 'Avg Heart Rate', default: false, description: 'Average heart rate during segment', category: 'performance', enabled: true },
  { key: 'maxHeartRate', label: 'Max Heart Rate', default: false, description: 'Maximum heart rate during segment', category: 'performance', enabled: true },
  { key: 'cadence', label: 'Avg Cadence', default: false, description: 'Average steps per minute', category: 'performance', enabled: true },
  { key: 'strideLength', label: 'Stride Length', default: false, description: 'Average stride length in meters', category: 'performance', enabled: true },
  { key: 'activityType', label: 'Activity Type', default: false, description: 'Type of activity (Run, TrailRun)', category: 'activity', enabled: true },
  { key: 'startTime', label: 'Start Time', default: false, description: 'Time when activity started', category: 'activity', enabled: true },
```

(Note: `activityType` and `startTime` `enabled` changed to `true` so they appear in the column picker.)

- [ ] **Step 2: Verify no other code imports the removed keys**

Run: `npx grep -rn "avgPower\|maxPower\|gpsAccuracy\|deviceType" src` — if not available, use the editor search.
Expected: matches only in `ResultsTable.js` / `ResultsCards.js` (handled in Task 8). No other references.

- [ ] **Step 3: Commit**

```bash
git add src/utils/constants.js
git commit -m "fix: remove PB columns with no Garmin data source"
```

---

## Task 8: PB render components — drop power cases, add table cases, wire startTime

**Files:**
- Modify: `src/components/PersonalBests/ResultsTable.js`
- Modify: `src/components/PersonalBests/ResultsCards.js`

- [ ] **Step 1: ResultsTable — remove power cases, add activityType/startTime**

In `ResultsTable.js`, delete the `case 'avgPower':` and `case 'maxPower':` blocks (lines ~107-122). Add these cases before `default:`:

```jsx
      case 'activityType':
        return <div className="text-sm text-slate-300">{run.activityType || run.type || 'N/A'}</div>;
      case 'startTime': {
        const t = run.startTime ? new Date(run.startTime) : null;
        return (
          <div className="text-sm text-slate-300">
            {t && !isNaN(t.getTime()) ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
          </div>
        );
      }
```

- [ ] **Step 2: ResultsCards — remove power cases, format startTime**

In `ResultsCards.js`, delete the `case 'avgPower':` and `case 'maxPower':` blocks (lines ~111-131) and the power chip in the "Enhanced metrics" row (lines ~251-253, the `{(run.averagePower || run.average_watts) && (...)}` block).

Replace the existing `case 'startTime':` block with a formatted version:

```jsx
      case 'startTime': {
        const t = run.startTime ? new Date(run.startTime) : null;
        if (!t || isNaN(t.getTime())) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      }
```

Also update the `activityType` case to fall back to `run.type`:

```jsx
      case 'activityType': {
        const at = run.activityType || run.type;
        if (!at) return null;
        return (
          <div className="text-sm">
            <span className="text-slate-400">{column.label}:</span>
            <span className="text-white ml-2">{at}</span>
          </div>
        );
      }
```

- [ ] **Step 3: Manual verification**

Run: `npm start`, open Personal Bests. Open the column picker.
Expected:
- Avg Power, Max Power, Temperature, Weather, GPS Accuracy, Device no longer listed.
- Activity Type and Start Time are selectable and show real values (not N/A).
- HR, Cadence, Elevation, Stride populate for stream-computed segments.
- No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PersonalBests/ResultsTable.js src/components/PersonalBests/ResultsCards.js
git commit -m "fix: PB tables drop power, add activity type/start time rendering"
```

---

## Task 9: localStorage column hygiene

**Files:**
- Modify: `src/components/PersonalBests/PersonalBests.js`

Ensure saved `visibleColumns` referencing removed keys don't linger.

- [ ] **Step 1: Filter loaded columns against AVAILABLE_COLUMNS**

In the mount effect that parses `savedColumns` (around lines 34-75), after computing `parsedColumns`, filter to valid keys. Add a valid-key set at the top of the effect:

```jsx
    const validKeys = new Set(AVAILABLE_COLUMNS.map(c => c.key));
```

Then wherever `setVisibleColumns(parsedColumns)` / the rank-normalised arrays are set from saved data, filter first, e.g. replace the normalised assignment with:

```jsx
        const cleaned = parsedColumns.filter(col => validKeys.has(col));
        const withRank = cleaned.includes('rank') ? cleaned : ['rank', ...cleaned];
        const ordered = withRank[0] === 'rank' ? withRank : ['rank', ...withRank.filter(c => c !== 'rank')];
        setVisibleColumns(ordered);
```

(Apply the same `validKeys.has` filter to the branch that reads `columnSettings` if it maps removed keys.)

- [ ] **Step 2: Manual verification**

Run: `npm start`. In DevTools console, seed a stale value:
`localStorage.setItem('visibleColumns', JSON.stringify(['rank','time','avgPower','maxPower']))`, reload Personal Bests.
Expected: table renders with rank + time only (avgPower/maxPower dropped), no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PersonalBests/PersonalBests.js
git commit -m "fix: drop removed column keys from saved PB column settings"
```

---

## Task 10: Full test + lint sweep

- [ ] **Step 1: Run the unit tests**

Run: `npx react-scripts test src/utils/goalUtils.test.js --watchAll=false`
Expected: all goalUtils tests PASS.

- [ ] **Step 2: Lint the changed files**

Run: `npx eslint src/utils/goalUtils.js src/components/Homepage/GoalCard.js src/components/Homepage/Homepage.js src/components/Settings/SettingsWorking.js src/services/predictionService.js src/components/Predictions/PredictionsPage.js src/utils/constants.js src/components/PersonalBests/ResultsTable.js src/components/PersonalBests/ResultsCards.js src/components/PersonalBests/PersonalBests.js`
Expected: no errors.

- [ ] **Step 3: Manual smoke test of all four features**

- Home: range selector switches totals; goal card shows progress + both projections; behind/on-track colours correct.
- Settings: default range + goal persist.
- Predictions: instant on revisit, recompute on Refresh.
- PBs: no dead columns; Activity Type / Start Time populate.

- [ ] **Step 4: Final commit (if any lint fixes were needed)**

```bash
git add -A
git commit -m "chore: lint fixes for home goals + PB column work"
```

---

## Self-review notes

- **Spec coverage:** range selector (Task 4) + default range setting (Task 5); goal card + projections (Tasks 1-3, 5); independent-of-selector goal (Task 4 mounts GoalCard from settings, not `range`); predictions cache + Refresh clear (Task 6); PB column removals + wired columns + localStorage hygiene (Tasks 7-9). All spec sections mapped.
- **Type consistency:** `getPeriodWindow` / `computeGoalProgress` signatures and the `{ periodTotal, percent, remaining, daysElapsed, daysInPeriod, projections: { paceToDate, recentTrend } }` shape are consistent across Tasks 1-3. `clearPredictionCache` named export used consistently in Task 6. `goal` shape `{ enabled, period, metric, target }` consistent in Tasks 3/5.
- **Projection semantics:** pace-to-date = linear extrapolation of total; recent-trend = current total + last-28-day daily rate × days remaining. Both explicit in Task 2 tests.
