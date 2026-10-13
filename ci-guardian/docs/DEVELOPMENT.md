# Package development

> v0.1.0 · C1–C4 (config, runner, workflow generation, Git Guardian job) are implemented; see the roadmap for what remains.

## Build and test

Node.js 20 or newer is required, matching Git Guardian. Python 3 is needed only for the documentation checker. The only dependencies are exact-pinned development dependencies (TypeScript and Node type definitions); the CLI has no runtime dependencies.

```bash
npm install          # then npm ci once the lockfile is the source of truth
npm test             # tsc build, then node --test tests/*.test.js
npm run docs:check   # required documents, local links and JSON syntax
npm pack             # local tarball; does not publish
```

Tests import `dist/`, so `npm test` always rebuilds first. Integration tests create temporary Git repositories and run the real CLI with small Node scripts as checks, including timeouts, process trees and SIGINT.

## Verify a packed build

Verification sequence: clean checkout → install → `npm test` → `npm pack` → install the tarball into an isolated Git repository → `init`, `validate`, `doctor`, `run` smoke tests. The [Readme](../Readme.md#try-it-locally) has the consumer steps and a playground configuration.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/config/` | Restricted YAML parser, schema and path validation, loader, defaults and serialization |
| `src/planner/` | Immutable ordered execution plan; check selection |
| `src/runner/` | Child processes in their own process group, timeouts, cancellation, normalized results |
| `src/reporters/` | Terminal summary and atomic JSON report |
| `src/commands/` | `init`, `validate`, `doctor`, `run` |
| `src/core/` | Exit codes, Git queries, executable resolution, terminal output |

Presets (`src/presets/`), providers and the Git Guardian integration are not created yet; add them with their milestones.

## Coding conventions

Use strict TypeScript, explicit input types and small modules with one clear responsibility. Keep parsing, domain decisions, process execution and output formatting separate. Return typed results rather than calling process.exit inside validators. Use argument-array subprocess calls with `shell: false`; implement platform-specific executable resolution where required. Never assemble executable shell strings from a branch name, configuration value or event payload.

Every command must define inputs, allowed side effects, cancellation behavior and nonzero exits. Test failures as well as the happy path. Treat paths with spaces, symlinks, missing files and interrupted writes as normal engineering cases.

## Contribution workflow

Create a focused branch, describe the user problem, update the affected contract, implement it and attach verification evidence. An interface change requires updated examples and migration notes in the same pull request. Do not claim support for a framework or operating system from a mocked test alone.

Review checklist: contract matches help; files owned by users survive; errors identify a fix; commands do not expose secrets; examples run against a packed package; unsupported combinations fail early; docs status reflects implementation status.

## Package publication

The package is published as `@agnotic/ci-guardian` under the MIT license, with an explicit `files` allowlist, `publishConfig.access: public` and a `prepublishOnly` test run. See [Publishing](PUBLISHING.md) for the release steps.

Use independent semantic versions for each Guardian package. Configuration `version: 1` is a schema version, not a package release. Deprecate compatible fields before removal; break incompatible configuration only in a documented major package release. Never silently migrate a consumer's configuration.

Publish a prerelease first, verify its tarball in real consumer repositories, then promote only after release approval. Release tags must match the tested source commit. Record dependency provenance, changelog and compatibility results. A package rollback means consumers pin the last known-good package and workflow revision; do not delete their configuration.
