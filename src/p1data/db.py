import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from p1data.join_schools import MatchResult
from p1data.models import GeocodeFailure, GeocodeResult, PhaseRecord

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


_SCHOOLS_MIGRATED_COLUMNS = {
    "latitude": "REAL",
    "longitude": "REAL",
    "geocode_source": "TEXT",
    "geocode_confidence": "REAL",
}


def init_schema(conn: sqlite3.Connection, schema_path: Path) -> None:
    conn.executescript(schema_path.read_text())
    _migrate_schools_columns(conn)


def _migrate_schools_columns(conn: sqlite3.Connection) -> None:
    """CREATE TABLE IF NOT EXISTS in schema.sql only applies to fresh databases; existing
    databases (e.g. data/output.sqlite3, already populated before these columns were added)
    need them added explicitly."""
    existing = {row[1] for row in conn.execute("PRAGMA table_info(schools)")}
    with conn:
        for column, column_type in _SCHOOLS_MIGRATED_COLUMNS.items():
            if column not in existing:
                conn.execute(f"ALTER TABLE schools ADD COLUMN {column} {column_type}")


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


def schools_needing_geocoding(conn: sqlite3.Connection) -> list[dict]:
    """Schools with no persisted coordinate yet — covers both never-attempted schools and
    ones previously flagged for manual review, so a rerun naturally retries failures too."""
    rows = conn.execute(
        "SELECT id, school_name, address, postal_code FROM schools WHERE latitude IS NULL"
    ).fetchall()
    return [
        {"id": school_id, "school_name": name, "address": address, "postal_code": postal_code}
        for school_id, name, address, postal_code in rows
    ]


def save_geocode_result(conn: sqlite3.Connection, school_id: int, result: GeocodeResult) -> None:
    with conn:
        conn.execute("DELETE FROM geocoding_review WHERE school_id = ?", (school_id,))
        conn.execute(
            "UPDATE schools SET latitude=?, longitude=?, geocode_source=?, geocode_confidence=? WHERE id=?",
            (result.latitude, result.longitude, result.source, result.confidence, school_id),
        )


def save_geocode_failure(conn: sqlite3.Connection, school_id: int, failure: GeocodeFailure) -> None:
    with conn:
        conn.execute("DELETE FROM geocoding_review WHERE school_id = ?", (school_id,))
        conn.execute(
            "INSERT INTO geocoding_review (school_id, reason, candidate_results) VALUES (?,?,?)",
            (school_id, failure.reason, json.dumps(failure.candidates) if failure.candidates else None),
        )


def get_latest_admissions(conn: sqlite3.Connection) -> dict:
    """Most recent year is a single global value (MAX(year) across all admission_phases),
    not computed per school. Schools with no phase rows for that year are simply absent
    from the returned "schools" dict, mirroring how get_geocoded_schools omits ungeocoded
    schools rather than including them with null data."""
    year = conn.execute("SELECT MAX(year) FROM admission_phases").fetchone()[0]
    if year is None:
        return {"year": None, "schools": {}}

    rows = conn.execute(
        """
        SELECT p.school_id, p.phase_label, p.phase_code, p.vacancy, p.applied, p.taken,
               b.category_code, b.category_label, b.applicants, b.vacancies
        FROM admission_phases p
        LEFT JOIN balloting_details b ON b.phase_id = p.id
        WHERE p.year = ?
        ORDER BY p.school_id, p.phase_order
        """,
        (year,),
    ).fetchall()

    schools: dict[int, list[dict]] = {}
    for school_id, phase_label, phase_code, vacancy, applied, taken, cat_code, cat_label, applicants, vacancies in rows:
        balloting = None
        if cat_code is not None:
            balloting = {
                "category_code": cat_code,
                "category_label": cat_label,
                "applicants": applicants,
                "vacancies": vacancies,
            }
        schools.setdefault(school_id, []).append(
            {
                "phase_label": phase_label,
                "phase_code": phase_code,
                "vacancy": vacancy,
                "applied": applied,
                "taken": taken,
                "balloting": balloting,
            }
        )
    return {"year": year, "schools": schools}


def get_geocoded_schools(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT id, site_slug, school_name, address, latitude, longitude
        FROM schools
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """
    ).fetchall()
    return [
        {
            "id": school_id,
            "slug": slug,
            "name": name,
            "address": address,
            "latitude": latitude,
            "longitude": longitude,
        }
        for school_id, slug, name, address, latitude, longitude in rows
    ]
