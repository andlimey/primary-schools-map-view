from datetime import datetime

import pytest

from p1data import config, onemap


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


def test_route_walk_sends_start_end_and_authorization(monkeypatch):
    captured = {}

    def fake_get(url, *, params, headers, timeout):
        captured["url"] = url
        captured["params"] = params
        captured["headers"] = headers
        return _FakeResponse({"route_summary": {}})

    monkeypatch.setattr(onemap.requests, "get", fake_get)

    onemap.route((1.30, 103.80), (1.34, 103.90), "walk", "tok-abc")

    assert captured["url"] == config.ONEMAP_ROUTE_URL
    assert captured["params"] == {
        "start": "1.3,103.8",
        "end": "1.34,103.9",
        "routeType": "walk",
    }
    assert captured["headers"] == {"Authorization": "tok-abc"}


def test_route_pt_adds_date_time_and_transit_params(monkeypatch):
    captured = {}

    def fake_get(url, *, params, headers, timeout):
        captured["params"] = params
        return _FakeResponse({"plan": {"itineraries": []}})

    monkeypatch.setattr(onemap.requests, "get", fake_get)

    dt = datetime(2026, 9, 7, 6, 30, 0)
    onemap.route((1.30, 103.80), (1.34, 103.90), "pt", "tok", dt=dt, max_walk_distance=2000)

    assert captured["params"]["routeType"] == "pt"
    assert captured["params"]["date"] == "09-07-2026"
    assert captured["params"]["time"] == "06:30:00"
    assert captured["params"]["mode"] == "TRANSIT"
    assert captured["params"]["numItineraries"] == 1
    assert captured["params"]["maxWalkDistance"] == 2000


def test_route_pt_requires_datetime(monkeypatch):
    monkeypatch.setattr(onemap.requests, "get", lambda *a, **k: _FakeResponse({}))
    with pytest.raises(onemap.OneMapError):
        onemap.route((1.0, 103.0), (1.1, 103.1), "pt", "tok")
