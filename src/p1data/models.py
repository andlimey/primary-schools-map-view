from dataclasses import dataclass


@dataclass(frozen=True)
class PhaseHeader:
    order: int
    raw_label: str
    code: str


@dataclass(frozen=True)
class BallotingDetail:
    category_code: str | None
    category_label: str | None
    applicants: int | None
    vacancies: int | None


@dataclass(frozen=True)
class SchoolBlock:
    display_name: str
    slug: str
    planning_area: str | None
    vacancy_row: object
    applied_row: object
    taken_row: object


@dataclass(frozen=True)
class PhaseRecord:
    year: int
    school_slug: str
    phase_label: str
    phase_code: str
    phase_order: int
    vacancy: int | None
    applied: int | None
    taken: int | None
    balloting: BallotingDetail | None


@dataclass(frozen=True)
class GeocodeResult:
    latitude: float
    longitude: float
    source: str          # 'postal_code' | 'address'
    confidence: float | None


@dataclass(frozen=True)
class GeocodeFailure:
    reason: str           # 'not_found' | 'ambiguous' | 'out_of_bounds'
    candidates: list[dict]
