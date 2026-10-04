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

The documentation checker proves no CI behavior. Minimum v1 support is RN JS checks on Linux plus local execution on supported OSes after testing. iOS build checks require a separately tested macOS fixture. Do not infer provider success from YAML syntax alone.

A required gate must fail when any required check failed, timed out, was cancelled or was skipped. Test that rule explicitly, including report write failures. No deployment credential should appear in a PR job or its artifacts.
