from pathlib import Path

from p1data.parse import (
    build_phase_records,
    iter_school_blocks,
    locate_primary_table,
    parse_phase_headers,
)

FIXTURE_2025 = (Path(__file__).parent / "fixtures" / "admiralty_2025_snippet.html").read_text()

# Synthetic fixture mimicking the older 7-column schema (2A split into 2A(1)/2A(2)) to prove
# the header parser reads <th> text dynamically rather than assuming a fixed 6-phase layout.
SYNTHETIC_7_PHASE_HTML = """
<table>
  <thead>
    <tr>
      <th>School</th><th>Phase 1</th><th>2A(1)</th><th>2A(2)</th><th>2B</th><th>2C</th><th>2C(S)</th><th>3</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><a href="/school/testschool">Test School</a></td>
        <td> </td><td> </td><td> </td><td> </td><td> </td><td> </td><td> </td></tr>
    <tr><td>↳ Vacancy (100)</td><td>10</td><td>20</td><td>30</td><td>40</td><td>50</td><td>0</td><td>0</td></tr>
    <tr><td>↳ Applied</td><td>5</td><td>15</td><td>25</td><td>35</td><td>45</td><td>0</td><td>-</td></tr>
    <tr><td>↳ Taken</td><td>5</td><td>15</td><td>25</td><td>35</td><td>45</td><td>0</td><td>-</td></tr>
  </tbody>
</table>
"""


def test_locate_primary_table_finds_the_admissions_table():
    table = locate_primary_table(FIXTURE_2025)
    assert table is not None


def test_parse_phase_headers_2025_six_phases():
    table = locate_primary_table(FIXTURE_2025)
    headers = parse_phase_headers(table)
    assert [(h.raw_label, h.code) for h in headers] == [
        ("Phase 1", "1"),
        ("2A", "2A"),
        ("2B", "2B"),
        ("2C", "2C"),
        ("2C(S)", "2C_S"),
        ("3", "3"),
    ]


def test_parse_phase_headers_handles_seven_column_schema_dynamically():
    table = locate_primary_table(SYNTHETIC_7_PHASE_HTML)
    headers = parse_phase_headers(table)
    assert [h.code for h in headers] == ["1", "2A_1", "2A_2", "2B", "2C", "2C_S", "3"]


def test_iter_school_blocks_yields_admiralty():
    table = locate_primary_table(FIXTURE_2025)
    blocks = list(iter_school_blocks(table))
    assert len(blocks) == 1
    assert blocks[0].slug == "admiralty"
    assert blocks[0].display_name == "Admiralty"
    assert blocks[0].planning_area == "Woodlands"


def test_build_phase_records_matches_admiralty_ground_truth():
    table = locate_primary_table(FIXTURE_2025)
    headers = parse_phase_headers(table)
    blocks = list(iter_school_blocks(table))
    records = build_phase_records(2025, headers, blocks)

    by_phase = {r.phase_code: r for r in records}

    phase_2c = by_phase["2C"]
    assert (phase_2c.vacancy, phase_2c.applied, phase_2c.taken) == (52, 87, 52)
    assert phase_2c.balloting.category_code == "SC<1"
    assert phase_2c.balloting.category_label == "SC within 1km needs to ballot"
    assert (phase_2c.balloting.applicants, phase_2c.balloting.vacancies) == (74, 52)

    phase_2b = by_phase["2B"]
    assert (phase_2b.vacancy, phase_2b.applied, phase_2b.taken) == (26, 27, 26)
    assert phase_2b.balloting.category_code == "SC1-2"
    assert (phase_2b.balloting.applicants, phase_2b.balloting.vacancies) == (6, 5)

    phase_1 = by_phase["1"]
    assert phase_1.balloting is None
    assert (phase_1.vacancy, phase_1.applied, phase_1.taken) == (150, 90, 90)

    # Phase "3" applied is "-" in the source, which is not a valid int
    phase_3 = by_phase["3"]
    assert phase_3.applied is None
