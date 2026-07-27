## Context

The frontend (`frontend/src/App.tsx`) is a single Leaflet map component that fetches `/api/schools` once and fits the view to every school's bounds. There's no user-driven geocoding path anywhere in the app today. The only existing OneMap integration is [`src/p1data/onemap.py`](../../../src/p1data/onemap.py) + [`src/p1data/geocode.py`](../../../src/p1data/geocode.py), used exclusively by the offline `geocode-schools` batch job (auth token fetched once per script run, school-name-aware disambiguation, results cached to disk under `cache/geocode/`).

Two things were verified empirically before settling this design (not assumed from docs):

1. **OneMap's public search endpoint (`/api/common/elastic/search`) is CORS-open and doesn't reject anonymous requests outright** — but its behavior is inconsistent. Two demo queries came back clean with no auth needed. A third, deliberately-novel query came back with a full result set **and** `"error": "Authentication token missing. Please create an account and generate or renew your API Token."` in the same payload. The working theory is that common/cached queries are served from a CDN layer that skips the auth check, while cache-misses (which is what any real user's free-text search will always be) route through a path that nags for a token. That rules out calling OneMap directly from the browser — it's not a foundation to build on.
2. Passing a garbage `Authorization` header to a query that had previously succeeded still returned 200 — consistent with token validity not actually being checked on that path, reinforcing that anonymous access is a caching artifact, not a supported mode.

## Goals / Non-Goals

**Goals:**
- Let a user type a Singapore address or postal code, resolve ambiguity via a picklist, and have the map pan/zoom to guarantee at least a 3km-radius view of the chosen point.
- Keep OneMap credentials and tokens server-side only.
- Reuse the existing `onemap.search()` function rather than writing a second OneMap client.

**Non-Goals:**
- Filtering, ranking, or listing schools by distance from the searched point — this change only affects the map viewport, not what schools are shown or how.
- Changing the map rendering library (stays Leaflet) or the base tile source (stays OpenStreetMap) — considered and explicitly deferred; out of scope for this change.
- Changing the existing `geocode-schools` batch job or its school-name disambiguation logic — that logic is tailored to matching a known school name against building candidates and doesn't apply to free-form user queries.
- Rate-limiting or abuse protection for the new endpoint beyond what's noted as a risk below.

## Decisions

### Backend proxy, not a direct client-side OneMap call
A new `GET /api/geocode?q=<query>` endpoint on the existing FastAPI app proxies to `onemap.search()`. Rejected alternative: calling OneMap directly from the browser — looked viable given the open CORS header, until the cache-miss/soft-auth-gate behavior above showed it isn't reliable for arbitrary user input. The proxy also keeps OneMap credentials out of the client entirely and gives a seam for future caching or provider swaps.

### Autocomplete dropdown, not submit-and-take-first-result
Selecting a candidate from a listbox rather than blindly panning to OneMap's top result. Rejected alternative: submit-only. A single postal code search (`238823`) returned 5 differently-named buildings at that address; free-text queries are worse (`bishan` → 113 results across 12 pages). There's no school-name anchor to auto-disambiguate against here (unlike the batch job), so the user has to be the disambiguator.

- Client-side debounce (~300ms) and a minimum query length (2-3 chars) before firing a request, to avoid hammering the endpoint on every keystroke.
- In-flight requests are superseded by newer ones (e.g. `AbortController`) so a slow response to a stale keystroke can't overwrite a newer result set.

### Geocoding provider: OneMap (not Nominatim, Mapbox, or Google)
Considered and rejected:
- **Nominatim (OSM)** — free, keyless, thematically consistent with the existing OSM tile layer, but weaker on hyperlocal Singapore formats (exact postal codes, HDB block numbers, informal building names) and its public instance's usage policy (1 req/sec, real User-Agent, "no heavy use") is a poor fit for an autocomplete-shaped access pattern.
- **Mapbox Geocoding API** — genuinely competitive: static access token (no refresh lifecycle at all), 100k free requests/month with no credit card required, and its "Temporary Geocoding" tier (cheaper, disallows storing results) matches this feature's ephemeral use exactly. Deferred anyway because its precision on Singapore-specific address formats is unverified, and verifying it would require provisioning a new account/token for a dimension (accuracy) that OneMap already wins on structurally, being the authoritative SLA address index that the rest of this project's dataset was already geocoded against.
- **Google Geocoding API** — mandatory billing account (credit card required even for the 10k/month free tier, $5/1000 after), and Google's platform terms generally expect geocoding results to be displayed on a Google map, which sits awkwardly against this app's Leaflet/OSM stack.

### OneMap token lifecycle: lazy-fetch + in-memory cache, not fetch-per-request
The token is valid ~3 days ([`onemap.get_token`](../../../src/p1data/onemap.py) docstring). The proxy endpoint fetches it lazily on first use, holds it in memory (e.g. FastAPI app state), and only re-authenticates if a request comes back with an auth failure. Fetching a fresh token per request was the actual concern behind "OneMap requires a token that constantly refreshes" — that's a naive-implementation bug, not a property of OneMap itself, and this design avoids it.

`onemap.search()` is called with `cache_dir=None` for live queries — the existing on-disk cache under `cache/geocode/` is for the batch job's known school addresses; writing arbitrary user query strings there forever would be an unbounded leak with no benefit (these queries are never repeated intentionally the way school addresses are).

### Zoom mechanism: fixed 3km-radius bounding box via `fitBounds`, not a hardcoded zoom level
Given a selected candidate's lat/lng, compute:
```
latOffset = 3000 / 111_320
lngOffset = 3000 / (111_320 * cos(lat_in_radians))
box = [[lat - latOffset, lng - lngOffset], [lat + latOffset, lng + lngOffset]]
```
and call `map.fitBounds(box)`. This is a `PanToSearch` component mirroring the existing `FitToSchools` pattern (a `useMap()` effect keyed on the searched location). A fixed box guarantees the 3km disc is never cropped regardless of container size/aspect ratio, without needing to guess a zoom integer per device. Longitude offset must account for degree-length shrinking away from the equator (not needed much at Singapore's ~1.35°N, but correct regardless).

A distinct marker (different icon/style from school pins) is dropped at the searched point so there's a visible anchor even when no school happens to be nearby.

## Risks / Trade-offs

- **[Risk]** OneMap's anonymous-access behavior is undocumented and inconsistent (cache-hit vs cache-miss paths) → **Mitigation**: always authenticate server-side with a real token; never rely on the anonymous path even opportunistically.
- **[Risk]** Cached token expires mid-session (~3 days) → **Mitigation**: catch auth failures from OneMap, refresh once, retry the request.
- **[Risk]** `/api/geocode` has no rate limiting of its own; public traffic could burn through the OneMap account's usage allowance → **Mitigation**: none in this change — noted as a known limitation given this app's expected traffic level; revisit if it becomes a real problem.
- **[Risk]** Short/broad queries can return large result sets (e.g. 113 results, 12 pages, for "bishan") → **Mitigation**: cap displayed candidates to a reasonable top-N; OneMap's own relevance ordering is used as-is (no re-ranking).
- **[Risk]** Debounced requests can resolve out of order → **Mitigation**: abort/ignore stale in-flight requests keyed to the latest query.

## Open Questions

- Does clearing the search revert the map to the whole-Singapore `FitToSchools` view, or just leave the map where the user left it? Low-stakes, can be decided during implementation.
- Exact debounce interval and minimum query length — starting point ~300ms / 2-3 characters, tune based on feel.
- Whether to draw a visual 3km radius circle around the searched point as a reference — a nice-to-have, not required by the proposal.
