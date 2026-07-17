PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schools (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    school_name         TEXT NOT NULL UNIQUE,   -- verbatim from CSV, e.g. 'ADMIRALTY PRIMARY SCHOOL'
    site_slug           TEXT UNIQUE,             -- e.g. 'admiralty'; NULL if unmatched
    url_address         TEXT,
    address             TEXT,
    postal_code         TEXT,
    telephone_no        TEXT,
    telephone_no_2      TEXT,
    fax_no              TEXT,
    fax_no_2            TEXT,
    email_address       TEXT,
    mrt_desc            TEXT,
    bus_desc            TEXT,
    principal_name      TEXT,
    first_vp_name       TEXT,
    second_vp_name      TEXT,
    third_vp_name       TEXT,
    fourth_vp_name      TEXT,
    fifth_vp_name       TEXT,
    sixth_vp_name       TEXT,
    dgp_code            TEXT,
    zone_code           TEXT,
    type_code           TEXT,
    nature_code         TEXT,
    session_code        TEXT,
    mainlevel_code      TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (mainlevel_code = 'PRIMARY'),
    sap_ind             TEXT,
    autonomous_ind      TEXT,
    gifted_ind          TEXT,
    ip_ind              TEXT,
    mothertongue1_code  TEXT,
    mothertongue2_code  TEXT,
    mothertongue3_code  TEXT,
    match_method        TEXT,   -- 'matched' | 'unmatched'
    match_confidence    REAL    -- fuzzy score if applicable, else NULL
);

CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(site_slug);

CREATE TABLE IF NOT EXISTS admission_phases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id     INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    year          INTEGER NOT NULL,
    phase_label   TEXT NOT NULL,    -- raw <th> text, e.g. 'Phase 2C(S)'
    phase_code    TEXT NOT NULL,    -- normalized, cross-year comparable, e.g. '2C_S'
    phase_order   INTEGER NOT NULL, -- 1-based column order as rendered that year
    vacancy       INTEGER,
    applied       INTEGER,
    taken         INTEGER,
    scraped_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(school_id, year, phase_label)
);

CREATE INDEX IF NOT EXISTS idx_phases_school_year ON admission_phases(school_id, year);
CREATE INDEX IF NOT EXISTS idx_phases_year         ON admission_phases(year);
CREATE INDEX IF NOT EXISTS idx_phases_phase_code   ON admission_phases(phase_code);

CREATE TABLE IF NOT EXISTS balloting_details (
    phase_id        INTEGER PRIMARY KEY REFERENCES admission_phases(id) ON DELETE CASCADE,
    category_code   TEXT NOT NULL,   -- data-tt-title, e.g. 'SC<1'
    category_label  TEXT,            -- first sentence of data-tt, e.g. 'SC within 1km needs to ballot'
    applicants      INTEGER,
    vacancies       INTEGER
);

CREATE TABLE IF NOT EXISTS scrape_runs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    year           INTEGER NOT NULL,
    source_url     TEXT NOT NULL,
    started_at     TEXT NOT NULL,
    finished_at    TEXT,
    school_rows    INTEGER,
    status         TEXT NOT NULL DEFAULT 'pending',  -- pending | success | failed
    error_message  TEXT
);

CREATE TABLE IF NOT EXISTS unmatched_schools (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    source             TEXT NOT NULL,   -- 'csv_no_site_match' | 'site_no_csv_match'
    name               TEXT NOT NULL,   -- CSV school_name or site display name
    slug               TEXT,            -- site slug, when source = site_no_csv_match
    year               INTEGER,         -- which year's page it was observed on (site-side only)
    candidate_matches  TEXT,            -- top-3 fuzzy suggestions + scores, JSON string, for manual review
    detected_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
