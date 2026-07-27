import os

import requests
from dotenv import load_dotenv

from p1data import config, onemap

_cached_token: str | None = None


class GeocodeConfigError(Exception):
    pass


def _get_credentials() -> tuple[str, str]:
    load_dotenv(config.PROJECT_ROOT / ".env")
    email = os.environ.get("ONEMAP_EMAIL")
    password = os.environ.get("ONEMAP_PASSWORD")
    if not email or not password:
        raise GeocodeConfigError("ONEMAP_EMAIL and ONEMAP_PASSWORD environment variables must be set")
    return email, password


def _fetch_token() -> str:
    email, password = _get_credentials()
    return onemap.get_token(email, password)


def search(query: str) -> list[dict]:
    """Search OneMap for `query`, reusing a cached token across calls (lazy-fetched on first
    use) and re-authenticating exactly once if the cached token is rejected."""
    global _cached_token
    if _cached_token is None:
        _cached_token = _fetch_token()

    try:
        return onemap.search(query, _cached_token, cache_dir=None)
    except requests.HTTPError as exc:
        if exc.response is None or exc.response.status_code not in (401, 403):
            raise
        _cached_token = _fetch_token()
        return onemap.search(query, _cached_token, cache_dir=None)
