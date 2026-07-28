from pathlib import Path
from typing import Callable

from fastapi import Depends, FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from p1data import config, db
from schoolsmap import geocode_proxy

MIN_GEOCODE_QUERY_LENGTH = 2


class School(BaseModel):
    id: int
    slug: str | None
    name: str
    address: str
    postal_code: str | None
    latitude: float
    longitude: float


class GeocodeCandidate(BaseModel):
    label: str
    latitude: float
    longitude: float


class BallotingDetail(BaseModel):
    category_code: str
    category_label: str | None
    applicants: int | None
    vacancies: int | None


class AdmissionPhase(BaseModel):
    phase_label: str
    phase_code: str
    vacancy: int | None
    applied: int | None
    taken: int | None
    balloting: BallotingDetail | None


class SchoolAdmissions(BaseModel):
    school_id: int
    phases: list[AdmissionPhase]


class AdmissionsResponse(BaseModel):
    year: int | None
    schools: list[SchoolAdmissions]


class SchoolDetail(BaseModel):
    id: int
    slug: str | None
    name: str
    address: str
    postal_code: str | None
    url_address: str | None
    zone_code: str | None
    nature_code: str | None
    mainlevel_code: str


class AdmissionPhaseHistory(BaseModel):
    year: int
    phase_label: str
    phase_code: str
    vacancy: int | None
    applied: int | None
    taken: int | None
    balloting: BallotingDetail | None


class AdmissionsHistoryResponse(BaseModel):
    school_id: int
    phases: list[AdmissionPhaseHistory]


def get_db_path() -> Path:
    return config.DEFAULT_DB_PATH


def get_schools(db_path: Path = Depends(get_db_path)) -> list[School]:
    conn = db.connect(db_path)
    try:
        rows = db.get_geocoded_schools(conn)
    finally:
        conn.close()
    return [School(**row) for row in rows]


def get_admissions(db_path: Path = Depends(get_db_path)) -> AdmissionsResponse:
    conn = db.connect(db_path)
    try:
        result = db.get_latest_admissions(conn)
    finally:
        conn.close()
    schools = [
        SchoolAdmissions(school_id=school_id, phases=phases)
        for school_id, phases in result["schools"].items()
    ]
    return AdmissionsResponse(year=result["year"], schools=schools)


def get_school_detail(school_id: int, db_path: Path = Depends(get_db_path)) -> SchoolDetail:
    conn = db.connect(db_path)
    try:
        row = db.get_school_detail(conn, school_id)
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="School not found")
    return SchoolDetail(**row)


def get_admissions_history(school_id: int, db_path: Path = Depends(get_db_path)) -> AdmissionsHistoryResponse:
    conn = db.connect(db_path)
    try:
        detail = db.get_school_detail(conn, school_id)
        if detail is None:
            raise HTTPException(status_code=404, detail="School not found")
        phases = db.get_admissions_history(conn, school_id)
    finally:
        conn.close()
    return AdmissionsHistoryResponse(school_id=school_id, phases=phases)


app = FastAPI(title="Primary Schools Map View API")


@app.get("/api/schools", response_model=list[School])
def list_schools(schools: list[School] = Depends(get_schools)) -> list[School]:
    return schools


@app.get("/api/schools/admissions", response_model=AdmissionsResponse)
def list_admissions(admissions: AdmissionsResponse = Depends(get_admissions)) -> AdmissionsResponse:
    return admissions


@app.get("/api/schools/{school_id}", response_model=SchoolDetail)
def get_school(school: SchoolDetail = Depends(get_school_detail)) -> SchoolDetail:
    return school


@app.get("/api/schools/{school_id}/admissions/history", response_model=AdmissionsHistoryResponse)
def get_school_admissions_history(
    history: AdmissionsHistoryResponse = Depends(get_admissions_history),
) -> AdmissionsHistoryResponse:
    return history


def get_geocode_search() -> Callable[[str], list[dict]]:
    return geocode_proxy.search


def get_geocode_candidates(
    q: str, search: Callable[[str], list[dict]] = Depends(get_geocode_search)
) -> list[GeocodeCandidate]:
    if len(q.strip()) < MIN_GEOCODE_QUERY_LENGTH:
        return []
    results = search(q)
    return [
        GeocodeCandidate(label=r["ADDRESS"], latitude=float(r["LATITUDE"]), longitude=float(r["LONGITUDE"]))
        for r in results
    ]


@app.get("/api/geocode", response_model=list[GeocodeCandidate])
def geocode(candidates: list[GeocodeCandidate] = Depends(get_geocode_candidates)) -> list[GeocodeCandidate]:
    return candidates


# The React build (frontend/dist) is mounted at "/" so the API and map are served from a
# single origin. Only mounted when the build exists (e.g. not yet built in a dev checkout).
_frontend_dist = config.PROJECT_ROOT / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")


def run() -> None:
    import uvicorn

    uvicorn.run("schoolsmap.api:app", host="0.0.0.0", port=8000)
