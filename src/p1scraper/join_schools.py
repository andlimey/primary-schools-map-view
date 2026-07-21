import csv
import difflib
import json
from dataclasses import dataclass, field
from pathlib import Path

from p1scraper.normalize import candidate_keys, normalize_name


@dataclass
class MatchResult:
    matched: dict[str, str]  # school_name -> site_slug
    unmatched_csv: list[tuple[str, list[tuple[str, str]]]]  # (school_name, [(display_name, slug), ...])
    unmatched_site: list[tuple[str, str]]  # (slug, display_name)


_ELIGIBLE_MAINLEVEL_CODES = ("PRIMARY", "MIXED LEVEL (P1-S4)")


def load_p1_schools(csv_path: Path) -> list[dict]:
    """Load schools with a Primary 1 intake: PRIMARY schools, plus mixed-level schools
    whose registration spans P1 through secondary (e.g. Catholic High, Maris Stella High)."""
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [row for row in reader if row["mainlevel_code"].strip() in _ELIGIBLE_MAINLEVEL_CODES]


def load_overrides(overrides_path: Path) -> dict[str, str]:
    if not overrides_path.exists():
        return {}
    with overrides_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return {row["school_name"].strip(): row["site_slug"].strip() for row in reader}


def build_matches(
    csv_schools: list[dict],
    site_schools: dict[str, str],
    overrides: dict[str, str],
) -> MatchResult:
    """site_schools: slug -> display_name, unioned across all scraped years."""
    site_by_norm = {normalize_name(name): slug for slug, name in site_schools.items()}

    matched: dict[str, str] = {}
    unmatched_csv: list[tuple[str, list[tuple[str, str]]]] = []

    for row in csv_schools:
        name = row["school_name"].strip()
        if name in overrides:
            matched[name] = overrides[name]
            continue

        keys = candidate_keys(name)
        hit = next((site_by_norm[c] for c in keys if c in site_by_norm), None)
        if hit:
            matched[name] = hit
        else:
            # Fuzzy-match against the most aggressively stripped candidate (e.g. 'ADMIRALTY'
            # rather than 'ADMIRALTY PRIMARY SCHOOL') since it's closest in form to the site's
            # abbreviated display names.
            suggestions = difflib.get_close_matches(
                keys[-1], site_by_norm.keys(), n=3, cutoff=0.6
            )
            unmatched_csv.append(
                (name, [(site_schools[site_by_norm[s]], site_by_norm[s]) for s in suggestions])
            )

    matched_slugs = set(matched.values())
    unmatched_site = [(slug, disp) for slug, disp in site_schools.items() if slug not in matched_slugs]

    return MatchResult(matched=matched, unmatched_csv=unmatched_csv, unmatched_site=unmatched_site)


def write_unmatched_log(result: MatchResult, log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["source", "name", "slug", "candidate_matches"])
        for name, suggestions in result.unmatched_csv:
            writer.writerow(["csv_no_site_match", name, "", json.dumps(suggestions)])
        for slug, display_name in result.unmatched_site:
            writer.writerow(["site_no_csv_match", display_name, slug, ""])
