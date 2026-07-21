import argparse
import logging
import time
from datetime import UTC, datetime
from pathlib import Path

from p1scraper import config, db
from p1scraper.fetch import FetchError, fetch_year_page
from p1scraper.join_schools import build_matches, load_overrides, load_p1_schools, write_unmatched_log
from p1scraper.parse import ParseError, parse_year_page

log = logging.getLogger(__name__)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape P1 admission balloting data from sgschooling.com")
    parser.add_argument("--years", type=int, nargs="+", default=config.YEARS)
    parser.add_argument("--db-path", type=Path, default=config.DEFAULT_DB_PATH)
    parser.add_argument("--use-cache", action="store_true", help="Read from cached HTML instead of fetching")
    parser.add_argument("--force-refetch", action="store_true", help="Ignore cache and re-fetch all pages")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = parse_args(argv)

    records_by_year: dict[int, list] = {}
    site_schools: dict[str, str] = {}  # slug -> display_name, union across all years

    for i, year in enumerate(args.years):
        if i > 0:
            time.sleep(config.REQUEST_DELAY_SECONDS)

        started_at = datetime.now(UTC)
        source_url = config.BASE_URL.format(year=year)
        try:
            html = fetch_year_page(
                year, cache_dir=config.CACHE_DIR, use_cache=args.use_cache, force_refetch=args.force_refetch
            )
            records, blocks = parse_year_page(year, html)
        except (FetchError, ParseError) as exc:
            log.error("Failed to scrape %s: %s", year, exc)
            records_by_year[year] = []
            continue

        records_by_year[year] = records
        for block in blocks:
            site_schools[block.slug] = block.display_name

        log.info("Parsed %s: %d schools, %d phase records", year, len(blocks), len(records))

    csv_schools = load_p1_schools(config.SCHOOLS_CSV_PATH)
    overrides = load_overrides(config.OVERRIDES_CSV_PATH)
    match_result = build_matches(csv_schools, site_schools, overrides)

    log.info(
        "Matched %d/%d CSV P1-intake schools to site slugs (%d unmatched CSV, %d unmatched site)",
        len(match_result.matched), len(csv_schools),
        len(match_result.unmatched_csv), len(match_result.unmatched_site),
    )

    config.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_path = config.LOGS_DIR / f"unmatched_schools_{datetime.now(UTC):%Y%m%dT%H%M%SZ}.csv"
    write_unmatched_log(match_result, log_path)
    log.info("Unmatched schools report written to %s", log_path)

    conn = db.connect(args.db_path)
    try:
        db.init_schema(conn, config.SCHEMA_PATH)
        db.upsert_schools(conn, csv_schools, match_result.matched)
        db.record_unmatched_schools(conn, match_result)

        for year in args.years:
            records = records_by_year.get(year, [])
            started_at = datetime.now(UTC)
            source_url = config.BASE_URL.format(year=year)
            inserted = db.replace_year_data(conn, year, records)
            db.record_scrape_run(
                conn, year, source_url, started_at, inserted,
                status="success" if records else "failed",
            )
            log.info("Stored %d admission_phases rows for %s", inserted, year)
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
