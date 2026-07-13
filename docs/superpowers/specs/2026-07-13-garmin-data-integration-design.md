# Garmin Data Integration — Design Spec

**Date:** 2026-07-13
**Status:** Approved design, pending implementation plan
**Author:** Dave + Claude

## Problem

As of 30 June 2026, Strava's Standard-tier API access (which `running-analytics`
uses via the `activity:read_all` OAuth flow) requires an active paid Strava
subscription (~$11.99/month). Without it, API calls are rejected — the app can
no longer sync. Logging in/out does not help because the token exchange succeeds
but the data endpoints reject the unsubscribed account.

Strava still lets users export their own data for free, and device integrations
(Garmin → Strava upload) are unaffected — but *reading data back out via the API*
is now paywalled.

## Goal

Replace Strava as the data source with **Garmin Connect**, pulled automatically
(no manual steps, no subscription, no per-call cost), at **full fidelity** — GPS
+ per-second streams — so every existing feature keeps working:

- Personal Bests at arbitrary distances (fastest 5 km inside a long run, etc.)
- Per-kilometre elevation profiles
- Road / suburb coverage maps
- Race predictions and training metrics

## Non-negotiable constraint: no PB drift

Personal Bests are produced by an intricate sliding-window algorithm in
`src/services/firebaseService.js` (`findFastestSegment` / `findBestSegmentsFromStreams`).
The switch to Garmin must not change any historical PB time. The design reuses
this exact code rather than reimplementing it, and adds a golden test to prove
equality.

## Chosen approach (Approach A)

Python pulls Garmin and writes activities + streams; the existing JavaScript
segment algorithm (run under Node) computes PBs. Two stages, chained on a daily
Windows Task Scheduler job — the same proven pattern as the `life-os` project.

Rejected alternatives:
- **B — port the PB algorithm to Python:** single language, but risks PB drift.
- **C — host in GitHub Actions:** truly PC-off, but more setup. A can graduate to
  C later with no code changes (garth supports a `GARMIN_TOKEN_STORE` secret).

## Architecture

```
Garmin Connect
   │  (garth, token auth — reuses life-os token)
   ▼
Stage 1: scripts/garmin_sync.py  (Python)
   ├─ activities/{garminActivityId}   → Firestore   (Strava-shaped fields)
   └─ streams/{garminActivityId}.json → Firebase Storage (gzipped)
   ▼
Stage 2: scripts/computeSegments.mjs (Node)
   ├─ reads streams from Storage
   ├─ runs src/services/segmentEngine.js (extracted from firebaseService.js)
   ├─ segments/{...}                  → Firestore   (Personal Bests)
   └─ folds activity metrics back onto activities/{id}
   ▼
React app (Firebase Hosting) — reads Firestore + Storage, unchanged UX
```

### Component 1 — Garmin auth

- Reuse `life-os/.garmin_tokens` (same Garmin account) via `garth.resume()`.
- No login in the sync path — only the data API (`connectapi`), which is not
  Cloudflare-blocked, so it runs headless.
- One-time re-bootstrap (`garmin_bootstrap.py`, needs `curl_cffi`) only if the
  token ever expires.

### Component 2 — Stage 1: `scripts/garmin_sync.py`

- Auth via garth; list activities in ~28-day windows (a single wide-range call
  gets throttled and returns only recent activities).
- Keep running types: `running`, `trail_running`, `treadmill_running`,
  `virtual_run` → map to app `type` values `Run` / `TrailRun` / `VirtualRun`.
- For each run, fetch detailed samples (Garmin activity-details JSON:
  per-sample timestamp, lat/long, altitude, HR, cadence, speed). Fall back to
  parsing the `.fit` binary (`fitdecode`) if the details endpoint lacks a field.
- Build **Strava-shaped stream arrays**:
  `time, distance, latlng ([[lat,lng],…]), altitude, heartrate, cadence, velocity_smooth`.
- Write `activities/{garminActivityId}` doc with the fields the app reads:
  `start_date`, `start_date_local`, `distance` (m), `moving_time` (s),
  `elapsed_time`, `type`, `name`, `total_elevation_gain`, `average_heartrate`,
  `max_heartrate`, `average_cadence`, `average_speed`, `workout_type` (mapped
  where Garmin provides it).
- Save streams to Firebase Storage as gzipped `streams/{id}.json` (Firestore's
  1 MB doc limit is too small for long-run streams).
- **Cadence mapping (critical):** the app treats running cadence as *per-leg*
  (Strava convention — see the stride-length comment in `firebaseService.js`).
  Garmin reports *both-legs* cadence, so Stage 1 halves it. Otherwise cadence
  and stride-length values double.
- Idempotent: `garminActivityId` is the doc id, so re-runs upsert. Supports
  `--days N`, `--start/--end`, and `--backfill` (full history).

### Component 3 — Stage 2: `scripts/computeSegments.mjs`

- Extract the pure, dependency-free functions from `firebaseService.js` into a
  new `src/services/segmentEngine.js`:
  `findFastestSegment`, `findBestSegmentsFromStreams`, `calculateActivityMetrics`,
  `calculateSegmentMetrics`, `calculatePace`, and the distance table.
- `firebaseService.js` imports from `segmentEngine.js` — browser and Node run
  identical code, guaranteeing identical PBs.
- Node script: for each new (or, during backfill, every) activity, load streams
  from Storage, run `findBestSegmentsFromStreams`, write `segments/{...}` docs,
  and fold `calculateActivityMetrics` back onto the activity doc — via
  firebase-admin.

### Component 4 — Orchestration

- `scripts/garmin_sync.bat` runs Stage 1 then Stage 2.
- Registered in Windows Task Scheduler for a daily unattended run (mirrors
  life-os).
- One-time `--backfill` run imports full history.

### Component 5 — React app changes

- Remove Strava OAuth/login; repurpose the sync button to show "last synced"
  status.
- Repoint `firebaseService.getActivityStreams` to read gzipped streams from
  Firebase Storage instead of the Strava API (used by `ElevationProfileKM` and
  `RoadCoverage`).
- Drop `REACT_APP_STRAVA_*` env vars. No new secrets reach the browser — the
  service-account key is server-side only.
- `firestore.rules`: activities/segments stay client-readable; writes happen via
  the admin SDK (bypasses rules), so client writes remain locked down.

### Component 6 — Full re-backfill & data reset

Garmin becomes the single source of truth, and doc IDs change from Strava IDs to
Garmin IDs. To avoid every run appearing twice:

1. Export a backup of the current `activities` and `segments` collections.
2. Wipe those collections (guarded — only after the backup succeeds).
3. Run the full Garmin `--backfill`.

## Data flow summary

Garmin Connect → (Python/garth, parse) → Firestore `activities` + Storage
`streams/{id}.json` → (Node segmentEngine) → Firestore `segments` → React app
reads Firestore + Storage (unchanged user experience).

## Error handling

- Reuse life-os retry/backoff (`safe_api`) for Garmin throttling (429/5xx).
- Indoor/treadmill runs without GPS: still write an activity doc; compute
  segments from distance/time where present, skip lat/long.
- Firestore/Storage writes retried; idempotent upserts keyed by activity id.
- Logging to `scripts/logs/`.

## Testing

- **Golden PB test:** unit-test `segmentEngine.js` against a known run's streams,
  asserting computed PB times equal current production values. This is the safety
  net proving no PB drift.
- **Mapping test:** validate Garmin→stream conversion on one real activity
  (stream lengths align across time/distance/latlng; cadence halved).
- **Dry-run mode:** parse + log, no writes — validate before touching Firestore.

## Prerequisites (at implementation time)

- Firebase **service-account key** for the running-analytics project (server-side
  only).
- Confirm the life-os Garmin token is still valid (life-os syncs daily, so it
  should be).
- Restore the local working tree first: it currently shows all tracked files as
  deleted (they exist in git, not on disk). `git restore .` recovers them; nothing
  is lost.

## Out of scope (YAGNI)

- Cloud/GitHub-Actions hosting (Approach C) — a later, code-free upgrade.
- Non-running activity types (cycling, etc.) — the app is running-only.
- Any change to prediction/training-metric logic beyond what a source swap
  requires.
```