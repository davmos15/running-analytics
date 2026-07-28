const MS_DAY = 24 * 60 * 60 * 1000;
const TREND_WINDOW_DAYS = 28;

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

const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun'];

function metricValue(activity, metric) {
  if (metric === 'time') return (activity.moving_time || activity.elapsed_time || 0) / 3600; // hours
  return (activity.distance || 0) / 1000; // km
}

function sumBetween(activities, metric, start, end) {
  return activities.reduce((sum, a) => {
    if (!a.type || !RUN_TYPES.includes(a.type)) return sum;
    const d = new Date(a.start_date);
    if (d >= start && d <= end) return sum + metricValue(a, metric);
    return sum;
  }, 0);
}

function computeGoalProgress(activities, goal, now = new Date()) {
  const { period, metric, target } = goal;
  const { start, end, daysElapsed, daysInPeriod } = getPeriodWindow(period, now);

  const periodTotal = sumBetween(activities, metric, start, end);
  const percent = target > 0 ? (periodTotal / target) * 100 : 0;
  const remaining = Math.max(target - periodTotal, 0);

  const paceToDate = daysElapsed > 0 ? (periodTotal / daysElapsed) * daysInPeriod : periodTotal;

  // Recent-trend uses a fixed 28-day window regardless of how far into the period
  // we are, so early in a period it can understate the rate (fewer real days of
  // running divided by the full 28). This is intentional — it smooths noise.
  const trendStart = new Date(now.getTime() - TREND_WINDOW_DAYS * MS_DAY);
  const recentTotal = sumBetween(activities, metric, trendStart, now);
  const recentRate = recentTotal / TREND_WINDOW_DAYS;
  const daysRemaining = Math.max(daysInPeriod - daysElapsed, 0);
  const recentTrend = periodTotal + recentRate * daysRemaining;

  return {
    periodTotal,
    percent,
    remaining,
    daysElapsed,
    daysInPeriod,
    projections: { paceToDate, recentTrend }
  };
}

module.exports = { getPeriodWindow, computeGoalProgress };
