<p align="center">
  <img src="assets/ci-guardian-logo.png" alt="CI Guardian logo" width="250">
</p>

# ci-guardian

**A consistent way to configure, run and maintain project quality checks.**

> Documentation baseline: 0.1.0-draft · 2 October 2026.
> This is a documentation-first project scaffold, not a working or published Guardian CLI.
> Package commands below specify intended behavior unless explicitly labelled as available now.
> Names, registry scope, repository owner, license and release versions are not finalized.
> Do not install a similarly named public package assuming it belongs to this toolkit.

## Purpose and proposed scope

CI Guardian standardizes how projects invoke their existing linters, type checkers, tests and build checks. It supplies a typed configuration contract, a local runner, reports and reviewable GitHub Actions workflows. It does not replace those tools, invent missing tests or host CI runners.

This is a new proposed scope for the middle package in the Guardian Engineering Toolkit. The first supported preset should be React Native; a generic command profile allows explicit integration with other projects without claiming a tested framework preset.

## V1 boundaries

- YAML configuration, explicit commands as argv arrays and per-check timeouts.
- Run selected checks locally and all required checks in CI, with deterministic reporting.
- GitHub Actions workflow generation as a preview plus an explicit write operation.
- Optional delegation of branch/commit conventions to Git Guardian using its pinned v0.1.1 CLI.
- Stable aggregate check name for repository rules; clear distinction between failed, skipped and passed checks.

V1 excludes deployment, signing, store upload, automatic code fixes, remote caches, changed-file-only optimization, full monorepo dependency graphs and other hosted CI providers. Flutter/native presets follow verified fixtures, not merely a project-type label.

## Intended quick start

After installing a verified, pinned build of our package:

```bash
ci-guardian init
ci-guardian validate
ci-guardian run
ci-guardian generate --provider github-actions
ci-guardian generate --provider github-actions --write
```

Generation previews by default and never enables branch protection automatically. Review and commit the generated workflow, then select its stable aggregate status as required in repository settings.

Available now: `python3 scripts/check_docs.py` checks this documentation scaffold.

## Documentation

- [Usage](docs/USAGE.md), [reference manual](docs/REFERENCE_MANUAL.md), [architecture](docs/ARCHITECTURE.md).
- [Development](docs/DEVELOPMENT.md), [testing](docs/TESTING.md), [roadmap](docs/ROADMAP.md).
- [Security](docs/SECURITY.md), [decisions](docs/DECISIONS.md), [sources](docs/SOURCES.md).
- [React Native configuration](examples/ciguardian.example.yml), [generic Python configuration](examples/ciguardian.python.example.yml).

The examples assume the consumer already defines the named commands and installs its own dependencies. CI Guardian must not report successful testing when a project has no test command.
