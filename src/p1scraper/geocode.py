import difflib
from pathlib import Path

from p1scraper import config, onemap
from p1scraper.models import GeocodeFailure, GeocodeResult
from p1scraper.normalize import normalize_name


def zero_pad_postal(postal_code: str) -> str:
    """Singapore postal codes are always 6 digits; the source CSV has lost leading zeros for
    some (e.g. '88256' instead of '088256')."""
    return postal_code.strip().zfill(6)


def geocode_school(
    school_name: str,
    postal_code: str,
    address: str,
    token: str,
    cache_dir: Path,
) -> GeocodeResult | GeocodeFailure:
    """Try the postal code first; only fall back to address if the postal code lookup fails."""
    postal_result = _try_source(
        zero_pad_postal(postal_code), school_name, token, cache_dir, source="postal_code"
    )
    if isinstance(postal_result, GeocodeResult):
        return postal_result

    address_result = _try_source(address, school_name, token, cache_dir, source="address")
    if isinstance(address_result, GeocodeResult):
        return address_result

    # Prefer surfacing an ambiguous-match failure (has candidates worth a human's attention)
    # over a plain not-found from either source.
    for failure in (postal_result, address_result):
        if failure.reason == "ambiguous":
            return failure
    return GeocodeFailure(reason="not_found", candidates=[])


def _try_source(
    query: str, school_name: str, token: str, cache_dir: Path, source: str
) -> GeocodeResult | GeocodeFailure:
    results = onemap.search(query, token, cache_dir=cache_dir)
    if not results:
        return GeocodeFailure(reason="not_found", candidates=[])

    if len(results) == 1:
        picked, confidence = results[0], 1.0
    else:
        picked, confidence = _disambiguate(results, school_name)
        if picked is None:
            return GeocodeFailure(reason="ambiguous", candidates=results)

    latitude, longitude = float(picked["LATITUDE"]), float(picked["LONGITUDE"])
    if not _in_singapore(latitude, longitude):
        return GeocodeFailure(reason="out_of_bounds", candidates=results)

    return GeocodeResult(latitude=latitude, longitude=longitude, source=source, confidence=confidence)


def _disambiguate(results: list[dict], school_name: str) -> tuple[dict | None, float | None]:
    """When a postal code resolves to multiple named entities (e.g. a school and a co-located
    student care centre at the same building), pick the one whose BUILDING name best matches
    the school's own name, rather than defaulting to the first result."""
    target = normalize_name(school_name)
    best, best_ratio = None, 0.0
    for result in results:
        building = normalize_name(result.get("BUILDING", ""))
        ratio = difflib.SequenceMatcher(None, target, building).ratio()
        if ratio > best_ratio:
            best, best_ratio = result, ratio

    if best is not None and best_ratio >= config.GEOCODE_DISAMBIGUATION_CUTOFF:
        return best, best_ratio
    return None, None


def _in_singapore(latitude: float, longitude: float) -> bool:
    lat_min, lat_max = config.SG_LAT_RANGE
    lng_min, lng_max = config.SG_LNG_RANGE
    return lat_min <= latitude <= lat_max and lng_min <= longitude <= lng_max
