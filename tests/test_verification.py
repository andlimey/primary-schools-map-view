from pathlib import Path

from p1data import db
from p1data.config import SCHEMA_PATH
from p1data.join_schools import build_matches
from p1data.parse import build_phase_records, iter_school_blocks, locate_primary_table, parse_phase_headers

FIXTURE_2025 = (Path(__file__).parent / "fixtures" / "admiralty_2025_snippet.html").read_text()


def test_end_to_end_admiralty_ground_truth(tmp_path):
    """Reproduces the user's original example end-to-end: fetch -> parse -> join -> store -> query.

    Admiralty Primary School, 2025, Phase 2C: 87 applicants, 52 vacancies, and within that,
    74 applicants in the 'SC within 1km' category needed to ballot for those 52 spots.
    """
    table = locate_primary_table(FIXTURE_2025)
    headers = parse_phase_headers(table)
    blocks = list(iter_school_blocks(table))
    records = build_phase_records(2025, headers, blocks)

    csv_schools = [{"school_name": "ADMIRALTY PRIMARY SCHOOL", "mainlevel_code": "PRIMARY",
                    **{k: "" for k in ("url_address", "address", "postal_code", "telephone_no",
                                        "telephone_no_2", "fax_no", "fax_no_2", "email_address",
                                        "mrt_desc", "bus_desc", "principal_name", "first_vp_name",
                                        "second_vp_name", "third_vp_name", "fourth_vp_name",
                                        "fifth_vp_name", "sixth_vp_name", "dgp_code", "zone_code",
                                        "type_code", "nature_code", "session_code", "sap_ind",
                                        "autonomous_ind", "gifted_ind", "ip_ind",
                                        "mothertongue1_code", "mothertongue2_code",
                                        "mothertongue3_code")}}]
    site_schools = {b.slug: b.display_name for b in blocks}
    match_result = build_matches(csv_schools, site_schools, overrides={})
    assert match_result.matched == {"ADMIRALTY PRIMARY SCHOOL": "admiralty"}

    conn = db.connect(tmp_path / "verify.sqlite3")
    db.init_schema(conn, SCHEMA_PATH)
    db.upsert_schools(conn, csv_schools, match_result.matched)
    db.replace_year_data(conn, 2025, records)

    row = conn.execute(
        """
        SELECT ap.vacancy, ap.applied, ap.taken, bd.category_code, bd.applicants, bd.vacancies
        FROM schools s
        JOIN admission_phases ap ON ap.school_id = s.id
        JOIN balloting_details bd ON bd.phase_id = ap.id
        WHERE s.school_name = 'ADMIRALTY PRIMARY SCHOOL' AND ap.year = 2025 AND ap.phase_code = '2C'
        """
    ).fetchone()

    assert row == (52, 87, 52, "SC<1", 74, 52)
