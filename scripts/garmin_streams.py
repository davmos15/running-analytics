"""Convert a Garmin activity-details payload into Strava-shaped stream arrays.

Garmin details format:
  metricDescriptors: [{ metricsIndex: int, key: str }, ...]
  activityDetailMetrics: [{ metrics: [float|None, ...] }, ...]   # one row per sample

Cadence note: Garmin's `directRunCadence` is ALREADY per-leg (steps/min for one
leg, ~75-95) which matches the app's Strava-style per-leg convention, so it is
NOT halved here. (`directDoubleCadence` would be both-legs, ~150-190.)
"""

# Metric-descriptor keys, verified against a real Garmin details payload.
K_DISTANCE = "sumDistance"          # metres, cumulative
K_DURATION = "sumElapsedDuration"   # seconds since start, cumulative
K_HR = "directHeartRate"
K_CADENCE = "directRunCadence"      # per-leg steps/min (do NOT halve)
K_SPEED = "directSpeed"             # m/s
K_ELEV = "directElevation"          # metres
K_LAT = "directLatitude"
K_LON = "directLongitude"


def _index_map(descriptors):
    return {d["key"]: d["metricsIndex"] for d in descriptors}


def _col(rows, idx):
    return [r["metrics"][idx] if idx is not None else None for r in rows]


def parse_details_to_streams(details):
    descriptors = details.get("metricDescriptors") or []
    rows = details.get("activityDetailMetrics") or []
    if not descriptors or not rows:
        return {}
    idx = _index_map(descriptors)

    time_col = _col(rows, idx.get(K_DURATION))
    dist_col = _col(rows, idx.get(K_DISTANCE))

    streams = {
        "time": {"data": [int(round(v)) if v is not None else None for v in time_col]},
        "distance": {"data": [round(v, 2) if v is not None else None for v in dist_col]},
    }

    def add(name, key, transform=lambda v: v):
        i = idx.get(key)
        if i is None:
            return
        col = _col(rows, i)
        if any(v is not None for v in col):
            streams[name] = {"data": [transform(v) if v is not None else None for v in col]}

    add("heartrate", K_HR, lambda v: int(round(v)))
    add("cadence", K_CADENCE, lambda v: round(v, 1))     # already per-leg
    add("velocity_smooth", K_SPEED)
    add("altitude", K_ELEV)

    lat = _col(rows, idx.get(K_LAT))
    lon = _col(rows, idx.get(K_LON))
    if any(v is not None for v in lat) and any(v is not None for v in lon):
        streams["latlng"] = {"data": [[la, lo] for la, lo in zip(lat, lon)]}

    return streams
