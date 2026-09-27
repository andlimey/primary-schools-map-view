"""Resolve walking / transit / driving routes between two points via OneMap's routing
service, with an in-process TTL + LRU cache.

Transit routes are always planned for a fixed weekly "school-run" time (the coming Monday
at 06:30, Asia/Singapore) rather than "now", so results are stable, comparable between
schools, and cacheable for a week. Walking and driving are time-independent.

The cache is in process memory only: a scale-to-zero wake starts cold, and the next request
for any route re-resolves it.
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from datetime import datetime, timedelta
from typing import Callable, Literal, NamedTuple
from zoneinfo import ZoneInfo

import polyline

from p1data import onemap
from schoolsmap import onemap_token

Mode = Literal["walk", "transit", "drive"]

_SGT = ZoneInfo("Asia/Singapore")
_ROUTE_TYPE: dict[Mode, str] = {"walk": "walk", "drive": "drive", "transit": "pt"}

# Coordinates are rounded to this many decimal places before they enter the cache key.
# 5 dp ≈ 1.1 m at Singapore's latitude — finer than the schools' geocode accuracy and far
# finer than anything that changes a route. The searched location always comes from a
# discrete OneMap geocoder result, so repeat lookups from the same search round to an
# identical key and hit the cache; the rounding just stops floating-point noise (or a
# hand-edited URL) from splintering one location into many near-duplicate entries.
_COORD_PRECISION = 5

# Cache bound. Each entry is small (route summary numbers + encoded polyline strings, ~1 KB;
# the decoded coordinate arrays are only built per response, never stored). 1500 entries is
# a few MB at most — comfortable on the 256 MB Fly VM — yet enough to hold every
# (school × mode) pair for ~150 schools across several distinct searched addresses in a
# session. Past the bound we evict least-recently-used (see _cache_put).
MAXSIZE = 1500

# Cache lifetime. This is NOT a freshness guard: with a fixed weekly transit anchor, a
# resolved route is effectively constant until roads or timetables change (rare, and never
# mid-session). It's a safety valve so an entry can't live forever — and it's tied to the
# 7-day anchor cadence, so a stale entry expires around when its anchor date stops being
# produced anyway. `time.monotonic()` (not wall clock) backs the expiry, so a system clock
# change can't extend or expire entries early.
TTL_SECONDS = 7 * 24 * 3600


class _EncodedLeg(NamedTuple):
    mode: str
    route: str | None
    points: str  # encoded polyline, decoded lazily on the way out of the cache


class _Resolved(NamedTuple):
    found: bool = False
    duration_seconds: int | None = None
    distance_meters: float | None = None
    transfers: int | None = None
    walk_seconds: int | None = None
    walk_only: bool = False
    legs: tuple[_EncodedLeg, ...] = ()


_NOT_FOUND = _Resolved()


_cache: "OrderedDict[tuple, tuple[_Resolved, float]]" = OrderedDict()
_lock = threading.Lock()


def weekly_anchor(now: datetime | None = None) -> datetime:
    """The canonical departure time transit routes are planned for: 06:30 on the coming
    Monday, Asia/Singapore (today, when today is a Monday).

    Why a fixed slot rather than "now":
      - Stable & comparable: every school is timed against the same moment, and the answer
        for a given school doesn't drift as the user clicks around or comes back later.
      - Cacheable: "now" would make every request a distinct cache key.
      - Representative: 06:30 Monday is a plausible primary-school drop-off — roughly the
        worst realistic case for the trip a parent is evaluating, and firmly inside peak
        service, so it doesn't understate transit time the way an off-peak query would.
      - Monday specifically: a weekday (weekend timetables differ), and the first of the
        week so the same anchor date stays valid for the longest before rolling forward.

    The exact calendar date isn't load-bearing — bus/MRT timetables are weekly-cyclical —
    it just has to be a near-future weekday that OneMap accepts. On a Monday we keep today's
    date even after 06:30 has passed (OneMap still plans a schedule-based itinerary for a
    past time on the current day), which avoids skipping a whole week every Monday morning.
    """
    if now is None:
        now = datetime.now(_SGT)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=_SGT)
    else:
        now = now.astimezone(_SGT)
    days_ahead = (-now.weekday()) % 7  # Monday == 0, so this is 0 on Mon, 6 on Tue, ... 1 on Sun
    monday = now + timedelta(days=days_ahead)
    return monday.replace(hour=6, minute=30, second=0, microsecond=0)


def resolve_route(
    from_lat: float,
    from_lng: float,
    to_lat: float,
    to_lng: float,
    mode: Mode,
    *,
    _route_call: Callable[..., dict] | None = None,
) -> dict:
    """Resolve `mode` between the two coordinates, serving from the in-memory cache when a
    live entry exists. `_route_call` overrides the OneMap call for testing."""
    anchor = weekly_anchor()
    # The anchor date is part of the key so that when it rolls to the next Monday, every
    # prior entry becomes unreachable in one clean generational sweep (and then ages out
    # via TTL / LRU) rather than needing explicit invalidation. It's included for walk/drive
    # too — harmless, since those routes barely change, and it keeps the key uniform.
    key = (
        round(from_lat, _COORD_PRECISION),
        round(from_lng, _COORD_PRECISION),
        round(to_lat, _COORD_PRECISION),
        round(to_lng, _COORD_PRECISION),
        mode,
        anchor.date().isoformat(),
    )

    resolved = _cache_get(key)
    if resolved is None:
        resolved = _resolve_uncached(from_lat, from_lng, to_lat, to_lng, mode, anchor, _route_call)
        _cache_put(key, resolved)

    return _to_payload(mode, resolved)


def _cache_get(key: tuple) -> _Resolved | None:
    with _lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        resolved, expires_at = entry
        if expires_at <= time.monotonic():
            del _cache[key]
            return None
        _cache.move_to_end(key)
        return resolved


def _cache_put(key: tuple, resolved: _Resolved) -> None:
    with _lock:
        _cache[key] = (resolved, time.monotonic() + TTL_SECONDS)
        _cache.move_to_end(key)  # newest at the end; oldest-touched at the front
        while len(_cache) > MAXSIZE:
            _cache.popitem(last=False)  # evict least-recently-used (front) until within bound


def _resolve_uncached(
    from_lat: float,
    from_lng: float,
    to_lat: float,
    to_lng: float,
    mode: Mode,
    anchor: datetime,
    route_call: Callable[..., dict] | None,
) -> _Resolved:
    call = route_call or (
        lambda **kw: onemap_token.with_token(lambda token: onemap.route(token=token, **kw))
    )
    kwargs = {
        "start": (from_lat, from_lng),
        "end": (to_lat, to_lng),
        "route_type": _ROUTE_TYPE[mode],
    }
    if mode == "transit":
        return _parse_transit(call(**kwargs, dt=anchor))
    return _parse_summary(call(**kwargs), leg_mode=mode.upper())


def _parse_summary(resp: dict, leg_mode: str) -> _Resolved:
    summary = resp.get("route_summary")
    geometry = resp.get("route_geometry")
    if not summary or not geometry:
        return _NOT_FOUND
    return _Resolved(
        found=True,
        duration_seconds=_int_or_none(summary.get("total_time")),
        distance_meters=_float_or_none(summary.get("total_distance")),
        legs=(_EncodedLeg(mode=leg_mode, route=None, points=geometry),),
    )


def _parse_transit(resp: dict) -> _Resolved:
    itineraries = resp.get("plan", {}).get("itineraries") or []
    if not itineraries:
        return _NOT_FOUND
    # We ask OneMap for numItineraries=1, but pick the shortest defensively in case it
    # ever returns more; `duration` is the total trip time in seconds.
    itin = min(itineraries, key=lambda it: it.get("duration", float("inf")))

    legs: list[_EncodedLeg] = []
    for leg in itin.get("legs", []):
        points = (leg.get("legGeometry") or {}).get("points")
        if not points:
            continue
        legs.append(
            _EncodedLeg(
                mode=str(leg.get("mode", "")).upper(),
                route=leg.get("route") or None,
                points=points,
            )
        )
    if not legs:
        return _NOT_FOUND

    walk_only = len(legs) == 1 and legs[0].mode == "WALK"
    return _Resolved(
        found=True,
        duration_seconds=_int_or_none(itin.get("duration")),
        distance_meters=None,
        transfers=None if walk_only else _int_or_none(itin.get("transfers")),
        walk_seconds=_int_or_none(itin.get("walkTime")),
        walk_only=walk_only,
        legs=tuple(legs),
    )


def _to_payload(mode: Mode, resolved: _Resolved) -> dict:
    """The JSON response body; `api.RouteResponse` is the schema it's validated against."""
    return {
        **resolved._asdict(),
        "mode": mode,
        "legs": [
            {
                "mode": leg.mode,
                "route": leg.route,
                "path": [[lat, lng] for lat, lng in polyline.decode(leg.points)],
            }
            for leg in resolved.legs
        ],
    }


def _int_or_none(value) -> int | None:
    return None if value is None else int(round(value))


def _float_or_none(value) -> float | None:
    return None if value is None else float(value)
