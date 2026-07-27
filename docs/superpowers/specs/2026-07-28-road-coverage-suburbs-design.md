# Road Coverage — Suburb Overhaul (Design)

Date: 2026-07-28

## Context

The Road Coverage page (`src/components/RoadCoverage/RoadCoverage.js`) lets a runner see
which roads in a suburb they've covered. Its suburb handling has three problems:

1. **Incomplete detection.** Auto-detection samples run points into ~1 km grid cells and
   reverse-geocodes only the **top 25 densest cells** (Nominatim, rate-limited ~1/s). Any
   suburb you ran through less often falls outside the top 25 and is never detected — e.g.
   "Coalfield South" is missing from the list entirely.
2. **Flaky manual add.** Adding a suburb searches all of Australia via Nominatim and only
   appears if road/geocode fetches succeed; small suburbs silently fail to add.
3. **No way to browse.** You can only see a fixed "Top 10"; there's no Top 5 / Top 10 / All
   control and no way to hide suburbs you don't care about.

The GPS fix already shipped: routes now load from the `streams/{id}` `latlng` array via
`firebaseService.getActivityStreams` (`firebaseService.js:838`), so the component has full
per-run coordinates available for detection.

## Goals

- Detect **every** suburb the user has run in, reliably.
- List runs-in suburbs ranked by **coverage %** (roads run ÷ total roads — unchanged
  metric), with a **Top 5 / Top 10 / All** view toggle (default Top 5).
- Let the user **hide** suburbs (persistent) and **un-hide** them from a dropdown.
- Keep **Conquered (100%)** as its own separate list (unchanged).
- Remove the all-Australia Nominatim search and arbitrary add/remove.

Non-goals: changing the coverage math, adding suburbs the user has never run in, changing
the map/legend behaviour beyond respecting hidden suburbs.

## Design

### 1. Complete suburb detection — boundary match

Replaces the capped reverse-geocode loop (`RoadCoverage.js:436-529`).

- Compute the bounding box of all run GPS points (from `runRoutes[].coords`).
- **One** Overpass query fetches every suburb boundary in that box:
  ```
  [out:json][timeout:60];
  relation["admin_level"~"9|10"]["boundary"="administrative"](south,west,north,east);
  out geom;
  ```
- Parse each relation's `outer`-role member geometry into polygon ring(s) (same shape the
  existing `fetchSuburbBoundary` already extracts, `RoadCoverage.js:184-215`). Inner
  holes are ignored — good enough for "did I run here".
- For each run, sample points (every Nth coord) and test point-in-polygon against each
  suburb's rings, with a per-suburb bbox prefilter. A suburb containing ≥1 run point is a
  suburb the user has run in. Record `{ name, lat, lon (centroid), boundary }`.
- Cache the detected suburb set in `localStorage`, keyed by a rounded bbox, so revisits are
  instant. Invalidate when the bbox changes materially (date filter change).

**New module `src/components/RoadCoverage/roadCoverageGeo.js`** holds the pure geometry so
it is unit-testable without network:
- `computeBounds(points) -> {south, west, north, east}`
- `pointInPolygon(point, ring) -> bool` (ray casting)
- `pointInSuburb(point, suburb) -> bool` (bbox prefilter + any-ring test)
- `parseBoundaryRelations(overpassElements) -> [{name, rings, bbox, centroid}]`
- `assignRunsToSuburbs(runRoutes, suburbs) -> Set<name>` (or per-suburb hit info)

Reuse the existing `haversineDistance` helper where useful; keep these functions pure
(no React, no fetch).

### 2. Coverage % — unchanged math

For each detected (non-hidden) suburb: fetch roads via the existing `fetchSuburbRoads`
(`RoadCoverage.js:109-180`), then compute coverage with the existing
`interpolatePoints` / `buildSpatialGrid` / `hasNearbyPoint` pipeline
(`RoadCoverage.js:637-692`). Roads are already cached in `localStorage`.

The suburb list renders **progressively** and re-sorts as each suburb's % arrives; the
existing per-suburb loading spinner (`loadingSuburbs`) is reused. First uncached load with
many suburbs can take a couple of minutes (one Overpass road query per suburb, spaced to
respect rate limits); it is cached afterward. Accepted trade-off.

### 3. UI — left panel

- **View toggle**: a `Top 5 · Top 10 · All` segmented control. New state
  `suburbView: 'top5' | 'top10' | 'all'`, default `'top5'`.
- **Ranked list**: all *non-conquered, non-hidden* run-in suburbs sorted by coverage %
  (reuse the existing % progress-bar row markup, `RoadCoverage.js:966-1015`), sliced to
  5 / 10 / ∞ per the toggle. Each row gains a **Hide** (eye-off) button.
- **Text filter** at the top of the list to jump to a suburb by name (the list can be
  long).
- **Conquered (100%)**: unchanged separate list (`RoadCoverage.js:1021-1051`), also
  excludes hidden suburbs.
- **Hidden (N)**: a collapsible section replacing the old "Add Suburbs" search box, listing
  hidden suburbs with an **Unhide** action.

### 4. State changes

- Add: `runInSuburbs` (detected), `hiddenSuburbs` (Set, persisted to
  `localStorage['roadCoverage_hidden']`), `suburbView`, `suburbFilter` (text).
- `selectedSuburbs` becomes derived: `runInSuburbs` minus `hiddenSuburbs`.
- Remove: `searchSuburbs` + the debounced search effect (`RoadCoverage.js:219-256`,
  `:533-546`), `addSuburb`/`removeSuburb` (`:550-633`), `reverseGeocodeToSuburb`
  (`:77-100`) and the `autoDetectedSuburbs` distinction. `hide`/`unhide` handlers replace
  add/remove.

### 5. Map

Draw roads only for visible (non-hidden) suburbs; focusing a suburb still isolates its
roads (`RoadCoverage.js:754-776` unchanged in spirit, but source excludes hidden).

## Testing

- **Unit** (`roadCoverageGeo.test.js`): `pointInPolygon` inside/outside/on-edge; a
  synthetic two-suburb layout where known points assign to the correct suburb; bbox
  prefilter rejects far points; `parseBoundaryRelations` handles a relation with multiple
  outer ways. No network.
- **Manual**: load the page and confirm every run-in suburb appears (incl. Coalfield
  South); toggle Top 5 / Top 10 / All; hide a suburb and confirm it leaves the list and the
  map and stays hidden after reload; un-hide restores it; Conquered stays separate; the
  legend GPS count is unchanged.

## Risks / trade-offs

- **First-load time**: fetching Overpass roads for every run-in suburb is the slow part;
  mitigated by progressive rendering + localStorage caching. If unacceptable later, a
  fallback is to order provisionally by run-frequency and fill in % as it loads.
- **Boundary coverage**: rural runs may fall outside any `admin_level 9|10` boundary and
  won't be attributed to a suburb — acceptable, matches "suburbs" semantics.
- **bbox size**: a very wide-spread run history makes the single boundary query large; the
  query is one-shot and cached, and `timeout:60` gives Overpass headroom.
