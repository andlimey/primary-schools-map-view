import json
import re
from datetime import datetime
from pathlib import Path

import requests

from p1data import config


class OneMapError(Exception):
    pass


def get_token(email: str, password: str, timeout: int = config.REQUEST_TIMEOUT_SECONDS) -> str:
    """Authenticate against OneMap and return an access token, valid ~3 days, to be sent as the
    Authorization header on subsequent search requests."""
    resp = requests.post(
        config.ONEMAP_TOKEN_URL, json={"email": email, "password": password}, timeout=timeout
    )
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise OneMapError(f"OneMap token response missing access_token: {data}")
    return token


def search(
    query: str,
    token: str,
    *,
    cache_dir: Path | None = None,
    timeout: int = config.REQUEST_TIMEOUT_SECONDS,
) -> list[dict]:
    """Search OneMap for `query` (a postal code or free-text address), returning the raw
    `results` list (possibly empty). Caches the raw response to disk under cache_dir, keyed by
    the normalized query, so re-running the batch job doesn't re-query already-seen values."""
    cache_path = _cache_path(cache_dir, query) if cache_dir is not None else None
    if cache_path is not None and cache_path.exists():
        return json.loads(cache_path.read_text())

    resp = requests.get(
        config.ONEMAP_SEARCH_URL,
        params={"searchVal": query, "returnGeom": "Y", "getAddrDetails": "Y", "pageNum": 1},
        headers={"Authorization": token},
        timeout=timeout,
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])

    if cache_path is not None:
        cache_path.write_text(json.dumps(results))

    return results


def _cache_path(cache_dir: Path, query: str) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    key = re.sub(r"[^A-Za-z0-9]+", "_", query.strip().upper()).strip("_")
    return cache_dir / f"{key}.json"


def route(
    start: tuple[float, float],
    end: tuple[float, float],
    route_type: str,
    token: str,
    *,
    dt: datetime | None = None,
    # OneMap's default is 1000 m; we widen it because primary schools we care about sit up
    # to ~2 km from the searched home, and a school with thin bus coverage otherwise
    # returns NO itinerary at all. A walk-heavy itinerary is a more useful answer than a
    # blank row (and the caller flags the all-walking case separately).
    max_walk_distance: int = 2000,
    timeout: int = config.REQUEST_TIMEOUT_SECONDS,
) -> dict:
    """Query OneMap's routing service for a `route_type` of "walk", "drive", or "pt" between
    two (lat, lng) points, returning the raw JSON response. For "pt", `dt` sets the departure
    date/time the itinerary is planned around (required by OneMap); it is ignored otherwise."""
    params = {
        "start": f"{start[0]},{start[1]}",
        "end": f"{end[0]},{end[1]}",
        "routeType": route_type,
    }
    if route_type == "pt":
        if dt is None:
            raise OneMapError("pt routing requires a departure datetime")
        params.update(
            {
                "date": dt.strftime("%m-%d-%Y"),  # OneMap wants US-style MM-DD-YYYY here
                "time": dt.strftime("%H:%M:%S"),
                "mode": "TRANSIT",  # fastest of bus / MRT / LRT, vs BUS-only or RAIL-only
                "numItineraries": 1,  # we only surface the single fastest trip
                "maxWalkDistance": max_walk_distance,
            }
        )

    resp = requests.get(
        config.ONEMAP_ROUTE_URL,
        params=params,
        headers={"Authorization": token},
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()
