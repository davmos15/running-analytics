"""One-off: fetch one running activity's summary + details and save as fixtures.

The fixtures drive the parser tests (scripts/garmin_streams.py,
scripts/garmin_activity.py). They contain real GPS tracks, so tests/fixtures/
is gitignored -- keep them local.
"""
import json
import os

import garth

from scripts.garmin_auth import authenticate

FIX = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures")


def main():
    authenticate()
    acts = garth.connectapi(
        "/activitylist-service/activities/search/activities?start=0&limit=20") or []
    run = next((a for a in acts if "running" in
                ((a.get("activityType") or {}).get("typeKey", "")).lower()), None)
    if not run:
        raise SystemExit("No running activity found in the last 20 activities.")
    aid = run["activityId"]
    details = garth.connectapi(
        f"/activity-service/activity/{aid}/details?maxChartSize=2000&maxPolylineSize=4000")
    os.makedirs(FIX, exist_ok=True)
    with open(os.path.join(FIX, "garmin_activity_summary.json"), "w") as f:
        json.dump(run, f, indent=2)
    with open(os.path.join(FIX, "garmin_activity_details.json"), "w") as f:
        json.dump(details, f, indent=2)
    print(f"Saved fixtures for activity {aid} "
          f"({run.get('activityName')}, {run.get('distance')}m)")


if __name__ == "__main__":
    main()
