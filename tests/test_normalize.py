from p1data.normalize import candidate_keys, normalize_name, normalize_phase_code


def test_normalize_name_strips_punctuation_and_hyphens():
    assert normalize_name("St. Andrew's Junior School") == "ST ANDREWS JUNIOR SCHOOL"
    assert normalize_name("Anglo-Chinese School (Junior)") == "ANGLO CHINESE SCHOOL JUNIOR"


def test_candidate_keys_progressive_suffix_stripping():
    keys = candidate_keys("ADMIRALTY PRIMARY SCHOOL")
    assert keys == ["ADMIRALTY PRIMARY SCHOOL", "ADMIRALTY PRIMARY", "ADMIRALTY"]


def test_candidate_keys_does_not_strip_parenthetical_campus_qualifiers():
    junior_keys = candidate_keys("ANGLO-CHINESE SCHOOL (JUNIOR)")
    primary_keys = candidate_keys("ANGLO-CHINESE SCHOOL (PRIMARY)")
    # These must remain distinct — collapsing them would silently merge two different schools.
    assert junior_keys != primary_keys
    assert "ANGLO CHINESE SCHOOL" not in junior_keys
    assert "ANGLO CHINESE SCHOOL" not in primary_keys


def test_normalize_phase_code_handles_all_known_label_shapes():
    assert normalize_phase_code("Phase 1") == "1"
    assert normalize_phase_code("2A") == "2A"
    assert normalize_phase_code("2C(S)") == "2C_S"
    assert normalize_phase_code("2A(1)") == "2A_1"
    assert normalize_phase_code("2A(2)") == "2A_2"
