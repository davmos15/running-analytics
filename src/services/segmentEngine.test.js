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

test('calculateActivityMetrics computes HR + stride from streams', () => {
  const streams = {
    heartrate: { data: [150, 160, 170] },
    cadence: { data: [80, 80, 80] },          // per-leg spm
    velocity_smooth: { data: [3, 3, 3] },     // m/s
  };
  const m = engine.calculateActivityMetrics(streams);
  expect(m.average_heartrate).toBe(160);
  expect(m.max_heartrate).toBe(170);
  // stride = (speed*60)/cadence = (3*60)/80 = 2.25
  expect(m.average_stride_length).toBe(2.25);
});
