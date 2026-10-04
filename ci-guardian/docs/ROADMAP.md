# Delivery roadmap

| Milestone | Deliverable | Acceptance |
| --- | --- | --- |
| C1 | Schema, init, validate, doctor | Example configs and invalid cases verified |
| C2 | Sequential runner and reports | Timeout/cancellation/full vs partial semantics pass |
| C3 | GitHub workflow generation | Real pilot PR; stable required check; safe existing-workflow behavior |
| C4 | Optional Git Guardian adapter | All selected PR commits and correct source branch verified |
| C5 | RN pilot and release packaging | Two contrasting consumer repos, actual tarball and docs |

Start after Git Guardian's validator interface stabilizes, but C1–C3 do not depend on it. Later: Flutter/native presets, graph-aware monorepos, parallel checks, other CI providers and coverage-policy plugins. A preset is supported only after a real fixture validates it.
