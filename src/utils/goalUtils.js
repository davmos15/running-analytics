const MS_DAY = 24 * 60 * 60 * 1000;

function getPeriodWindow(period, now = new Date()) {
  const year = now.getFullYear();
  let start;
  let daysInPeriod;

  if (period === 'weekly') {
    // Monday as start of week
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const diffToMonday = (day === 0 ? 6 : day - 1);
    start = new Date(year, now.getMonth(), now.getDate() - diffToMonday);
    daysInPeriod = 7;
  } else if (period === 'monthly') {
    start = new Date(year, now.getMonth(), 1);
    daysInPeriod = new Date(year, now.getMonth() + 1, 0).getDate();
  } else {
    // yearly (default)
    start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    daysInPeriod = Math.round((end - start) / MS_DAY) + 1;
  }

  const daysElapsed = (now - start) / MS_DAY;
  return { start, end: now, daysElapsed, daysInPeriod };
}

module.exports = { getPeriodWindow };
