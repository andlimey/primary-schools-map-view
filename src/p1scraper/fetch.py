from pathlib import Path

import requests

from p1scraper.config import BASE_URL, REQUEST_TIMEOUT_SECONDS, USER_AGENT


class FetchError(Exception):
    pass


def fetch_year_page(
    year: int,
    cache_dir: Path | None = None,
    use_cache: bool = False,
    force_refetch: bool = False,
) -> str:
    cache_path = cache_dir / f"year_{year}.html" if cache_dir else None

    if use_cache and not force_refetch and cache_path and cache_path.exists():
        return cache_path.read_text()

    url = BASE_URL.format(year=year)
    try:
        resp = requests.get(
            url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT_SECONDS
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise FetchError(f"Failed to fetch {url}: {exc}") from exc

    if cache_path:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(resp.text)

    return resp.text
