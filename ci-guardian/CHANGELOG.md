# Changelog

## 0.1.0 — 2026-10-13

- First npm release as `@agnotic/ci-guardian` (the command is still `ci-guardian`). MIT license; `private` removed; `files`, `repository`, `homepage`, `bugs`, `keywords`, `publishConfig` and `prepublishOnly` added.
- Added [Publishing](docs/PUBLISHING.md) with the release order relative to Git Guardian.
- Readme: install from npm, one-line summary, and a comparison with Husky and hand-written workflows. Tarball install is kept for unreleased builds.
- Git Guardian's setup now installs `@agnotic/ci-guardian` from npm.

## 0.1.0-alpha.0 — 2026-10-04

- Added the TypeScript CLI with `init` (interactive and `--defaults`), `validate`, `doctor` and `run [--check <id>]` (milestones C1 and C2).
- Added a restricted YAML parser, schema and repository-path validation, a sequential runner with per-check timeouts and process-tree cancellation, a terminal summary and an atomic JSON report.
- Added 40 unit and integration tests; `npm test` builds and runs them.
- Lowered the Node baseline from 22 to 20 to match Git Guardian.
- Added `generate` / `generate --write`: a GitHub Actions workflow with a `git-guardian` job (branch, every commit, PR title, secrets), a `checks` job running `ci-guardian run`, and a stable `guardian-ci / required` gate. Actions pinned to SHAs; never overwrites an existing file; warns about `file:` dependencies outside the repository.
- `init` now asks, in order: add Git Guardian checks to CI (and sets Git Guardian up if missing), then lint, Prettier, npm audit, type check and tests (only those the project can run), then writes the config and the workflow.
- Security: the generated workflow calls `npx --no git-guardian` / `npx --no ci-guardian`. Plain `npx` in CI silently downloads and runs any npm package with that name when the dependency is missing (verified with npm 10.8); `--no` makes the step fail instead.
- Added install, update and removal steps to the Readme and usage guide.
- Interactive, colour-coded CLI matching Git Guardian: `init` is a guided three-step setup (Git Guardian checks → code checks shown as a found/missing list with one "Add all?" question → highlighted config preview), ending with a summary and numbered next steps. Coloured help, run headers and summary (✓/✗/○ with a re-run hint), doctor, config errors and workflow preview. Colour is off outside a terminal; `NO_COLOR` and `FORCE_COLOR` are honoured.
- Added the optional `gitGuardian.enabled` setting; `checks` may be empty when it is on.

## 0.1.0-draft — 2026-10-02

- Created development and consumer documentation, reference manual and configuration examples.
- Added an offline documentation integrity checker.
- No operational Guardian CLI is included.
