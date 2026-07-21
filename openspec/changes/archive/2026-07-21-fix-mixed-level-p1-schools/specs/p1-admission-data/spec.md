## MODIFIED Requirements

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
