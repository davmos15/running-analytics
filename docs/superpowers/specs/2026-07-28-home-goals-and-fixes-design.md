# Home Dashboard Goals + Range Selector, Predictions Caching, PB Column Cleanup

Date: 2026-07-28
Status: Approved (design)

## Overview

Four related pieces of work, batched into one spec:

1. **Home page range selector** — let the totals cards show All Time, This Year, or a
   specific past year, with a configurable default.
2. **Home page goal + projection card** — a configurable goal (period + metric + target)
   with progress and two projections.
3. **Predictions caching** — stop recomputing the full ML prediction on every page visit.
4. **PBs column cleanup** — make the Personal Bests columns honest against what Garmin
   actually provides (remove always-empty columns, wire up the ones that have data).

These are independent enough to implement and test in isolation, but share the Settings
page and the `homepageSettings` localStorage object, so they are specced together.

## Context / current state

- Home totals come from `useHomepageSummary` / `firebaseService.getRunningStatsSummary()`
  and are **all-time only**. `Homepage.js` uses `getRunningStatsSummary()` directly.
- `firebaseService.getActivities(timeFilter, from, to)` already supports `all-time`,
  `this-year`, and `custom` (with explicit from/to), filtering in memory. Firebase reads
  are cached 5 minutes via `getCachedQuery`.
- There is **no** goal or projection concept anywhere today.
- `PredictionsPage.js` holds all state locally and re-runs
  `predictionService.generatePredictionsForRaceDate(...)` on every mount. Firebase reads
  are cached, but the **computed prediction result is not**, so navigating to the page
  always shows the loading spinner while it recomputes (VDOT fits, per-distance binary
  searches, training metrics).
- Garmin ingestion (`scripts/garmin_activity.py`, `scripts/garmin_streams.py`) stores:
  activity: `distance`, `moving_time`, `elapsed_time`, `total_elevation_gain`,
  `average_heartrate`, `max_heartrate`, `average_cadence`, `average_speed`, `vo2max`,
  `type`, `start_date`/`start_date_local`, `name`; streams: `time`, `distance`,
  `heartrate`, `cadence`, `velocity_smooth` (speed), `altitude`, `latlng`.
  There is **no power/watts stream** and **no weather / GPS-accuracy / device** data.
- `segmentEngine.calculateSegmentMetrics` computes per-segment HR, max HR, cadence,
  elevation gain, and stride length (from cadence + velocity) from streams. Power is
  computed only if a `watts` stream exists — it never does for Garmin.
- `AVAILABLE_COLUMNS` in `src/utils/constants.js` still lists Avg Power, Max Power,
  Temperature, Weather, Activity Type, Start Time, Location, GPS Accuracy, Device — none
  of which have a working Garmin data path, so they render `N/A` by design.

## 1. Home page — range selector for totals

**UI:** A range selector at the top of the totals section:
`All Time · This Year · [year dropdown]`. The year dropdown lists calendar years spanned
by the user's activity data (min activity year → current year).

**Behaviour:**
- Selection drives the three totals cards (Total Distance / Total Time / Total Runs).
- Totals are computed from activities filtered by the selected range:
  - All Time → `getActivities('all-time')`
  - This Year → `getActivities('this-year')`
  - Specific year Y → `getActivities('custom', 'Y-01-01', 'Y-12-31')`
- Filter to run types (`Run`, `TrailRun`, `VirtualRun`) and sum distance (÷1000 for km),
  elapsed/moving time, and count — same reduction currently in `useHomepageSummary`.
- The **default** range comes from a new `defaultHomeRange` setting (see Settings). The
  on-page selector overrides it for the current session only (not persisted).

**Note:** This replaces the direct `getRunningStatsSummary()` call in `Homepage.js` with a
range-aware totals computation. PB cards remain all-time (unchanged).

## 2. Home page — goal + projection card

A new **Goal card** on the home page, independent of the range selector. It always shows
the **current** period (this week / this month / this year), regardless of what the totals
range selector is set to.

**Config (in Settings, stored in `homepageSettings.goal`):**
- `period`: `'weekly' | 'monthly' | 'yearly'` (default `'yearly'`)
- `metric`: `'distance' | 'time'` (toggle; default `'distance'`)
- `target`: number — km for distance, hours for time
- Optional `enabled` flag so the card can be hidden.

**Current-period window:**
- weekly → Monday 00:00 of the current week → now; period length 7 days.
- monthly → 1st of current month → now; period length = days in month.
- yearly → Jan 1 of current year → now; period length = 365/366.

**Card contents:**
- Header naming the period and metric (e.g. "2026 Distance Goal").
- Progress bar: current-period total vs `target`, with % complete and remaining
  (e.g. "1,240 / 2,000 km — 62%, 760 km to go").
- **Two projections shown together:**
  - *Pace-to-date*: `total / daysElapsed * daysInPeriod`.
  - *Recent trend*: average daily rate over the last **4 weeks** (28 days) × `daysInPeriod`.
    For a weekly period the window is still 28 days of history to smooth noise.
  - Each projection shows the projected end value and an on-track indicator
    (ahead / behind target, and by how much).
- Current-period total is computed from the same activity data (run types only), summing
  distance (km) or time (hours) within the current-period window.

**Projection math lives in a pure, unit-tested helper** (`goalUtils.js`): given the set of
activities, period type, metric, target, and "now", it returns
`{ periodTotal, percent, remaining, projections: { paceToDate, recentTrend }, daysElapsed, daysInPeriod }`.

## 3. Predictions — stop recomputing every visit

Add an **in-memory module-level cache** in the prediction service:
- Key: a stable string built from `raceDate` + sorted `customDistances` + `raceConditions`.
- `generatePredictionsForRaceDate(...)` returns the cached result when the key matches;
  otherwise computes, stores, and returns.
- Add an explicit `clearCache()` (or a `force` argument) used by the **Refresh** button in
  `PredictionsPage.js` so users can force a recompute.
- Cache lives for the JS session; a full page reload clears it (acceptable — avoids stale
  predictions after a new sync).

Result: navigating to Predictions after the first computation is instant; the spinner only
appears on first compute, on Refresh, or after a reload.

## 4. PBs — honest Garmin columns

**Remove** always-empty columns (no Garmin data source) from `AVAILABLE_COLUMNS`:
`avgPower`, `maxPower`, `temperature`, `weather`, `gpsAccuracy`, `deviceType`, `location`.

**Wire up** columns that have data but weren't rendered:
- `activityType` — from segment/activity `type`.
- `startTime` — from segment `startTime` (already stored), formatted as a time.

Add render cases for these in `ResultsTable.js` and `ResultsCards.js`.

**Keep & verify** the real Garmin columns populate correctly: `time`, `pace`, `date`,
`runName`, `segment`, `fullRunDistance`, `fullRunTime`, `averageSpeed`, `heartRate`,
`maxHeartRate`, `cadence`, `elevation`, `strideLength`, `activityId`.

**localStorage hygiene:** On load, filter `visibleColumns` and `columnSettings` to only keys
that still exist in `AVAILABLE_COLUMNS`, so removed keys don't linger or break rendering.

## Settings changes (`SettingsWorking.js`)

- **Default Home Range** control: All Time / This Year (stored as
  `homepageSettings.defaultHomeRange`, default `'all-time'`).
- **Goal** controls: period select, metric toggle, target input (stored as
  `homepageSettings.goal`).
- Column management already reads `AVAILABLE_COLUMNS`; it will automatically reflect the
  removed/added columns.

## Data model / storage

All new config lives in the existing `homepageSettings` localStorage object:

```
homepageSettings = {
  ...existing (showGraphs, showTotals, showPBs, selectedGraphs, pbDistances),
  defaultHomeRange: 'all-time',              // 'all-time' | 'this-year'
  goal: { enabled: true, period: 'yearly', metric: 'distance', target: 2000 }
}
```

## Files touched

- `src/components/Homepage/Homepage.js` — range selector, year-filtered totals, mount GoalCard.
- `src/components/Homepage/GoalCard.js` — new component.
- `src/utils/goalUtils.js` (+ `goalUtils.test.js`) — pure projection/progress math.
- `src/components/Settings/SettingsWorking.js` — default range + goal config controls.
- `src/services/predictionService.js` / `predictionServiceEnhanced.js` — result cache + clear.
- `src/components/Predictions/PredictionsPage.js` — Refresh clears cache.
- `src/utils/constants.js` — `AVAILABLE_COLUMNS` cleanup.
- `src/components/PersonalBests/ResultsTable.js`, `ResultsCards.js` — new render cases,
  removed dead ones.
- `src/components/PersonalBests/PersonalBests.js` — localStorage column hygiene.

## Testing

- `goalUtils` unit tests: progress %, remaining, both projections, on-track flags, across
  weekly/monthly/yearly and both metrics, including edge cases (day 1 of period, zero data).
- Prediction cache: same key returns identical object without recompute; different key or
  Refresh recomputes.
- PB columns: removed keys no longer appear; `activityType`/`startTime` render; verify HR /
  cadence / elevation / stride show values for stream-computed segments.
- Manual: home range selector switches totals; goal card reflects settings changes.

## Out of scope / YAGNI

- Multiple simultaneous goals (only one goal at a time).
- Persisting the on-page range selection or persisting predictions across reloads.
- Backfilling old basic segments that lack stream-derived metrics.
- Any new Garmin data (power, weather) — not ingested, so not surfaced.
