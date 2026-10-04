# Package development

> Documentation baseline: 0.1.0-draft · 2 October 2026.
> This is a documentation-first project scaffold, not a working or published Guardian CLI.
> Package commands below specify intended behavior unless explicitly labelled as available now.
> Names, registry scope, repository owner, license and release versions are not finalized.
> Do not install a similarly named public package assuming it belongs to this toolkit.

## Work on this scaffold now

Use Node.js 22 or newer as the proposed development baseline. Python 3 is needed only for the included documentation checker. No dependency installation is needed to read or check this scaffold.

```bash
python3 scripts/check_docs.py
npm run docs:check
```

Both commands perform the same documentation check. The checker validates local Markdown file links, JSON syntax and required project documents; it does not test a Guardian implementation or validate YAML schemas. There is deliberately no `npm test`, `build`, executable, or deployment script pretending an implementation exists.

## Establish the implementation toolchain

1. Keep this project as its own repository; no sibling Guardian checkout is required.
2. Add TypeScript as an exact, reviewed development dependency and commit the generated package lock.
3. Add strict compilation, an actual CLI parser and a schema validator. Choose and record dependency versions in an ADR before publishing; this scaffold does not prescribe floating versions.
4. Compile `src/cli.ts` to `dist/cli.js`. Add an executable shebang and a `bin` entry only when the entry point works.
5. Use Node's test runner or one selected test framework. Add scripts for build, typecheck, unit, integration and package smoke tests as they become real.
6. Implement the first milestone in ROADMAP.md. Keep help, configuration examples and the reference manual synchronized with the implementation.
7. Generate a lockfile and then use `npm ci` for reproducible subsequent installs. Do not document `npm ci` against this initial scaffold, which has no dependencies or lockfile.

Proposed implementation verification sequence, after the corresponding scripts exist: clean checkout → locked install → typecheck → unit tests → build → integration tests → `npm pack --dry-run` → install actual tarball into an isolated fixture → command smoke tests.

## Coding conventions

Use strict TypeScript, explicit input types and small modules with one clear responsibility. Keep parsing, domain decisions, process execution and output formatting separate. Return typed results rather than calling process.exit inside validators. Use argument-array subprocess calls with `shell: false`; implement platform-specific executable resolution where required. Never assemble executable shell strings from a branch name, configuration value or event payload.

Every command must define inputs, allowed side effects, cancellation behavior and nonzero exits. Test failures as well as the happy path. Treat paths with spaces, symlinks, missing files and interrupted writes as normal engineering cases.

## Contribution workflow

Create a focused branch, describe the user problem, update the affected contract, implement it and attach verification evidence. An interface change requires updated examples and migration notes in the same pull request. Do not claim support for a framework or operating system from a mocked test alone.

Review checklist: contract matches help; files owned by users survive; errors identify a fix; commands do not expose secrets; examples run against a packed package; unsupported combinations fail early; docs status reflects implementation status.

## Package publication

The scaffold sets `private: true` and `license: UNLICENSED` to prevent accidental publication and avoid granting an unchosen license. These are temporary release controls, not a licensing recommendation. Before the first registry release, verify ownership and naming, choose a license, define the files allowlist and package metadata, confirm runtime support, and deliberately remove the publication block.

Use independent semantic versions for each Guardian package. Configuration `version: 1` is a schema version, not a package release. Deprecate compatible fields before removal; break incompatible configuration only in a documented major package release. Never silently migrate a consumer's configuration.

Publish a prerelease first, verify its tarball in real consumer repositories, then promote only after release approval. Release tags must match the tested source commit. Record dependency provenance, changelog and compatibility results. A package rollback means consumers pin the last known-good package and workflow revision; do not delete their configuration.
