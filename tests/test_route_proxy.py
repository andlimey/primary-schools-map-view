from datetime import datetime

import pytest

from schoolsmap import route_proxy

# Google's canonical precision-5 polyline → [(38.5,-120.2),(40.7,-120.95),(43.252,-126.453)]
_POLY = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"


@pytest.fixture(autouse=True)
def _clear_cache():
    route_proxy._cache.clear()
    yield
    route_proxy._cache.clear()


def _walk_response():
    return {"route_geometry": _POLY, "route_summary": {"total_time": 912, "total_distance": 1204.6}}


def _transit_response():
    return {
        "plan": {
            "itineraries": [
                {
                    "duration": 1330,
                    "walkTime": 360,
                    "transfers": 1,
                    "legs": [
                        {"mode": "WALK", "legGeometry": {"points": _POLY}},
                        {"mode": "BUS", "route": "185", "legGeometry": {"points": _POLY}},
                        {"mode": "WALK", "legGeometry": {"points": _POLY}},
                    ],
                },
                {"duration": 9999, "legs": [{"mode": "WALK", "legGeometry": {"points": _POLY}}]},
            ]
        }
    }


def _resolve(mode, response, **kw):
    return route_proxy.resolve_route(
        1.30, 103.80, 1.34, 103.90, mode, _route_call=lambda **_: response, **kw
    )


def test_walk_payload_shape_and_single_decoded_leg():
    payload = _resolve("walk", _walk_response())
    assert payload["mode"] == "walk"
    assert payload["found"] is True
    assert payload["duration_seconds"] == 912
    assert payload["distance_meters"] == pytest.approx(1204.6)
    assert payload["transfers"] is None
    assert payload["walk_only"] is False
    assert len(payload["legs"]) == 1
    assert payload["legs"][0]["mode"] == "WALK"
    assert payload["legs"][0]["path"][0] == [38.5, -120.2]


def test_drive_leg_is_labelled_drive():
    payload = _resolve("drive", _walk_response())
    assert [leg["mode"] for leg in payload["legs"]] == ["DRIVE"]


def test_transit_payload_omits_distance_and_reports_transfers_and_walk():
    payload = _resolve("transit", _transit_response())
    assert payload["distance_meters"] is None
    assert payload["transfers"] == 1
    assert payload["walk_seconds"] == 360
    assert payload["walk_only"] is False
    assert [leg["mode"] for leg in payload["legs"]] == ["WALK", "BUS", "WALK"]
    assert payload["legs"][1]["route"] == "185"


def test_transit_picks_fastest_itinerary():
    payload = _resolve("transit", _transit_response())
    assert payload["duration_seconds"] == 1330


def test_walk_only_transit_itinerary_is_flagged():
    response = {"plan": {"itineraries": [{"duration": 600, "legs": [
        {"mode": "WALK", "legGeometry": {"points": _POLY}},
    ]}]}}
    payload = _resolve("transit", response)
    assert payload["walk_only"] is True
    assert payload["transfers"] is None
    assert len(payload["legs"]) == 1


def test_no_route_summary_yields_not_found():
    payload = _resolve("drive", {"status": 1, "error": "no route"})
    assert payload["found"] is False
    assert payload["legs"] == []


def test_empty_itineraries_yields_not_found():
    payload = _resolve("transit", {"plan": {"itineraries": []}})
    assert payload["found"] is False


def test_second_identical_call_served_from_cache():
    calls = []

    def route_call(**kw):
        calls.append(kw)
        return _walk_response()

    args = (1.30, 103.80, 1.34, 103.90, "walk")
    route_proxy.resolve_route(*args, _route_call=route_call)
    route_proxy.resolve_route(*args, _route_call=route_call)

    assert len(calls) == 1


def test_call_after_anchor_rollover_misses_cache(monkeypatch):
    calls = []

    def route_call(**kw):
        calls.append(kw)
        return _walk_response()

    args = (1.30, 103.80, 1.34, 103.90, "walk")

    monkeypatch.setattr(route_proxy, "weekly_anchor", lambda: datetime(2026, 9, 7, 6, 30))
    route_proxy.resolve_route(*args, _route_call=route_call)

    monkeypatch.setattr(route_proxy, "weekly_anchor", lambda: datetime(2026, 9, 14, 6, 30))
    route_proxy.resolve_route(*args, _route_call=route_call)

    assert len(calls) == 2


def test_lru_eviction_past_maxsize(monkeypatch):
    monkeypatch.setattr(route_proxy, "MAXSIZE", 3)
    for i in range(5):
        route_proxy.resolve_route(
            1.0 + i / 1000, 103.0, 1.5, 103.5, "walk", _route_call=lambda **_: _walk_response()
        )
    assert len(route_proxy._cache) == 3


def test_expired_entry_is_refetched(monkeypatch):
    calls = []

    def route_call(**kw):
        calls.append(kw)
        return _walk_response()

    args = (1.30, 103.80, 1.34, 103.90, "walk")
    monkeypatch.setattr(route_proxy, "TTL_SECONDS", -1)
    route_proxy.resolve_route(*args, _route_call=route_call)
    route_proxy.resolve_route(*args, _route_call=route_call)
    assert len(calls) == 2


@pytest.mark.parametrize(
    "given, expected_date",
    [
        (datetime(2026, 8, 31, 9, 0), "2026-08-31"),  # Monday -> that Monday
        (datetime(2026, 9, 1, 9, 0), "2026-09-07"),  # Tuesday -> next Monday
        (datetime(2026, 9, 6, 23, 0), "2026-09-07"),  # Sunday -> next day
    ],
)
def test_weekly_anchor_lands_on_monday_0630_sgt(given, expected_date):
    anchor = route_proxy.weekly_anchor(given)
    assert anchor.date().isoformat() == expected_date
    assert (anchor.hour, anchor.minute) == (6, 30)
    assert anchor.weekday() == 0


def test_transit_call_receives_anchor_datetime(monkeypatch):
    seen = {}

    def route_call(**kw):
        seen.update(kw)
        return _transit_response()

    monkeypatch.setattr(route_proxy, "weekly_anchor", lambda: datetime(2026, 9, 7, 6, 30))
    route_proxy.resolve_route(1.0, 103.0, 1.1, 103.1, "transit", _route_call=route_call)
    assert seen["dt"] == datetime(2026, 9, 7, 6, 30)
    assert seen["route_type"] == "pt"
