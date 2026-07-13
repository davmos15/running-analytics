"""Firebase Admin writer: activities -> Firestore, streams -> Storage (gzip).

`init()` is called once before any write. The gzip helpers are pure and unit-
tested without network access.
"""
import gzip
import json
import os

_app = None
_db = None
_bucket = None


def gzip_streams(streams: dict) -> bytes:
    return gzip.compress(json.dumps(streams, separators=(",", ":")).encode("utf-8"))


def gunzip_streams(blob: bytes) -> dict:
    return json.loads(gzip.decompress(blob))


def init(service_account_path=None, bucket_name=None):
    global _app, _db, _bucket
    import firebase_admin
    from firebase_admin import credentials, firestore, storage
    if _app is None:
        path = service_account_path or os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
        bucket_name = bucket_name or os.environ["FIREBASE_STORAGE_BUCKET"]
        _app = firebase_admin.initialize_app(
            credentials.Certificate(path), {"storageBucket": bucket_name})
        _db = firestore.client()
        _bucket = storage.bucket()
    return _db, _bucket


def write_activity(doc: dict):
    _db.collection("activities").document(doc["id"]).set(doc, merge=True)


def write_streams(activity_id: str, streams: dict):
    blob = _bucket.blob(f"streams/{activity_id}.json.gz")
    blob.upload_from_string(gzip_streams(streams), content_type="application/gzip")
