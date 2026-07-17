from pathlib import Path

BASE_URL = "https://sgschooling.com/year/{year}/"
YEARS = [2022, 2023, 2024, 2025]
USER_AGENT = "p1scraper/0.1 (contact: andychan1451@gmail.com)"
REQUEST_DELAY_SECONDS = 2
REQUEST_TIMEOUT_SECONDS = 15

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHOOLS_CSV_PATH = PROJECT_ROOT / "schools_information.csv"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = PROJECT_ROOT / "cache"
LOGS_DIR = PROJECT_ROOT / "logs"

DEFAULT_DB_PATH = DATA_DIR / "output.sqlite3"
OVERRIDES_CSV_PATH = DATA_DIR / "school_slug_overrides.csv"
