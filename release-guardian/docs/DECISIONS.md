# Decisions

| Decision | Status and rationale |
| --- | --- |
| Mobile CD CLI plus reusable GitHub workflows | Preserved earlier proposal; reduce per-project pipeline duplication |
| Thin orchestration over platform tools | Preserved proposal; no new CI engine |
| RN iOS first, then Android | Preserved proposed sequence; Flutter/native later |
| TestFlight and Play Internal only in v1 | Preserved proposal; production rollout deferred |
| YAML config and credential references | Preserved proposal; no secrets in source |
| Explicit plan/dry-run | New design detail; review exact intended release before external writes |
| Trusted GitHub-only deploy | New v1 constraint; local planning remains usable |
| Explicit build number and no automatic retry after uncertain upload | New contract; prevent duplicate/ambiguous releases |
| Existing signing assets for first iOS adapter | New implementation proposal; avoid certificate lifecycle automation initially |

Open before release: account owners and test apps; exact toolchain/pins; central workflow repository identity; Android signing integration contract for each pilot; provider lookup capability for duplicate reconciliation; concrete store processing observations; package name/license. None of these placeholders establish access to existing LERA accounts.
