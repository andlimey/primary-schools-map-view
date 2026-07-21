# p1-admission-data Specification

## Purpose
Scrape, join, and persist Primary 1 (P1) admission phase and balloting data from sgschooling.com, matched to the official school registry, so it can be queried by school across multiple years.

## Requirements

### Requirement: Scrape P1 admission phase data by year
The system SHALL fetch `https://sgschooling.com/year/{YYYY}/` for a configurable set of years and extract, per school and per admission phase, the vacancy count, applied count, and taken count.

#### Scenario: Fetching a configured year
- **WHEN** the scraper runs for year 2025
- **THEN** it fetches `https://sgschooling.com/year/2025/` and produces one phase record per (school, phase) pair found in the page's admissions table, each with vacancy/applied/taken populated where present

#### Scenario: Phase columns vary by year
- **WHEN** the scraper parses a year whose admissions table has a different number or labeling of phase columns than another scraped year (e.g. `2A` merged vs `2A(1)`/`2A(2)` split)
- **THEN** the phase headers are read from that page's own table headers rather than assumed from a fixed layout, so the correct number of phases is recorded for that year

### Requirement: Extract balloting detail when present
The system SHALL extract, for any phase where balloting occurred, the citizenship/distance category code, category label, number of applicants, and number of vacancies for that category, from the page's tooltip markup.

#### Scenario: A phase with balloting
- **WHEN** a "Taken" cell contains a tooltip span indicating balloting occurred (e.g. "SC within 1km needs to ballot", Applicants: 74, Vacancies: 52)
- **THEN** the system stores a balloting detail record for that phase with category_code="SC<1", category_label="SC within 1km needs to ballot", applicants=74, vacancies=52

#### Scenario: A phase without balloting
- **WHEN** a "Taken" cell has no tooltip span
- **THEN** no balloting detail record is created for that phase, and the plain taken count is still recorded

#### Scenario: A phase where a category is fully admitted with no ballot needed
- **WHEN** a "Taken" cell's tooltip indicates a category was fully admitted with no leftover applicants to ballot (e.g. category code suffixed `#`, "Ballot Chance: 100%")
- **THEN** the system still records the balloting detail record with the applicants and vacancies figures as given (which may both be 0), rather than treating it as an error

### Requirement: Join scraped schools to the official school registry
The system SHALL match each eligible school in `schools_information.csv` to its corresponding school on sgschooling.com, and SHALL NOT silently guess an ambiguous or low-confidence match. A school is eligible if its `mainlevel_code` is `PRIMARY` or `MIXED LEVEL (P1-S4)` (schools with a Primary 1 intake registered jointly with secondary levels).

#### Scenario: Unambiguous match
- **WHEN** an eligible CSV school's normalized name (or a progressively suffix-stripped form of it) exactly matches a normalized site school name
- **THEN** the CSV school is automatically matched to that site school's slug

#### Scenario: Ambiguous or unmatched CSV school
- **WHEN** an eligible CSV school's name has no exact normalized match against any site school (e.g. due to naming differences the automated normalization cannot resolve)
- **THEN** the system does not guess a match; it records the school as unmatched with candidate suggestions for manual review, unless an explicit override for that school name has been provided

#### Scenario: Manual override takes precedence
- **WHEN** a CSV school name has an entry in the manually-curated overrides file
- **THEN** that mapping is used regardless of what automatic normalization would have produced

#### Scenario: Mixed-level school with a P1 intake is eligible
- **WHEN** a CSV school's `mainlevel_code` is `MIXED LEVEL (P1-S4)` (e.g. Catholic High School, CHIJ St. Nicholas Girls' School, Maris Stella High School)
- **THEN** the school is included in the match candidate pool the same as a `PRIMARY`-tagged school, and is matched, unmatched-with-suggestions, or override-resolved by the same rules

#### Scenario: Non-P1 mixed-level school remains excluded
- **WHEN** a CSV school's `mainlevel_code` is `MIXED LEVEL (S1-JC2)` or another value with no Primary 1 intake
- **THEN** the school is not included in the match candidate pool

### Requirement: Persist scraped data for querying by school across years
The system SHALL store scraped schools, phase records, and balloting details in a local SQLite database queryable by school across multiple years.

#### Scenario: Querying a school's history
- **WHEN** the database has been populated for multiple scraped years
- **THEN** a query filtered by a school's name returns that school's phase and balloting records across all scraped years, orderable by year and phase

### Requirement: Re-running the scraper is idempotent
The system SHALL support being re-run (for all configured years or a subset) without producing duplicate rows or corrupting previously stored data for years not being re-scraped.

#### Scenario: Re-running for all years
- **WHEN** the scraper is run twice in succession with the same year arguments
- **THEN** the resulting row counts in every table are identical after the second run

#### Scenario: Re-running for a single year
- **WHEN** the scraper is run for one year only, after having previously stored data for multiple years
- **THEN** data for years not included in this run remains unchanged
