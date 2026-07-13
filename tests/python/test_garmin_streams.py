import json
import os

import pytest

from scripts.garmin_streams import parse_details_to_streams

FIX = os.path.join(os.path.dirname(__file__), "..", "fixtures")


def load(name):
    path = os.path.join(FIX, name)
    if not os.path.exists(path):
        pytest.skip(f"fixture {name} not present (run scripts.capture_samples)")
    with open(path) as f:
        return json.load(f)


def test_streams_have_aligned_lengths_and_shape():
    streams = parse_details_to_streams(load("garmin_activity_details.json"))
    assert "time" in streams and "distance" in streams
    n = len(streams["time"]["data"])
    assert n > 0
    assert len(streams["distance"]["data"]) == n
    # distance is cumulative, non-decreasing metres
    d = [x for x in streams["distance"]["data"] if x is not None]
    assert d[0] <= d[-1]
    assert d[-1] > 1000  # a real run in metres, not km
    # latlng, when present, is a list of [lat, lng] pairs the same length
    if "latlng" in streams:
        assert len(streams["latlng"]["data"]) == n
        assert len(streams["latlng"]["data"][0]) == 2


def test_cadence_is_per_leg_not_doubled():
    streams = parse_details_to_streams(load("garmin_activity_details.json"))
    assert "cadence" in streams
    vals = [c for c in streams["cadence"]["data"] if c]
    # per-leg running cadence ~75-95 spm; both-legs would exceed 130,
    # an over-eager halving would drop below 60.
    assert 60 < max(vals) < 130


def test_parse_empty_details_returns_empty():
    assert parse_details_to_streams({}) == {}
