from p1data import onemap
from schoolsmap import onemap_token


def search(query: str) -> list[dict]:
    """Search OneMap for `query`, reusing a cached token across calls (lazy-fetched on first
    use) and re-authenticating exactly once if the cached token is rejected."""
    return onemap_token.with_token(lambda token: onemap.search(query, token, cache_dir=None))
