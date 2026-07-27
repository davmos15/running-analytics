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
