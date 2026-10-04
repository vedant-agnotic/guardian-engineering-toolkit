# Repository layout

This project may be its own repository or live at `packages/config-guardian` in Guardian Engineering Toolkit. It keeps its own package.json, README, docs, source, tests, changelog and release version either way.

For a monorepo, the root package.json is private and declares `workspaces: ["packages/*"]`. Put git-guardian, ci-guardian, release-guardian and config-guardian in separate package folders. Keep one root dependency lockfile; run commands with --workspace to select a package. Shared tests/build config are optional; do not introduce a runtime core package before shared needs are clear.

Each publishable package gets its own scoped npm name and version. Root privacy prevents accidental root publishing but does not prohibit publishing selected child workspaces. Keep unfinished package manifests private. Publish only the named, tested workspace, not all workspaces at once.

Use package-specific tags such as config-guardian-v0.1.0 and independent changelogs. Record repository.directory as packages/config-guardian in package metadata after the actual remote exists. Repository access is shared in a monorepo; choose separate repositories if different teams require genuinely different source permissions or ownership.

See [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/) for supported workspace commands.
