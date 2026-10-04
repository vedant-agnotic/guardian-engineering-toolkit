<p align="center">
  <img src="assets/release-guardian-logo.png" alt="Release Guardian logo" width="250">
</p>

# release-guardian

**Repeatable mobile delivery across projects, beginning with React Native internal releases.**

> Documentation baseline: 0.1.0-draft · 2 October 2026.
> This is a documentation-first project scaffold, not a working or published Guardian CLI.
> Package commands below specify intended behavior unless explicitly labelled as available now.
> Names, registry scope, repository owner, license and release versions are not finalized.
> Do not install a similarly named public package assuming it belongs to this toolkit.

## Purpose

Provide a small CLI and reusable GitHub Actions delivery workflows around established build tools. Project teams configure application identifiers, build targets, credentials by reference and delivery destinations. The package coordinates validation, build, signing, upload and reporting; Xcode, Gradle and Fastlane retain their platform responsibilities.

The reusable abstraction is intended to grow toward React Native, Flutter and native projects. V1 supports React Native first: iOS to TestFlight, followed by Android to Google Play Internal Testing. Flutter and native adapters are later milestones. Expo/EAS, website deployments, production rollout, automatic rollback, release notes and notifications are outside v1.

## Intended experience

After installing a verified pinned package and setting up accounts/toolchains:

```bash
release-guardian init
release-guardian validate
release-guardian doctor
release-guardian plan ios --build-number 1001
release-guardian deploy ios --build-number 1001 --dry-run
# Intended trusted delivery workflow, after review and environment approval:
release-guardian deploy ios --build-number 1001
```

`--dry-run` must never sign, build, upload or contact a store. `plan` is an explicit design addition for reviewability. Real deploy performs external writes and belongs in a protected workflow. No deployment is performed by this scaffold.

Available now: `python3 scripts/check_docs.py` validates documentation integrity.

## Documentation

| Topic | Document |
| --- | --- |
| Setup, first release, upgrade | [Usage](docs/USAGE.md) |
| Commands, configuration, credentials, state | [Reference manual](docs/REFERENCE_MANUAL.md) |
| Adapters, workflow and execution model | [Architecture](docs/ARCHITECTURE.md) |
| Package development and publishing | [Development](docs/DEVELOPMENT.md) |
| Credential rotation and trust | [Security](docs/SECURITY.md) |
| Failure handling and operating checklist | [Operations manual](docs/OPERATIONS.md) |
| Verification and sequence | [Testing](docs/TESTING.md), [roadmap](docs/ROADMAP.md) |
| Rationale and external references | [Decisions](docs/DECISIONS.md), [sources](docs/SOURCES.md) |
| Example configuration | [releaseguardian.example.yml](examples/releaseguardian.example.yml) |

The sample uses placeholder application identifiers and signing references. It is a configuration illustration, not a usable connection to LERA or any existing app.
