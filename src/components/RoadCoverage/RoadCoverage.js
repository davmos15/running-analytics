import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import polyline from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';
import firebaseService from '../../services/firebaseService';
import DateFilter from '../PersonalBests/DateFilter';
import { Map, Search, ChevronDown, ChevronUp, Loader, MapPin, Trophy } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

const MELBOURNE_CENTER = [-37.8136, 144.9631];
const DEFAULT_ZOOM = 13;
const ROAD_MATCH_TOLERANCE = 25; // metres – how close a GPS point must be to "cover" a road segment

function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Build a spatial grid for fast proximity lookups
function buildSpatialGrid(points, cellSize = 0.002) {
  const grid = {};
  for (const pt of points) {
    const key = `${Math.floor(pt[0] / cellSize)},${Math.floor(pt[1] / cellSize)}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(pt);
  }
  return { grid, cellSize };
}

function hasNearbyPoint(spatialGrid, lat, lon, tolerance) {
  const { grid, cellSize } = spatialGrid;
  const cx = Math.floor(lat / cellSize);
  const cy = Math.floor(lon / cellSize);
  // Check 3x3 neighborhood
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${cx + dx},${cy + dy}`;
      const cell = grid[key];
      if (!cell) continue;
      for (const pt of cell) {
        if (haversineDistance([lat, lon], pt) <= tolerance) return true;
      }
    }
  }
  return false;
}

// Interpolate extra points along a polyline to fill gaps in GPS data
function interpolatePoints(coords, maxGapMetres = 15) {
  const result = [];
  for (let i = 0; i < coords.length; i++) {
    result.push(coords[i]);
    if (i < coords.length - 1) {
      const dist = haversineDistance(coords[i], coords[i + 1]);
      if (dist > maxGapMetres) {
        const steps = Math.ceil(dist / maxGapMetres);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          result.push([
            coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
            coords[i][1] + t * (coords[i + 1][1] - coords[i][1]),
          ]);
        }
      }
    }
  }
  return result;
}

// ── Overpass API: fetch suburb roads ─────────────────────────────────────────

async function fetchSuburbRoads(suburbName) {
  const query = `
    [out:json][timeout:30];
    area["name"="${suburbName}"]["admin_level"~"9|10"]["boundary"="administrative"]->.suburb;
    (
      way["highway"~"^(residential|tertiary|secondary|primary|trunk|unclassified|living_street)$"](area.suburb);
    );
    out body;
    >;
    out skel qt;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
  const data = await response.json();

  // Build node map
  const nodes = {};
  for (const el of data.elements) {
    if (el.type === 'node') nodes[el.id] = [el.lat, el.lon];
  }

  // Build road segments
  const roads = [];
  for (const el of data.elements) {
    if (el.type === 'way' && el.nodes) {
      const coords = el.nodes.map((nId) => nodes[nId]).filter(Boolean);
      if (coords.length >= 2) {
        roads.push({
          id: el.id,
          name: el.tags?.name || 'Unnamed Road',
          type: el.tags?.highway || 'road',
          coords,
        });
      }
    }
  }
  return roads;
}

// ── Suburb search via Nominatim ─────────────────────────────────────────────

async function searchSuburbs(query) {
  if (!query || query.length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&addressdetails=1&limit=10&countrycodes=au&featuretype=settlement`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'RunningAnalytics/1.0' },
  });
  if (!response.ok) return [];
  const results = await response.json();

  return results
    .filter(
      (r) =>
        r.address?.suburb ||
        r.address?.town ||
        r.address?.city_district ||
        r.type === 'suburb' ||
        r.type === 'neighbourhood'
    )
    .map((r) => ({
      name:
        r.address?.suburb ||
        r.address?.town ||
        r.address?.city_district ||
        r.display_name.split(',')[0],
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      state: r.address?.state || '',
    }));
}

// ── Map auto-fit component ──────────────────────────────────────────────────

function MapFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, bounds]);
  return null;
}

// ── Main component ──────────────────────────────────────────────────────────

const RoadCoverage = () => {
  // Date filter state
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Suburb state
  const [selectedSuburbs, setSelectedSuburbs] = useState([]);
  const [suburbSearch, setSuburbSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  const searchTimeout = useRef(null);

  // Map data state
  const [runRoutes, setRunRoutes] = useState([]);
  const [suburbRoads, setSuburbRoads] = useState({});
  const [roadCoverage, setRoadCoverage] = useState({});
  const [suburbStats, setSuburbStats] = useState({});
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingRoads, setIsLoadingRoads] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [error, setError] = useState(null);

  // ── Load run routes from Firestore ──────────────────────────────────────

  useEffect(() => {
    async function loadRoutes() {
      setIsLoadingActivities(true);
      setError(null);
      try {
        const activities = await firebaseService.getActivities(
          timeFilter,
          customDateFrom,
          customDateTo
        );

        const routes = activities
          .filter(
            (a) =>
              a.type &&
              ['Run', 'TrailRun'].includes(a.type) &&
              a.map?.summary_polyline
          )
          .map((a) => {
            try {
              const coords = polyline.decode(a.map.summary_polyline);
              return { id: a.id, coords, date: a.start_date };
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        setRunRoutes(routes);
      } catch (err) {
        console.error('Failed to load routes:', err);
        setError('Failed to load activity data');
      } finally {
        setIsLoadingActivities(false);
      }
    }
    loadRoutes();
  }, [timeFilter, customDateFrom, customDateTo]);

  // ── Suburb search debounced ─────────────────────────────────────────────

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!suburbSearch || suburbSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchSuburbs(suburbSearch);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [suburbSearch]);

  // ── Add a suburb ────────────────────────────────────────────────────────

  const addSuburb = useCallback(
    async (suburb) => {
      if (selectedSuburbs.find((s) => s.name === suburb.name)) return;
      setSelectedSuburbs((prev) => [...prev, suburb]);
      setSuburbSearch('');
      setSearchResults([]);

      // Load roads for this suburb
      setIsLoadingRoads(true);
      try {
        const roads = await fetchSuburbRoads(suburb.name);
        setSuburbRoads((prev) => ({ ...prev, [suburb.name]: roads }));
      } catch (err) {
        console.error(`Failed to load roads for ${suburb.name}:`, err);
        setError(`Could not load roads for ${suburb.name}. Try again later.`);
      } finally {
        setIsLoadingRoads(false);
      }
    },
    [selectedSuburbs]
  );

  const removeSuburb = useCallback((name) => {
    setSelectedSuburbs((prev) => prev.filter((s) => s.name !== name));
    setSuburbRoads((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
    setRoadCoverage((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
    setSuburbStats((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }, []);

  // ── Compute road coverage when routes or roads change ───────────────────

  useEffect(() => {
    if (runRoutes.length === 0 || Object.keys(suburbRoads).length === 0) return;

    // Build a single spatial grid from all run points (with interpolation)
    const allRunPoints = runRoutes.flatMap((r) => interpolatePoints(r.coords));
    const spatialGrid = buildSpatialGrid(allRunPoints);

    const newCoverage = {};
    const newStats = {};

    for (const [suburbName, roads] of Object.entries(suburbRoads)) {
      const coverageMap = {};
      for (const road of roads) {
        // Check each segment (pair of consecutive points) of the road
        let roadCovered = 0;
        let roadTotal = 0;

        for (let i = 0; i < road.coords.length; i++) {
          roadTotal++;
          const [lat, lon] = road.coords[i];
          if (hasNearbyPoint(spatialGrid, lat, lon, ROAD_MATCH_TOLERANCE)) {
            roadCovered++;
          }
        }

        const pct = roadTotal > 0 ? roadCovered / roadTotal : 0;
        coverageMap[road.id] = {
          ...road,
          covered: pct >= 0.3, // 30% of points matched = "run"
          coveragePercent: Math.round(pct * 100),
        };
      }

      newCoverage[suburbName] = coverageMap;
      newStats[suburbName] = {
        totalRoads: roads.length,
        coveredRoads: Object.values(coverageMap).filter((r) => r.covered).length,
        percent:
          roads.length > 0
            ? Math.round(
                (Object.values(coverageMap).filter((r) => r.covered).length /
                  roads.length) *
                  100
              )
            : 0,
      };
    }

    setRoadCoverage(newCoverage);
    setSuburbStats(newStats);
  }, [runRoutes, suburbRoads]);

  // ── Compute map bounds ──────────────────────────────────────────────────

  useEffect(() => {
    const allCoords = [];
    for (const roads of Object.values(suburbRoads)) {
      for (const road of roads) {
        allCoords.push(...road.coords);
      }
    }
    if (allCoords.length > 0) {
      setMapBounds(allCoords);
    } else if (runRoutes.length > 0) {
      setMapBounds(runRoutes.flatMap((r) => r.coords));
    }
  }, [suburbRoads, runRoutes]);

  // ── Top 5 suburbs (sorted by coverage %) ────────────────────────────────

  const topSuburbs = useMemo(() => {
    return Object.entries(suburbStats)
      .sort(([, a], [, b]) => b.percent - a.percent)
      .slice(0, 5);
  }, [suburbStats]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mt-6 mx-4 space-y-4 pb-24 md:pb-6">
      {/* Header */}
      <div className="athletic-card-gradient p-4">
        <div className="flex items-center gap-3">
          <Map className="w-6 h-6 text-orange-400" />
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            Road Coverage
          </h1>
        </div>
        <p className="text-slate-400 mt-1 text-sm">
          See which roads you've conquered and which are still waiting.
        </p>
      </div>

      {/* Controls row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left panel: Top suburbs + suburb selector */}
        <div className="lg:col-span-1 space-y-4">
          {/* Date filter */}
          <DateFilter
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            customDateFrom={customDateFrom}
            setCustomDateFrom={setCustomDateFrom}
            customDateTo={customDateTo}
            setCustomDateTo={setCustomDateTo}
          />

          {/* Suburb search */}
          <div className="athletic-card-gradient p-4">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center justify-between w-full text-white font-medium mb-2"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-400" />
                Add Suburbs
              </span>
              {showSearch ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showSearch && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={suburbSearch}
                  onChange={(e) => setSuburbSearch(e.target.value)}
                  placeholder="Search suburbs..."
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-slate-400"
                />
                {isSearching && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm p-2">
                    <Loader className="w-4 h-4 animate-spin" /> Searching...
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => addSuburb(result)}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-600/50 text-white text-sm transition-colors"
                      >
                        <div className="font-medium">{result.name}</div>
                        <div className="text-slate-400 text-xs truncate">
                          {result.displayName}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected suburbs */}
            {selectedSuburbs.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Selected
                </div>
                {selectedSuburbs.map((suburb) => (
                  <div
                    key={suburb.name}
                    className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-orange-400" />
                      <span className="text-white text-sm">{suburb.name}</span>
                    </div>
                    <button
                      onClick={() => removeSuburb(suburb.name)}
                      className="text-slate-400 hover:text-red-400 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 suburbs */}
          {topSuburbs.length > 0 && (
            <div className="athletic-card-gradient p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-orange-400" />
                <h3 className="text-white font-semibold text-sm">
                  Top Suburbs
                </h3>
              </div>
              <div className="space-y-2">
                {topSuburbs.map(([name, stats], idx) => (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white flex items-center gap-2">
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0
                              ? 'bg-orange-500 text-white'
                              : idx === 1
                              ? 'bg-slate-400 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-600 text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        {name}
                      </span>
                      <span className="text-orange-400 font-semibold">
                        {stats.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${stats.percent}%`,
                          background:
                            stats.percent >= 75
                              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                              : stats.percent >= 50
                              ? 'linear-gradient(90deg, #f97316, #ea580c)'
                              : stats.percent >= 25
                              ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                              : 'linear-gradient(90deg, #ef4444, #dc2626)',
                        }}
                      />
                    </div>
                    <div className="text-xs text-slate-400">
                      {stats.coveredRoads}/{stats.totalRoads} roads
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div className="athletic-card-gradient p-2 relative" style={{ minHeight: '600px' }}>
            {(isLoadingActivities || isLoadingRoads) && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 z-[1000] rounded-lg">
                <div className="text-center">
                  <Loader className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">
                    {isLoadingActivities
                      ? 'Loading activities...'
                      : 'Loading road data...'}
                  </p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute top-2 left-2 right-2 z-[1000] bg-red-500/90 text-white p-3 rounded-lg text-sm">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            <MapContainer
              center={MELBOURNE_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {mapBounds && <MapFitter bounds={mapBounds} />}

              {/* Render suburb roads – unrun roads first (below), then covered */}
              {Object.values(roadCoverage).flatMap((roads) =>
                Object.values(roads)
                  .filter((r) => !r.covered)
                  .map((road) => (
                    <Polyline
                      key={`unrun-${road.id}`}
                      positions={road.coords}
                      pathOptions={{
                        color: '#64748b',
                        weight: 2,
                        opacity: 0.35,
                        dashArray: '4 6',
                      }}
                    />
                  ))
              )}
              {Object.values(roadCoverage).flatMap((roads) =>
                Object.values(roads)
                  .filter((r) => r.covered)
                  .map((road) => (
                    <Polyline
                      key={`run-${road.id}`}
                      positions={road.coords}
                      pathOptions={{
                        color: '#f97316',
                        weight: 3.5,
                        opacity: 0.9,
                      }}
                    />
                  ))
              )}

              {/* Run route traces (subtle) when no suburb is selected */}
              {selectedSuburbs.length === 0 &&
                runRoutes.map((route) => (
                  <Polyline
                    key={`route-${route.id}`}
                    positions={route.coords}
                    pathOptions={{
                      color: '#f97316',
                      weight: 2.5,
                      opacity: 0.7,
                    }}
                  />
                ))}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="athletic-card-gradient p-3 mt-2 flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-1 rounded"
                style={{ backgroundColor: '#f97316' }}
              />
              <span className="text-white">Roads you've run</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-1 rounded opacity-40"
                style={{
                  backgroundColor: '#64748b',
                  borderStyle: 'dashed',
                }}
              />
              <span className="text-slate-400">Roads still to conquer</span>
            </div>
            {!isLoadingActivities && (
              <div className="text-slate-500 ml-auto">
                {runRoutes.length} activities loaded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadCoverage;
