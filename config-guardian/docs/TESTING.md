# Testing and acceptance

No Config Guardian runtime tests exist or have run. The schema/example is validated as a documentation artifact; operational support awaits implementation evidence.

| Area | Acceptance cases |
| --- | --- |
| Schema/semantics | Unknown/duplicate keys, wrong types, duplicate IDs/schemes/flavors, incomplete platforms, malformed paths |
| Discovery | One/multiple projects, target ambiguity, absent platform, monorepo app root |
| Plan | No native writes, stable diff, full dependency hash set, conflicts, environment filtering with global collision checks |
| Apply | Idempotency, stale config/input, partial failure, concurrent edits, journal recovery, fresh clone ownership |
| iOS | Shared scheme, Debug/Release selection, bundle/display name, icon, base xcconfig/CocoaPods preservation |
| Android | Groovy/Kotlin fixtures, flavor dimension, debug/release variants, ID/resource selection, dependency matching |
| RN runtime | Inspect actual bundle values for every profile/mode; no cross-environment cache leakage |
| Integration | Distinct apps install side by side; chosen backend and icon/name verified |
| Distribution | Packed CLI, templates/schema included, minimum Node, macOS + Android build environment |

Pilot one simple RN app with both platforms and then a differently structured existing project. Run native builds after generating, not only parser snapshots. Unsupported multiple targets/extensions/dimensions must fail without mutation. App signing and store upload are separate Release Guardian tests.
