# Test and acceptance plan

| Area | Required verification |
| --- | --- |
| Config | Missing/unknown fields, malformed YAML, duplicate keys, placeholders, unsupported framework/destination, path escapes |
| Plan/dry-run | No network, build, signing, store writes or credential value output |
| Authorization | Wrong branch, wrong SHA, missing/failed CI, fork event, missing approval/context all refused |
| iOS | Shared scheme, app/team match, valid/expired signing assets, signing failure cleanup, artifact metadata |
| Android | Module/variant, app ID, keystore mismatch, correct AAB, valid unique versionCode |
| Upload | Accepted/rejected/timeout-after-send, duplicate build, reconciliation before retry |
| State/report | No false tester-availability claim; interrupted run; report write/cleanup failure |
| Concurrency | Same app/platform/track serializes; active upload not auto-cancelled |
| Credentials | No values in logs/artifacts; private temp files removed on every termination path |
| Distribution | Packed CLI and pinned reusable workflow tested together in a consuming repo |

Mock provider responses for ordinary tests; use isolated test applications and approved internal tracks for end-to-end uploads. A live upload requires explicit authorization and credential provisioning; this documentation task performs none.

Release sequence: RN iOS fixture to actual TestFlight receipt → confirm processing manually → RN Android fixture to internal-track receipt → confirm availability → second consumer to test configurability. Freeze toolchain versions per tested release; test upgrades before changing runner images. Flutter/native support needs separate real fixtures.

No implementation or store tests have been executed in this scaffold. Passing its documentation checker does not establish deployment readiness.
