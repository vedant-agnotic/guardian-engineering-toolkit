<p align="center">
  <img src="assets/config-guardian-logo.png" alt="Config Guardian logo" width="250">
</p>

# config-guardian

**Define mobile app environments once. Generate and validate their native configuration.**

> Documentation-first project, 0.1.0-draft · 3 October 2026. CLI commands are proposed interfaces, not implemented commands. The deliverable includes documentation, a configuration schema and examples; it does not modify native app projects.

Config Guardian is a standalone Guardian Engineering Toolkit package. It can live in its own repository or as an independently versioned package inside a toolkit monorepo. It does not need Release Guardian installed.

## Purpose

A project may need development, staging and production apps with different display names, identifiers, icons and API endpoints. Config Guardian describes those environments centrally and maps them to iOS schemes/build configurations and Android flavors/build types.

Environment and build mode are independent: staging can have both Debug and Release builds. An iOS scheme is not an Android flavor, and the package must preserve platform-specific configuration rather than pretending they are identical.

## First release scope

React Native with checked-in ios/android projects, one main app target per platform, one Android environment flavor dimension, development/staging/production profiles. Inspect and validate first; native editing follows adapter tests. Flutter, pure native presets, Expo/EAS, extensions, white-label brands and multi-target projects are later work.

V1 covers schemes, build configurations, xcconfig mapping, Gradle flavor integration, display names, identifiers, selected icon references and explicit public runtime-config generation. It does not manage store records, certificates, signing keys, backend deployment or production rollout.

## Proposed workflow

```bash
config-guardian init
config-guardian inspect
config-guardian add staging
config-guardian validate
config-guardian plan --environment staging
config-guardian apply --plan .config-guardian/plan.json
config-guardian doctor
```

`init` writes only the new central config. `add` changes that config after review. `plan` produces a diff and hash-bound plan without editing native files. `apply` is the sole native-file mutation command and refuses stale plans or unsupported layouts. None of these CLI commands is implemented in this scaffold.

Available now:

```bash
python3 scripts/check_docs.py
```

## Documentation

| Document | Purpose |
| --- | --- |
| [User guide](docs/USAGE.md) | Setup, daily changes, adoption and removal |
| [Reference manual](docs/REFERENCE_MANUAL.md) | Commands, fields, mappings and errors |
| [Architecture](docs/ARCHITECTURE.md) | Adapters, planning, ownership and native changes |
| [Development](docs/DEVELOPMENT.md) | Implementation structure, contribution and release |
| [Testing](docs/TESTING.md) | Native fixture matrix and acceptance criteria |
| [Roadmap](docs/ROADMAP.md) | Ordered milestones |
| [Security](docs/SECURITY.md) | Public values, credentials and safe file handling |
| [Decisions](docs/DECISIONS.md) | Proposed choices and unresolved questions |
| [Sources](docs/SOURCES.md) | Platform references |
| [Example](examples/config-guardian.example.yml) | Three sample environments |
| [Schema](schemas/config-guardian.schema.json) | Draft 2020-12 schema for parsed config |

See [Repository layout](docs/REPOSITORY_LAYOUT.md) for standalone and monorepo use. Package name/scope and license remain unselected; the manifest is private until a real implementation is ready to publish.
