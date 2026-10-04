<p align="center">
  <img src="assets/git-guardian-logo.png" alt="Git Guardian logo" width="250">
</p>

# git-guardian

**Project-local Git policy enforcement for branch names and commit messages.**

Git Guardian installs Git hooks that reject non-conforming branch names before the branch is created and non-conforming commit subjects before the commit is recorded, with suggested fixes. Rules live in a committed `.git-guardian.yml`, so every clone enforces the same conventions.

> v0.1.1 · Requires Node 20+ and Git 2.28+. Not yet published to npm; install from a local tarball as shown below. Cross-platform and minimum-version coverage are still being established; see [Testing](docs/TESTING.md).

## Features

- Interactive `init` that writes `.git-guardian.yml` and installs hooks.
- Branch creation checks through the native `reference-transaction` hook, so `git switch -c` and `git checkout -b` are guarded too.
- Commit subject checks through `commit-msg` (Conventional Commits by default; merge and revert commits allowed).
- Explicit validators, a validated `branch create` helper and branch-name suggestions.
- Existing hooks are backed up and chained, and restored on `uninstall`; `doctor` reports installation status.

Not included in v0.1.1: a pre-commit hook, blocking direct commits to a branch, or a command to validate a PR's commit range. `branch.protected` lists branch names that are always allowed, not branches that are write-protected. Read [known limitations](docs/KNOWN_LIMITATIONS.md) before rolling out to a team.

## Install in a project

Build a tarball from this repository:

```bash
npm install
npm run build
npm pack            # creates git-guardian-0.1.1.tgz
```

Then, in the project you want to guard:

```bash
npm install --save-dev /absolute/path/to/git-guardian-0.1.1.tgz
npx git-guardian init        # prompts for rules; use --yes to accept defaults
npx git-guardian doctor
```

Commit `.git-guardian.yml`. Hooks are local to each clone, so every contributor installs dependencies and runs `npx git-guardian install` once. Use the project-local executable so an unrelated global version is never picked up.

The hooks look for the CLI in `GIT_GUARDIAN_BIN`, then `node_modules/.bin`, then `PATH`. If none is found they fail closed and block the operation. GUI Git clients that do not inherit your shell `PATH` need a local install.

## Usage

```bash
git switch -c Bad_Branch                       # blocked, with suggestions
git switch -c feature/ABC-123-add-login        # allowed
git commit -m "fixed stuff"                    # blocked, with suggestions
git commit -m "feat(auth): add passkey login"  # allowed
```

| Command | Purpose |
| --- | --- |
| `init [--yes] [--force]` | Create `.git-guardian.yml` and install hooks |
| `install [--force]` / `uninstall` | Install hooks, or remove them and restore previous hooks |
| `doctor` | Check Git version, config and hook installation |
| `validate [config]` | Validate the configuration |
| `validate branch [name]` | Validate the current or a given branch name |
| `validate commit -m "<msg>"` / `-f <file>` | Validate a commit message |
| `branch create <name> [--from <ref>]` | Validate, then create a branch |
| `branch suggest "<description>"` | Suggest compliant branch names |

Default rules are in [examples/git-guardian.example.yml](examples/git-guardian.example.yml). Allowed branch types are the prefixes in `branch.pattern`; keep `branch.suggestionPrefixes` in sync with it.

## Development

```bash
npm install
npm test               # builds with tsc, then runs node --test
npm run docs:check     # required docs, local links and JSON syntax
```

`dist/` is build output and is not committed. See [Development](docs/DEVELOPMENT.md) and [Contributing](CONTRIBUTING.md).

## Documentation

| Document | Purpose |
| --- | --- |
| [Usage](docs/USAGE.md) | Setup, everyday use, CI, upgrade and removal |
| [Reference manual](docs/REFERENCE_MANUAL.md) | Commands, config semantics, exit codes and troubleshooting |
| [Development](docs/DEVELOPMENT.md) | Source setup, tests, packaging and contribution |
| [Architecture](docs/ARCHITECTURE.md) | Modules, hooks and data flow |
| [Testing](docs/TESTING.md) | Current evidence and remaining test matrix |
| [Known limitations](docs/KNOWN_LIMITATIONS.md) | Differences from the earlier design and code-level caveats |
| [Roadmap](docs/ROADMAP.md) | Hardening and future features |
| [Security](docs/SECURITY.md) | Trust and hook lifecycle considerations |
| [Decisions](docs/DECISIONS.md) | Current implementation versus the earlier draft |
| [Sources](docs/SOURCES.md) | Source provenance and references |
| [Changelog](CHANGELOG.md) | Release history |

## License

[MIT](LICENSE)
