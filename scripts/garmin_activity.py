"""Build a Strava-shaped Firestore activity doc from a Garmin activity summary.

Field names verified against a real Garmin activitylist summary. The app reads
Strava-style keys (start_date, distance in metres, moving_time in seconds, etc.).
"""

TYPE_MAP = {
    "running": "Run",
    "trail_running": "TrailRun",
    "treadmill_running": "VirtualRun",
    "virtual_run": "VirtualRun",
    "indoor_running": "VirtualRun",
}

RUNNING_TYPE_KEYS = set(TYPE_MAP.keys())


def is_running(summary):
    tk = ((summary.get("activityType") or {}).get("typeKey") or "").lower()
    return tk in RUNNING_TYPE_KEYS


def _to_int(v):
    return int(round(v)) if v is not None else None


def build_activity_doc(summary):
    tk = ((summary.get("activityType") or {}).get("typeKey") or "running").lower()
    aid = summary["activityId"]
    start_local = summary.get("startTimeLocal")   # "YYYY-MM-DD HH:MM:SS" (local)
    start_gmt = summary.get("startTimeGMT")        # "YYYY-MM-DD HH:MM:SS" (UTC)
    iso_local = start_local.replace(" ", "T") if start_local else None
    both_legs_cadence = summary.get("averageRunningCadenceInStepsPerMinute")
    return {k: v for k, v in {
        "id": str(aid),
        "garmin_activity_id": aid,
        "name": summary.get("activityName") or "Run",
        "type": TYPE_MAP.get(tk, "Run"),
        "start_date": (start_gmt.replace(" ", "T") + "Z") if start_gmt else iso_local,
        "start_date_local": iso_local,
        "distance": summary.get("distance"),                 # metres
        "moving_time": _to_int(summary.get("movingDuration")
                               or summary.get("duration")),   # seconds
        "elapsed_time": _to_int(summary.get("elapsedDuration")
                                or summary.get("duration")),
        "total_elevation_gain": _to_int(summary.get("elevationGain")),
        "average_heartrate": _to_int(summary.get("averageHR")),
        "max_heartrate": _to_int(summary.get("maxHR")),
        # Garmin averageRunningCadenceInStepsPerMinute is both-legs -> per-leg
        "average_cadence": (round(both_legs_cadence / 2.0, 1)
                            if both_legs_cadence else None),
        "average_speed": summary.get("averageSpeed"),        # m/s
        "vo2max": summary.get("vO2MaxValue"),
        "source": "garmin",
    }.items() if v is not None}
