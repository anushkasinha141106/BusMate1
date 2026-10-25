1. Work on branch cityflow/main. Dashboard 1 (BusMate_CampusSeat/) is frozen at git tag d1-baseline.
   No file under BusMate_CampusSeat/ may ever change, be added or be deleted.
2. Allowed paths: BusMate_CityFlow/**, BusMate_Hub/**, AGENTS.md, Makefile, scripts/guard_d1.py, scripts/guard_d1.sh.
   Root .gitignore is append-only.
3. Run `python scripts/guard_d1.py` before every commit. It must exit 0.
4. No number may appear in the UI, README or reports unless it was read from a JSON file written
   by a pipeline script. No hand-typed results.
5. Every pipeline run writes BusMate_CityFlow/outputs/run_<gitshort>_<confighash>/ with config copy,
   seeds, library versions and raw stdout, and adds a row to BusMate_CityFlow/outputs/LEDGER.csv.
6. Seeds are fixed. BusMate_CityFlow/config/cityflow.yaml is the single source of truth for costs,
   capacities, dates, seeds and corridor names. Scripts must not hard-code them.
7. Chronological splits only. Features for target hour t use data at or before t-1.
8. Never claim: measured Pune ridership, observed crowding, real PMPML improvement, emissions saved,
   WCAG compliance, or that the fixed plan is the real timetable. Do not claim that settings carry
   between the two dashboards unless both are served from the same origin.
   Banned words in UI and docs: proves, publishable, top 1%, sub-50 ms, guaranteed, A+.
9. If a check fails or an input is missing: STOP and report. Do not work around it.
10. Do only the current phase. Never start the next one.
11. Finish with the Phase Report (format at the bottom).
