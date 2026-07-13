import json
import os

import pytest

from scripts.garmin_activity import build_activity_doc, is_running, TYPE_MAP

FIX = os.path.join(os.path.dirname(__file__), "..", "fixtures")


def load_summary():
    path = os.path.join(FIX, "garmin_activity_summary.json")
    if not os.path.exists(path):
        pytest.skip("summary fixture not present (run scripts.capture_samples)")
    with open(path) as f:
        return json.load(f)


def test_build_activity_doc_maps_core_fields():
    doc = build_activity_doc(load_summary())
    assert isinstance(doc["id"], str)
    assert doc["type"] in ("Run", "TrailRun", "VirtualRun")
    assert doc["distance"] > 0            # metres
    assert doc["moving_time"] > 0         # seconds
    assert doc["start_date"].endswith("Z")
    assert "T" in doc["start_date"]
    assert doc["source"] == "garmin"


def test_average_cadence_is_halved_to_per_leg():
    summary = load_summary()
    doc = build_activity_doc(summary)
    both_legs = summary.get("averageRunningCadenceInStepsPerMinute")
    if both_legs:
        # both-legs ~178 -> per-leg ~89
        assert doc["average_cadence"] == round(both_legs / 2.0, 1)
        assert doc["average_cadence"] < 130


def test_type_map_and_is_running():
    assert TYPE_MAP["running"] == "Run"
    assert TYPE_MAP["trail_running"] == "TrailRun"
    assert TYPE_MAP["treadmill_running"] == "VirtualRun"
    assert TYPE_MAP["virtual_run"] == "VirtualRun"
    assert is_running({"activityType": {"typeKey": "trail_running"}})
    assert not is_running({"activityType": {"typeKey": "cycling"}})
