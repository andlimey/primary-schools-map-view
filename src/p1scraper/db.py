import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from p1scraper.join_schools import MatchResult
from p1scraper.models import PhaseRecord

# All schools table columns sourced directly from the CSV (subset of the 31 CSV columns,
# excluding school_name/mainlevel_code which are handled specially).
_CSV_COLUMNS = [
    "url_address", "address", "postal_code", "telephone_no", "telephone_no_2",
    "fax_no", "fax_no_2", "email_address", "mrt_desc", "bus_desc", "principal_name",
    "first_vp_name", "second_vp_name", "third_vp_name", "fourth_vp_name",
    "fifth_vp_name", "sixth_vp_name", "dgp_code", "zone_code", "type_code",
    "nature_code", "session_code", "sap_ind", "autonomous_ind", "gifted_ind",
    "ip_ind", "mothertongue1_code", "mothertongue2_code", "mothertongue3_code",
]


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection, schema_path: Path) -> None:
    conn.executescript(schema_path.read_text())


def upsert_schools(conn: sqlite3.Connection, csv_schools: list[dict], matched: dict[str, str]) -> None:
    with conn:
        for row in csv_schools:
            name = row["school_name"].strip()
            slug = matched.get(name)
            params = {col: row.get(col, "").strip() or None for col in _CSV_COLUMNS}
            params["school_name"] = name
            params["site_slug"] = slug
            params["match_method"] = "matched" if slug else "unmatched"

            columns = ["school_name", "site_slug", "match_method", *_CSV_COLUMNS]
            placeholders = ", ".join(f":{c}" for c in columns)
            update_clause = ", ".join(f"{c}=excluded.{c}" for c in columns if c != "school_name")
            conn.execute(
                f"""
                INSERT INTO schools ({", ".join(columns)})
                VALUES ({placeholders})
                ON CONFLICT(school_name) DO UPDATE SET {update_clause}
                """,
                params,
            )


def get_slug_to_school_id(conn: sqlite3.Connection) -> dict[str, int]:
    rows = conn.execute("SELECT site_slug, id FROM schools WHERE site_slug IS NOT NULL").fetchall()
    return {slug: school_id for slug, school_id in rows}


def replace_year_data(conn: sqlite3.Connection, year: int, records: list[PhaseRecord]) -> int:
    slug_to_school_id = get_slug_to_school_id(conn)
    inserted = 0
    with conn:
        conn.execute("DELETE FROM admission_phases WHERE year = ?", (year,))
        for r in records:
            school_id = slug_to_school_id.get(r.school_slug)
            if school_id is None:
                continue  # unmatched school; recorded separately in unmatched_schools
            cur = conn.execute(
                """
                INSERT INTO admission_phases
                    (school_id, year, phase_label, phase_code, phase_order, vacancy, applied, taken)
                VALUES (?,?,?,?,?,?,?,?)
                """,
                (school_id, year, r.phase_label, r.phase_code, r.phase_order, r.vacancy, r.applied, r.taken),
            )
            phase_id = cur.lastrowid
            inserted += 1
            if r.balloting:
                conn.execute(
                    """
                    INSERT INTO balloting_details
                        (phase_id, category_code, category_label, applicants, vacancies)
                    VALUES (?,?,?,?,?)
                    """,
                    (
                        phase_id,
                        r.balloting.category_code,
                        r.balloting.category_label,
                        r.balloting.applicants,
                        r.balloting.vacancies,
                    ),
                )
    return inserted


def record_unmatched_schools(conn: sqlite3.Connection, match_result: MatchResult) -> None:
    """Matching is run-wide (union of site schools across all scraped years), so this is a
    full snapshot replaced on every run rather than tracked per-year."""
    with conn:
        conn.execute("DELETE FROM unmatched_schools")
        for name, suggestions in match_result.unmatched_csv:
            conn.execute(
                "INSERT INTO unmatched_schools (source, name, slug, year, candidate_matches) VALUES (?,?,?,?,?)",
                ("csv_no_site_match", name, None, None, json.dumps(suggestions)),
            )
        for slug, display_name in match_result.unmatched_site:
            conn.execute(
                "INSERT INTO unmatched_schools (source, name, slug, year, candidate_matches) VALUES (?,?,?,?,?)",
                ("site_no_csv_match", display_name, slug, None, None),
            )


def record_scrape_run(
    conn: sqlite3.Connection,
    year: int,
    source_url: str,
    started_at: datetime,
    school_rows: int,
    status: str,
    error_message: str | None = None,
) -> None:
    with conn:
        conn.execute(
            """
            INSERT INTO scrape_runs (year, source_url, started_at, finished_at, school_rows, status, error_message)
            VALUES (?,?,?,?,?,?,?)
            """,
            (
                year,
                source_url,
                started_at.isoformat(),
                datetime.now(UTC).isoformat(),
                school_rows,
                status,
                error_message,
            ),
        )
