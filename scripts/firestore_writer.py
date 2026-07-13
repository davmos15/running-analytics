"""Firebase Admin writer: activities + gzipped streams -> Firestore.

Streams are stored as a single gzipped `bytes` field in a `streams/{id}` doc
(kept on the free Spark plan; no Cloud Storage needed). Firestore's 1 MB doc
limit is ample for a run's gzipped stream. The gzip helpers are pure and
unit-tested without network access.
"""
import gzip
import json
import logging
import os

log = logging.getLogger("garmin.writer")

_app = None
_db = None

# Firestore hard limit is ~1 MiB per document; stay safely under it.
_MAX_STREAM_BYTES = 1_000_000


def gzip_streams(streams: dict) -> bytes:
    return gzip.compress(json.dumps(streams, separators=(",", ":")).encode("utf-8"))


def gunzip_streams(blob: bytes) -> dict:
    return json.loads(gzip.decompress(blob))


def init(service_account_path=None):
    global _app, _db
    import firebase_admin
    from firebase_admin import credentials, firestore
    if _app is None:
        path = service_account_path or os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
        _app = firebase_admin.initialize_app(credentials.Certificate(path))
        _db = firestore.client()
    return _db


def write_activity(doc: dict):
    _db.collection("activities").document(doc["id"]).set(doc, merge=True)


def write_streams(activity_id: str, streams: dict):
    blob = gzip_streams(streams)
    if len(blob) > _MAX_STREAM_BYTES:
        log.warning("  streams for %s are %d bytes (> 1 MB); skipping stream doc",
                    activity_id, len(blob))
        return False
    _db.collection("streams").document(str(activity_id)).set({"gz": blob})
    return True
