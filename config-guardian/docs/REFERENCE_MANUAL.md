# Config Guardian reference manual

Status: proposed v1 command and configuration contract. The included JSON schema validates structure; native adapters and semantic validators remain to be implemented.

## Commands and effects

| Command | Purpose | Writes |
| --- | --- | --- |
| `init` | Interactive config preview and creation; refuse existing file | New .config-guardian.yml only |
| `inspect` | List discovered platforms, targets, schemes, configurations and flavors | None |
| `add <environment>` | Prompt for a new profile; preview then add it | Central config only |
| `validate` | Strict structural and cross-field checks | None |
| `plan [--environment <name>]` | Diff supported native changes; omit filter for all profiles | .config-guardian/plan.json only |
| `apply --plan <path>` | Verify saved hashes; apply only reviewed edits | Planned native/generated files and local ownership journal |
| `doctor` | Report missing tools/resources and configuration drift | None; no native builds |
| `resolve --environment <name> --platform <ios-or-android> --mode <debug-or-release>` | Emit machine-readable build selection | None; JSON stdout |
| `--help`, `--version` | Usage and package version | None |

Unknown options/fields fail. No force overwrite, automatic secret lookup or build/deploy command. Commands run from within the Git repo and discover root config. Apply requires a clean tracked worktree after the config is committed, refuses unrelated untracked collisions, and checks every input hash immediately before writing. A plan filter must still check global name/identifier collisions across all environments.

## Configuration

Path: `.config-guardian.yml` at Git root. See the [example](../examples/config-guardian.example.yml) and [schema](../schemas/config-guardian.schema.json).

| Field | Requirement |
| --- | --- |
| version | Exactly 1, independent of package version |
| project.framework | react-native in initial v1 |
| project.root | Repository-relative app root; . allowed |
| project.ios | Optional selected iOS project and app target |
| project.ios.project | App-root-relative .xcodeproj path |
| project.ios.target | Exact app target; never guess first target |
| project.android | Optional Android projectDir, module, gradleDsl and flavorDimension |
| project.android.projectDir | App-root-relative Gradle project directory |
| project.android.module | App module name |
| project.android.gradleDsl | groovy or kotlin; declared choice still requires a tested adapter |
| project.android.flavorDimension | Single environment dimension name |
| environments | Nonempty mapping with lowercase names |
| environments.<name>.appName | Display name; required |
| environments.<name>.publicValues | String-valued mapping with uppercase variable names; empty allowed |
| environments.<name>.ios.scheme | Unique shared scheme name |
| environments.<name>.ios.bundleId | App bundle identifier; unique among environments |
| environments.<name>.ios.configurations.debug/release | Explicit unique native build configuration names |
| environments.<name>.ios.iconAsset | Existing validated asset catalog icon set |
| environments.<name>.android.flavor | Unique lower-camel-case flavor name |
| environments.<name>.android.applicationId | Explicit ID, unique among environments |
| environments.<name>.android.iconResource | Existing @mipmap/... reference |

At least one platform must be configured. Every environment must contain exactly the platform blocks selected by project. Saved configs have no hidden field defaults. Names/path constraints must be validated before writing; YAML duplicate keys, custom tags and unsupported structures are rejected. Paths resolve within the repository with no symlink escape.

Cross-platform ID strings may differ, but each profile must map intentionally to both selected apps. Schema regexes are only structural filters; use native tooling checks for actual identifier validity. Shared names within unrelated projects do not conflict.

The JSON schema cannot prove filesystem existence, target type, identifier uniqueness across mapping values, platform-block consistency or native compatibility. Those are explicit semantic validator responsibilities.

## Native mapping

| Central concept | iOS | Android |
| --- | --- | --- |
| Environment | Shared scheme plus explicit build configurations | Product flavor in environment dimension |
| Debug mode | Debug-derived configuration; scheme Run/Test defaults | debug build type |
| Release mode | Release-derived configuration; scheme Archive/Profile defaults | release build type |
| App identity | PRODUCT_BUNDLE_IDENTIFIER and display-name integration | applicationId and generated resources |
| Icons | Valid existing asset reference selected by build setting | Valid resource selected through manifest/resource mapping |
| Public values | Generated config + explicit RN runtime bridge | Generated config + explicit RN runtime bridge |

For staging, sample mapping is Example-Staging / Debug-Staging or Release-Staging; Android is stagingDebug or stagingRelease. Preserve inherited project settings and CocoaPods base xcconfig links; do not sever dependency configuration while adding environment overrides.

## Plan/ownership protocol

Plan schema version 1 contains tool/adapter versions, source commit, central config SHA-256, environment filter, all read input paths+hashes, intended output paths+before hashes+after hashes, readable diffs and unsupported/conflict entries. Missing files have an explicit absent state, not a made-up hash.

Apply rejects a different repo/commit/config, changed input or destination, duplicate path, symlink escape, unsupported adapter or unresolved conflict. Journal backups before mutation, stage outputs, atomically replace individual files and rollback only owned changes if a later step fails. Multi-file atomicity must not be claimed from individual renames. Preserve a recoverable journal for interruptions and never restore over a concurrent user edit.

A fresh clone has no local journal. Reconstruct deterministic ownership for generated files from marker plus expected bytes and require explicit review to adopt existing native edits. Local journals alone cannot be the only means of recognizing tracked generated output.

## Resolve output

JSON fields: schemaVersion=1, toolVersion, configHash, environment, platform, mode, appName, applicationId, publicValues, and build. iOS build has project/target/scheme/configuration; Android has projectDir/module/flavor/buildType/variant. Consumers reject unknown major schema versions and verify configHash. Resolve performs no signing or execution and does not certify that a native build succeeded.

## Exits and troubleshooting

0 = requested operation succeeded; 1 = validation/drift/conflict prevented completion; 2 = usage/config parse/runtime/unsupported-layout error; 130 = interrupted. No machine-readable success when checks were skipped.

| Symptom | Action |
| --- | --- |
| Existing scheme/flavor collision | Inspect ownership; rename or explicitly adopt in a reviewed implementation path |
| Stale plan | Regenerate after reviewing changed source/config; no force bypass |
| Missing native dependency settings | Verify CocoaPods base configs or Gradle integration; undo faulty generated edits |
| Both apps overwrite each other | Check resolved/binary identifiers, not just display names |
| JS uses wrong API endpoint | Inspect actual bundled runtime values and explicit RN integration |
| Icon not found | Supply correct existing resource/asset; creation is not implied |
| Multiple targets/flavor dimensions | Unsupported initial adapter; retain existing workflow |
| Doctor passes but build fails | Doctor is local inspection; run real native build fixture |
