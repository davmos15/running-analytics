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
