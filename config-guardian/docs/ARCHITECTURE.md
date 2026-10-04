# Architecture

| Proposed module | Responsibility |
| --- | --- |
| src/cli.ts | Argument parsing and exits |
| src/config/ | Restricted YAML, schema, semantic checks |
| src/discovery/ | Filesystem detection and explicit project selection |
| src/model/ | Canonical environment and resolved build types |
| src/adapters/ios/ | Structural project/scheme/xcconfig edits |
| src/adapters/android/ | Reviewed Groovy/Kotlin integration and flavor/resource generation |
| src/adapters/react-native/ | Explicit public-runtime-config wiring and bundle verification |
| src/planner/ | Pure diff creation, collision checks, hashes and deterministic outputs |
| src/apply/ | Input verification, write journal, staging and recovery |
| src/diagnostics/ | Drift and prerequisites |
| src/commands/ | Workflow orchestration |

Flow: inspect → select project → config → validate → normalized environment model → adapter plan → reviewed apply → doctor → consumer native builds. There is no dependency on another Guardian package.

Use parsers/structured edits for Xcode projects. Gradle is executable code and cannot generally be safely rewritten using regex replacements. Prefer a small reviewed inclusion point and generated supported flavor configuration; reject projects whose structure cannot be safely handled. Kotlin/Groovy are separate compatibility cases. Stable identifiers, ordering and formatting are part of idempotency.

Keep generated assets/configs separate from manually maintained files. Preserve Xcode base configuration relationships and account for CocoaPods mapping when named configs are added. A scheme alone cannot select all app-specific configuration correctly without mapped build settings. Android environment flavors and debug/release build types stay independent.

Initial icons refer to existing assets/resources; generation of image sets is out of scope. RN public-value integration must be explicit, mode/environment-specific, and checked in the actual bundle. No universal automatic mapping from native variables to JS is assumed.

Release Guardian should consume resolve's JSON contract. CI Guardian may run validate/doctor/build checks. This avoids two tools owning native configuration. Version adapters and resolved output separately from package releases when compatibility warrants it.
