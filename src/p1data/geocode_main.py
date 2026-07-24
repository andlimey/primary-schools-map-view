import argparse
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv

from p1data import config, db, geocode, onemap
from p1data.models import GeocodeFailure, GeocodeResult

log = logging.getLogger(__name__)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Geocode schools (postal code first, address fallback) via the OneMap API"
    )
    parser.add_argument("--db-path", type=Path, default=config.DEFAULT_DB_PATH)
    parser.add_argument("--cache-dir", type=Path, default=config.GEOCODE_CACHE_DIR)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = parse_args(argv)

    load_dotenv(config.PROJECT_ROOT / ".env")
    email = os.environ.get("ONEMAP_EMAIL")
    password = os.environ.get("ONEMAP_PASSWORD")
    if not email or not password:
        log.error("ONEMAP_EMAIL and ONEMAP_PASSWORD environment variables must be set")
        return 1

    token = onemap.get_token(email, password)

    conn = db.connect(args.db_path)
    try:
        db.init_schema(conn, config.SCHEMA_PATH)
        schools = db.schools_needing_geocoding(conn)
        log.info("%d schools need geocoding", len(schools))

        resolved = 0
        flagged = 0
        for i, school in enumerate(schools):
            if i > 0:
                time.sleep(config.ONEMAP_REQUEST_DELAY_SECONDS)

            result = geocode.geocode_school(
                school["school_name"], school["postal_code"], school["address"], token, args.cache_dir
            )
            if isinstance(result, GeocodeResult):
                db.save_geocode_result(conn, school["id"], result)
                resolved += 1
                log.info(
                    "Geocoded %s via %s (confidence=%.2f)",
                    school["school_name"], result.source, result.confidence or 0.0,
                )
            else:
                assert isinstance(result, GeocodeFailure)
                db.save_geocode_failure(conn, school["id"], result)
                flagged += 1
                log.warning("Could not geocode %s: %s", school["school_name"], result.reason)

        log.info("Geocoding complete: %d resolved, %d flagged for manual review", resolved, flagged)
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
