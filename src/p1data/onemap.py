import json
import re
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
