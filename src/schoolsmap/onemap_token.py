import os
import threading
from typing import Callable, TypeVar

import requests
from dotenv import load_dotenv

from p1data import config, onemap

T = TypeVar("T")


class OneMapConfigError(Exception):
    pass

_cached_token: str | None = None
_lock = threading.Lock()


def _get_credentials() -> tuple[str, str]:
    load_dotenv(config.PROJECT_ROOT / ".env")
    email = os.environ.get("ONEMAP_EMAIL")
    password = os.environ.get("ONEMAP_PASSWORD")
    if not email or not password:
        raise OneMapConfigError("ONEMAP_EMAIL and ONEMAP_PASSWORD environment variables must be set")
    return email, password


def _fetch_token() -> str:
    email, password = _get_credentials()
    return onemap.get_token(email, password)


def get_token(*, stale: str | None = None) -> str:
    """Return the cached OneMap access token, fetching one lazily on first use. Passing the
    rejected token as `stale` re-fetches only if it is still the cached one, so concurrent
    requests that all hit the same expired token re-authenticate once, not once each.
    Shared by every OneMap proxy so a single token is reused."""
    global _cached_token
    with _lock:
        if _cached_token is None or (stale is not None and _cached_token == stale):
            _cached_token = _fetch_token()
        return _cached_token


def with_token(call: Callable[[str], T]) -> T:
    """Run `call(token)` with the cached OneMap token, re-authenticating exactly once and
    retrying if OneMap rejects the token as expired/invalid (HTTP 401/403)."""
    token = get_token()
    try:
        return call(token)
    except requests.HTTPError as exc:
        if exc.response is None or exc.response.status_code not in (401, 403):
            raise
        return call(get_token(stale=token))
