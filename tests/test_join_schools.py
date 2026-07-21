import csv

from p1scraper.join_schools import build_matches, load_p1_schools


def test_exact_normalized_match():
    csv_schools = [{"school_name": "ADMIRALTY PRIMARY SCHOOL"}]
    site_schools = {"admiralty": "Admiralty"}
    result = build_matches(csv_schools, site_schools, overrides={})
    assert result.matched == {"ADMIRALTY PRIMARY SCHOOL": "admiralty"}
    assert result.unmatched_csv == []
    assert result.unmatched_site == []


def test_ambiguous_campus_names_are_not_auto_matched():
    csv_schools = [
        {"school_name": "ANGLO-CHINESE SCHOOL (JUNIOR)"},
        {"school_name": "ANGLO-CHINESE SCHOOL (PRIMARY)"},
    ]
    site_schools = {
        "anglo-chinese-junior": "Anglo-Chinese Junior",
        "anglo-chinese-primary": "Anglo-Chinese Primary",
    }
    result = build_matches(csv_schools, site_schools, overrides={})
    # Neither should be auto-matched — normalized forms don't align, so both surface for review.
    assert result.matched == {}
    unmatched_names = {name for name, _ in result.unmatched_csv}
    assert unmatched_names == {"ANGLO-CHINESE SCHOOL (JUNIOR)", "ANGLO-CHINESE SCHOOL (PRIMARY)"}


def test_ambiguous_campus_names_resolved_via_overrides():
    csv_schools = [
        {"school_name": "ANGLO-CHINESE SCHOOL (JUNIOR)"},
        {"school_name": "ANGLO-CHINESE SCHOOL (PRIMARY)"},
    ]
    site_schools = {
        "anglo-chinese-junior": "Anglo-Chinese Junior",
        "anglo-chinese-primary": "Anglo-Chinese Primary",
    }
    overrides = {
        "ANGLO-CHINESE SCHOOL (JUNIOR)": "anglo-chinese-junior",
        "ANGLO-CHINESE SCHOOL (PRIMARY)": "anglo-chinese-primary",
    }
    result = build_matches(csv_schools, site_schools, overrides)
    assert result.matched == overrides
    assert result.unmatched_csv == []


def test_unmatched_csv_school_gets_fuzzy_suggestions():
    csv_schools = [{"school_name": "ADMIRALTIE PRIMARY SCHOOL"}]  # typo, won't exact-match
    site_schools = {"admiralty": "Admiralty"}
    result = build_matches(csv_schools, site_schools, overrides={})
    assert result.matched == {}
    assert len(result.unmatched_csv) == 1
    name, suggestions = result.unmatched_csv[0]
    assert name == "ADMIRALTIE PRIMARY SCHOOL"
    assert suggestions  # at least one fuzzy suggestion offered for manual review


def test_unmatched_site_school_reported():
    csv_schools = [{"school_name": "ADMIRALTY PRIMARY SCHOOL"}]
    site_schools = {"admiralty": "Admiralty", "some-other-school": "Some Other School"}
    result = build_matches(csv_schools, site_schools, overrides={})
    assert result.unmatched_site == [("some-other-school", "Some Other School")]


def _write_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["school_name", "mainlevel_code"])
        writer.writeheader()
        writer.writerows(rows)


def test_load_p1_schools_includes_primary_and_mixed_level_p1(tmp_path):
    csv_path = tmp_path / "schools.csv"
    _write_csv(csv_path, [
        {"school_name": "ADMIRALTY PRIMARY SCHOOL", "mainlevel_code": "PRIMARY"},
        {"school_name": "CATHOLIC HIGH SCHOOL", "mainlevel_code": "MIXED LEVEL (P1-S4)"},
    ])
    schools = load_p1_schools(csv_path)
    names = {row["school_name"] for row in schools}
    assert names == {"ADMIRALTY PRIMARY SCHOOL", "CATHOLIC HIGH SCHOOL"}


def test_load_p1_schools_excludes_non_p1_mixed_level(tmp_path):
    csv_path = tmp_path / "schools.csv"
    _write_csv(csv_path, [
        {"school_name": "ADMIRALTY PRIMARY SCHOOL", "mainlevel_code": "PRIMARY"},
        {"school_name": "ST. JOSEPH'S INSTITUTION", "mainlevel_code": "MIXED LEVEL (S1-JC2)"},
        {"school_name": "SOME JUNIOR COLLEGE", "mainlevel_code": "JUNIOR COLLEGE"},
    ])
    schools = load_p1_schools(csv_path)
    names = {row["school_name"] for row in schools}
    assert names == {"ADMIRALTY PRIMARY SCHOOL"}
