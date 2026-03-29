import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, useMap } from 'react-leaflet';
import polyline from '@mapbox/polyline';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import firebaseService from '../../services/firebaseService';
import DateFilter from '../PersonalBests/DateFilter';
import { Map, Search, ChevronDown, ChevronUp, Loader, MapPin, Trophy, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

const MELBOURNE_CENTER = [-37.8136, 144.9631];
const DEFAULT_ZOOM = 13;
const ROAD_MATCH_TOLERANCE = 25;

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

// ── Reverse geocode a point to suburb name ──────────────────────────────────

async function reverseGeocodeToSuburb(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=16`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RunningAnalytics/1.0' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const suburb =
      data.address?.suburb ||
      data.address?.town ||
      data.address?.city_district ||
      data.address?.neighbourhood;
    if (!suburb) return null;
    return {
      name: suburb,
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      state: data.address?.state || '',
    };
  } catch {
    return null;
  }
}

// ── Overpass API: fetch suburb roads with retry ──────────────────────────────

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function fetchSuburbRoads(suburbName, lat, lon, retries = 2) {
  // Use 'around' on the relation to find only the suburb near the known
  // coordinates, preventing identically-named suburbs worldwide from matching
  const locationFilter = lat && lon
    ? `(around:15000,${lat},${lon})`
    : '';

  const query = `
    [out:json][timeout:45];
    rel["name"="${suburbName}"]["admin_level"~"9|10"]["boundary"="administrative"]${locationFilter};
    map_to_area->.suburb;
    (
      way["highway"~"^(residential|tertiary|secondary|primary|trunk|unclassified|living_street)$"](area.suburb);
    );
    out body;
    >;
    out skel qt;
  `;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 504 || response.status === 429) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
      }
      if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
      const data = await response.json();

      const nodes = {};
      for (const el of data.elements) {
        if (el.type === 'node') nodes[el.id] = [el.lat, el.lon];
      }

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

// ── Fetch suburb boundary from Overpass ──────────────────────────────────────

async function fetchSuburbBoundary(suburbName, lat, lon) {
  const locationFilter = lat && lon
    ? `(around:15000,${lat},${lon})`
    : '';
  const query = `
    [out:json][timeout:20];
    relation["name"="${suburbName}"]["admin_level"~"9|10"]["boundary"="administrative"]${locationFilter};
    out geom;
  `;

  try {
    const response = await fetch(OVERPASS_ENDPOINTS[0], {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!response.ok) return null;
    const data = await response.json();

    for (const el of data.elements) {
      if (el.type === 'relation' && el.members) {
        const outerWays = el.members
          .filter((m) => m.type === 'way' && m.role === 'outer' && m.geometry)
          .flatMap((m) => m.geometry.map((g) => [g.lat, g.lon]));
        if (outerWays.length > 0) return outerWays;
      }
    }
  } catch {
    // boundary is optional
  }
  return null;
}

// ── Suburb search via Nominatim ─────────────────────────────────────────────

async function searchSuburbs(query) {
  if (!query || query.length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query + ', Australia'
  )}&format=json&addressdetails=1&limit=15&countrycodes=au`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'RunningAnalytics/1.0' },
  });
  if (!response.ok) return [];
  const results = await response.json();

  // Deduplicate by suburb name - keep distinct suburbs (handles North/South/East/West)
  const seen = new Set();
  return results
    .filter((r) => {
      const name =
        r.address?.suburb ||
        r.address?.town ||
        r.address?.city_district;
      if (!name) return false;
      // Use name + state as key to distinguish e.g. "Richmond VIC" vs "Richmond NSW"
      const key = `${name}|${r.address?.state || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => ({
      name:
        r.address?.suburb ||
        r.address?.town ||
        r.address?.city_district,
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      state: r.address?.state || '',
    }));
}

// ── Map controller components ───────────────────────────────────────────────

function MapFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        const latLngs = bounds.map((b) => L.latLng(b[0], b[1]));
        const b = L.latLngBounds(latLngs);
        if (b.isValid()) {
          map.fitBounds(b, { padding: [30, 30], maxZoom: 16 });
        }
      } catch {
        // invalid bounds
      }
    }
  }, [map, bounds]);
  return null;
}

function MapFlyer({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 1 });
    }
  }, [map, center, zoom]);
  return null;
}

// ── Main component ──────────────────────────────────────────────────────────

const RoadCoverage = () => {
  // Date filter
  const [timeFilter, setTimeFilter] = useState('all-time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Suburb state – restore from cache
  const [selectedSuburbs, setSelectedSuburbs] = useState(() => {
    try {
      const cached = localStorage.getItem('roadCoverage_suburbs');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [suburbSearch, setSuburbSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  const searchTimeout = useRef(null);

  // Map data
  const [runRoutes, setRunRoutes] = useState([]);
  const [suburbRoads, setSuburbRoads] = useState({});
  const [roadCoverage, setRoadCoverage] = useState({});
  const [suburbStats, setSuburbStats] = useState({});
  const [suburbBoundaries, setSuburbBoundaries] = useState({});
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [loadingSuburbs, setLoadingSuburbs] = useState(new Set());
  const [mapBounds, setMapBounds] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(MELBOURNE_CENTER);
  const [totalRunCount, setTotalRunCount] = useState(0);

  // Visibility toggles
  const [showRunRoads, setShowRunRoads] = useState(true);
  const [showUnrunRoads, setShowUnrunRoads] = useState(true);
  const [runColor, setRunColor] = useState('#f97316'); // orange by default
  const [unrunColor, setUnrunColor] = useState('#ef4444'); // red by default

  // Highlighted suburb (from clicking top suburbs or search)
  const [highlightedSuburb, setHighlightedSuburb] = useState(null);

  // Track if auto-detection has run
  const autoDetectRan = useRef(false);
  const [autoDetectedSuburbs, setAutoDetectedSuburbs] = useState(() => {
    try {
      const cached = localStorage.getItem('roadCoverage_autoSuburbs');
      return cached ? new Set(JSON.parse(cached)) : new Set();
    } catch { return new Set(); }
  });

  // ── Persist suburbs to localStorage ──────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem('roadCoverage_suburbs', JSON.stringify(selectedSuburbs));
    } catch { /* quota exceeded */ }
  }, [selectedSuburbs]);

  useEffect(() => {
    try {
      localStorage.setItem('roadCoverage_autoSuburbs', JSON.stringify([...autoDetectedSuburbs]));
    } catch { /* quota exceeded */ }
  }, [autoDetectedSuburbs]);

  // ── Load cached road data on mount, then refresh from Overpass ─────────

  useEffect(() => {
    // Restore cached road data for instant display
    try {
      const cachedRoads = localStorage.getItem('roadCoverage_roads');
      if (cachedRoads) {
        setSuburbRoads(JSON.parse(cachedRoads));
      }
    } catch { /* ignore */ }
  }, []);

  // Persist road data when it changes
  useEffect(() => {
    if (Object.keys(suburbRoads).length > 0) {
      try {
        localStorage.setItem('roadCoverage_roads', JSON.stringify(suburbRoads));
      } catch { /* quota exceeded - road data can be large */ }
    }
  }, [suburbRoads]);

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

        const runActivities = activities.filter(
          (a) => a.type && ['Run', 'TrailRun'].includes(a.type)
        );
        const withPolyline = runActivities.filter((a) => a.map?.summary_polyline);

        console.log(
          `[RoadCoverage] ${runActivities.length} runs, ${withPolyline.length} have polylines`
        );

        // If no polylines, check if map field exists at all
        if (withPolyline.length === 0 && runActivities.length > 0) {
          const sample = runActivities[0];
          console.log('[RoadCoverage] Sample activity map field:', sample.map);
        }

        const routes = withPolyline
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
        setTotalRunCount(runActivities.length);

        if (routes.length === 0 && runActivities.length > 0) {
          setError(
            `Found ${runActivities.length} runs but none have route data. ` +
            'Try re-syncing from Settings to pull in GPS polylines from Strava.'
          );
        }
      } catch (err) {
        console.error('Failed to load routes:', err);
        setError('Failed to load activity data');
      } finally {
        setIsLoadingActivities(false);
      }
    }
    loadRoutes();
  }, [timeFilter, customDateFrom, customDateTo]);

  // ── Auto-detect ALL suburbs from run data ───────────────────────────

  useEffect(() => {
    if (autoDetectRan.current || runRoutes.length === 0 || isLoadingActivities) return;
    autoDetectRan.current = true;

    // Skip if we have cached suburbs
    try {
      const cached = localStorage.getItem('roadCoverage_suburbs');
      if (cached && JSON.parse(cached).length > 0) return;
    } catch { /* proceed */ }

    async function detectSuburbs() {
      // Sample multiple points per route (start, middle, end) for better suburb coverage
      const cellSize = 0.01; // ~1km grid
      const cellCounts = {};
      const cellPoints = {};

      for (const route of runRoutes) {
        if (route.coords.length === 0) continue;
        // Sample start, 25%, 50%, 75% points to catch routes crossing suburbs
        const indices = [0, Math.floor(route.coords.length * 0.25), Math.floor(route.coords.length * 0.5), Math.floor(route.coords.length * 0.75)];
        for (const idx of indices) {
          if (idx >= route.coords.length) continue;
          const [lat, lon] = route.coords[idx];
          const key = `${Math.floor(lat / cellSize)},${Math.floor(lon / cellSize)}`;
          cellCounts[key] = (cellCounts[key] || 0) + 1;
          if (!cellPoints[key]) cellPoints[key] = [lat, lon];
        }
      }

      // Get ALL distinct clusters (sorted by density)
      const allCells = Object.entries(cellCounts)
        .sort(([, a], [, b]) => b - a);

      if (allCells.length === 0) return;

      // Reverse geocode all cluster centers to find every suburb
      const suburbInfo = {};
      const suburbCounts = {};
      // Limit to top 25 clusters to stay within rate limits (~28s)
      const cellsToGeocode = allCells.slice(0, 25);

      for (const [key, count] of cellsToGeocode) {
        const point = cellPoints[key];
        const suburb = await reverseGeocodeToSuburb(point[0], point[1]);
        if (suburb) {
          if (!suburbInfo[suburb.name]) {
            suburbInfo[suburb.name] = suburb;
            suburbCounts[suburb.name] = count;
          } else {
            suburbCounts[suburb.name] += count;
          }
        }
        await new Promise((r) => setTimeout(r, 1100));
      }

      const allNames = Object.entries(suburbCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([name]) => name);

      if (allNames.length === 0) return;

      // Center map on most frequent suburb
      const topSuburb = suburbInfo[allNames[0]];
      if (topSuburb) {
        setMapCenter([topSuburb.lat, topSuburb.lon]);
        setFlyToTarget({ center: [topSuburb.lat, topSuburb.lon], zoom: 14 });
      }

      // Add ALL detected suburbs
      const allSuburbs = allNames.map((name) => suburbInfo[name]);
      setSelectedSuburbs(allSuburbs);
      setAutoDetectedSuburbs(new Set(allNames));

      // Load roads for each suburb sequentially
      for (const suburb of allSuburbs) {
        setLoadingSuburbs((prev) => new Set([...prev, suburb.name]));
        try {
          const roads = await fetchSuburbRoads(suburb.name, suburb.lat, suburb.lon);
          setSuburbRoads((prev) => ({ ...prev, [suburb.name]: roads }));
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

    detectSuburbs();
  }, [runRoutes, isLoadingActivities]);

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
      if (selectedSuburbs.find((s) => s.name === suburb.name)) {
        // Already added – just fly to it and highlight
        setFlyToTarget({ center: [suburb.lat, suburb.lon], zoom: 15 });
        setHighlightedSuburb(suburb.name);
        setSuburbSearch('');
        setSearchResults([]);
        return;
      }

      setSelectedSuburbs((prev) => [...prev, suburb]);
      setSuburbSearch('');
      setSearchResults([]);

      // Fly to the suburb on the map
      setFlyToTarget({ center: [suburb.lat, suburb.lon], zoom: 15 });
      setHighlightedSuburb(suburb.name);

      // Load roads
      setLoadingSuburbs((prev) => new Set([...prev, suburb.name]));
      try {
        const [roads, boundary] = await Promise.all([
          fetchSuburbRoads(suburb.name, suburb.lat, suburb.lon),
          fetchSuburbBoundary(suburb.name, suburb.lat, suburb.lon),
        ]);
        setSuburbRoads((prev) => ({ ...prev, [suburb.name]: roads }));
        if (boundary) {
          setSuburbBoundaries((prev) => ({ ...prev, [suburb.name]: boundary }));
        }
      } catch (err) {
        console.error(`Failed to load roads for ${suburb.name}:`, err);
        setError(`Could not load roads for ${suburb.name}. Retrying...`);
        setTimeout(async () => {
          try {
            const roads = await fetchSuburbRoads(suburb.name, suburb.lat, suburb.lon);
            setSuburbRoads((prev) => ({ ...prev, [suburb.name]: roads }));
            setError(null);
          } catch {
            setError(`Could not load roads for ${suburb.name}. Try again later.`);
          } finally {
            setLoadingSuburbs((prev) => {
              const next = new Set(prev);
              next.delete(suburb.name);
              return next;
            });
          }
        }, 3000);
        return;
      } finally {
        setLoadingSuburbs((prev) => {
          const next = new Set(prev);
          next.delete(suburb.name);
          return next;
        });
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
    setSuburbBoundaries((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
    if (highlightedSuburb === name) setHighlightedSuburb(null);
  }, [highlightedSuburb]);

  // ── Compute road coverage ───────────────────────────────────────────────

  useEffect(() => {
    if (runRoutes.length === 0 || Object.keys(suburbRoads).length === 0) return;

    const allRunPoints = runRoutes.flatMap((r) => interpolatePoints(r.coords));
    const spatialGrid = buildSpatialGrid(allRunPoints);

    const newCoverage = {};
    const newStats = {};
    // Track road IDs globally to deduplicate roads that appear in multiple suburbs
    const globalSeenRoadIds = new Set();

    for (const [suburbName, roads] of Object.entries(suburbRoads)) {
      const coverageMap = {};

      for (const road of roads) {
        // Skip duplicate roads already processed in another suburb
        if (globalSeenRoadIds.has(road.id)) continue;
        globalSeenRoadIds.add(road.id);

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
          covered: pct >= 0.3,
          coveragePercent: Math.round(pct * 100),
        };
      }

      newCoverage[suburbName] = coverageMap;
      newStats[suburbName] = {
        totalRoads: Object.keys(coverageMap).length,
        coveredRoads: Object.values(coverageMap).filter((r) => r.covered).length,
        percent:
          Object.keys(coverageMap).length > 0
            ? Math.round(
                (Object.values(coverageMap).filter((r) => r.covered).length /
                  Object.keys(coverageMap).length) *
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

  // ── Conquered suburbs (100%) and top 5 in-progress ─────────────────────

  const conqueredSuburbs = useMemo(() => {
    return Object.entries(suburbStats)
      .filter(([, s]) => s.percent === 100 && s.totalRoads > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [suburbStats]);

  const topSuburbs = useMemo(() => {
    return Object.entries(suburbStats)
      .filter(([, s]) => s.percent < 100 && s.totalRoads > 0)
      .sort(([, a], [, b]) => b.percent - a.percent)
      .slice(0, 10);
  }, [suburbStats]);

  // ── Handle clicking a suburb (focus/unfocus) ─────────────────────────────

  const handleSuburbClick = useCallback(
    async (suburbName) => {
      const isAlreadyFocused = highlightedSuburb === suburbName;
      setHighlightedSuburb(isAlreadyFocused ? null : suburbName);

      if (!isAlreadyFocused) {
        const suburb = selectedSuburbs.find((s) => s.name === suburbName);
        if (suburb) {
          setFlyToTarget({ center: [suburb.lat, suburb.lon], zoom: 15 });
        }
        if (!suburbBoundaries[suburbName]) {
          const suburb = selectedSuburbs.find((s) => s.name === suburbName);
          const boundary = await fetchSuburbBoundary(suburbName, suburb?.lat, suburb?.lon);
          if (boundary) {
            setSuburbBoundaries((prev) => ({ ...prev, [suburbName]: boundary }));
          }
        }
      } else {
        // Un-focus: reset fly target so bounds take over
        setFlyToTarget(null);
      }
    },
    [highlightedSuburb, selectedSuburbs, suburbBoundaries]
  );

  // ── Road lists filtered to focused suburb if one is selected ────────────

  const { runRoads, unrunRoads } = useMemo(() => {
    const seenIds = new Set();
    const run = [];
    const unrun = [];

    // If a suburb is focused, show only its roads
    const source = highlightedSuburb && roadCoverage[highlightedSuburb]
      ? { [highlightedSuburb]: roadCoverage[highlightedSuburb] }
      : roadCoverage;

    for (const roads of Object.values(source)) {
      for (const road of Object.values(roads)) {
        if (seenIds.has(road.id)) continue;
        seenIds.add(road.id);
        if (road.covered) {
          run.push(road);
        } else {
          unrun.push(road);
        }
      }
    }
    return { runRoads: run, unrunRoads: unrun };
  }, [roadCoverage, highlightedSuburb]);

  const isLoadingRoads = loadingSuburbs.size > 0;

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
        {/* Left panel */}
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

          {/* Visibility toggles */}
          <div className="athletic-card-gradient p-4">
            <h3 className="text-white font-medium text-sm mb-3">Road Visibility</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowRunRoads(!showRunRoads)}
                className={`flex items-center gap-2 w-full p-2 rounded-lg text-sm transition-colors ${
                  showRunRoads ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                {showRunRoads ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <div className="w-6 h-1 rounded" style={{ backgroundColor: runColor }} />
                Roads you've run
              </button>
              {showRunRoads && (
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-xs text-slate-400">Colour:</span>
                  {['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#eab308'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setRunColor(color)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                        runColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowUnrunRoads(!showUnrunRoads)}
                className={`flex items-center gap-2 w-full p-2 rounded-lg text-sm transition-colors ${
                  showUnrunRoads ? 'bg-slate-600/40 text-white' : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                {showUnrunRoads ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <div className="w-6 h-1 rounded" style={{ backgroundColor: unrunColor }} />
                Roads to conquer
              </button>
              {showUnrunRoads && (
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-xs text-slate-400">Colour:</span>
                  {['#ef4444', '#64748b', '#8b5cf6', '#06b6d4', '#eab308'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setUnrunColor(color)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                        unrunColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

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
              {showSearch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                        key={`${result.name}-${result.state}-${idx}`}
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

            {/* Manually added suburbs (not auto-detected) */}
            {selectedSuburbs.filter((s) => !autoDetectedSuburbs.has(s.name)).length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Added
                </div>
                {selectedSuburbs.filter((s) => !autoDetectedSuburbs.has(s.name)).map((suburb) => (
                  <div
                    key={suburb.name}
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                      highlightedSuburb === suburb.name
                        ? 'bg-orange-500/20 border border-orange-500/30'
                        : 'bg-slate-700/50 hover:bg-slate-600/50'
                    }`}
                    onClick={() => handleSuburbClick(suburb.name)}
                  >
                    <div className="flex items-center gap-2">
                      {loadingSuburbs.has(suburb.name) ? (
                        <Loader className="w-3 h-3 text-orange-400 animate-spin" />
                      ) : (
                        <MapPin className="w-3 h-3 text-orange-400" />
                      )}
                      <span className="text-white text-sm">{suburb.name}</span>
                      {suburbStats[suburb.name] && (
                        <span className="text-xs text-slate-400">
                          {suburbStats[suburb.name].percent}%
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSuburb(suburb.name); }}
                      className="text-slate-400 hover:text-red-400 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 10 suburbs */}
          {topSuburbs.length > 0 && (
            <div className="athletic-card-gradient p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-orange-400" />
                <h3 className="text-white font-semibold text-sm">Top Suburbs</h3>
              </div>
              <div className="space-y-2">
                {topSuburbs.map(([name, stats], idx) => (
                  <button
                    key={name}
                    onClick={() => handleSuburbClick(name)}
                    className={`w-full text-left space-y-1 p-2 rounded-lg transition-colors ${
                      highlightedSuburb === name
                        ? 'bg-orange-500/20 border border-orange-500/30'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
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
                      <span className="text-orange-400 font-semibold">{stats.percent}%</span>
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
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conquered suburbs (100%) */}
          {conqueredSuburbs.length > 0 && (
            <div className="athletic-card-gradient p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-white font-semibold text-sm">
                  Conquered ({conqueredSuburbs.length})
                </h3>
              </div>
              <div className="space-y-1">
                {conqueredSuburbs.map(([name, stats]) => (
                  <button
                    key={name}
                    onClick={() => handleSuburbClick(name)}
                    className={`w-full text-left flex items-center justify-between p-2 rounded-lg transition-colors ${
                      highlightedSuburb === name
                        ? 'bg-green-500/20 border border-green-500/30'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-white text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      {name}
                    </span>
                    <span className="text-green-400 text-xs font-medium">
                      {stats.totalRoads} roads
                    </span>
                  </button>
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
                      : `Loading roads${loadingSuburbs.size > 0 ? ` for ${[...loadingSuburbs].join(', ')}` : ''}...`}
                  </p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute top-2 left-2 right-2 z-[1000] bg-red-500/90 text-white p-3 rounded-lg text-sm">
                {error}
                <button onClick={() => setError(null)} className="ml-2 underline">
                  Dismiss
                </button>
              </div>
            )}
            <MapContainer
              center={mapCenter}
              zoom={DEFAULT_ZOOM}
              style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {mapBounds && !flyToTarget && <MapFitter bounds={mapBounds} />}
              {flyToTarget && (
                <MapFlyer center={flyToTarget.center} zoom={flyToTarget.zoom} />
              )}

              {/* Suburb boundaries */}
              {highlightedSuburb && suburbBoundaries[highlightedSuburb] && (
                <Polygon
                  positions={suburbBoundaries[highlightedSuburb]}
                  pathOptions={{
                    color: runColor,
                    weight: 2,
                    opacity: 0.8,
                    fillColor: runColor,
                    fillOpacity: 0.08,
                    dashArray: '6 4',
                  }}
                />
              )}

              {/* Unrun roads */}
              {showUnrunRoads &&
                unrunRoads.map((road) => (
                  <Polyline
                    key={`unrun-${road.id}`}
                    positions={road.coords}
                    pathOptions={{
                      color: unrunColor,
                      weight: 3.5,
                      opacity: 0.9,
                    }}
                  />
                ))}

              {/* Run roads */}
              {showRunRoads &&
                runRoads.map((road) => (
                  <Polyline
                    key={`run-${road.id}`}
                    positions={road.coords}
                    pathOptions={{
                      color: runColor,
                      weight: 3.5,
                      opacity: 0.9,
                    }}
                  />
                ))}

              {/* Raw route traces only when no suburb roads loaded */}
              {showRunRoads &&
                Object.keys(suburbRoads).length === 0 &&
                runRoutes.map((route) => (
                  <Polyline
                    key={`route-${route.id}`}
                    positions={route.coords}
                    pathOptions={{
                      color: runColor,
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
              <div className="w-8 h-1 rounded" style={{ backgroundColor: runColor }} />
              <span className="text-white">
                Roads you've run ({runRoads.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded opacity-50" style={{ backgroundColor: unrunColor }} />
              <span className="text-slate-400">
                Roads to conquer ({unrunRoads.length})
              </span>
            </div>
            {!isLoadingActivities && (
              <div className="text-slate-500 ml-auto text-xs">
                {runRoutes.length} with GPS{totalRunCount > runRoutes.length ? ` (${totalRunCount - runRoutes.length} indoor/no GPS)` : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadCoverage;
