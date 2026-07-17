import logging
import re
from collections.abc import Iterator

from bs4 import BeautifulSoup, Tag

from p1scraper.models import BallotingDetail, PhaseHeader, PhaseRecord, SchoolBlock
from p1scraper.normalize import normalize_phase_code

log = logging.getLogger(__name__)

_SCHOOL_LINK_RE = re.compile(r"^/school/")
_APPLICANTS_RE = re.compile(r"Applicants:\s*([\d,]+)")
_VACANCIES_RE = re.compile(r"Vacancies:\s*([\d,]+)")


class ParseError(Exception):
    pass


def _normalize_row_label(text: str) -> str:
    """'↳ Vacancy (210)' -> 'Vacancy', '↳ Applied' -> 'Applied', '↳ Taken' -> 'Taken'."""
    text = text.replace("↳", "").strip()
    return re.sub(r"\s*\(\d+\)\s*$", "", text)


def locate_primary_table(html: str) -> Tag:
    soup = BeautifulSoup(html, "lxml")
    for table in soup.find_all("table"):
        labels = {_normalize_row_label(el.get_text(strip=True)) for el in table.find_all("td")}
        if {"Vacancy", "Applied", "Taken"} <= labels:
            return table
    raise ParseError("Could not locate the P1 admissions table in page")


def parse_phase_headers(table: Tag) -> list[PhaseHeader]:
    header_row = table.find("tr")
    if header_row is None:
        raise ParseError("Table has no header row")
    ths = header_row.find_all("th")
    headers = []
    for i, th in enumerate(ths[1:], start=1):  # skip col 0 = school name column
        raw_label = th.get_text(strip=True)
        headers.append(PhaseHeader(order=i, raw_label=raw_label, code=normalize_phase_code(raw_label)))
    if not headers:
        raise ParseError("No phase headers found in table")
    return headers


def iter_school_blocks(table: Tag) -> Iterator[SchoolBlock]:
    rows = table.find_all("tr")
    i = 0
    while i < len(rows):
        link = rows[i].find("a", href=_SCHOOL_LINK_RE)
        if link is not None and i + 3 < len(rows):
            vacancy_row, applied_row, taken_row = rows[i + 1], rows[i + 2], rows[i + 3]

            def _first_cell_text(row: Tag) -> str:
                td = row.find("td")
                return _normalize_row_label(td.get_text(strip=True)) if td else ""

            if not (
                _first_cell_text(vacancy_row) == "Vacancy"
                and _first_cell_text(applied_row) == "Applied"
                and _first_cell_text(taken_row) == "Taken"
            ):
                log.warning("Unexpected row layout after school link %r, skipping block", link.get("href"))
                i += 1
                continue

            slug = link["href"].strip("/").split("/")[-1]
            yield SchoolBlock(
                display_name=link.get_text(strip=True),
                slug=slug,
                planning_area=rows[i].get("data-area") or link.get("data-area"),
                vacancy_row=vacancy_row,
                applied_row=applied_row,
                taken_row=taken_row,
            )
            i += 4
        else:
            i += 1


def extract_int(cell: Tag) -> int | None:
    """Take text before the first <br>, strip commas."""
    first_line = cell.get_text(separator="|", strip=True).split("|")[0].replace(",", "")
    return int(first_line) if first_line.lstrip("-").isdigit() else None


def parse_taken_cell(cell: Tag) -> tuple[int | None, BallotingDetail | None]:
    taken = extract_int(cell)
    tt = cell.find("span", class_="tt")
    if tt is None:
        return taken, None

    raw_tooltip = tt.get("data-tt", "")
    category_code = tt.get("data-tt-title")
    lines = raw_tooltip.split("\n")
    category_label = lines[0].strip() if lines and lines[0].strip() else None

    def _int(rx: re.Pattern) -> int | None:
        m = rx.search(raw_tooltip)
        return int(m.group(1).replace(",", "")) if m else None

    return taken, BallotingDetail(
        category_code=category_code,
        category_label=category_label,
        applicants=_int(_APPLICANTS_RE),
        vacancies=_int(_VACANCIES_RE),
    )


def build_phase_records(year: int, headers: list[PhaseHeader], blocks: Iterator[SchoolBlock]) -> list[PhaseRecord]:
    records = []
    for block in blocks:
        vac_cells = block.vacancy_row.find_all("td")[1:]
        app_cells = block.applied_row.find_all("td")[1:]
        take_cells = block.taken_row.find_all("td")[1:]
        if not (len(vac_cells) == len(app_cells) == len(take_cells) == len(headers)):
            log.warning(
                "Column count mismatch for %s in %s (headers=%d vacancy=%d applied=%d taken=%d), skipping",
                block.slug, year, len(headers), len(vac_cells), len(app_cells), len(take_cells),
            )
            continue
        for h, vc, ac, tc in zip(headers, vac_cells, app_cells, take_cells):
            taken, balloting = parse_taken_cell(tc)
            records.append(
                PhaseRecord(
                    year=year,
                    school_slug=block.slug,
                    phase_label=h.raw_label,
                    phase_code=h.code,
                    phase_order=h.order,
                    vacancy=extract_int(vc),
                    applied=extract_int(ac),
                    taken=taken,
                    balloting=balloting,
                )
            )
    return records


def parse_year_page(year: int, html: str) -> tuple[list[PhaseRecord], list[SchoolBlock]]:
    table = locate_primary_table(html)
    headers = parse_phase_headers(table)
    blocks = list(iter_school_blocks(table))
    records = build_phase_records(year, headers, blocks)
    return records, blocks
