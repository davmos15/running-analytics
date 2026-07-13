"""Stage 1: pull Garmin running activities -> Firestore activities + Storage streams.

Usage:
    py scripts/garmin_sync.py --days 7                 # last 7 days
    py scripts/garmin_sync.py --backfill               # full history
    py scripts/garmin_sync.py --days 30 --dry-run      # parse + log, no writes
"""
import argparse
import datetime
import logging
import os
import random
import time

import garth

from scripts.garmin_auth import authenticate
from scripts.garmin_activity import build_activity_doc, is_running
from scripts.garmin_streams import parse_details_to_streams
from scripts import firestore_writer as fw

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"),
                    format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("garmin.sync")


def safe_api(path, tries=4):
    """connectapi call with retry/backoff for throttling (429/5xx)."""
    for attempt in range(tries):
        try:
            return garth.connectapi(path)
        except Exception as e:
            status = getattr(getattr(getattr(e, "error", None), "response", None),
                             "status_code", None)
            if status == 404:
                return None
            if attempt < tries - 1:
                time.sleep((2 ** attempt) + random.uniform(0, 0.5))
                continue
            log.warning("API failed after %d tries (HTTP %s): %s", tries, status, str(e)[:120])
            return None


def list_running(start, end):
    """List running activities in [start, end], windowed into 28-day chunks."""
    s = datetime.date.fromisoformat(start)
    e = datetime.date.fromisoformat(end)
    by_id, cur = {}, s
    while cur <= e:
        w_end = min(cur + datetime.timedelta(days=27), e)
        chunk = safe_api(
            f"/activitylist-service/activities/search/activities"
            f"?startDate={cur}&endDate={w_end}&limit=200") or []
        for a in chunk:
            if is_running(a):
                by_id[a["activityId"]] = a
        time.sleep(0.3)
        cur = w_end + datetime.timedelta(days=1)
    return list(by_id.values())


def sync_one(summary, dry_run):
    aid = summary["activityId"]
    doc = build_activity_doc(summary)
    details = safe_api(f"/activity-service/activity/{aid}/details"
                       f"?maxChartSize=2000&maxPolylineSize=4000")
    streams = parse_details_to_streams(details) if details else {}
    log.info("  %s %s (%.2fkm) streams=%s",
             aid, doc.get("name"), (doc.get("distance") or 0) / 1000, list(streams.keys()))
    if dry_run:
        return
    fw.write_activity(doc)
    if streams:
        fw.write_streams(str(aid), streams)


def main():
    p = argparse.ArgumentParser(description="Garmin -> Firestore sync (Stage 1)")
    p.add_argument("--days", type=int, default=7)
    p.add_argument("--start")
    p.add_argument("--end")
    p.add_argument("--backfill", action="store_true", help="import from 2005-01-01")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--service-account", default=os.environ.get(
        "GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json"))
    p.add_argument("--bucket", default=os.environ.get("FIREBASE_STORAGE_BUCKET"))
    args = p.parse_args()

    today = datetime.date.today()
    if args.backfill:
        start, end = "2005-01-01", today.isoformat()
    else:
        start = args.start or (today - datetime.timedelta(days=args.days)).isoformat()
        end = args.end or today.isoformat()

    authenticate()
    if not args.dry_run:
        fw.init(args.service_account, args.bucket)

    runs = list_running(start, end)
    log.info("Found %d running activities in %s..%s", len(runs), start, end)
    for i, summary in enumerate(runs, 1):
        log.info("[%d/%d]", i, len(runs))
        sync_one(summary, args.dry_run)
        time.sleep(0.3)
    log.info("Done.")


if __name__ == "__main__":
    main()
