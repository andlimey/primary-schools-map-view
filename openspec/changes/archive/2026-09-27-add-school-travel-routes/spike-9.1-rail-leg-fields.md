# Spike 9.1 — what a OneMap transit leg carries to identify a rail line

Ran `onemap.route(..., "pt", ...)` for several cross-island / within-town pairs on 2026-09-07.

## Findings

| Service | `leg.mode` | `leg.route` | also on the leg |
|---|---|---|---|
| MRT (East-West Line) | `SUBWAY` | `"EW"` | `routeShortName: "EW"`, `routeLongName: "EAST WEST LINE"`, `routeType: 1`, `agencyName: "SMRT Corporation"` |
| LRT (Bukit Panjang) | `TRAM` | `"BP"` | `routeShortName: "BP"`, `routeLongName: "BUKIT PANJANG LRT SYSTEM"`, `routeType: 0` |
| Bus (service 38) | `BUS` | `"38"` | `routeShortName: "38"`, `routeLongName: "GAS BUS 38"`, `routeType: 3` |
| Walk | `WALK` | `""` (empty string) | no `routeShortName` / `routeLongName` |

## Conclusions for `routeColors.ts` (task 9.2)

- **MRT lines are `mode === "SUBWAY"`, LRT lines are `mode === "TRAM"`.** Both carry the line code in `leg.route`.
- **Line codes seen / expected:** `NS` `EW` `NE` `CC` `DT` `TE` (MRT), plus `CG` (Changi branch, colour as EW) and `CE` (Circle extension, colour as CC); `BP` `SW` `SE` `STC` `PW` `PE` `PTC` (LRT, all grey). `JS`/`JW`/`JE` (Jurong Region Line) not yet operational — map to a teal when they appear, harmless if never hit.
- **Bus is `mode === "BUS"`**, `leg.route` is the public service number — one bus colour regardless.
- **Walk is `mode === "WALK"`**, `leg.route` is `""` → treat empty as no line.
- Backend already passes `leg.mode` (uppercased) and `leg.route` (`… or None`) straight through in the `RouteLeg` payload, so no backend change is needed.

The mapping in `legStyle` should key on `mode` first (WALK / BUS / SUBWAY|TRAM), then on `route` for the rail line colour, with a neutral grey fallback for any unrecognised rail code.
