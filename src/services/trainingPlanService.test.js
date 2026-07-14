import svc from './trainingPlanService';

const paces = {
  easy: '5:19', tempo: '4:23', race: '4:37',
  interval: '4:10', recovery: '5:47', marathon: '4:50'
};
const MARATHON = 42200;
// A modest base, like the reported case (~10km/week, longest 10km).
const userData = { currentWeeklyVolume: 10, longestRun: 10, averagePacePerKm: 320 };

test('marathon peak weekly volume is substantial even for a low base', () => {
  const peak = svc.calculatePeakVolume(MARATHON, userData);
  expect(peak).toBeGreaterThanOrEqual(50); // was ~15 before the fix
});

test('marathon long run builds toward ~30km at peak', () => {
  const lr = svc.calculateLongRunDistance(54, 'peak', 9, userData, MARATHON, 12);
  expect(lr).toBeGreaterThanOrEqual(28);
  expect(lr).toBeLessThanOrEqual(32);
});

test('weekly volume ramps up across the plan (not flat-low)', () => {
  const wk1 = svc.calculateWeeklyVolume(1, 'base', MARATHON, userData, 12);
  const wk9 = svc.calculateWeeklyVolume(9, 'peak', MARATHON, userData, 12);
  expect(wk9).toBeGreaterThan(wk1);
  expect(wk9).toBeGreaterThanOrEqual(50);
});

test('quality segments never go negative, even for tiny workouts', () => {
  [1, 2, 3, 5, 8].forEach((total) => {
    const groups = [
      svc.generateRacePaceSegments(total, paces),
      svc.generateIntervalSegments(total, paces, 'build'),
      svc.generateHillSegments(total, paces),
      svc.generateTempoSegments(total, paces)
    ];
    groups.forEach((segs) => segs.forEach((s) => {
      expect(s.distance).toBeGreaterThanOrEqual(0);
    }));
  });
});

test('assessFeasibility flags an aggressive marathon build from a low base', () => {
  const f = svc.assessFeasibility(12, MARATHON, userData);
  expect(['moderate', 'high']).toContain(f.level);
  expect(f.message.length).toBeGreaterThan(0);
});
