import gzip
import json

from scripts.firestore_writer import gzip_streams, gunzip_streams


def test_gzip_round_trip():
    streams = {"time": {"data": [0, 1, 2]}, "distance": {"data": [0, 5, 11]}}
    blob = gzip_streams(streams)
    assert isinstance(blob, (bytes, bytearray))
    assert gunzip_streams(blob) == streams
    # sanity: it is really gzip
    assert json.loads(gzip.decompress(blob)) == streams
