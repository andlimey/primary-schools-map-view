from fastapi.testclient import TestClient

from p1data import db
from p1data.config import SCHEMA_PATH
from schoolsmap.api import app, get_db_path


def _make_conn(tmp_path):
    conn = db.connect(tmp_path / "test.sqlite3")
    db.init_schema(conn, SCHEMA_PATH)
    return conn


def _sample_csv_row(name="ADMIRALTY PRIMARY SCHOOL", postal_code="738907"):
    return {
        "school_name": name, "url_address": "", "address": "11 WOODLANDS CIRCLE",
        "postal_code": postal_code, "telephone_no": "", "telephone_no_2": "", "fax_no": "",
        "fax_no_2": "", "email_address": "", "mrt_desc": "", "bus_desc": "",
        "principal_name": "", "first_vp_name": "", "second_vp_name": "", "third_vp_name": "",
        "fourth_vp_name": "", "fifth_vp_name": "", "sixth_vp_name": "", "dgp_code": "WOODLANDS",
        "zone_code": "NORTH", "type_code": "GOVERNMENT SCHOOL", "nature_code": "CO-ED SCHOOL",
        "session_code": "", "sap_ind": "No", "autonomous_ind": "No", "gifted_ind": "No",
        "ip_ind": "No", "mothertongue1_code": "CHINESE", "mothertongue2_code": "MALAY",
        "mothertongue3_code": "TAMIL",
    }


def _client_for(tmp_path):
    conn = _make_conn(tmp_path)
    app.dependency_overrides[get_db_path] = lambda: tmp_path / "test.sqlite3"
    return conn, TestClient(app)


def test_list_schools_returns_geocoded_school(tmp_path):
    conn, client = _client_for(tmp_path)
    db.upsert_schools(conn, [_sample_csv_row()], {"ADMIRALTY PRIMARY SCHOOL": "admiralty"})
    school_id = conn.execute("SELECT id FROM schools").fetchone()[0]
    from p1data.models import GeocodeResult
    db.save_geocode_result(
        conn, school_id, GeocodeResult(latitude=1.4426, longitude=103.8000, source="postal_code", confidence=1.0)
    )

    resp = client.get("/api/schools")
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["name"] == "ADMIRALTY PRIMARY SCHOOL"
    assert body[0]["slug"] == "admiralty"
    assert body[0]["address"] == "11 WOODLANDS CIRCLE"
    assert body[0]["latitude"] == 1.4426
    assert body[0]["longitude"] == 103.8000


def test_list_schools_excludes_ungeocoded_school(tmp_path):
    conn, client = _client_for(tmp_path)
    db.upsert_schools(
        conn,
        [_sample_csv_row(), _sample_csv_row(name="AI TONG SCHOOL", postal_code="579646")],
        {"ADMIRALTY PRIMARY SCHOOL": "admiralty", "AI TONG SCHOOL": "ai-tong"},
    )
    geocoded_id = conn.execute(
        "SELECT id FROM schools WHERE school_name = 'ADMIRALTY PRIMARY SCHOOL'"
    ).fetchone()[0]
    from p1data.models import GeocodeResult
    db.save_geocode_result(
        conn, geocoded_id, GeocodeResult(latitude=1.4426, longitude=103.8000, source="postal_code", confidence=1.0)
    )
    # AI TONG SCHOOL is left ungeocoded (no coordinates persisted).

    resp = client.get("/api/schools")
    app.dependency_overrides.clear()

    body = resp.json()
    assert len(body) == 1
    assert body[0]["name"] == "ADMIRALTY PRIMARY SCHOOL"
