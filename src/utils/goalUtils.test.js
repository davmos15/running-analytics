const { getPeriodWindow } = require('./goalUtils');

const MS_DAY = 24 * 60 * 60 * 1000;

test('yearly window starts Jan 1 and spans the whole year', () => {
  const now = new Date('2026-07-28T12:00:00');
  const w = getPeriodWindow('yearly', now);
  expect(w.start).toEqual(new Date(2026, 0, 1));
  expect(w.daysInPeriod).toBe(365); // 2026 is not a leap year
  expect(Math.round(w.daysElapsed)).toBe(Math.round((now - new Date(2026, 0, 1)) / MS_DAY));
});

test('monthly window starts on the 1st and spans days in the month', () => {
  const now = new Date('2026-07-28T12:00:00');
  const w = getPeriodWindow('monthly', now);
  expect(w.start).toEqual(new Date(2026, 6, 1));
  expect(w.daysInPeriod).toBe(31); // July
});

test('weekly window starts Monday and spans 7 days', () => {
  const now = new Date('2026-07-28T12:00:00'); // Tuesday
  const w = getPeriodWindow('weekly', now);
  expect(w.start).toEqual(new Date(2026, 6, 27)); // Monday 27 July
  expect(w.daysInPeriod).toBe(7);
});
