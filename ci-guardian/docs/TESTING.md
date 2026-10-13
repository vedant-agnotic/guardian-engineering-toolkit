# Test and acceptance plan

| Area | Cases | Release evidence |
| --- | --- | --- |
| Configuration | Duplicate keys, alias abuse, invalid argv, unknown fields, root traversal, symlink escape | Unit and filesystem tests |
| Runner | Pass, nonzero, missing executable, timeout, cancellation, noisy output, child processes | Real fixture executables |
| Selection | All checks, known/unknown ID, fail-fast, partial report | Full/partial semantics asserted |
| Reports | Atomic writes, write failure, stale report, secrets absent | Structured snapshots and filesystem failures |
| Generator | First write, preview, existing file, unconfigured pins, stable aggregate status | Golden files plus real GitHub fixture execution |
| PR safety | Fork PR, injection-like branch/title, no secrets, failed/skipped job | Isolated provider pilot |
| Git adapter | Detached checkout, shallow history, rebased head, empty range | Real Git histories and pinned CLI |
| Packaging | Actual npm tarball on minimum/current approved Node | CLI/preset assets included |

## Covered today (v0.1.0)

`npm test` runs 40 tests on Node's built-in runner:

- YAML: block and compact sequences, flow sequences, quoting, comments; rejection of duplicate keys, anchors, aliases, tags, merge keys, flow mappings, block scalars, tabs, multiple documents, ambiguous booleans, oversized and deeply nested input.
- Configuration: both examples validate; required and unknown fields; ids, argv, timeouts, enums; `..` and absolute paths; missing project root; symlink escapes for `project.root` and `report.path`; reports inside `.git`; serialization round-trip.
- CLI: help, version, unknown commands and flags (exit 2), outside a Git repository, `init --defaults` and refusal to overwrite, non-TTY `init`, `validate` and `doctor` not executing checks, doctor missing executables.
- Runner: pass, nonzero exit, missing executable, timeout, failFast skips, partial `--check` runs, unknown id, arguments passed literally without a shell, `project.root` as working directory, commit SHA, atomic report without leftover temp files, report write failure (exit 2).
- Process control (POSIX): a timeout kills grandchildren; SIGINT cancels the running check, skips the rest, writes a `cancelled` report and exits 130.

Interactive `init` was verified manually through a pseudo-terminal, and a packed tarball was installed and run in a scratch consumer repository. Not covered: Windows, Linux CI, Node 22+, very noisy output, real React Native projects.

The documentation checker proves no CI behavior. Minimum v1 support is RN JS checks on Linux plus local execution on supported OSes after testing. iOS build checks require a separately tested macOS fixture. Do not infer provider success from YAML syntax alone.

A required gate must fail when any required check failed, timed out, was cancelled or was skipped. Test that rule explicitly, including report write failures. No deployment credential should appear in a PR job or its artifacts.
