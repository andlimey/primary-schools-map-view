from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from p1data import config, db


class School(BaseModel):
    id: int
    slug: str | None
    name: str
    address: str
    latitude: float
    longitude: float


def get_db_path() -> Path:
    return config.DEFAULT_DB_PATH


def get_schools(db_path: Path = Depends(get_db_path)) -> list[School]:
    conn = db.connect(db_path)
    try:
        rows = db.get_geocoded_schools(conn)
    finally:
        conn.close()
    return [School(**row) for row in rows]


app = FastAPI(title="Primary Schools Map View API")


@app.get("/api/schools", response_model=list[School])
def list_schools(schools: list[School] = Depends(get_schools)) -> list[School]:
    return schools


# The React build (frontend/dist) is mounted at "/" so the API and map are served from a
# single origin. Only mounted when the build exists (e.g. not yet built in a dev checkout).
_frontend_dist = config.PROJECT_ROOT / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")


def run() -> None:
    import uvicorn

    uvicorn.run("schoolsmap.api:app", host="0.0.0.0", port=8000)
