import re


def normalize_name(name: str) -> str:
    """Uppercase, strip periods/apostrophes/parens, hyphens/& -> spaces/AND, collapse whitespace."""
    s = name.upper()
    s = re.sub(r"[.'()]", "", s)
    s = s.replace("-", " ").replace("&", "AND")
    return re.sub(r"\s+", " ", s).strip()


_GENERIC_SUFFIX_WORDS = ("SCHOOL", "PRIMARY")


def candidate_keys(csv_school_name: str) -> list[str]:
    """Progressive suffix-stripping, least -> most aggressive.

    e.g. 'ADMIRALTY PRIMARY SCHOOL' -> ['ADMIRALTY PRIMARY SCHOOL', 'ADMIRALTY PRIMARY', 'ADMIRALTY']

    Deliberately does NOT strip anything when the raw name ends with a parenthetical qualifier
    like '(JUNIOR)'/'(PRIMARY)' (e.g. 'ANGLO-CHINESE SCHOOL (JUNIOR)' vs '... (PRIMARY)' are
    distinct schools) — those ambiguous cases go through the manual overrides file instead.
    """
    normalized = normalize_name(csv_school_name)
    candidates = [normalized]

    if csv_school_name.strip().endswith(")"):
        return candidates

    current = normalized
    while True:
        words = current.split(" ")
        if len(words) > 1 and words[-1] in _GENERIC_SUFFIX_WORDS:
            current = " ".join(words[:-1])
            candidates.append(current)
        else:
            break

    return candidates


def normalize_phase_code(raw_label: str) -> str:
    """'Phase 2A(1)' -> '2A_1', 'Phase 2C(S)' -> '2C_S', 'Phase 1' -> '1'."""
    s = re.sub(r"(?i)^phase\s*", "", raw_label.strip())
    s = re.sub(r"\((s)\)", "_S", s, flags=re.IGNORECASE)
    s = re.sub(r"\((\d+)\)", r"_\1", s)
    return re.sub(r"\s+", "", s).upper()
