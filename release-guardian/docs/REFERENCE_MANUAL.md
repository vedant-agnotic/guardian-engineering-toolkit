# Release Guardian reference manual

> Proposed v1 contract; all release commands remain unimplemented in this scaffold.

## Commands

| Invocation | Behavior | External writes |
| --- | --- | --- |
| `init` | Interactive config selection and preview; refuse existing config | None |
| `validate` | Strict structural/semantic validation of YAML | None |
| `doctor` | Local tools, paths, identifiers and credential references | None; no provider calls |
| `plan <ios\|android> --build-number <value>` | Show stages, commit, target and prerequisites | None |
| `deploy <ios\|android> --build-number <value> --dry-run` | Same plan plus local preflight | None; no network/build/sign/upload |
| `deploy <ios\|android> --build-number <value>` | Trusted-runner preflight, build, sign and upload | Store upload/internal delivery |
| `--help`, `--version` | Help/version | None |

Only these flags are defined. No `--force`, automatic production destination, `--skip-ci`, implicit build number or unverified resume option exists. Actual deploy in v1 requires GitHub Actions trusted execution context, allowed branch and a verified commit; local deployment is deferred. Local plan may report unresolved provider prerequisites without claiming deploy readiness.

## Common configuration

File `.releaseguardian.yml` at Git root. No executable YAML tags, duplicate keys or unknown fields. Version 1, project/provider/environment/release and at least one platform object are required. Init does not hide unresolved values behind defaults.

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | integer | Exactly 1 |
| `project.framework` | enum | `react-native` only in first v1 |
| `project.root` | relative path | Root of app within repository, realpath must stay inside repo |
| `provider` | enum | `github-actions` |
| `environment` | string | Protected consumer environment; example `internal` |
| `release.allowedBranches` | nonempty string list | Exact trusted branches; main is example, not universal assumption |
| `release.requireCleanTree` | boolean | Must be true for v1 deploy |
| `release.requireCi` | boolean | Must be true for v1 deploy |
| `release.ciCheckName` | nonempty string | Required full CI status on exact source SHA |

No loose override precedence: committed config defines policy; platform and build number are the only deploy CLI inputs; credential values come from variables named in config. Missing credentials fail real deploy. Dry-run reports missing credentials without requesting secret values; malformed config still fails.

## Platform fields

| iOS field | Rule |
| --- | --- |
| `workspace` | Repository-app-root-relative `.xcworkspace` path; required |
| `scheme` | Explicit shared scheme, required |
| `bundleId`, `teamId` | Explicit app/team identifiers, required |
| `destination` | Exactly `testflight` |
| `signing` | Exactly `existing-assets` in v1; no automatic certificate creation |
| `credentials` | All iOS environment-name fields below required |

| Android field | Rule |
| --- | --- |
| `projectDir` | App-root-relative Gradle project path |
| `applicationId` | Expected identifier of produced application |
| `module` | Explicit Gradle module, example `app` |
| `variant` | Explicit supported build variant; first pilot `release` |
| `destination` | Exactly `play-internal` |
| `credentials` | All Android environment-name fields below required |

Flavors/extensions/multiple signing profiles require adapter work and tests before support. A string field does not imply arbitrary variants are already supported. All config-relative paths must stay in the repository. Credential file paths come from env and may point to private runner temp files outside it; validate those separately and never copy them into the repo.

## Credential references

| Config key under platform credentials | Example env name | Value supplied at runtime |
| --- | --- | --- |
| iOS `keyIdEnv` | ASC_KEY_ID | App Store Connect key ID |
| iOS `issuerIdEnv` | ASC_ISSUER_ID | Issuer ID |
| iOS `privateKeyPathEnv` | ASC_PRIVATE_KEY_PATH | Private temporary API-key file path |
| iOS `certificatePathEnv` | IOS_CERTIFICATE_PATH | Exported signing certificate/private-key file path |
| iOS `certificatePasswordEnv` | IOS_CERTIFICATE_PASSWORD | Signing archive password |
| iOS `profilePathEnv` | IOS_PROFILE_PATH | Provisioning profile path |
| Android `serviceAccountPathEnv` | PLAY_SERVICE_ACCOUNT_PATH | Service-account credential file path |
| Android `keystorePathEnv` | ANDROID_KEYSTORE_PATH | Upload keystore path |
| Android `keystorePasswordEnv` | ANDROID_KEYSTORE_PASSWORD | Keystore password |
| Android `keyAliasEnv` | ANDROID_KEY_ALIAS | Upload key alias |
| Android `keyPasswordEnv` | ANDROID_KEY_PASSWORD | Key password |

Environment-name values must match `[A-Z_][A-Z0-9_]*`; secret values never belong in config. Availability/format checks do not prove provider permissions. GitHub credentials used to verify checks must be separately scoped to read the necessary workflow/check metadata.

## Build identity

The input build number is explicit and platform-validated. Android uses a valid versionCode; iOS maps to a valid CFBundleVersion. Platform-specific validity and store uniqueness are checked before upload. Marketing version/versionName stays project-owned in v1; no semantic version bump or release notes are generated.

Apply version changes in the isolated build workspace and never commit them. Capture source SHA, package version, workflow revision, config hash, platform, application ID, marketing version, build number, artifact hash and provider response ID. No secret material goes into this record.

## Deployment states and exits

Stages: validated → authorized → built → signed → uploaded → processing → available. A failure may occur at any stage. `uploaded` means provider accepted the submission; `processing` and `available` are separate observations, and v1 may end with availability unconfirmed.

0 = requested operation completed (for real deploy, upload accepted, not guaranteed tester availability); 1 = build/sign/upload/provider failure; 2 = usage/config/runtime/policy/preflight refusal; 130 = cancelled. A timeout after upload may leave outcome unknown. Record `uploadState: unknown` and return failure; never automatically replay the upload.

Output under `.guardian/release/<platform>/<build-number>/report.json`. Report fields: schemaVersion, runId, sourceSha, configHash, packageVersion, workflowRevision, appId, platform, marketingVersion, buildNumber, artifactSha256, stage, status, uploadState, providerId (nullable), startedAt, finishedAt, sanitized error (nullable). `uploadState` is not-attempted/accepted/rejected/unknown; status is succeeded/failed/cancelled. Report success requires an accepted upload. Logs and retention must exclude credentials.

## Troubleshooting

| Symptom | Check | Recovery |
| --- | --- | --- |
| Workspace/scheme missing | Paths, checkout, shared scheme | Correct config and committed scheme |
| Signing fails | Certificate expiry, private key, team, profile, entitlements | Replace matching assets and rerun from preflight |
| Store denies upload | App ID, access, agreement or credential status | Resolve in store; do not log tokens |
| Duplicate build | Provider already has this build | Reconcile previous attempt before choosing a new build |
| Upload accepted, not visible | Provider processing/compliance/tester status | Inspect store; do not claim rollback or retry blindly |
| CI verification refused | Wrong SHA/check name or insufficient permission | Verify exact reviewed commit and required check |
| Concurrent run blocked | Same app/platform/track active | Wait; avoid cancellation during upload |
| Flutter/native selected | Unsupported v1 adapter | Use existing project pipeline pending adapter implementation |
