# Road Coverage Suburb Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect every suburb the runner has actually run in (via suburb-boundary matching), list them ranked by coverage %, with a Top 5 / Top 10 / All toggle and persistent hide/un-hide, keeping Conquered separate.

**Architecture:** Extract pure geometry (bounds, ray-cast point-in-polygon, Overpass boundary parsing, run→suburb assignment) into a new dependency-free module `roadCoverageGeo.js` (mirrors `segmentEngine.js`), unit-tested with Jest. `RoadCoverage.js` calls it: one Overpass query fetches all suburb boundaries in the run bounding box, boundaries are matched to run GPS locally, and roads/coverage are computed with the existing pipeline. The suburb panel is reworked into a view toggle + ranked list + hidden section.

**Tech Stack:** React (CRA), `react-leaflet`, Overpass API, Jest via `react-scripts test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-28-road-coverage-suburbs-design.md`

---

## File Structure

- **Create** `src/components/RoadCoverage/roadCoverageGeo.js` — pure geometry, `module.exports` (CJS), no React/fetch. Testable in isolation.
- **Create** `src/components/RoadCoverage/roadCoverageGeo.test.js` — Jest unit tests for the geometry.
- **Modify** `src/components/RoadCoverage/RoadCoverage.js` — replace detection + suburb-panel UI; remove Nominatim search / arbitrary add / capped geocode.

`roadCoverageGeo.js` uses `module.exports = { ... }` exactly like `src/services/segmentEngine.js:367`, so the Jest test can `require()` it and the component can `import * as geo from './roadCoverageGeo'`.

---

## Task 1: Pure geometry module `roadCoverageGeo.js`

**Files:**
- Create: `src/components/RoadCoverage/roadCoverageGeo.js`
- Test: `src/components/RoadCoverage/roadCoverageGeo.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/components/RoadCoverage/roadCoverageGeo.test.js`:

```js
const geo = require('./roadCoverageGeo');

// A square suburb covering lat 0..10, lon 0..10 (points are [lat, lon]).
const squareA = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
// A second square suburb covering lat 0..10, lon 20..30.
const squareB = [[0, 20], [10, 20], [10, 30], [0, 30], [0, 20]];

test('computeBounds returns min/max lat/lon, null when empty', () => {
  expect(geo.computeBounds([[1, 2], [3, 4], [-1, 10]]))
    .toEqual({ south: -1, west: 2, north: 3, east: 10 });
  expect(geo.computeBounds([])).toBeNull();
});

test('pointInRing is true inside, false outside', () => {
  expect(geo.pointInRing([5, 5], squareA)).toBe(true);
  expect(geo.pointInRing([15, 5], squareA)).toBe(false);
  expect(geo.pointInRing([5, 25], squareA)).toBe(false);
});

test('assembleRings stitches two open ways into one closed ring', () => {
  const wayA = [[0, 0], [10, 0], [10, 10]];
  const wayB = [[10, 10], [0, 10], [0, 0]];
  const rings = geo.assembleRings([wayA, wayB]);
  expect(rings.length).toBe(1);
  const ring = rings[0];
  expect(ring[0]).toEqual(ring[ring.length - 1]); // closed
  expect(geo.pointInRing([5, 5], ring)).toBe(true);
});

test('parseBoundaryRelations builds named suburbs with rings and bbox', () => {
  const elements = [{
    type: 'relation',
    tags: { name: 'Coalfield South' },
    members: [
      { type: 'way', role: 'outer', geometry: [{ lat: 0, lon: 0 }, { lat: 10, lon: 0 }, { lat: 10, lon: 10 }] },
      { type: 'way', role: 'outer', geometry: [{ lat: 10, lon: 10 }, { lat: 0, lon: 10 }, { lat: 0, lon: 0 }] },
    ],
  }];
  const suburbs = geo.parseBoundaryRelations(elements);
  expect(suburbs.length).toBe(1);
  expect(suburbs[0].name).toBe('Coalfield South');
  expect(suburbs[0].bbox).toEqual({ south: 0, west: 0, north: 10, east: 10 });
  expect(geo.pointInSuburb([5, 5], suburbs[0])).toBe(true);
  expect(geo.pointInSuburb([5, 25], suburbs[0])).toBe(false);
});

test('assignRunsToSuburbs counts runs whose sampled points fall in a suburb', () => {
  const suburbs = [
    { name: 'A', rings: [squareA], bbox: geo.computeBounds(squareA) },
    { name: 'B', rings: [squareB], bbox: geo.computeBounds(squareB) },
  ];
  const routes = [
    { coords: [[5, 5], [6, 6]] },   // in A
    { coords: [[5, 25], [6, 26]] }, // in B
    { coords: [[5, 5], [5, 25]] },  // touches both
  ];
  const hits = geo.assignRunsToSuburbs(routes, suburbs, 1);
  expect(hits.get('A')).toBe(2);
  expect(hits.get('B')).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx cross-env CI=true react-scripts test src/components/RoadCoverage/roadCoverageGeo.test.js`
Expected: FAIL — `Cannot find module './roadCoverageGeo'`.

- [ ] **Step 3: Write the implementation**

Create `src/components/RoadCoverage/roadCoverageGeo.js`:

```js
// Pure, dependency-free geometry for Road Coverage suburb detection.
// No React, no fetch, no browser APIs. Shared shape with segmentEngine.js:
// CommonJS exports so it's require()-able in Jest and importable in the app.

const EPS = 1e-7;

function computeBounds(points) {
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
  for (const p of points) {
    if (!p || p[0] == null || p[1] == null) continue;
    const [lat, lon] = p;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lon < west) west = lon;
    if (lon > east) east = lon;
  }
  if (south === Infinity) return null;
  return { south, west, north, east };
}

function inBox(point, box) {
  const [lat, lon] = point;
  return lat >= box.south && lat <= box.north && lon >= box.west && lon <= box.east;
}

// Ray casting on (x = lon, y = lat). ring: array of [lat, lon].
function pointInRing(point, ring) {
  const [lat, lon] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0], xi = ring[i][1];
    const yj = ring[j][0], xj = ring[j][1];
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Stitch Overpass 'outer' ways (each an ordered [lat,lon] array) into closed rings.
function assembleRings(ways) {
  const same = (a, b) => Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS;
  const remaining = ways.map((w) => w.slice()).filter((w) => w.length >= 2);
  const rings = [];
  while (remaining.length) {
    let ring = remaining.shift();
    let extended = true;
    while (extended && !same(ring[0], ring[ring.length - 1])) {
      extended = false;
      for (let k = 0; k < remaining.length; k++) {
        const w = remaining[k];
        const end = ring[ring.length - 1];
        if (same(end, w[0])) {
          ring = ring.concat(w.slice(1)); remaining.splice(k, 1); extended = true; break;
        }
        if (same(end, w[w.length - 1])) {
          ring = ring.concat(w.slice().reverse().slice(1)); remaining.splice(k, 1); extended = true; break;
        }
      }
    }
    rings.push(ring);
  }
  return rings;
}

function parseBoundaryRelations(elements) {
  const suburbs = [];
  for (const el of elements) {
    if (el.type !== 'relation' || !el.members) continue;
    const name = el.tags && el.tags.name;
    if (!name) continue;
    const ways = el.members
      .filter((m) => m.type === 'way' && m.role === 'outer' && Array.isArray(m.geometry))
      .map((m) => m.geometry.map((g) => [g.lat, g.lon]));
    if (ways.length === 0) continue;
    const rings = assembleRings(ways);
    const bbox = computeBounds(rings.flat());
    if (!bbox) continue;
    const centroid = [(bbox.south + bbox.north) / 2, (bbox.west + bbox.east) / 2];
    suburbs.push({ name, rings, bbox, centroid });
  }
  return suburbs;
}

function pointInSuburb(point, suburb) {
  if (!inBox(point, suburb.bbox)) return false;
  return suburb.rings.some((ring) => pointInRing(point, ring));
}

// routes: [{ coords: [[lat,lon], ...] }]. Returns Map<suburbName, runCount>.
function assignRunsToSuburbs(routes, suburbs, sampleStep = 10) {
  const hits = new Map();
  for (const route of routes) {
    const coords = route.coords || [];
    const matched = new Set();
    for (let i = 0; i < coords.length; i += sampleStep) {
      const pt = coords[i];
      if (!pt || pt[0] == null || pt[1] == null) continue;
      for (const s of suburbs) {
        if (!matched.has(s.name) && pointInSuburb(pt, s)) matched.add(s.name);
      }
    }
    for (const name of matched) hits.set(name, (hits.get(name) || 0) + 1);
  }
  return hits;
}

module.exports = {
  computeBounds, pointInRing, assembleRings,
  parseBoundaryRelations, pointInSuburb, assignRunsToSuburbs,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx cross-env CI=true react-scripts test src/components/RoadCoverage/roadCoverageGeo.test.js`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/RoadCoverage/roadCoverageGeo.js src/components/RoadCoverage/roadCoverageGeo.test.js
git commit -m "feat: add pure geometry module for suburb boundary detection"
```

---

## Task 2: Boundary-based detection in RoadCoverage

Replace the capped reverse-geocode auto-detection with a single Overpass boundary query + local matching. This task is verified by `npm run build` + browser console (the component has no unit tests, matching the codebase).

**Files:**
- Modify: `src/components/RoadCoverage/RoadCoverage.js`

- [ ] **Step 1: Import the geo module**

At the top of `RoadCoverage.js`, below `import firebaseService ...`, add:

```js
import * as geo from './roadCoverageGeo';
```

- [ ] **Step 2: Add the boundary-fetch helper**

Immediately after the existing `fetchSuburbBoundary` function (the one ending `return null;` before `// ── Suburb search via Nominatim`), add this new function:

```js
// ── Overpass: all suburb boundaries within a bounding box (one query) ─────────

async function fetchSuburbBoundariesInBounds(bounds, retries = 2) {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const query = `
    [out:json][timeout:60];
    relation["admin_level"~"9|10"]["boundary"="administrative"](${bbox});
    out geom;
  `;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if ((response.status === 504 || response.status === 429) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!response.ok) throw new Error(`Overpass boundaries error: ${response.status}`);
      const data = await response.json();
      return data.elements || [];
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  return [];
}
```

- [ ] **Step 3: Replace suburb state with the run-in model**

Find the state block that declares `selectedSuburbs` (the `useState(() => { ... localStorage.getItem('roadCoverage_suburbs') ... })`) and the related `suburbSearch`, `searchResults`, `isSearching`, `showSearch`, `searchTimeout`. Replace that whole group with:

```js
  // Run-in suburbs detected from GPS (each: { name, lat, lon, rings })
  const [runInSuburbs, setRunInSuburbs] = useState([]);
  // Hidden suburb names – persisted
  const [hiddenSuburbs, setHiddenSuburbs] = useState(() => {
    try {
      const cached = localStorage.getItem('roadCoverage_hidden');
      return cached ? new Set(JSON.parse(cached)) : new Set();
    } catch { return new Set(); }
  });
  // View: 'top5' | 'top10' | 'all'
  const [suburbView, setSuburbView] = useState('top5');
  const [suburbFilter, setSuburbFilter] = useState('');
```

- [ ] **Step 4: Remove the old auto-detect and search state/effects**

Delete these now-unused pieces entirely:
- the `autoDetectRan` ref and `autoDetectedSuburbs` state + its persistence `useEffect`
- the persistence `useEffect` for `roadCoverage_suburbs`
- the whole `detectSuburbs` auto-detect `useEffect` (the one starting `if (autoDetectRan.current || runRoutes.length === 0 ...`)
- the debounced suburb-search `useEffect` (the one using `searchTimeout`)
- the `reverseGeocodeToSuburb` and `searchSuburbs` top-level functions
- `suburbBoundaries` state and its on-click `fetchSuburbBoundary` usage will be handled in Task 3 — leave `suburbBoundaries` for now.

Add a `detectRan` ref near the other refs:

```js
  const detectRan = useRef(false);
```

Add the persistence effect for hidden suburbs (near the other persistence effects):

```js
  useEffect(() => {
    try {
      localStorage.setItem('roadCoverage_hidden', JSON.stringify([...hiddenSuburbs]));
    } catch { /* quota */ }
  }, [hiddenSuburbs]);
```

- [ ] **Step 5: Add the boundary-detection effect**

Add this effect after the `loadRoutes` effect:

```js
  // ── Detect ALL run-in suburbs via one Overpass boundary query ─────────────

  useEffect(() => {
    if (detectRan.current || runRoutes.length === 0 || isLoadingActivities) return;
    detectRan.current = true;

    async function detect() {
      const allPoints = runRoutes.flatMap((r) => r.coords);
      const bounds = geo.computeBounds(allPoints);
      if (!bounds) return;

      // Cache keyed on a coarse bbox so revisits are instant.
      const key = ['s', 'w', 'n', 'e']
        .map((k, i) => [bounds.south, bounds.west, bounds.north, bounds.east][i].toFixed(2))
        .join(',');
      try {
        const cached = JSON.parse(localStorage.getItem('roadCoverage_runInSuburbs') || 'null');
        if (cached && cached.key === key && Array.isArray(cached.suburbs)) {
          setRunInSuburbs(cached.suburbs);
          if (cached.suburbs[0]) {
            setMapCenter([cached.suburbs[0].lat, cached.suburbs[0].lon]);
          }
          return;
        }
      } catch { /* ignore */ }

      let elements;
      try {
        elements = await fetchSuburbBoundariesInBounds(bounds);
      } catch (err) {
        console.error('[RoadCoverage] boundary fetch failed:', err);
        setError('Could not load suburb boundaries. Try again later.');
        return;
      }

      const suburbs = geo.parseBoundaryRelations(elements);
      const hits = geo.assignRunsToSuburbs(runRoutes, suburbs);
      const runIn = suburbs
        .filter((s) => hits.has(s.name))
        .map((s) => ({ name: s.name, lat: s.centroid[0], lon: s.centroid[1], rings: s.rings }))
        // de-dupe by name (adjacent admin levels can repeat a name)
        .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);

      console.log(`[RoadCoverage] detected ${runIn.length} run-in suburbs`);
      setRunInSuburbs(runIn);
      if (runIn[0]) setMapCenter([runIn[0].lat, runIn[0].lon]);
      try {
        localStorage.setItem('roadCoverage_runInSuburbs', JSON.stringify({ key, suburbs: runIn }));
      } catch { /* quota */ }
    }

    detect();
  }, [runRoutes, isLoadingActivities]);
```

- [ ] **Step 6: Verify build compiles**

Run: `npx cross-env CI=true npm run build`
Expected: "Compiled" / "The build folder is ready" with no errors. (Warnings for as-yet-unused `suburbView`/`suburbFilter`/`hiddenSuburbs` are acceptable until Task 4 wires them.)

- [ ] **Step 7: Commit**

```bash
git add src/components/RoadCoverage/RoadCoverage.js
git commit -m "feat: detect run-in suburbs via Overpass boundary matching"
```

---

## Task 3: Load roads for visible suburbs; boundary from detected rings

Make road-loading/coverage run over the detected visible suburbs, and draw the focused suburb's boundary from its stored rings (removing the on-click `fetchSuburbBoundary`).

**Files:**
- Modify: `src/components/RoadCoverage/RoadCoverage.js`

- [ ] **Step 1: Add the derived visible-suburbs list**

After the `runInSuburbs` state, add a memo (place it after other hooks, before the render return, near `topSuburbs`):

```js
  const visibleSuburbs = useMemo(
    () => runInSuburbs.filter((s) => !hiddenSuburbs.has(s.name)),
    [runInSuburbs, hiddenSuburbs]
  );
```

- [ ] **Step 2: Add a roads-loading effect for visible suburbs**

Add this effect (replaces road-loading that previously lived inside `detectSuburbs`/`addSuburb`):

```js
  // ── Load Overpass roads for each visible suburb that lacks them ───────────

  useEffect(() => {
    let cancelled = false;
    async function loadRoads() {
      for (const suburb of visibleSuburbs) {
        if (cancelled) return;
        if (suburbRoads[suburb.name] || loadingSuburbs.has(suburb.name)) continue;
        setLoadingSuburbs((prev) => new Set([...prev, suburb.name]));
        try {
          const roads = await fetchSuburbRoads(suburb.name, suburb.lat, suburb.lon);
          if (!cancelled) setSuburbRoads((prev) => ({ ...prev, [suburb.name]: roads }));
        } catch (err) {
          console.error(`Failed to load roads for ${suburb.name}:`, err);
        } finally {
          setLoadingSuburbs((prev) => {
            const next = new Set(prev);
            next.delete(suburb.name);
            return next;
          });
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    loadRoads();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSuburbs]);
```

- [ ] **Step 3: Draw the focused suburb boundary from stored rings**

Remove the `suburbBoundaries` state, its cleanup in `removeSuburb` (removed in Task 4), and the on-click `fetchSuburbBoundary` block in `handleSuburbClick`. Replace `handleSuburbClick` with:

```js
  const handleSuburbClick = useCallback(
    (suburbName) => {
      const isAlreadyFocused = highlightedSuburb === suburbName;
      setHighlightedSuburb(isAlreadyFocused ? null : suburbName);
      if (!isAlreadyFocused) {
        const suburb = runInSuburbs.find((s) => s.name === suburbName);
        if (suburb) setFlyToTarget({ center: [suburb.lat, suburb.lon], zoom: 15 });
      } else {
        setFlyToTarget(null);
      }
    },
    [highlightedSuburb, runInSuburbs]
  );
```

In the JSX map, replace the `suburbBoundaries[highlightedSuburb]` Polygon block with one driven by the focused suburb's rings:

```jsx
              {highlightedSuburb && (() => {
                const focused = runInSuburbs.find((s) => s.name === highlightedSuburb);
                return focused && focused.rings ? (
                  <Polygon
                    positions={focused.rings}
                    pathOptions={{
                      color: runColor, weight: 2, opacity: 0.8,
                      fillColor: runColor, fillOpacity: 0.08, dashArray: '6 4',
                    }}
                  />
                ) : null;
              })()}
```

- [ ] **Step 4: Exclude hidden suburbs from the map roads**

In the `runRoads`/`unrunRoads` `useMemo`, change the `source` so hidden suburbs never render. Replace its `source` definition with:

```js
    const source = highlightedSuburb && roadCoverage[highlightedSuburb]
      ? { [highlightedSuburb]: roadCoverage[highlightedSuburb] }
      : Object.fromEntries(
          Object.entries(roadCoverage).filter(([name]) => !hiddenSuburbs.has(name))
        );
```

Add `hiddenSuburbs` to that memo's dependency array.

- [ ] **Step 5: Verify build compiles**

Run: `npx cross-env CI=true npm run build`
Expected: Compiles cleanly (unused `suburbView`/`suburbFilter` warnings still OK until Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/components/RoadCoverage/RoadCoverage.js
git commit -m "feat: load roads for visible suburbs, draw boundary from detected rings"
```

---

## Task 4: Suburb panel UI — view toggle, filter, hide/un-hide

Replace the "Add Suburbs" search box and the fixed "Top 10" list with the new controls. Conquered list stays, minus hidden.

**Files:**
- Modify: `src/components/RoadCoverage/RoadCoverage.js`

- [ ] **Step 1: Rework the ranked/conquered memos**

Replace the `conqueredSuburbs` and `topSuburbs` memos with:

```js
  const conqueredSuburbs = useMemo(() => {
    return Object.entries(suburbStats)
      .filter(([name, s]) => s.percent === 100 && s.totalRoads > 0 && !hiddenSuburbs.has(name))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [suburbStats, hiddenSuburbs]);

  const rankedSuburbs = useMemo(() => {
    const q = suburbFilter.trim().toLowerCase();
    const list = Object.entries(suburbStats)
      .filter(([name, s]) =>
        s.percent < 100 && s.totalRoads > 0 &&
        !hiddenSuburbs.has(name) &&
        (!q || name.toLowerCase().includes(q)))
      .sort(([, a], [, b]) => b.percent - a.percent);
    if (suburbView === 'top5') return list.slice(0, 5);
    if (suburbView === 'top10') return list.slice(0, 10);
    return list;
  }, [suburbStats, hiddenSuburbs, suburbView, suburbFilter]);

  const hiddenList = useMemo(
    () => runInSuburbs.filter((s) => hiddenSuburbs.has(s.name)).map((s) => s.name).sort(),
    [runInSuburbs, hiddenSuburbs]
  );
```

- [ ] **Step 2: Add hide / un-hide handlers**

Replace `addSuburb` and `removeSuburb` with:

```js
  const hideSuburb = useCallback((name) => {
    setHiddenSuburbs((prev) => new Set([...prev, name]));
    setHighlightedSuburb((h) => (h === name ? null : h));
  }, []);

  const unhideSuburb = useCallback((name) => {
    setHiddenSuburbs((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);
```

- [ ] **Step 3: Replace the "Add Suburbs" panel JSX**

Replace the entire "Suburb search" card (`<div className="athletic-card-gradient p-4">` containing the `Add Suburbs` button/input/results and the "Added" list) with a filter + hidden section:

```jsx
          {/* Find / hidden suburbs */}
          <div className="athletic-card-gradient p-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-medium">
              <Search className="w-4 h-4 text-orange-400" />
              Suburbs
            </div>
            <input
              type="text"
              value={suburbFilter}
              onChange={(e) => setSuburbFilter(e.target.value)}
              placeholder="Filter suburbs..."
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-slate-400"
            />
            {hiddenList.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Hidden ({hiddenList.length})
                </div>
                {hiddenList.map((name) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/50">
                    <span className="text-slate-300 text-sm flex items-center gap-2">
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      {name}
                    </span>
                    <button
                      onClick={() => unhideSuburb(name)}
                      className="text-orange-400 hover:text-orange-300 text-xs"
                    >
                      Unhide
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
```

- [ ] **Step 4: Replace the "Top 10 suburbs" card with the toggle + ranked list**

Replace the `{topSuburbs.length > 0 && ( ... )}` card with:

```jsx
          {/* Ranked suburbs with view toggle */}
          <div className="athletic-card-gradient p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-orange-400" />
                <h3 className="text-white font-semibold text-sm">Suburbs</h3>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-slate-600 text-xs">
                {[['top5', 'Top 5'], ['top10', 'Top 10'], ['all', 'All']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSuburbView(val)}
                    className={`px-2 py-1 transition-colors ${
                      suburbView === val ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {rankedSuburbs.length === 0 ? (
              <p className="text-slate-400 text-sm">
                {isLoadingActivities || loadingSuburbs.size > 0
                  ? 'Loading suburbs…'
                  : 'No suburbs to show yet.'}
              </p>
            ) : (
              <div className="space-y-2">
                {rankedSuburbs.map(([name, stats], idx) => (
                  <div
                    key={name}
                    className={`space-y-1 p-2 rounded-lg transition-colors ${
                      highlightedSuburb === name
                        ? 'bg-orange-500/20 border border-orange-500/30'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <button onClick={() => handleSuburbClick(name)} className="text-white flex items-center gap-2 text-left">
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-orange-500 text-white'
                          : idx === 1 ? 'bg-slate-400 text-slate-900'
                          : idx === 2 ? 'bg-amber-700 text-white'
                          : 'bg-slate-600 text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        {loadingSuburbs.has(name) && <Loader className="w-3 h-3 text-orange-400 animate-spin" />}
                        {name}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400 font-semibold">{stats.percent}%</span>
                        <button
                          onClick={() => hideSuburb(name)}
                          title="Hide suburb"
                          className="text-slate-400 hover:text-red-400"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => handleSuburbClick(name)} className="block w-full">
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${stats.percent}%`,
                            background:
                              stats.percent >= 75 ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                              : stats.percent >= 50 ? 'linear-gradient(90deg, #f97316, #ea580c)'
                              : stats.percent >= 25 ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                              : 'linear-gradient(90deg, #ef4444, #dc2626)',
                          }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 text-left">
                        {stats.coveredRoads}/{stats.totalRoads} roads
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
```

- [ ] **Step 5: Verify build compiles**

Run: `npx cross-env CI=true npm run build`
Expected: Compiles cleanly with no unused-variable warnings for the suburb state.

- [ ] **Step 6: Commit**

```bash
git add src/components/RoadCoverage/RoadCoverage.js
git commit -m "feat: suburb view toggle, name filter, and persistent hide/un-hide"
```

---

## Task 5: Remove dead code and final verification

**Files:**
- Modify: `src/components/RoadCoverage/RoadCoverage.js`

- [ ] **Step 1: Delete remaining unused code**

Confirm these are gone (delete any that remain): `searchSuburbs`, `reverseGeocodeToSuburb`, `addSuburb`, `removeSuburb`, `suburbBoundaries` state + all references, `selectedSuburbs`, `suburbSearch`, `searchResults`, `isSearching`, `showSearch`, `searchTimeout`, `autoDetectedSuburbs`, `autoDetectRan`. Keep `fetchSuburbRoads`; `fetchSuburbBoundary` may be removed since boundaries now come from detected rings.

- [ ] **Step 2: Lint**

Run: `npx eslint src/components/RoadCoverage/RoadCoverage.js`
Expected: No errors (a stale-browserslist notice is fine). Fix any `no-unused-vars` by removing the dead symbol.

- [ ] **Step 3: Run the geo unit tests once more**

Run: `npx cross-env CI=true react-scripts test src/components/RoadCoverage/roadCoverageGeo.test.js`
Expected: PASS.

- [ ] **Step 4: Manual verification (browser)**

Run `npm start`, open Road Coverage, and confirm:
- Every run-in suburb appears (including Coalfield South); console logs `detected N run-in suburbs`.
- Top 5 / Top 10 / All toggle changes the list length; ranking is by coverage %.
- The filter box narrows the list by name.
- Hiding a suburb removes it from the list AND the map; it appears under "Hidden (N)"; after a full page reload it is still hidden; "Unhide" restores it.
- Conquered (100%) suburbs stay in their own separate list.
- Focusing a suburb flies to it and draws its dashed boundary.

- [ ] **Step 5: Commit**

```bash
git add src/components/RoadCoverage/RoadCoverage.js
git commit -m "chore: remove dead Nominatim search / add-suburb code from Road Coverage"
```

---

## Self-Review Notes

- **Spec coverage:** boundary detection (Task 1–2), coverage % unchanged (Task 3), Top5/10/All toggle + filter (Task 4), persistent hide/un-hide (Task 4), conquered separate (Task 4), map excludes hidden (Task 3), dead-code removal (Task 5), unit tests for geo (Task 1), manual checks (Task 5). All spec sections mapped.
- **Type consistency:** geo exports `computeBounds/pointInRing/assembleRings/parseBoundaryRelations/pointInSuburb/assignRunsToSuburbs`; suburb objects carry `{ name, rings, bbox, centroid }` in the module and `{ name, lat, lon, rings }` in component state (centroid → lat/lon at the boundary). `Polygon positions={focused.rings}` matches Leaflet's nested-array format. Bounds object shape `{south,west,north,east}` is used consistently by `computeBounds`, `inBox`, the cache key, and the Overpass bbox string.
- **No placeholders:** every code step contains complete code.
