# Architecture

CI Guardian is an orchestration layer around project-owned commands. The local runner and workflow generator consume the same validated model.

| Module | Responsibility |
| --- | --- |
| `src/config/` | Restricted YAML parse, typed schema and path validation |
| `src/presets/` | Explicit RN suggestions; generic profile without framework assumptions |
| `src/planner/` | Select checks; build immutable ordered execution plan |
| `src/runner/` | argv execution, timeouts, cancellation, normalized results |
| `src/reporters/` | Human summary and atomic JSON report |
| `src/providers/github/` | Workflow rendering, stable status names, explicit inputs |
| `src/integrations/git-guardian/` | Later CLI adapter for branch/range policies |
| `src/commands/` | init/validate/doctor/run/generate dispatch |

Execution: config → semantic validation → plan → sequential child processes → per-check results → aggregate report → exit. Validation never executes checks. Doctor may inspect executable resolution and filesystem state, but must not run arbitrary check scripts.

Represent a command as `{ executable, args, cwd, timeoutSeconds }`, not shell text. On Windows, implement and test executable resolution without allowing untrusted strings to become cmd.exe source. Run child processes with bounded output handling, report backpressure and process-tree cancellation.

Workflow generation: validated model + explicit provider/toolchain inputs → rendered bytes → syntax/static checks → preview → atomic new-file write. The generator cannot silently amend existing CI or host settings. Separate generated workflow ownership from project-owned check scripts.

Reports are operational evidence, not signed attestations. Release Guardian cannot accept an arbitrary local report as proof of trusted CI; it needs provider verification tied to an exact commit. The packages are independently usable and independently versioned.
