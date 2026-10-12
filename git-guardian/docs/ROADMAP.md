# Roadmap from v0.1.1

| Priority | Work | Acceptance |
| --- | --- | --- |
| G1 | Safe ownership/install/uninstall and force behavior | Preserve changed hooks/backups; recover partial installation |
| G2 | Strict config and exact validation semantics | Invalid/unknown types fail; examples/suggestions validate; length defined |
| G3 | Reference-hook compatibility and diagnostics | Real Git/OS matrix; unborn cases; doctor strict-mode proposal |
| G4 | Clear branch allowlist versus protection | Distinct documented policy; optional pre-commit checks reviewed |
| G5 | CI range checks and migration | All PR commits, explicit source branch, versioned config migration |
| G3a | Faster hooks | Shell wrappers skip irrelevant reference-transaction states and refs without starting Node; commit overhead well below today's ~0.3 s |
| G6 | Release hardening | Locked dev toolchain, packed consumer smoke tests and verified registry ownership |

CLI validators, init, hook wrappers, backup/chaining and branch helpers already exist. Do not restart these modules from the superseded JSON draft. Add future presets, ticket integrations, monorepo behavior and standalone distribution only after the first reliability gates.
