// Run with: node --test scripts/computeSegments.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { buildSegmentsForActivity, segmentId } = require('./computeSegments');

test('buildSegmentsForActivity produces PB segments from streams', async () => {
  const activity = {
    id: '123', name: 'Test Run', type: 'Run',
    distance: 5000, moving_time: 1500, start_date: '2026-01-01T00:00:00Z',
  };
  // 5000m at 5:00/km: a point every 100m, +30s per 100m
  const distance = { data: [] };
  const time = { data: [] };
  for (let i = 0; i <= 50; i++) { distance.data.push(i * 100); time.data.push(i * 30); }

  const { segments, metrics } = await buildSegmentsForActivity(activity, { distance, time });
  assert.ok(segments.find((s) => s.distance === '1K'), 'expected a 1K segment');
  assert.strictEqual(segments.find((s) => s.distance === '5K').time, 1500);
  assert.strictEqual(typeof metrics, 'object');
});

test('segmentId is stable and composed of activity/distance/startTime', () => {
  const id = segmentId({ activityId: '123', distance: '5K', startTime: '2026-01-01T00:00:00Z' });
  assert.strictEqual(id, '123_5K_2026-01-01T00:00:00Z');
});
