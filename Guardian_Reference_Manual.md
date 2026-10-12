# Guardian Engineering Toolkit — complete reference manual

Documentation edition: 2 October 2026. Git Guardian: supplied v0.1.1. CI Guardian and Release Guardian: proposed v1 contracts.

This standalone edition includes the suite guide, usage and command/configuration manuals. Full development, architecture and test documentation is in the project archives.


---

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

- Git Guardian manual (`git-guardian/docs/REFERENCE_MANUAL.md` in project archive)
- CI Guardian manual (`ci-guardian/docs/REFERENCE_MANUAL.md` in project archive)
- Release Guardian manual (`release-guardian/docs/REFERENCE_MANUAL.md` in project archive)
- Release operations and rotation (`release-guardian/docs/OPERATIONS.md` in project archive)

Primary technical references: [Git hooks](https://git-scm.com/docs/githooks), [GitHub reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows), [Fastlane TestFlight](https://docs.fastlane.tools/actions/upload_to_testflight/), [Fastlane Play upload](https://docs.fastlane.tools/actions/upload_to_play_store/). Package-specific contracts are proposed design, not claims of existing third-party behavior.


---

# User guide — v0.1.1

## Setup

Use Node 20+ and Git 2.28+ as declared by the package. Start in a disposable ordinary Git repository and install a verified local tarball as shown in the Readme (`git-guardian/Readme.md` in project archive). This avoids relying on unverified public registry ownership.

Run `git-guardian init`. It asks three questions (branch name format, allowed types, commit message format) and whether hooks should be installed, showing an example after each answer. Press Enter to keep a default; an invalid format is explained and asked again. Answer `n` to write only configuration. `init --yes` writes defaults and installs without prompting. Non-TTY init also proceeds with defaults even without --yes; do not invoke it merely to inspect a repository.

An existing config causes init to fail unless `--force` is supplied. Avoid force during normal onboarding; it replaces policy and can also affect hook backups. Commit `.git-guardian.yml`. A colleague then installs dependencies and runs `git-guardian install`, followed by doctor. Hook activation is local to each clone.

## Choose conventions

Rules are written as readable formats, not regular expressions:

| Placeholder | Matches | Example |
| --- | --- | --- |
| `<type>` | one of the configured types | `feat` |
| `<number>` | digits | `123` |
| `<ticket>` | capital letters, hyphen, digits | `ABC-123` |
| `<scope>` | lowercase area of the code | `auth` |
| `<description>` | branches: lowercase words joined by hyphens; commits: any short text | `add-login` / `add login page` |

Everything else is literal text. Wrap optional parts in square brackets: `<type>[(<scope>)]: <description>` accepts both `feat(auth): add login` and `feat: add login`. Branch formats cannot contain spaces.

Defaults: branch format `<type>/<number>-<description>` (e.g. `feat/123-add-login`), commit format `<type>: <description>` (e.g. `feat: add login page`) and types `feat, chore, bugfix, task` for both. Other common setups:

| Convention | Format |
| --- | --- |
| Jira ticket in branch | `<type>/<ticket>-<description>` |
| Ticket optional | `<type>/[<ticket>-]<description>` |
| Conventional Commits with optional scope | `<type>[(<scope>)]: <description>` |
| Ticket before commit subject | `<ticket> <type>: <description>` |

Edit the generated YAML to change rules. Lists such as types and protected names are comma-separated strings, not YAML arrays. Run `git-guardian validate config`, then try a few names with `validate branch` and `validate commit`.

## Daily work

```bash
git switch -c feat/123-add-login
git-guardian validate branch feat/123-add-login
git-guardian validate commit -m 'feat: add login'
git-guardian branch suggest 'ABC-123 add login'   # → feat/123-add-login, ...
```

Native branch operations are checked when Git invokes the installed reference hook. The helper `git-guardian branch create feat/123-add-login --from develop` validates and runs `git switch -c`; it also switches the current branch.

On rejection, the message shows the format, what each placeholder means, an example and up to three suggestions. A suggestion may still contain a placeholder such as `<number>` when it could not be guessed from the input; replace it before use. Existing branches are not retroactively rejected by a pre-commit hook because this version has none.

The commit hook validates the message and does not rewrite it. Default Merge/Revert prefix exemptions are enabled; disable them in YAML if your policy needs checks on those subjects. These are prefix-based exemptions, not verification that Git generated the message.

## Existing hooks and Husky

The installer uses the effective hooks directory, including a configured core.hooksPath. It renames an existing target hook to `<hook>.git-guardian-original` and installs a wrapper. An executable original handler runs first; failure stops the chain. Reference-transaction stdin is captured and replayed for both handlers.

Inspect the effective hook files before and after installation. Compatibility with every Husky version/layout has not been proven. If another manager regenerates its hooks, Guardian may need deliberate reintegration. If both a hook and backup already exist, resolve the conflict manually; force may discard the previous backup. A shared global hooks directory can affect other repositories, so prefer repository-local ownership for a pilot.

## CI

Use the actual PR source branch from provider metadata:

```sh
./node_modules/.bin/git-guardian validate branch "$GITHUB_HEAD_REF"
```

Pass values as data, not interpolated shell source. Do not use plain `validate` as a strict branch gate: it warns on an invalid current branch without failing. Validate every intended commit separately using `validate commit --file <file>` until a range command exists. Git Guardian does not collect PR ranges or generate workflows in this version. Required host rules remain authoritative.

## Upgrade and remove

Upgrade a pinned artifact in a branch, inspect config changes, run validators and test hook behavior in a disposable clone. The current installer overwrites hooks carrying its marker without comparing content hashes; preserve local edits first.

Before uninstall, inspect both managed hooks and `.git-guardian-original` backups. Current uninstall restores backups even if another hook has appeared at the destination; preserve any user changes before running it. Then run `git-guardian uninstall` and remove the package dependency. Config remains available for deliberate removal. For limitations and future safety work see known limitations (`git-guardian/docs/KNOWN_LIMITATIONS.md` in project archive).


---

# Git Guardian reference manual — v0.1.1

This manual describes the supplied source, not the superseded JSON/three-hook draft.

## Commands

| Command | Behavior |
| --- | --- |
| `init [--yes|-y] [--force]` | Create YAML; prompt on TTY unless yes; optionally install hooks; force replaces config |
| `install [--force]` | Load config and install enabled hooks in effective directory |
| `uninstall` | Remove marked hooks and restore backups; inspect edits first |
| `doctor` | Load config; report Git version, effective hooks path, marker and executability |
| `validate` / `validate config` | Validate config; warn about invalid current branch |
| `validate branch [name]` | Fail for invalid explicit/current branch; explicit name required in detached HEAD |
| `validate commit --message <text>` / `-m` | Validate supplied message |
| `validate commit --file <path>` / `-f` | Read UTF-8 file and validate; file takes precedence when both given |
| `branch create <name> [--from <ref>]` | Validate, reject existing branch, then run git switch -c |
| `branch suggest <description>` | Print candidate names; does not create anything |
| `hook commit-msg <file>` | Internal message-hook entry point |
| `hook reference-transaction <state>` | Internal ref hook; reads stdin |
| `help`, `--help`, `-h` | Usage |
| `version`, `--version`, `-v` | Package version |

Exit 0 means the command completed; exit 1 represents caught errors or rejected validation. The current CLI does not implement the earlier draft's distinct exit 2. Doctor warnings and plain validate's branch warning can still return 0. Unknown top-level commands fail, but strict rejection of every unknown option is not implemented.

## Configuration fields

File: `.git-guardian.yml` at Git root. Defaults are in the example (`git-guardian/examples/git-guardian.example.yml` in project archive). The parser supports nested mappings and scalars with two-space indentation. Arrays and tabs are unsupported; use CSV strings for list fields. Double-quoted strings are parsed using JSON escaping. This is not a full YAML implementation.

| Field | Default / type | Actual meaning |
| --- | --- | --- |
| `version` | 1 / number | Must equal 1 |
| `branch.enabled` | true / boolean | Enable branch validation |
| `branch.format` | `<type>/<number>-<description>` / string | Readable format; see the [user guide](USAGE.md#choose-conventions). Whole name must match |
| `branch.types` | feat,chore,bugfix,task / CSV | Values allowed for `<type>`; lowercase letters, numbers, hyphens |
| `branch.protected` | main,master,develop,development,staging,production / CSV | Names always accepted; does not prevent commits/pushes |
| `branch.suggestions` | true / boolean | Include suggestions on validation failure |
| `commit.enabled` | true / boolean | Enable message validation |
| `commit.format` | `<type>: <description>` / string | Readable format for the first line. Whole line must match |
| `commit.types` | feat,chore,bugfix,task / CSV | Values allowed for `<type>` |
| `commit.maxSubjectLength` | 72 / positive integer | Maximum first-line length; suggestions are shortened to fit |
| `commit.allowMergeCommits` | true / boolean | Accept normalized text beginning with Merge word |
| `commit.allowRevertCommits` | true / boolean | Accept normalized text beginning with Revert word |
| `hooks.referenceTransaction` | true / boolean | Install reference hook when branch validation enabled |
| `hooks.commitMsg` | true / boolean | Install message hook when commit validation enabled |

Missing or wrong-typed fields fall back to defaults. Unknown keys are ignored; duplicate parsed keys overwrite earlier ones. The 0.1.x fields `pattern`, `example`, `suggestionPrefixes` and `suggestionTypes` are rejected with migration instructions. Validation checks schema version, that formats use known placeholders with balanced brackets, valid type names, positive integer maxSubjectLength and nonempty CSV sets. It does not impose a strict schema, validate examples or enforce Git syntax on explicit string validation. Native Git still validates its own ref syntax.

## Commit semantics

The validator trims the whole message before taking its first line, so whitespace is normalized rather than explicitly rejected. Lines starting with `#` (Git's editor comments) are ignored. Prefix exemptions run before length/format checks. The first line must be at most maxSubjectLength characters (JavaScript string length, i.e. UTF-16 code units) and match commit.format. Body/footers are not checked. No file rewrite occurs.

## Hooks and runtime lookup

Two hooks: reference-transaction and commit-msg. No pre-commit hook. Handler code accepts preparing and prepared states; other states return success. It examines refs/heads and a symbolic HEAD target when the old value is zero and the target ref is absent. Cross-version behavior, especially unborn branches, needs verification; the handler's source comments do not establish a universal Git guarantee.

Wrapper resolution order: `GIT_GUARDIAN_BIN` JavaScript entry path executed through node → root-local node_modules executable → PATH executable → error. No package download fallback. Reference input is replayed from a temporary file; executable original hooks run before Guardian.

Owned-hook detection uses the text marker `# git-guardian-managed-hook v1`, not hashes. Backups use `.git-guardian-original`. Installer does not change core.hooksPath and can write to an inherited/shared configured directory. Disabled settings skip installation, but do not remove a previously installed hook. The runtime branch/commit enabled switches disable their corresponding validator; hook-install flags alone do not.

## Troubleshooting

| Symptom | Check and action |
| --- | --- |
| Missing config | Run init in correct repo or restore `.git-guardian.yml`; old `.gitguardian.json` is not loaded |
| Suggestion contains `<number>` or another placeholder | The value could not be found in your input; fill it in |
| "uses fields from an older version" | Replace regex `pattern` fields with `format` and `types`, or delete the config and rerun init |
| Doctor succeeds but hook absent | Read warnings; doctor is not a strict installation gate |
| Invalid branch passes CI | Use `validate branch`, not bare validate |
| Existing hook/backups conflict | Preserve both and reconcile; avoid blind force |
| CLI not found in GUI | Configure Node/PATH or local install used by that client |
| Invalid branch creation not blocked | Verify effective hook, Git version and client implementation; test ordinary and unborn repos separately |
| Setting hook flag false has no effect | It controls installation; reconcile installed files or validator enabled setting |

Local hooks are bypassable. No remote permission control, secret scanning, PR range validation, universal GUI compatibility or automatic cleanup transaction is provided.


---

# Known limitations and implementation gaps — v0.1.1

These findings come from reading the supplied source. They are documented here rather than silently altering runtime code during a documentation task.

| Area | Current behavior | Follow-up |
| --- | --- | --- |
| Config strictness | Defaults replace wrong/missing types; unknown keys ignored; duplicate keys overwrite | Reject invalid types, unknown and duplicate fields |
| Suggestions | Candidates not revalidated against custom policy/Git syntax | Filter candidates and validate diagnostic examples |
| Commit length | Guard is maxSubjectLength + 32; JS UTF-16 length | Define and implement precise total-subject semantics |
| Merge/revert | Prefix-based bypass enabled by default | Document or implement structured exemptions |
| Branch protection | protected means naming allowlist only | Rename field or add distinct direct-commit rule |
| Existing branches | No pre-commit branch validation | Decide whether to add explicit check hook |
| Hook ownership | Marker only; edited managed hooks can be overwritten | Manifest/hashes and conflict refusal |
| Uninstall | Existing backup can replace a changed target hook | Preserve user edits before restoring |
| Force install | Can delete an existing backup | Safer recovery flow with explicit backup preservation |
| Multi-hook mutation | No all-or-nothing rollback | Transactional install and failure recovery |
| Configured hooks path | Inherited/shared path may be written | Detect scope and prevent unintended multi-repo impact |
| Hook toggles | Disabling install flag does not remove old installed wrapper | Reconcile enabled/disabled state explicitly |
| Doctor | Warnings can exit zero; no end-to-end hook proof | Machine-readable/strict diagnostic mode |
| Compatibility | Minimum declared versions are not full matrix evidence | Test native Git versions, OSes, GUIs, worktrees/submodules |
| CI | No PR range collector or workflow generator | Keep explicit validation in consumer CI |

Ordinary native ref creation and symbolic/unborn paths need their own integration evidence. A hook only protects operations that invoke it; client libraries and disabled hooks can bypass it. Never present these local checks as remote access control.


---

# User guide

> Proposed v1 workflow. Guardian commands are not implemented in this scaffold.

## Install and prepare

Install our verified tarball at a pinned version as a local dev dependency, or globally for a non-Node repository. See the package identity requirement in development (`ci-guardian/docs/DEVELOPMENT.md` in project archive). The CLI baseline is Node 22+. Application dependencies and toolchains remain the consuming project's responsibility.

Before setup, identify commands that already work: lint, type checking, unit tests and optionally a build check. For React Native, use the project's actual package manager and test framework. The example `--runInBand` applies to Jest-style commands and must not be copied to a different runner.

## Configure a new or existing project

1. Run `ci-guardian init` at the repository root. Select React Native or generic, project root and available check commands.
2. Review `.ciguardian.yml`. Init must not invent scripts, alter package scripts or install application dependencies.
3. Run `ci-guardian validate`, then `ci-guardian doctor` to identify missing executables or directories.
4. Run `ci-guardian run`. This executes repository code; use it only in a trusted checkout.
5. Use `ci-guardian run --check lint` for feedback during development. A partial run is labelled partial and cannot stand in for the full required gate.
6. Commit the configuration once the checks are meaningful and reproducible.

If init finds existing config, it refuses overwrite. In noninteractive automation use `init --defaults`, which writes the documented React Native example contract without proving that those scripts exist; review it and run doctor before execution.

## Generate GitHub Actions

`ci-guardian generate --provider github-actions` displays proposed output without changing the repository. Add `--write` to create a new `.github/workflows/guardian-ci.yml`. Existing workflows are never overwritten in v1; generation prints a conflict and requires manual merging.

The generator must require verified action revisions, the package version, dependency bootstrap commands and approved runtime versions before output is executable. There is no working workflow shipped in this scaffold; names and pins cannot be fabricated before the implementation repository exists.

For an existing CI pipeline, keep its installation, cache and environment setup. Replace only the check invocation after verifying equivalent behavior. Run the new job alongside old checks until results agree. Then update required status names deliberately; do not leave a required check pointing at a removed job.

Use a normal pull-request workflow with minimal read permissions. Checkout untrusted PR code only on isolated runners without deployment credentials. A trusted main-branch workflow can additionally run the same checks after merge.

## Dependency setup and artifacts

CI Guardian runs checks; it does not bootstrap every language. The workflow must install the locked Node/Python/Ruby/Java/SDK dependencies that the project actually needs. A native iOS build check requires an appropriate macOS/Xcode runner; the first React Native JS-check preset does not imply iOS compilation.

The proposed JSON report is `.guardian/ci/report.json`. Upload it and explicitly configured project test reports even after check failure. Do not include environment dumps or entire home directories. Report absence is an error, not a pass.

## Integrate Git Guardian

Install the separately pinned Git Guardian executable. Use `git-guardian validate branch <name>` and `git-guardian validate commit --file <path>`; bare `validate` is not a strict branch gate. Invoke its explicit branch validator using provider metadata and validate all commit subjects in the defined PR range. For the future CI adapter: fetch base and head history, compute the merge base, enumerate reachable head commits not reachable from the merge base, and fail clearly if history is insufficient. Make merge-commit and squash-title rules explicit. Never use a detached CI checkout's branch name as the PR source branch.

This adapter is milestone C4; it is not represented by an invented enabled field in the initial configuration. Until it exists, the consuming workflow owns these steps.

## Updating and removing

Update the pinned package and generated workflow revisions in a pull request. Compare generated output, run validation, observe a complete PR run, then adjust repository rules if required. Preserve a known-good revision for reversion.

To remove CI Guardian, replace its invocations with equivalent direct commands, update required statuses, remove only its owned config/report output and remove the package dependency. Existing tests, lint rules and unrelated workflows stay. There is no destructive uninstall command in v1.


---

# CI Guardian reference manual

> Proposed v1 contract. The examples specify target behavior, not currently available commands.

## Commands

| Invocation | Behavior | Side effects |
| --- | --- | --- |
| `init` | Interactive project/check setup with preview | Writes new `.ciguardian.yml` |
| `init --defaults` | Writes documented RN example without prompts | New config only |
| `validate` | Parse config and reject schema/semantic errors | None; no child execution |
| `doctor` | Inspect runtime, roots and command availability | None; no checks run |
| `run` | Execute all checks in listed order | Child commands and report |
| `run --check <id>` | Execute exactly one named check | Partial report and child effects |
| `generate --provider github-actions` | Show proposed workflow | None |
| `generate --provider github-actions --write` | Create new workflow after validation | New workflow; refuse existing file |
| `--help`, `--version` | Help/version | None |

All commands discover configuration at the Git root. No arbitrary config search up outside that repository. Unknown flags, providers or check IDs fail with exit 2. Generation in noninteractive mode fails if required release pins or bootstrap information is absent; it does not emit a deceptively ready file.

## Configuration dictionary

See RN example (`ci-guardian/examples/ciguardian.example.yml` in project archive).

| Field | Required / type | Rule |
| --- | --- | --- |
| `version` | yes / integer | Exactly 1 |
| `project.type` | yes / enum | `react-native` or `generic` in initial v1 |
| `project.root` | yes / string | Existing repository-relative directory; `.` allowed |
| `provider` | yes / enum | `github-actions` |
| `checks` | yes / nonempty list | All listed checks are required for a full pass |
| `checks[].id` | yes / string | Unique lowercase letters, numbers or hyphens; begins with letter |
| `checks[].command` | yes / nonempty string array | Executable and separate args; no shell evaluation |
| `checks[].timeoutSeconds` | yes / integer | 1–7200 |
| `execution.failFast` | yes / boolean | False continues other checks after failure |
| `report.path` | yes / string | Repository-relative JSON output, default from init `.guardian/ci/report.json` |

Saved config requires every field above; defaults are generated by init rather than silently injected by the loader. Reject unknown fields, duplicate YAML keys, custom tags and unsupported schemas. Parse YAML using a restricted data-only schema with limits for file size, nesting and aliases. Resolve real paths, reject repository escapes and symlink escapes. Do not expand environment placeholders in command strings. Commands inherit a reviewed process environment; the CLI adds no secret discovery.

`project.root` is the working directory for all child checks. `report.path` is relative to the Git root, not project.root. The generic Python example assumes Python, ruff and pytest were installed separately in the intended environment.

## Execution and report contract

V1 runs checks sequentially in listed order. There is no DAG, check dependency field or parallelism switch. Fail-fast marks unstarted checks skipped with reason; any failure still fails the run. A timeout terminates the process tree using a tested OS-specific implementation, records timeout and returns failure. Ctrl-C must cancel children and write a best-effort interrupted report, not success.

Report schema version 1: `schemaVersion`, `packageVersion`, `configHash`, `commitSha` (nullable outside a resolvable checkout), `scope` (`full` or `partial`), `startedAt`, `finishedAt`, `status`, and `checks`. Each check records `id`, `status`, `exitCode` (nullable), `durationMs`, and `reason` (nullable). Status is passed/failed/skipped/cancelled; a full run is passed only when all required checks pass. Logs remain in runner output; the JSON report contains no raw environment or secrets.

An atomic temporary-file rename prevents a half-written report from looking complete. A stale report must be identified by run timestamp, commit and config hash; downstream consumers cannot trust merely the presence of a file.

## Exit codes

0 = requested checks passed; 1 = check failed or timed out; 2 = invalid invocation, config, missing runtime or report-write error; 130 = interrupted. Partial success returns 0 locally but its report is `scope: partial`; required CI gates must demand a successful full report from the current run. Child process exit codes are retained in the report, not blindly exposed as Guardian's exit code.

## Workflow generation contract

Output: `.github/workflows/guardian-ci.yml`, with stable final status name `guardian-ci / required`. Required jobs must cover all configured checks; the final gate runs even after failure or cancellation and rejects missing/skipped required work. A path-filtered or skipped workflow is not a pass. Generated workflows must be parsed and exercised before the package advertises support.

Explicit immutable action and Guardian revisions, locked dependency setup, minimal permissions, deliberate caches, appropriate runners and report retention are required. V1 generation creates a reviewed file; it is not a remote workflow editor and does not configure repository protection.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Command missing | Tool not installed or wrong root | Run doctor; configure workflow bootstrap |
| Local pass, CI fail | Different versions/env or partial local run | Compare toolchain, run full checks from clean checkout |
| Check hangs | Interactive script or child leak | Use noninteractive test command; inspect timeout cleanup |
| Required status pending | Renamed/filtered workflow | Review host rules and trigger coverage |
| Workflow conflict | Existing file at target | Preview and manually merge; no force overwrite |
| Old report looks successful | Stale output | Match timestamp, commit, config hash and full scope |
| CI reports no tests | Missing tests or permissive test runner | Configure meaningful tests; no-test behavior is project policy |


---

# User guide

> Intended v1 behavior; implementation and provider validation remain outstanding.

## Prerequisites

The CLI proposes Node 22+ and a pinned package version. The consuming project must already build locally with a documented, locked toolchain. iOS delivery needs macOS, a compatible Xcode, app workspace and shared scheme, Apple team/app access and signing assets. Android needs compatible JDK, SDK, Gradle wrapper, signing setup, app registration and a service account authorized for the intended Play app. Ruby/Fastlane and CocoaPods, where used, must be pinned in the consuming setup rather than silently downloaded by a hook.

The package cannot create developer accounts, accept store agreements, grant itself access, fix missing app records or guarantee store processing/review time. Complete those steps in the relevant account before the pilot. Verify the chosen credential mechanism and platform requirements during adapter implementation.

## Install and initialize

Install the team's verified package tarball at a pinned version. Use a local dev dependency in RN projects. For future non-Node consumers, support a pinned global executable; Node remains necessary.

Run `release-guardian init`. The wizard detects candidate workspace/scheme or Gradle targets and asks the user to select them. It never silently selects the first target or prints credentials. It previews `.releaseguardian.yml`, chosen internal destinations and proposed workflow integration before writing a new config. Existing files cause a conflict.

For headless setup, commit a reviewed config based on the example (`release-guardian/examples/releaseguardian.example.yml` in project archive); init has no automatic defaults flag in this design. Run validate afterwards. Replace all placeholder identifiers. V1 may configure one or both platforms, but deploying an unconfigured platform is an error.

## Credentials and signing

Store credential values in GitHub environment secrets or an approved vault. Config contains only environment variable names and nonsecret identifiers. A runner setup step materializes credential files into a private temporary directory and exports their absolute paths; it must remove them in an always-run cleanup step.

For iOS, provision an App Store Connect API key for upload plus the certificate/private key and matching provisioning profile required to sign. An upload API key alone is not a signing identity. For Android, provision the upload keystore and service account separately; they serve different purposes. The consumer's Gradle signing configuration must use the documented environment references without committing passwords.

Run validate (no credential access) and doctor (local presence/format checks only). Passing doctor is not proof of account authorization; actual provider preflight happens only during deploy.

## GitHub workflow setup

The planned first release includes maintained central reusable workflows and a small caller workflow per consumer. An implementation release must supply the real repository owner and immutable revision; no runnable placeholder workflow is included here.

The caller is manually dispatched for a protected branch, selects ios or android and supplies an explicit unique build number. The reusable workflow must validate event/ref, checkout the exact approved commit, verify required CI on that commit, select a protected `internal` environment, install the pinned toolchain, materialize credentials, deploy, retain sanitized reports and clean up in all outcomes. Use a concurrency key per app/platform/destination; do not cancel an in-progress upload to start a new one.

Declare explicit workflow inputs and secrets. The deployment job in the called workflow declares the environment; environment approvals/secrets must be tested in the consumer repository. Environment secret behavior cannot be assumed from a caller's secret mappings. Choose the stable actual CI status name, not a similar display label.

## First iOS delivery

1. Confirm a clean approved commit passes all required checks.
2. Select a new build number compatible with the app's platform configuration. The example date-based number illustrates input only; uniqueness must be checked against the store.
3. Run `release-guardian plan ios --build-number 1001`; inspect app, commit, environment, target and stages.
4. Run the same deploy command with `--dry-run` to confirm the plan without provider calls or signing.
5. Trigger the protected workflow for that exact commit and number. Approve the reviewed environment request.
6. After upload, inspect report and App Store Connect processing status. An accepted upload is not yet proof the build is available to testers.
7. Complete any required compliance/review/tester-group steps in the store; v1 does not silently enroll external testers.

## First Android delivery

Use `plan android --build-number 1001`, review the selected app and internal track, then trigger the protected Android workflow. The integer is the intended versionCode and must be greater than prior uploaded codes as required by the platform. A retry is not a new version automatically. Verify the AAB's applicationId, versionName and versionCode before upload.

V1 fixes the destination to Internal Testing and does not promote to production. Store app setup, account state and review/compliance requirements can still prevent availability; report upload acceptance separately from tester availability.

## Upgrades

Update the package and reusable workflow SHA together in a reviewed PR with a compatibility record. Keep schemas explicit and refuse unsupported versions. Pilot on the internal destination before broad adoption. Downgrading the automation cannot remove an already uploaded store build; follow the operations manual (`release-guardian/docs/OPERATIONS.md` in project archive).


---

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


---

# Release operations manual

## Before the first pilot

Record the application owner, signing owner, store account administrator and engineering operator. Confirm app IDs/team/track and choose one internal destination. Build from a clean checkout with the documented toolchain. Record package and reusable workflow pins. Store signing backups through the organization's controlled credential process, not in Git or build artifacts.

## Per-release checklist

1. Identify exact source SHA and confirm full required CI on it.
2. Confirm marketing version and select an unused platform-valid build number.
3. Review plan: app, platform, branch, environment, destination and signing references.
4. Confirm no conflicting release is running and approve the environment gate.
5. Record workflow run ID and artifact hash; retain sanitized report.
6. Verify upload receipt, then separately confirm processing and tester availability in the store.
7. Communicate status accurately through the team's normal process. Automated notifications are outside v1.

## Failure decision table

| Last confirmed stage | Safe next step |
| --- | --- |
| Validation or authorization | Correct config/access; no upload occurred |
| Build | Fix toolchain/code and rerun using an explicit build identity |
| Signing | Check app/team/profile/key alignment; replace assets if needed |
| Before upload request | Retry after fixing the known failure |
| Upload request sent; response missing | Inspect store for the app/version/build; do not blindly retry |
| Upload accepted | Wait for/review processing; never label it absent because local job failed |
| Build available but defective | Stop tester use if possible and ship a corrected higher build through the store process |

## Credential rotation runbook

1. Identify credential type, consumer workflows and owner; pause new release runs while changing signing-sensitive assets.
2. Provision replacement with minimum needed access. Where the platform supports overlapping valid credentials, retain the old one during validation.
3. Update the protected environment secret/file source without changing values in repository config.
4. Run local-format checks and one approved internal delivery with the new material.
5. Verify provider receipt and affected consumers, then revoke the old credential through the provider.
6. Remove temporary copies and record rotation date/owner without secret values.

If exposed, revoke promptly under the incident process instead of waiting for a normal overlap window. Rotating an API/service-account credential is different from rotating an Android upload key or app-signing key; the latter may require the provider's specific reset/upgrade process. Do not assume replacing a keystore file is a safe key rotation. An Apple signing certificate/profile change similarly needs a matching signing set.

## Recovery and retention

V1 has no automated store rollback. Revert automation to a known-good pinned package/workflow when the automation regresses. For defective application code, create and test a corrected build with a new valid number; do not try to overwrite an accepted build.

Retain source SHA, version/build, artifact hash, package/workflow revisions and provider ID for each attempt. Decide artifact retention in the consuming organization; signed binaries may contain proprietary material. Never retain credential directories. If cleanup fails, fail the run and let an operator verify the runner and credential exposure before reuse.
