from p1scraper import db
from p1scraper.config import SCHEMA_PATH
from p1scraper.models import BallotingDetail, PhaseRecord


def _make_conn(tmp_path):
    conn = db.connect(tmp_path / "test.sqlite3")
    db.init_schema(conn, SCHEMA_PATH)
    return conn


def _sample_csv_row(name="ADMIRALTY PRIMARY SCHOOL"):
    return {
        "school_name": name, "url_address": "", "address": "11 WOODLANDS CIRCLE",
        "postal_code": "738907", "telephone_no": "", "telephone_no_2": "", "fax_no": "",
        "fax_no_2": "", "email_address": "", "mrt_desc": "", "bus_desc": "",
        "principal_name": "", "first_vp_name": "", "second_vp_name": "", "third_vp_name": "",
        "fourth_vp_name": "", "fifth_vp_name": "", "sixth_vp_name": "", "dgp_code": "WOODLANDS",
        "zone_code": "NORTH", "type_code": "GOVERNMENT SCHOOL", "nature_code": "CO-ED SCHOOL",
        "session_code": "", "sap_ind": "No", "autonomous_ind": "No", "gifted_ind": "No",
        "ip_ind": "No", "mothertongue1_code": "CHINESE", "mothertongue2_code": "MALAY",
        "mothertongue3_code": "TAMIL",
    }


def test_init_schema_creates_tables(tmp_path):
    conn = _make_conn(tmp_path)
    tables = {
        row[0]
        for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    }
    assert {"schools", "admission_phases", "balloting_details", "scrape_runs", "unmatched_schools"} <= tables


def test_upsert_schools_is_idempotent(tmp_path):
    conn = _make_conn(tmp_path)
    csv_schools = [_sample_csv_row()]
    matched = {"ADMIRALTY PRIMARY SCHOOL": "admiralty"}

    db.upsert_schools(conn, csv_schools, matched)
    db.upsert_schools(conn, csv_schools, matched)  # re-run

    rows = conn.execute("SELECT id, school_name, site_slug FROM schools").fetchall()
    assert len(rows) == 1
    assert rows[0][1:] == ("ADMIRALTY PRIMARY SCHOOL", "admiralty")


def test_replace_year_data_no_duplicates_on_rerun(tmp_path):
    conn = _make_conn(tmp_path)
    db.upsert_schools(conn, [_sample_csv_row()], {"ADMIRALTY PRIMARY SCHOOL": "admiralty"})

    records = [
        PhaseRecord(
            year=2025, school_slug="admiralty", phase_label="2C", phase_code="2C", phase_order=4,
            vacancy=52, applied=87, taken=52,
            balloting=BallotingDetail(category_code="SC<1", category_label="SC within 1km needs to ballot",
                                       applicants=74, vacancies=52),
        ),
    ]

    db.replace_year_data(conn, 2025, records)
    db.replace_year_data(conn, 2025, records)  # re-run same year

    phase_rows = conn.execute("SELECT * FROM admission_phases WHERE year = 2025").fetchall()
    balloting_rows = conn.execute("SELECT * FROM balloting_details").fetchall()
    assert len(phase_rows) == 1
    assert len(balloting_rows) == 1


def test_replace_year_data_scoped_to_year_leaves_other_years_untouched(tmp_path):
    conn = _make_conn(tmp_path)
    db.upsert_schools(conn, [_sample_csv_row()], {"ADMIRALTY PRIMARY SCHOOL": "admiralty"})

    rec_2024 = PhaseRecord(year=2024, school_slug="admiralty", phase_label="2C", phase_code="2C",
                            phase_order=4, vacancy=69, applied=134, taken=69, balloting=None)
    rec_2025 = PhaseRecord(year=2025, school_slug="admiralty", phase_label="2C", phase_code="2C",
                            phase_order=4, vacancy=52, applied=87, taken=52, balloting=None)

    db.replace_year_data(conn, 2024, [rec_2024])
    db.replace_year_data(conn, 2025, [rec_2025])
    # Re-run 2025 only
    db.replace_year_data(conn, 2025, [rec_2025])

    years = sorted(r[0] for r in conn.execute("SELECT year FROM admission_phases").fetchall())
    assert years == [2024, 2025]
