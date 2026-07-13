# Garmin Data Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the (now paywalled) Strava API as `running-analytics`' data source with Garmin Connect, pulled automatically at full fidelity, without changing any historical Personal Best.

**Architecture:** A two-stage daily pipeline. Stage 1 (Python + `garth`) pulls Garmin activities, converts them to Strava-shaped stream arrays, and writes `activities` docs to Firestore + gzipped streams to Firebase Storage. Stage 2 (Node) runs the app's *existing* PB algorithm — extracted into a shared `segmentEngine` module — over those streams to write `segments` docs. The React app reads Firestore + Storage unchanged.

**Tech Stack:** Python 3.12 (`garth`, `firebase-admin`, `fitdecode`, `requests`, `pytest`); Node 18+ (`firebase-admin`); existing React 18 / Firebase JS SDK app; Jest (via `react-scripts test`).

---

## Reference facts (verified against the codebase)

- The app reads two Firestore collections: `activities` (doc id = activity id; Strava-shaped fields `start_date`, `distance` in metres, `moving_time` in seconds, `type` ∈ `Run`/`TrailRun`/`VirtualRun`, `name`, `average_heartrate`, `max_heartrate`, `average_cadence`, `total_elevation_gain`, `workout_type`) and `segments` (best effort per distance).
- Stream shape the app consumes (see `findBestSegmentsFromStreams` in `src/services/firebaseService.js`): an object of `{ time:{data:[...]}, distance:{data:[...]}, heartrate:{data}, cadence:{data}, altitude:{data}, watts:{data}, velocity_smooth:{data}, latlng:{data:[[lat,lng],...]} }`. Distance is cumulative metres; time is cumulative seconds.
- Cadence in the app is **per-leg** (Strava convention). See the stride-length comment in `calculateActivityMetrics`: `strideLen = (speed*60)/cadence`. Garmin reports both-legs cadence → must be halved.
- The pure PB functions currently living in `src/services/firebaseService.js`: `calculateActivityMetrics` (~L85-155), `extractSegmentsFromActivity` (~L736-819), `findBestSegmentsFromStreams` (~L822-918), `calculateSegmentMetrics` (~L921-993), `findFastestSegment` (~L996-1046), `calculatePace` (~L1079-1085). The 100 m→42.2 km distance table is duplicated inside two of them.
- The working tree is currently empty (all tracked files show as deleted; they exist in git). Task 0 restores it.
- Proven reference implementation for Garmin auth + activity listing: `../life-os/scripts/garmin_sync.py` (uses `garth.resume()`, `garth.connectapi()`, 28-day windowed listing, retry/backoff `safe_api`).

---

## Task 0: Restore working tree & scaffold tooling

**Files:**
- Restore: entire tracked tree
- Create: `scripts/` (dir), `scripts/logs/.gitkeep`, `tests/python/` (dir), `requirements-garmin.txt`

- [ ] **Step 1: Restore the deleted working tree**

Run:
```powershell
git restore .
git status --short
```
Expected: no more `D` lines; `git status` shows only the untracked `docs/superpowers/plans/` file (this plan). All `src/`, `package.json`, etc. are back on disk.

- [ ] **Step 2: Confirm the app still builds**

Run:
```powershell
npm install
npm run build
```
Expected: `Compiled ... build folder is ready to be deployed`. (If it fails, stop — the tree restore is incomplete.)

- [ ] **Step 3: Create the Python requirements file**

Create `requirements-garmin.txt`:
```
garth==0.8.0
requests==2.32.3
firebase-admin==6.5.0
fitdecode==0.10.0
pytest==8.2.2
```

- [ ] **Step 4: Create Python env and install**

Run:
```powershell
py -3.12 -m venv .venv-garmin
.\.venv-garmin\Scripts\python.exe -m pip install --upgrade pip
.\.venv-garmin\Scripts\python.exe -m pip install -r requirements-garmin.txt
```
Expected: installs succeed. `fitdecode` and `firebase-admin` present.

- [ ] **Step 5: Add Node admin dep and ignore secrets**

Run:
```powershell
npm install --save-dev firebase-admin
```
Append to `.gitignore`:
```
# Garmin sync
.venv-garmin/
.garmin_tokens/
serviceAccountKey.json
scripts/logs/*.log
backups/
```
Create empty file `scripts/logs/.gitkeep`.

- [ ] **Step 6: Commit**

```powershell
git add requirements-garmin.txt .gitignore scripts/logs/.gitkeep package.json package-lock.json docs/superpowers/plans/2026-07-13-garmin-data-integration.md
git commit -m "chore: scaffold Garmin sync tooling (python env, node admin, gitignore)"
```

---

## Task 1: Extract the PB algorithm into a shared `segmentEngine` module

This is the linchpin for "no PB drift": we *move* the existing functions verbatim (CommonJS) so the browser and the Node sync run identical code.

**Files:**
- Create: `src/services/segmentEngine.js`
- Create: `src/services/segmentEngine.test.js`
- Modify: `src/services/firebaseService.js` (replace inlined functions with calls into the engine)

- [ ] **Step 1: Write the failing test**

Create `src/services/segmentEngine.test.js`:
```javascript
const engine = require('./segmentEngine');

// Synthetic run: 10 points, 100m apart, constant 10s per 100m,
// except points 3->4 which are a fast 5s split. Distances cumulative metres.
const distance = { data: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900] };
const time =     { data: [0,  10,  20,  30,  35,  45,  55,  65,  75,  85] };

test('findFastestSegment returns the fastest 100m window', () => {
  const seg = engine.findFastestSegment(distance.data, time.data, 100);
  expect(seg).not.toBeNull();
  expect(seg.time).toBe(5);            // the 300->400 split
  expect(seg.startDistance).toBe(300);
  expect(seg.endDistance).toBe(400);
});

test('calculatePace formats min:sec per km', () => {
  // 300s over 1000m = 5:00/km
  expect(engine.calculatePace(300, 1000)).toBe('5:00');
});

test('findBestSegmentsFromStreams produces a 100m segment for a >=100m run', async () => {
  const activity = { id: 'x', name: 'Test', type: 'Run', distance: 900,
    moving_time: 85, start_date: '2026-01-01T00:00:00Z' };
  const streams = { distance, time };
  const segs = await engine.findBestSegmentsFromStreams(activity, streams);
  const oneHundred = segs.find(s => s.distance === '100m');
  expect(oneHundred).toBeDefined();
  expect(oneHundred.time).toBe(5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx react-scripts test src/services/segmentEngine.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './segmentEngine'`.

- [ ] **Step 3: Create `segmentEngine.js` by moving the pure functions**

Create `src/services/segmentEngine.js`. Move these functions **verbatim** out of `firebaseService.js` (converting `this.` calls to plain calls and removing the class-method syntax): `findFastestSegment`, `findBestSegmentsFromStreams`, `calculateSegmentMetrics`, `calculateActivityMetrics`, `extractSegmentsFromActivity`, `calculatePace`. Hoist the distances table to a single shared const.

```javascript
// src/services/segmentEngine.js
// Pure, dependency-free running-analytics segment/PB math.
// Shared by the browser (firebaseService.js) and the Node sync (computeSegments.js)
// so PBs are computed identically in both. NO firebase / browser imports here.

const DISTANCES = [
  { name: '100m', meters: 100 }, { name: '200m', meters: 200 },
  { name: '400m', meters: 400 }, { name: '800m', meters: 800 },
  { name: '1K', meters: 1000 }, { name: 'Mile', meters: 1609 },
  { name: '1.5K', meters: 1500 }, { name: '2K', meters: 2000 },
  { name: '3K', meters: 3000 }, { name: '4K', meters: 4000 },
  { name: '5K', meters: 5000 }, { name: '6K', meters: 6000 },
  { name: '7K', meters: 7000 }, { name: '8K', meters: 8000 },
  { name: '9K', meters: 9000 }, { name: '10K', meters: 10000 },
  { name: '11K', meters: 11000 }, { name: '12K', meters: 12000 },
  { name: '13K', meters: 13000 }, { name: '14K', meters: 14000 },
  { name: '15K', meters: 15000 }, { name: '16K', meters: 16000 },
  { name: '17K', meters: 17000 }, { name: '18K', meters: 18000 },
  { name: '19K', meters: 19000 }, { name: '20K', meters: 20000 },
  { name: '21.1K', meters: 21097.5 }, { name: '25K', meters: 25000 },
  { name: '30K', meters: 30000 }, { name: '35K', meters: 35000 },
  { name: '40K', meters: 40000 }, { name: '42.2K', meters: 42195 },
];

function calculatePace(timeSeconds, distanceMeters) {
  const pacePerKm = (timeSeconds / 60) / (distanceMeters / 1000);
  const minutes = Math.floor(pacePerKm);
  const seconds = Math.round((pacePerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ... PASTE the bodies of findFastestSegment, calculateSegmentMetrics,
// calculateActivityMetrics, findBestSegmentsFromStreams, extractSegmentsFromActivity
// here, verbatim from firebaseService.js, replacing every `this.calculatePace(`
// with `calculatePace(`, `this.findFastestSegment(` with `findFastestSegment(`,
// `this.calculateSegmentMetrics(` with `calculateSegmentMetrics(`,
// `this.extractSegmentsFromActivity(` with `extractSegmentsFromActivity(`, and
// replacing each inline `const distances = [ ... ]` with `const distances = DISTANCES;`.

module.exports = {
  DISTANCES,
  calculatePace,
  findFastestSegment,
  calculateSegmentMetrics,
  calculateActivityMetrics,
  findBestSegmentsFromStreams,
  extractSegmentsFromActivity,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx react-scripts test src/services/segmentEngine.test.js --watchAll=false`
Expected: 3 passing tests.

- [ ] **Step 5: Refactor `firebaseService.js` to use the engine**

At the top of `src/services/firebaseService.js` add:
```javascript
import segmentEngine from './segmentEngine';
```
Delete the moved method bodies and replace each remaining internal call site so the class delegates. For each of the six functions, replace the class method with a thin delegator, e.g.:
```javascript
  calculatePace(timeSeconds, distanceMeters) {
    return segmentEngine.calculatePace(timeSeconds, distanceMeters);
  }
  findFastestSegment(distanceStream, timeStream, targetDistance) {
    return segmentEngine.findFastestSegment(distanceStream, timeStream, targetDistance);
  }
  calculateSegmentMetrics(...args) { return segmentEngine.calculateSegmentMetrics(...args); }
  calculateActivityMetrics(streams) { return segmentEngine.calculateActivityMetrics(streams); }
  async findBestSegmentsFromStreams(activity, streams) {
    return segmentEngine.findBestSegmentsFromStreams(activity, streams);
  }
  extractSegmentsFromActivity(activity) {
    return segmentEngine.extractSegmentsFromActivity(activity);
  }
```
Keep all *other* methods (Firestore reads/writes, `saveSegment`, `getPersonalBests`, etc.) unchanged — they still call `this.findBestSegmentsFromStreams(...)` etc., which now delegate.

- [ ] **Step 6: Verify the app still builds and existing tests pass**

Run:
```powershell
npm run build
npx react-scripts test --watchAll=false
```
Expected: build succeeds; the segmentEngine tests pass; no new failures.

- [ ] **Step 7: Commit**

```powershell
git add src/services/segmentEngine.js src/services/segmentEngine.test.js src/services/firebaseService.js
git commit -m "refactor: extract PB/segment math into shared segmentEngine module"
```

---

## Task 2: Garmin auth wrapper (Python)

**Files:**
- Create: `scripts/garmin_auth.py`
- Create: `tests/python/test_garmin_auth.py`

- [ ] **Step 1: Write the failing test (token-dir resolution)**

Create `tests/python/test_garmin_auth.py`:
```python
import os
from scripts import garmin_auth

def test_resolve_token_dir_prefers_env(monkeypatch, tmp_path):
    monkeypatch.setenv("GARMIN_TOKEN_DIR", str(tmp_path))
    assert garmin_auth.resolve_token_dir() == str(tmp_path)

def test_resolve_token_dir_defaults_to_life_os(monkeypatch):
    monkeypatch.delenv("GARMIN_TOKEN_DIR", raising=False)
    d = garmin_auth.resolve_token_dir()
    assert d.endswith(".garmin_tokens")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\.venv-garmin\Scripts\python.exe -m pytest tests/python/test_garmin_auth.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.garmin_auth'` (create `scripts/__init__.py` and `tests/python/__init__.py` empty files if import errors persist).

- [ ] **Step 3: Implement `garmin_auth.py`**

Create `scripts/garmin_auth.py`:
```python
"""Garmin auth via garth token resume. Reuses the life-os token by default."""
import logging
import os

log = logging.getLogger("garmin.auth")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
# Default to this project's own token dir; fall back to the life-os one if present.
LIFE_OS_TOKENS = os.path.abspath(os.path.join(PROJECT_DIR, "..", "life-os", ".garmin_tokens"))
LOCAL_TOKENS = os.path.join(PROJECT_DIR, ".garmin_tokens")


def resolve_token_dir():
    env = os.environ.get("GARMIN_TOKEN_DIR")
    if env:
        return env
    if os.path.exists(os.path.join(LOCAL_TOKENS, "oauth1_token.json")):
        return LOCAL_TOKENS
    if os.path.exists(os.path.join(LIFE_OS_TOKENS, "oauth1_token.json")):
        return LIFE_OS_TOKENS
    return LOCAL_TOKENS  # default path (may not exist yet -> caller errors clearly)


def authenticate():
    import garth
    token_dir = resolve_token_dir()
    if not os.path.exists(os.path.join(token_dir, "oauth1_token.json")):
        raise SystemExit(
            f"No Garmin tokens at {token_dir}. Copy life-os/.garmin_tokens here "
            f"or run life-os/scripts/garmin_bootstrap.py.")
    garth.resume(token_dir)
    dn = garth.client.profile["displayName"]
    log.info("Authenticated as %s", garth.client.profile.get("fullName") or dn)
    return dn
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\.venv-garmin\Scripts\python.exe -m pytest tests/python/test_garmin_auth.py -v`
Expected: 2 passing tests.

- [ ] **Step 5: Manual auth smoke check**

Run:
```powershell
.\.venv-garmin\Scripts\python.exe -c "import logging; logging.basicConfig(level='INFO'); from scripts.garmin_auth import authenticate; print('displayName:', authenticate())"
```
Expected: prints your Garmin display name. If it errors about tokens, copy `..\life-os\.garmin_tokens` into the project root (or set `GARMIN_TOKEN_DIR`).

- [ ] **Step 6: Commit**

```powershell
git add scripts/garmin_auth.py scripts/__init__.py tests/python/__init__.py tests/python/test_garmin_auth.py
git commit -m "feat: Garmin garth auth wrapper reusing life-os token"
```

---

## Task 3: Capture real Garmin sample fixtures

We build parsers against *real* captured JSON, not guesses about Garmin's field names.

**Files:**
- Create: `scripts/capture_samples.py`
- Create: `tests/fixtures/garmin_activity_summary.json` (generated)
- Create: `tests/fixtures/garmin_activity_details.json` (generated)

- [ ] **Step 1: Write the capture script**

Create `scripts/capture_samples.py`:
```python
"""One-off: fetch one running activity's summary + details and save as fixtures."""
import json, os, garth
from scripts.garmin_auth import authenticate

FIX = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures")

def main():
    dn = authenticate()
    acts = garth.connectapi(
        "/activitylist-service/activities/search/activities?start=0&limit=20") or []
    run = next((a for a in acts if "running" in
                ((a.get("activityType") or {}).get("typeKey", "")).lower()), None)
    if not run:
        raise SystemExit("No running activity found in the last 20 activities.")
    aid = run["activityId"]
    details = garth.connectapi(
        f"/activity-service/activity/{aid}/details?maxChartSize=2000&maxPolylineSize=4000")
    os.makedirs(FIX, exist_ok=True)
    with open(os.path.join(FIX, "garmin_activity_summary.json"), "w") as f:
        json.dump(run, f, indent=2)
    with open(os.path.join(FIX, "garmin_activity_details.json"), "w") as f:
        json.dump(details, f, indent=2)
    print(f"Saved fixtures for activity {aid} "
          f"({run.get('activityName')}, {run.get('distance')}m)")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it to capture fixtures**

Run: `.\.venv-garmin\Scripts\python.exe -m scripts.capture_samples`
Expected: prints "Saved fixtures for activity ..."; two JSON files appear in `tests/fixtures/`.

- [ ] **Step 3: Inspect the details metric descriptors**

Run:
```powershell
.\.venv-garmin\Scripts\python.exe -c "import json; d=json.load(open('tests/fixtures/garmin_activity_details.json')); print([m['key'] for m in d['metricDescriptors']])"
```
Expected: a list including keys like `directTimestamp`/`sumElapsedDuration`, `sumDistance`, `directLatitude`, `directLongitude`, `directElevation`, `directHeartRate`, `directRunCadence`/`directDoubleCadence`, `directSpeed`. **Record the exact keys printed** — Task 4's mapping uses them.

- [ ] **Step 4: Commit the fixtures**

Fixtures contain your GPS tracks. If that's acceptable for this private repo, commit; otherwise add `tests/fixtures/` to `.gitignore` and keep them local (Task 4's test will then be a local-only check).
```powershell
git add scripts/capture_samples.py tests/fixtures/garmin_activity_summary.json tests/fixtures/garmin_activity_details.json
git commit -m "test: capture real Garmin summary + details fixtures"
```

---

## Task 4: Garmin details → Strava-shaped streams (Python)

**Files:**
- Create: `scripts/garmin_streams.py`
- Create: `tests/python/test_garmin_streams.py`

- [ ] **Step 1: Write the failing test (against the real fixture)**

Create `tests/python/test_garmin_streams.py`:
```python
import json, os
from scripts.garmin_streams import parse_details_to_streams

FIX = os.path.join(os.path.dirname(__file__), "..", "..", "tests", "fixtures")

def load(name):
    with open(os.path.join(FIX, name)) as f:
        return json.load(f)

def test_streams_have_aligned_lengths_and_shape():
    streams = parse_details_to_streams(load("garmin_activity_details.json"))
    assert "time" in streams and "distance" in streams
    n = len(streams["time"]["data"])
    assert n > 0
    assert len(streams["distance"]["data"]) == n
    # distance is cumulative, non-decreasing metres
    d = streams["distance"]["data"]
    assert d[0] <= d[-1]
    # latlng, when present, is a list of [lat, lng] pairs the same length
    if "latlng" in streams:
        assert len(streams["latlng"]["data"]) == n
        assert len(streams["latlng"]["data"][0]) == 2

def test_cadence_is_halved_to_per_leg():
    streams = parse_details_to_streams(load("garmin_activity_details.json"))
    if "cadence" in streams:
        # Garmin run cadence ~150-190 spm both-legs -> per-leg ~75-95
        vals = [c for c in streams["cadence"]["data"] if c]
        if vals:
            assert max(vals) < 130
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\.venv-garmin\Scripts\python.exe -m pytest tests/python/test_garmin_streams.py -v`
Expected: FAIL — `ModuleNotFoundError: scripts.garmin_streams`.

- [ ] **Step 3: Implement `garmin_streams.py`**

Create `scripts/garmin_streams.py`. Adjust the KEY constants to the exact keys you recorded in Task 3 Step 3.
```python
"""Convert a Garmin activity-details payload into Strava-shaped stream arrays.

Garmin details format:
  metricDescriptors: [{ metricsIndex: int, key: str }, ...]
  activityDetailMetrics: [{ metrics: [float|None, ...] }, ...]   # one row per sample
geoPolylineDTO.polyline: [{ lat, lon, altitude, time }, ...]      # GPS track
"""

# Keys as observed via Task 3 Step 3. Update if your fixture differs.
K_DISTANCE = "sumDistance"          # metres (may be km on some devices -> see scaling below)
K_DURATION = "sumElapsedDuration"   # seconds since start
K_HR = "directHeartRate"
K_CADENCE = "directRunCadence"      # steps/min, both legs
K_SPEED = "directSpeed"             # m/s
K_ELEV = "directElevation"          # metres
K_LAT = "directLatitude"
K_LON = "directLongitude"


def _index_map(descriptors):
    return {d["key"]: d["metricsIndex"] for d in descriptors}


def _col(rows, idx):
    return [r["metrics"][idx] if idx is not None else None for r in rows]


def parse_details_to_streams(details):
    descriptors = details.get("metricDescriptors") or []
    rows = details.get("activityDetailMetrics") or []
    if not descriptors or not rows:
        return {}
    idx = _index_map(descriptors)

    time_col = _col(rows, idx.get(K_DURATION))
    dist_col = _col(rows, idx.get(K_DISTANCE))
    # Some Garmin devices report sumDistance in km; normalise to metres if so.
    if dist_col and max(v for v in dist_col if v is not None) < 1000 \
            and (details.get("summaryDTO") or {}).get("distance", 0) > 2000:
        dist_col = [v * 1000 if v is not None else None for v in dist_col]

    streams = {
        "time": {"data": [int(round(v)) if v is not None else None for v in time_col]},
        "distance": {"data": [round(v, 2) if v is not None else None for v in dist_col]},
    }

    def add(name, key, transform=lambda v: v):
        i = idx.get(key)
        if i is None:
            return
        col = _col(rows, i)
        if any(v is not None for v in col):
            streams[name] = {"data": [transform(v) if v is not None else None for v in col]}

    add("heartrate", K_HR, lambda v: int(round(v)))
    add("cadence", K_CADENCE, lambda v: round(v / 2.0, 1))   # both-legs -> per-leg
    add("velocity_smooth", K_SPEED)
    add("altitude", K_ELEV)

    lat = _col(rows, idx.get(K_LAT))
    lon = _col(rows, idx.get(K_LON))
    if any(v is not None for v in lat) and any(v is not None for v in lon):
        streams["latlng"] = {"data": [[la, lo] for la, lo in zip(lat, lon)]}

    return streams
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\.venv-garmin\Scripts\python.exe -m pytest tests/python/test_garmin_streams.py -v`
Expected: PASS. If lengths mismatch or cadence assert fails, correct the KEY constants to match your fixture's descriptors and re-run.

- [ ] **Step 5: Commit**

```powershell
git add scripts/garmin_streams.py tests/python/test_garmin_streams.py
git commit -m "feat: parse Garmin details into Strava-shaped streams (cadence per-leg)"
```

---

## Task 5: Garmin summary → Strava-shaped activity doc (Python)

**Files:**
- Create: `scripts/garmin_activity.py`
- Create: `tests/python/test_garmin_activity.py`

- [ ] **Step 1: Write the failing test**

Create `tests/python/test_garmin_activity.py`:
```python
import json, os
from scripts.garmin_activity import build_activity_doc, TYPE_MAP

FIX = os.path.join(os.path.dirname(__file__), "..", "..", "tests", "fixtures")

def test_build_activity_doc_maps_core_fields():
    with open(os.path.join(FIX, "garmin_activity_summary.json")) as f:
        summary = json.load(f)
    doc = build_activity_doc(summary)
    assert isinstance(doc["id"], str)
    assert doc["type"] in ("Run", "TrailRun", "VirtualRun")
    assert doc["distance"] > 0            # metres
    assert doc["moving_time"] > 0         # seconds
    assert "start_date" in doc

def test_type_map_known_values():
    assert TYPE_MAP["running"] == "Run"
    assert TYPE_MAP["trail_running"] == "TrailRun"
    assert TYPE_MAP["treadmill_running"] == "VirtualRun"
    assert TYPE_MAP["virtual_run"] == "VirtualRun"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\.venv-garmin\Scripts\python.exe -m pytest tests/python/test_garmin_activity.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `garmin_activity.py`**

Create `scripts/garmin_activity.py`:
```python
"""Build a Strava-shaped Firestore activity doc from a Garmin activity summary."""

TYPE_MAP = {
    "running": "Run",
    "trail_running": "TrailRun",
    "treadmill_running": "VirtualRun",
    "virtual_run": "VirtualRun",
    "indoor_running": "VirtualRun",
}

RUNNING_TYPE_KEYS = set(TYPE_MAP.keys())


def is_running(summary):
    tk = ((summary.get("activityType") or {}).get("typeKey") or "").lower()
    return tk in RUNNING_TYPE_KEYS


def _to_int(v):
    return int(round(v)) if v is not None else None


def build_activity_doc(summary):
    tk = ((summary.get("activityType") or {}).get("typeKey") or "running").lower()
    aid = summary["activityId"]
    start_local = summary.get("startTimeLocal")   # "YYYY-MM-DD HH:MM:SS"
    start_gmt = summary.get("startTimeGMT")
    iso = start_local.replace(" ", "T") if start_local else None
    return {k: v for k, v in {
        "id": str(aid),
        "garmin_activity_id": aid,
        "name": summary.get("activityName") or "Run",
        "type": TYPE_MAP.get(tk, "Run"),
        "start_date": (start_gmt.replace(" ", "T") + "Z") if start_gmt else iso,
        "start_date_local": iso,
        "distance": summary.get("distance"),                # metres
        "moving_time": _to_int(summary.get("movingDuration")
                               or summary.get("duration")),  # seconds
        "elapsed_time": _to_int(summary.get("elapsedDuration")
                                or summary.get("duration")),
        "total_elevation_gain": _to_int(summary.get("elevationGain")),
        "average_heartrate": _to_int(summary.get("averageHR")),
        "max_heartrate": _to_int(summary.get("maxHR")),
        # Garmin averageRunningCadenceInStepsPerMinute is both-legs -> per-leg
        "average_cadence": (round(summary["averageRunningCadenceInStepsPerMinute"] / 2.0, 1)
                            if summary.get("averageRunningCadenceInStepsPerMinute") else None),
        "average_speed": summary.get("averageSpeed"),       # m/s
        "vo2max": summary.get("vO2MaxValue"),
        "source": "garmin",
    }.items() if v is not None}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\.venv-garmin\Scripts\python.exe -m pytest tests/python/test_garmin_activity.py -v`
Expected: PASS. If `movingDuration`/field names differ in your summary fixture, adjust to the keys present and re-run.

- [ ] **Step 5: Commit**

```powershell
git add scripts/garmin_activity.py tests/python/test_garmin_activity.py
git commit -m "feat: build Strava-shaped activity doc from Garmin summary"
```

---

## Task 6: Firestore + Storage writers (Python)

**Files:**
- Create: `scripts/firestore_writer.py`
- Create: `tests/python/test_firestore_writer.py`

- [ ] **Step 1: Write the failing test (gzip round-trip, no network)**

Create `tests/python/test_firestore_writer.py`:
```python
import gzip, json
from scripts.firestore_writer import gzip_streams, gunzip_streams

def test_gzip_round_trip():
    streams = {"time": {"data": [0, 1, 2]}, "distance": {"data": [0, 5, 11]}}
    blob = gzip_streams(streams)
    assert isinstance(blob, (bytes, bytearray))
    assert gunzip_streams(blob) == streams
    # sanity: it is really gzip
    assert json.loads(gzip.decompress(blob)) == streams
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\.venv-garmin\Scripts\python.exe -m pytest tests/python/test_firestore_writer.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `firestore_writer.py`**

Create `scripts/firestore_writer.py`:
```python
"""Firebase Admin writer: activities -> Firestore, streams -> Storage (gzip)."""
import gzip, json, os

_app = None
_db = None
_bucket = None


def gzip_streams(streams: dict) -> bytes:
    return gzip.compress(json.dumps(streams, separators=(",", ":")).encode("utf-8"))


def gunzip_streams(blob: bytes) -> dict:
    return json.loads(gzip.decompress(blob))


def init(service_account_path=None, bucket_name=None):
    global _app, _db, _bucket
    import firebase_admin
    from firebase_admin import credentials, firestore, storage
    if _app is None:
        path = service_account_path or os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
        bucket_name = bucket_name or os.environ["FIREBASE_STORAGE_BUCKET"]
        _app = firebase_admin.initialize_app(
            credentials.Certificate(path), {"storageBucket": bucket_name})
        _db = firestore.client()
        _bucket = storage.bucket()
    return _db, _bucket


def write_activity(doc: dict):
    _db.collection("activities").document(doc["id"]).set(doc, merge=True)


def write_streams(activity_id: str, streams: dict):
    blob = _bucket.blob(f"streams/{activity_id}.json.gz")
    blob.upload_from_string(gzip_streams(streams), content_type="application/gzip")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\.venv-garmin\Scripts\python.exe -m pytest tests/python/test_firestore_writer.py -v`
Expected: PASS.

- [ ] **Step 5: Obtain the service-account key (manual, one-time)**

In the Firebase console for the running-analytics project → Project Settings → Service accounts → *Generate new private key*. Save as `serviceAccountKey.json` in the project root (already gitignored). Note the Storage bucket name (Project Settings → Storage, e.g. `<project-id>.appspot.com`).

- [ ] **Step 6: Commit**

```powershell
git add scripts/firestore_writer.py tests/python/test_firestore_writer.py
git commit -m "feat: firebase-admin writer (Firestore activities + gzip streams to Storage)"
```

---

## Task 7: Assemble Stage 1 sync (`scripts/garmin_sync.py`)

**Files:**
- Create: `scripts/garmin_sync.py`

- [ ] **Step 1: Implement the orchestrator**

Create `scripts/garmin_sync.py`:
```python
"""Stage 1: pull Garmin running activities -> Firestore activities + Storage streams."""
import argparse, datetime, logging, os, random, time
import garth

from scripts.garmin_auth import authenticate
from scripts.garmin_activity import build_activity_doc, is_running
from scripts.garmin_streams import parse_details_to_streams
from scripts import firestore_writer as fw

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"),
                    format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("garmin.sync")


def safe_api(path, tries=4):
    for attempt in range(tries):
        try:
            return garth.connectapi(path)
        except Exception as e:
            status = getattr(getattr(getattr(e, "error", None), "response", None),
                             "status_code", None)
            if status == 404:
                return None
            if attempt < tries - 1:
                time.sleep((2 ** attempt) + random.uniform(0, 0.5))
                continue
            log.warning("API failed after %d tries (HTTP %s): %s", tries, status, str(e)[:120])
            return None


def list_running(start, end):
    s = datetime.date.fromisoformat(start)
    e = datetime.date.fromisoformat(end)
    by_id, cur = {}, s
    while cur <= e:
        w_end = min(cur + datetime.timedelta(days=27), e)
        chunk = safe_api(
            f"/activitylist-service/activities/search/activities"
            f"?startDate={cur}&endDate={w_end}&limit=200") or []
        for a in chunk:
            if is_running(a):
                by_id[a["activityId"]] = a
        time.sleep(0.3)
        cur = w_end + datetime.timedelta(days=1)
    return list(by_id.values())


def sync_one(summary, dry_run):
    aid = summary["activityId"]
    doc = build_activity_doc(summary)
    details = safe_api(f"/activity-service/activity/{aid}/details"
                       f"?maxChartSize=2000&maxPolylineSize=4000")
    streams = parse_details_to_streams(details) if details else {}
    log.info("  %s %s (%.1fkm) streams=%s",
             aid, doc.get("name"), (doc.get("distance") or 0) / 1000, list(streams.keys()))
    if dry_run:
        return
    fw.write_activity(doc)
    if streams:
        fw.write_streams(str(aid), streams)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--days", type=int, default=7)
    p.add_argument("--start")
    p.add_argument("--end")
    p.add_argument("--backfill", action="store_true", help="import from 2005-01-01")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--service-account", default=os.environ.get(
        "GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json"))
    p.add_argument("--bucket", default=os.environ.get("FIREBASE_STORAGE_BUCKET"))
    args = p.parse_args()

    today = datetime.date.today()
    if args.backfill:
        start, end = "2005-01-01", today.isoformat()
    else:
        start = args.start or (today - datetime.timedelta(days=args.days)).isoformat()
        end = args.end or today.isoformat()

    authenticate()
    if not args.dry_run:
        fw.init(args.service_account, args.bucket)

    runs = list_running(start, end)
    log.info("Found %d running activities in %s..%s", len(runs), start, end)
    for i, summary in enumerate(runs, 1):
        log.info("[%d/%d]", i, len(runs))
        sync_one(summary, args.dry_run)
        time.sleep(0.3)
    log.info("Done.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Dry-run against the last 30 days (no writes)**

Run: `.\.venv-garmin\Scripts\python.exe -m scripts.garmin_sync --days 30 --dry-run`
Expected: lists running activities with their stream keys; no Firestore writes. Confirm streams include `distance`, `time`, and (for outdoor runs) `latlng`.

- [ ] **Step 3: Live sync a small window and verify in the console**

Run:
```powershell
$env:FIREBASE_STORAGE_BUCKET="<your-project-id>.appspot.com"
.\.venv-garmin\Scripts\python.exe -m scripts.garmin_sync --days 14
```
Expected: writes complete. In the Firebase console, confirm new `activities/{garminId}` docs and `streams/{garminId}.json.gz` objects in Storage.

- [ ] **Step 4: Commit**

```powershell
git add scripts/garmin_sync.py
git commit -m "feat: Stage 1 Garmin sync orchestrator (activities + streams)"
```

---

## Task 8: Stage 2 — Node segment computer (`scripts/computeSegments.js`)

**Files:**
- Create: `scripts/computeSegments.js`
- Create: `scripts/computeSegments.test.js`

- [ ] **Step 1: Write the failing test (pure segment build via the shared engine)**

Create `scripts/computeSegments.test.js`:
```javascript
const { buildSegmentsForActivity } = require('./computeSegments');

test('buildSegmentsForActivity produces PB segments from streams', async () => {
  const activity = { id: '123', name: 'Test Run', type: 'Run',
    distance: 5000, moving_time: 1500, start_date: '2026-01-01T00:00:00Z' };
  // 5000m at 5:00/km: distance every 100m, time +30s per 100m
  const data = { time: { data: [] }, distance: { data: [] } };
  for (let i = 0; i <= 50; i++) { data.distance.data.push(i * 100); data.time.data.push(i * 30); }
  const segs = await buildSegmentsForActivity(activity, data);
  expect(segs.find(s => s.distance === '1K')).toBeDefined();
  expect(segs.find(s => s.distance === '5K').time).toBe(1500);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx react-scripts test scripts/computeSegments.test.js --watchAll=false`
Expected: FAIL — cannot find `./computeSegments`.
(If Jest refuses to look outside `src/`, move both files under `src/sync/` and adjust the require paths accordingly.)

- [ ] **Step 3: Implement `computeSegments.js`**

Create `scripts/computeSegments.js`:
```javascript
/* Stage 2: read streams from Storage, compute segments via the shared engine,
   write `segments` docs + fold activity metrics back onto `activities`. */
const zlib = require('zlib');
const engine = require('../src/services/segmentEngine');

async function buildSegmentsForActivity(activity, streams) {
  const segments = await engine.findBestSegmentsFromStreams(activity, streams);
  const metrics = engine.calculateActivityMetrics(streams);
  segments.__activityMetrics = metrics; // carried out-of-band; caller strips it
  return segments;
}

function segmentId(seg) {
  return `${seg.activityId}_${seg.distance}_${seg.startTime}`;
}

async function run() {
  const admin = require('firebase-admin');
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json';
  admin.initializeApp({
    credential: admin.credential.cert(require(require('path').resolve(path))),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const snap = await db.collection('activities')
    .where('type', 'in', ['Run', 'TrailRun', 'VirtualRun']).get();
  console.log(`Computing segments for ${snap.size} activities`);

  for (const doc of snap.docs) {
    const activity = { id: doc.id, ...doc.data() };
    const file = bucket.file(`streams/${doc.id}.json.gz`);
    const [exists] = await file.exists();
    if (!exists) { console.log(`  ${doc.id}: no streams, skipping`); continue; }
    const [gz] = await file.download();
    const streams = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
    if (!streams.distance || !streams.time) { console.log(`  ${doc.id}: no dist/time`); continue; }

    const segments = await buildSegmentsForActivity(activity, streams);
    const metrics = segments.__activityMetrics; delete segments.__activityMetrics;

    const batch = db.batch();
    for (const seg of segments) {
      seg.activityName = activity.name;
      seg.activityId = activity.id;
      batch.set(db.collection('segments').doc(segmentId(seg)),
                { ...seg, lastUpdated: new Date() }, { merge: true });
    }
    if (metrics && Object.keys(metrics).length) {
      batch.set(doc.ref, metrics, { merge: true });
    }
    await batch.commit();
    console.log(`  ${doc.id}: wrote ${segments.length} segments`);
  }
  console.log('Done.');
}

module.exports = { buildSegmentsForActivity, segmentId };

if (require.main === module) {
  run().catch(e => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx react-scripts test scripts/computeSegments.test.js --watchAll=false`
Expected: PASS (the 1K and 5K segments are found; 5K time is 1500s).

- [ ] **Step 5: Run Stage 2 against the data synced in Task 7**

Run:
```powershell
$env:FIREBASE_STORAGE_BUCKET="<your-project-id>.appspot.com"
node scripts/computeSegments.js
```
Expected: logs "wrote N segments" per activity. In the Firebase console, `segments` docs now exist for the synced runs.

- [ ] **Step 6: Verify PBs render in the app**

Run: `npm start`, open the Personal Bests page, confirm PBs appear for the synced runs and times look correct.

- [ ] **Step 7: Commit**

```powershell
git add scripts/computeSegments.js scripts/computeSegments.test.js
git commit -m "feat: Stage 2 Node segment computer using shared segmentEngine"
```

---

## Task 9: Repoint the app's stream reads to Firebase Storage

The elevation profile and road-coverage map call `firebaseService.getActivityStreams`, which today hits Strava. Point it at Storage.

**Files:**
- Modify: `src/services/firebaseService.js` (`getActivityStreams`, ~L1200-1211)

- [ ] **Step 1: Add a Storage import and rewrite `getActivityStreams`**

At the top of `src/services/firebaseService.js`, add:
```javascript
import { getStorage, ref, getBytes } from 'firebase/storage';
```
After `const db = getFirestore(app);` add:
```javascript
const storage = getStorage(app);
```
Replace the body of `getActivityStreams`:
```javascript
  async getActivityStreams(activityId) {
    try {
      const gz = await getBytes(ref(storage, `streams/${activityId}.json.gz`));
      // Browsers: inflate gzip via DecompressionStream
      const ds = new DecompressionStream('gzip');
      const stream = new Blob([gz]).stream().pipeThrough(ds);
      const text = await new Response(stream).text();
      return JSON.parse(text);
    } catch (error) {
      console.error(`No stored streams for activity ${activityId}:`, error);
      return null;
    }
  }
```

- [ ] **Step 2: Verify build + manual check**

Run: `npm run build` then `npm start`. Open an activity's elevation profile and the road-coverage map; confirm they render from stored streams (network tab shows a request to `firebasestorage`).
Expected: profile + map display; no Strava requests.

- [ ] **Step 3: Commit**

```powershell
git add src/services/firebaseService.js
git commit -m "feat: read activity streams from Firebase Storage instead of Strava"
```

---

## Task 10: Remove Strava auth from the UI

**Files:**
- Modify: `src/hooks/useStrava.js`, `src/components/SyncButton/SyncButton.js`, and any component importing Strava OAuth (grep first)
- Modify: `.env.example` (drop `REACT_APP_STRAVA_*`)

- [ ] **Step 1: Find every Strava reference**

Run: `git grep -n -i "strava" src/`
Expected: a list. The data-path files (`stravaApi.js`, `syncService.js`) are now unused; UI files reference login/sync.

- [ ] **Step 2: Neutralise the login/sync UI**

In `src/components/SyncButton/SyncButton.js`, remove the Strava OAuth trigger and instead show read-only "Last synced" text sourced from the most recent `activities` doc's `start_date` (use `firebaseService.getActivities('all-time')` and take `[0].start_date`). Remove any "Connect to Strava" button and the `useStrava` import.

- [ ] **Step 3: Delete now-dead Strava modules**

Run:
```powershell
git rm src/services/stravaApi.js src/services/syncService.js src/hooks/useStrava.js src/services/stravaRouteService.js
```
Then fix any remaining imports surfaced by `npm run build` (remove references; the sync now happens server-side).

- [ ] **Step 4: Strip Strava env vars**

Edit `.env.example`: delete `REACT_APP_STRAVA_CLIENT_ID`, `REACT_APP_STRAVA_CLIENT_SECRET`, `REACT_APP_STRAVA_REDIRECT_URI`.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: compiles with no unresolved imports.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "refactor: remove Strava OAuth/sync from the app (Garmin is the source now)"
```

---

## Task 11: Backup + reset script for the full re-backfill

**Files:**
- Create: `scripts/reset_collections.js`

- [ ] **Step 1: Implement guarded backup + wipe**

Create `scripts/reset_collections.js`:
```javascript
/* Backs up activities + segments to backups/<ts>.json, THEN deletes them.
   Deletion only proceeds if the backup wrote successfully. */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function dumpAndDelete(db, name, backup) {
  const snap = await db.collection(name).get();
  backup[name] = snap.docs.map(d => ({ id: d.id, data: d.data() }));
  return snap.docs;
}

async function main() {
  const cred = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json';
  admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(cred))) });
  const db = admin.firestore();

  const backup = {};
  const acts = await dumpAndDelete(db, 'activities', backup);
  const segs = await dumpAndDelete(db, 'segments', backup);

  fs.mkdirSync('backups', { recursive: true });
  const file = path.join('backups', `reset-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup));
  const stat = fs.statSync(file);
  if (stat.size < 2) throw new Error('Backup looks empty; aborting delete.');
  console.log(`Backed up ${acts.length} activities + ${segs.length} segments to ${file}`);

  if (process.argv.includes('--confirm-delete')) {
    for (const group of [acts, segs]) {
      for (let i = 0; i < group.length; i += 400) {
        const batch = db.batch();
        group.slice(i, i + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
    console.log('Deleted activities + segments. Ready for --backfill.');
  } else {
    console.log('Dry run: backup only. Re-run with --confirm-delete to wipe.');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Backup-only dry run**

Run: `node scripts/reset_collections.js`
Expected: writes `backups/reset-*.json`, prints counts, does NOT delete.

- [ ] **Step 3: Commit**

```powershell
git add scripts/reset_collections.js
git commit -m "feat: guarded backup+reset script for the Garmin re-backfill"
```

---

## Task 12: Orchestration + one-time full backfill

**Files:**
- Create: `scripts/garmin_sync.bat`

- [ ] **Step 1: Write the batch orchestrator**

Create `scripts/garmin_sync.bat`:
```bat
@echo off
setlocal
cd /d "%~dp0\.."
set FIREBASE_STORAGE_BUCKET=<your-project-id>.appspot.com
set GOOGLE_APPLICATION_CREDENTIALS=%CD%\serviceAccountKey.json
echo [%date% %time%] Garmin sync start >> scripts\logs\garmin_sync.log
".venv-garmin\Scripts\python.exe" -m scripts.garmin_sync --days 7 >> scripts\logs\garmin_sync.log 2>&1
node scripts\computeSegments.js >> scripts\logs\garmin_sync.log 2>&1
echo [%date% %time%] Garmin sync done >> scripts\logs\garmin_sync.log
endlocal
```

- [ ] **Step 2: Execute the one-time reset + full backfill (manual runbook)**

Run, in order:
```powershell
$env:FIREBASE_STORAGE_BUCKET="<your-project-id>.appspot.com"
$env:GOOGLE_APPLICATION_CREDENTIALS="$PWD\serviceAccountKey.json"
node scripts/reset_collections.js --confirm-delete
.\.venv-garmin\Scripts\python.exe -m scripts.garmin_sync --backfill
node scripts/computeSegments.js
```
Expected: collections wiped after backup; all Garmin history imported; segments computed. This can take a while for years of history — that's expected.

- [ ] **Step 3: Verify the app end-to-end**

Run `npm start`. Check: Personal Bests populated across distances; progression charts; elevation profiles; road-coverage map; predictions page loads. Spot-check a known PB against your memory of it.

- [ ] **Step 4: Register the daily scheduled task**

Run (PowerShell as your user):
```powershell
$action = New-ScheduledTaskAction -Execute "$PWD\scripts\garmin_sync.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 6am
Register-ScheduledTask -TaskName "running-analytics-garmin-sync" -Action $action -Trigger $trigger -Description "Daily Garmin -> Firestore sync"
```
Expected: task registered. Confirm with `Get-ScheduledTask -TaskName running-analytics-garmin-sync`.

- [ ] **Step 5: Commit**

```powershell
git add scripts/garmin_sync.bat
git commit -m "feat: daily Garmin sync orchestration (batch + scheduled task)"
```

---

## Self-review notes

- **Spec coverage:** Auth reuse (T2); Stage 1 python sync + streams to Storage (T3-T7); Cadence half-mapping (T4/T5); Stage 2 shared-engine PBs (T1/T8); Storage stream reads (T9); Strava removal (T10); backup+wipe+backfill (T11/T12); orchestration + scheduler (T12). All spec sections mapped.
- **PB-drift safety:** guaranteed structurally — T1 moves the algorithm unchanged and both runtimes import the same `segmentEngine`; T1's tests plus the T8 5K test assert known values.
- **Known verification points (not placeholders — real "confirm against your data" steps):** exact Garmin metric-descriptor keys (T3 S3 → used in T4), summary field names (`movingDuration` etc. in T5), and the Storage bucket id. Each has an explicit inspection step before the code depends on it.
- **Type consistency:** `parse_details_to_streams`, `build_activity_doc`, `is_running`, `write_activity`, `write_streams`, `buildSegmentsForActivity`, `segmentId`, `gzip_streams`/`gunzip_streams` are each defined once and used with matching signatures.
```