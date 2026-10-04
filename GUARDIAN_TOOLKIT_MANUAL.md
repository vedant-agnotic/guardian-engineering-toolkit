# Guardian Engineering Toolkit — reference manual

Version 0.1.0-draft · 2 October 2026 · Owner: Vedant Chandresh Shirke

## 1. What this delivery contains

Three self-contained documentation projects for building and using the proposed packages. Git Guardian includes the supplied v0.1.1 source, compiled CLI and tests with updated documentation. CI Guardian and Release Guardian remain private documentation scaffolds, and their commands are proposed. No package was published and no workflow was deployed.

Git Guardian commands describe v0.1.1; treat CI Guardian and Release Guardian commands as target interfaces. Use verified local package artifacts when implementation exists; do not install a similarly named public package based on this document. Registry names and repository ownership require verification before publication. Git Guardian includes its MIT license; CI/Release licenses remain open.

## 2. Which package owns which problem?

| Situation | Owner | Boundary |
| --- | --- | --- |
| Reject an incorrectly named branch when created | Git Guardian | Native reference hook when invoked; not universal GUI/orphan interception |
| Enforce commit subject format | Git Guardian | Subject only, no full changelog parser |
| Run lint/typecheck/test consistently | CI Guardian | Calls existing tools; does not create tests |
| Generate a reviewable PR workflow | CI Guardian | GitHub Actions first; host rules configured separately |
| Require checks before a merge | Git host rules + CI Guardian | Local hooks cannot enforce this remotely |
| Build/sign an iOS or Android app | Release Guardian | Coordinates existing toolchains and assets |
| Upload to TestFlight or Play Internal | Release Guardian | Upload acceptance differs from tester availability |
| Release a website or deploy an API | Outside current v1 scope | Keep the existing deployment workflow |
| Scan secrets, verify tickets, auto-fix code | Deferred or separate tools | Do not infer these capabilities from package names |

A team can adopt any package alone. CI Guardian may invoke a pinned Git Guardian executable; Release Guardian verifies trusted CI on the exact source commit but does not require CI Guardian specifically. If another CI system produces the required trusted check, its contract must be explicitly verified.

## 3. Shared conventions

Proposed implementation language: TypeScript. Git Guardian v0.1.1 declares Node 20+; CI/Release propose Node 22+. Package distribution: compiled JavaScript through a verified npm identity, with independent semantic versions. Native or Python consumer projects still need the CLI runtime; they do not need to convert their application to JavaScript.

Configuration is committed data. Git Guardian v0.1.1 uses `.git-guardian.yml`; CI Guardian uses `.ciguardian.yml`; Release Guardian uses `.releaseguardian.yml`. Each uses configuration schema version 1, separate from package version. CI/Release propose strict unknown-field rejection. Git Guardian v0.1.1 ignores unknown keys and falls back to defaults for wrong types; hardening is documented. Configuration changes require review.

No install-time prompts or automatic Git mutation from npm lifecycle scripts. Setup is explicit. CI/Release propose preview and preservation contracts; Git Guardian currently uses backup/chaining with known overwrite risks described in its manual. No package stages/commits files for the user. Credentials are never written to tracked configuration.

Keep CLI error messages actionable: what failed, where the rule came from, expected example and next action. Avoid success exits for missing checks or unimplemented behavior. Documentation status changes only after implementation evidence exists.

## 4. Quick command reference

Git Guardian commands below exist in v0.1.1; CI/Release commands remain proposed.

| Package | First setup | Inspect | Routine work |
| --- | --- | --- | --- |
| Git Guardian | `git-guardian init` | `git-guardian doctor` | Native Git branch/commit commands; explicit validators for CI |
| CI Guardian | `ci-guardian init` | `ci-guardian validate`, `ci-guardian doctor` | `ci-guardian run` |
| Release Guardian | `release-guardian init` | `release-guardian validate`, `release-guardian doctor` | `release-guardian plan ios --build-number 1001` |

Git Guardian activates each developer clone using `install`; other packages do not install Git hooks. CI workflow generation previews by default; add `--write` only after review. Release deploy is a separate external-write operation in a trusted workflow; plan and dry-run cannot upload anything.

Exit-code differences matter: Git Guardian uses 0/1 and may return 0 with doctor/config warnings. CI/Release propose 0 for success, 2 for setup/usage/config problems and 1 for execution failures. CI/Release reserve 130 for cancellation. A Release success means upload acceptance, not confirmed tester availability.

## 5. Adopt in an existing project

### Step A — establish current behavior

Record existing hook manager, PR workflow/check names, test commands, signing process and delivery destinations. Confirm the current project builds and tests. Keep a known-good revision. This avoids mistaking existing failures for migration failures.

### Step B — Git conventions

Pick branch examples meaningful to the team, such as `feature/LERA-428-add-user-filter` or `fix/VEDAS-102-fix-student-search`. In v0.1.1, protected names are naming exemptions; direct-commit restrictions do not exist. Inspect existing Husky hooks and backups before installer chaining; answer n at the interactive install prompt to write config only. Test valid and invalid branch creation in a disposable clone, then onboard each developer.

### Step C — CI checks

List actual lint/type/test commands. Configure them explicitly and run the full set locally. Generate/merge the GitHub workflow after pinning real package/action identities and toolchains. Run new and old checks side by side for a pilot, then deliberately update required host statuses. Partial local runs are useful feedback but never a complete CI gate.

### Step D — internal delivery

Start with one RN iOS app. Select workspace, scheme, bundle/team, credentials by reference and TestFlight. Resolve provider accounts and signing assets outside the package. Protect the workflow environment, verify exact source SHA and required CI, then perform one authorized internal upload. Observe processing separately. Repeat Android only after the iOS path and cleanup are reliable.

### Step E — repeatability

Document app-specific differences as config only when the adapter supports them. If a project requires an untested flavor, extension or framework, report that gap rather than promising configurability. Pin package/workflow versions and upgrade through reviewed pilot runs.

## 6. Development reference

Each project includes the same document map:

| Document | Questions it answers |
| --- | --- |
| `Readme.md` | What is this package, what exists, and where do I start? |
| `docs/USAGE.md` | How will a consumer configure, use, upgrade and remove it? |
| `docs/REFERENCE_MANUAL.md` | Exact commands, flags, fields, exits, limitations and troubleshooting |
| `docs/ARCHITECTURE.md` | Modules, data flow, process boundaries and ownership |
| `docs/DEVELOPMENT.md` | Toolchain setup, contribution and package publication |
| `docs/TESTING.md` | What evidence is required before support/release claims? |
| `docs/ROADMAP.md` | Which milestones should be implemented first? |
| `docs/SECURITY.md` | Trust, credential handling and reporting boundaries |
| `docs/DECISIONS.md` | Existing direction, new proposals and open choices |
| `docs/SOURCES.md` | External documentation and provenance |

Release Guardian also has `docs/OPERATIONS.md` for release checks, uncertain uploads and credential rotation.

Run `python3 scripts/check_docs.py` inside any project now. This validates documents, not product behavior. Git Guardian already has build and test scripts; CI/Release need implementation before equivalent scripts can be added. Before a package release, install its real packed tarball in clean consumer fixtures and verify every advertised command.

## 7. Implementation roadmap

| Stage | Deliverable | Evidence before moving on |
| --- | --- | --- |
| 1 | Harden existing Git v0.1.1 validators | Strict config, suggestion and subject semantics |
| 2 | Verify existing native reference/message hooks | Real repo rejects invalid creation without creating the ref |
| 3 | Safe Git installation lifecycle | Conflicts/cancellation/uninstall preserve user data |
| 4 | CI runner and full/partial reports | Failure, timeout and cancellation cannot pass required gate |
| 5 | CI workflow generation | Real PR fixture; minimal permissions and stable required status |
| 6 | Release plans and iOS pilot | Exact SHA, real internal receipt, cleanup and identity evidence |
| 7 | Android pilot and second consumer | Real internal upload and duplicate/uncertain-result handling |
| 8 | Package release readiness | Verified identity, license, versioned docs and compatibility matrix |

This is the recommended sequence for one lead handling multiple projects. Build the smallest useful shared behavior first and avoid promising Flutter/native/production rollout before actual pilots. Dates and effort should be estimated after the first integration spikes, because account access, signing differences and runner environments materially affect the work.

## 8. Failure and recovery reference

| Failure | First check | Safe response |
| --- | --- | --- |
| Branch naming not enforced | Hook activation/client behavior | Run doctor; check effective hook; retain required CI |
| Existing hook manager conflict | Who owns effective hooks? | Config-only and manual integration |
| CI command missing | Tool installation and project root | Correct bootstrap/config; never skip silently |
| Required status stays pending | Workflow trigger/name/rules | Repair trigger coverage or update rules deliberately |
| Release preflight fails | Exact SHA, CI, branch, toolchain, credentials | Correct prerequisite before external writes |
| Upload response lost | Store app/version/build state | Reconcile; no automatic duplicate upload |
| Uploaded build defective | Store stage and tester exposure | Correct code and issue a new valid build; no automatic rollback |

Package reversion and application rollback are different. Pinning an earlier automation package does not remove a store build. Similarly uninstalling local hooks does not remove required GitHub rules.

## 9. Secrets and access

Git Guardian requires no accounts or secrets. CI quality checks should run without delivery credentials. Release credentials belong to protected environments or an approved vault and are materialized temporarily only in trusted jobs. An Apple upload API key does not replace signing assets; an Android service account does not replace the upload keystore.

Rotate credentials according to their provider-specific lifecycle. Validate replacements, update consumers and revoke old credentials when safe; suspected compromise requires prompt incident response. Do not assume replacing an Android keystore rotates the correct app-signing/upload identity. Use the Release Guardian operations runbook for ownership and reconciliation.

## 10. Decisions still open

Verify package names and potential branding conflicts; select registry scope and repository organization. Preserve the supplied Git Guardian MIT license; choose CI/Release licenses before publishing. Freeze tested Node/Git/toolchain versions before publishing. Confirm test applications, platform account access and a protected central workflow repository. Decide support ownership and release cadence.

The supplied Git Guardian v0.1.1 supersedes the early JSON/three-hook design for current usage. Its manual documents limitations and the environment-blocked integration tests. Release Guardian retains the earlier thin mobile-CD approach. CI Guardian's detailed product scope and the additional plan/report/schema contracts are proposals created for this documentation baseline, ready for implementation review.

## 11. Detailed manuals

- [Git Guardian manual](git-guardian/docs/REFERENCE_MANUAL.md)
- [CI Guardian manual](ci-guardian/docs/REFERENCE_MANUAL.md)
- [Release Guardian manual](release-guardian/docs/REFERENCE_MANUAL.md)
- [Release operations and rotation](release-guardian/docs/OPERATIONS.md)

Primary technical references: [Git hooks](https://git-scm.com/docs/githooks), [GitHub reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows), [Fastlane TestFlight](https://docs.fastlane.tools/actions/upload_to_testflight/), [Fastlane Play upload](https://docs.fastlane.tools/actions/upload_to_play_store/). Package-specific contracts are proposed design, not claims of existing third-party behavior.
