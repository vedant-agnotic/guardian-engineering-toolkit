# Architecture

## Components

| Module | Responsibility |
| --- | --- |
| `src/config/` | YAML schema, identifiers and path/credential-reference validation |
| `src/planner/` | Immutable selected platform plan; no provider mutation |
| `src/adapters/react-native/` | Locate RN native projects and prepare app-specific inputs |
| `src/platforms/ios/` | Workspace/scheme, signing assets and Xcode/Fastlane coordination |
| `src/platforms/android/` | Gradle target, keystore, AAB metadata and Play coordination |
| `src/providers/github/` | Trusted event, source SHA, required check and environment integration |
| `src/providers/stores/` | Upload responses and reconciliation identifiers |
| `src/executor/` | Stage execution, subprocess safety, cancellation and cleanup |
| `src/reports/` | Sanitized run record and artifact identity |
| `workflows/` | Future central reusable workflow source and caller templates |

A future adapter interface separates `detect`, `validate`, `plan`, `build`, `inspectArtifact` and platform upload inputs. Keep framework detection advisory; ambiguous targets require explicit user selection. Do not turn every project into a custom adapter before the first RN pilot works.

## Trusted execution flow

Caller requests internal release → protected workflow resolves and checks exact source SHA → environment approval → locked toolchain and credential preparation → deploy preflight → isolated build/sign → verify app/version identity → upload → report → cleanup.

The package verifies provider context and required status; a local JSON CI report alone is insufficient. Repository rules and workflow review remain the trust boundary, since code can lie about its own checks. Protect central reusable workflow revisions and consumer configuration changes with review.

V1 uses explicit build numbers and serializes per app/platform/destination. Inspect store state before upload to detect duplicates. There is no distributed idempotency guarantee supplied by the stores: a network timeout can leave an accepted upload with no local receipt. Reconcile before any retry.

## Reusable workflow contract

Future required inputs: platform, source SHA, build number, environment, config path fixed to repo policy, and pinned toolkit version. Prefer fixed destination from policy over a free-form track input. Define each needed secret explicitly rather than forwarding every secret. Called jobs choose appropriate runner and declare the environment. Verify permissions and secrets behavior in an actual cross-repository pilot.

A tested release must tie CLI, workflow revision, adapter/toolchain matrix and schema versions together in its release manifest. Consumer workflow references use immutable revisions; do not publish examples with an invented organization or a floating main reference.

## Signing and cleanup

Use temporary iOS keychain/profile placement isolated to the runner; capture previous state and restore only changes owned by the run. Android setup supplies upload-key references to reviewed Gradle configuration. Avoid secrets in process arguments where logs/process listings could expose them. Always clean temporary credentials and keychain state after failure or cancellation, including partial setup.

No source commits, automatic production promotion or store rollback is part of v1. Provider upload behavior remains delegated to maintained platform tools; the toolkit reports exactly which step succeeded.
