<p align="center">
  <img src="assets/git-guardian-logo.png" alt="Git Guardian logo" width="250">
</p>

# git-guardian

**Readable branch-name and commit-message rules for your team, enforced by Git hooks.**

> **In one line:** `@agnotic/git-guardian` is a Husky alternative for branch-name and commit-message rules. Install it with `npm install --save-dev @agnotic/git-guardian`, run `npx git-guardian init`, and Git hooks are set up for you. There is no `prepare` script, no `.husky/` folder, no commitlint config and no regular expressions.

Write your conventions as plain formats like `<type>/<number>-<description>`, with no regular expressions. Git Guardian blocks a badly named branch before it is created, and a commit before it is recorded if the message breaks the format or the changes contain an API key, token, password or `.env` file. Each time, it explains the format and suggests a fix. The rules live in a committed `.git-guardian.yml`, so every clone follows the same conventions.

> **Status:** early release (0.x); the config format may still change between minor versions. Package: [`@agnotic/git-guardian`](https://www.npmjs.com/package/@agnotic/git-guardian).
> Requires Node.js 20+ and Git 2.28+. Tested on macOS; Linux expected to work; Windows untested.

## What it looks like

```text
$ git switch -c wip/12-login
✗ Branch creation blocked: wip/12-login
Branch "wip/12-login" doesn't follow the format <type>/<number>-<description>
"wip" is not an allowed type.

Format:  <type>/<number>-<description>
  <type>         one of: feat, chore, bugfix, task
  <number>       a number, e.g. 123
  <description>  lowercase words joined by hyphens, e.g. add-login
Example: feat/123-add-login

Try:
  feat/12-wip-login
  chore/12-wip-login
  bugfix/12-wip-login
fatal: ref updates aborted by hook
```

In a terminal, errors are red, hints yellow, and examples and suggestions green.

## Features

- **Readable rules.** Formats use placeholders (`<type>`, `<number>`, `<ticket>`, `<scope>`, `<description>`) and `[ ]` for optional parts.
- **Guards native Git.** `git switch -c`, `git checkout -b` and `git branch` are checked through Git's `reference-transaction` hook, and `git commit` through `commit-msg`. No wrapper commands to remember.
- **Secret scanning.** Each commit's added lines and message are checked for private keys, cloud and SaaS tokens (AWS, GitHub, GitLab, Slack, Stripe, Google, OpenAI, Anthropic, npm and more), passwords in URLs, hard-coded passwords, and files like `.env` or `id_rsa`. Matches are shown masked, never in full.
- **Helpful rejections.** Every block explains what each placeholder means, shows a valid example and suggests names built from what you typed.
- **Guided setup.** `init` asks three questions and shows an example after each answer.
- **Plays well with existing hooks.** Hooks you already had are backed up, still run first, and are restored on `uninstall`.
- **No runtime dependencies.**

## Install

Requirements: Node.js 20+, Git 2.28+, and a `package.json` in the project (run `npm init -y` if there isn't one; the project itself can be any language).

```bash
npm install --save-dev @agnotic/git-guardian
npx git-guardian init        # 5 questions; or --yes to accept the defaults
npx git-guardian doctor      # confirms both hooks are installed
git add .git-guardian.yml package.json package-lock.json
git commit -m "chore: add git guardian"
```

The package is `@agnotic/git-guardian`; the command is `git-guardian`.

**Each teammate**, after pulling and running `npm install`, runs once:

```bash
npx git-guardian install
```

Hooks live in each clone's `.git/hooks` and aren't committed. To install them automatically on `npm install`, see [Automating install for a team](docs/HOW_IT_WORKS.md#automating-install-for-a-team).

### Install an unreleased build

To try changes that aren't on npm yet, build a tarball and keep it inside the project (in `tools/`, committed), so teammates and CI can install it too:

```bash
cd guardian-engineering-toolkit/git-guardian && npm install && npm pack   # creates agnotic-git-guardian-<version>.tgz
cd /path/to/your-project && mkdir -p tools
cp /path/to/guardian-engineering-toolkit/git-guardian/agnotic-git-guardian-*.tgz tools/
npm install --save-dev ./tools/agnotic-git-guardian-<version>.tgz
```

## Setup questions

| # | Question | Default | Example of a valid name |
| --- | --- | --- | --- |
| 1 | Branch name format | `<type>/<number>-<description>` | `feat/123-add-login` |
| 2 | Allowed types (branches and commits) | `feat, chore, bugfix, task` | — |
| 3 | Commit message format | `<type>: <description>` | `feat: add login page` |
| 4 | Block commits that contain secrets? | Yes | — |
| 5 | Also run these checks in GitHub Actions? (installs [`@agnotic/ci-guardian`](https://www.npmjs.com/package/@agnotic/ci-guardian) from npm and sets it up) | No | — |

Placeholders:

| Placeholder | Accepts | Example |
| --- | --- | --- |
| `<type>` | One of your allowed types | `feat` |
| `<number>` | Digits | `123` |
| `<ticket>` | Ticket key in capitals | `ABC-123` |
| `<scope>` | Lowercase area of the code | `auth` |
| `<description>` | Branch: lowercase words joined by hyphens. Commit: a short summary | `add-login` / `add login page` |

Other common conventions:

| Convention | Format | Valid example |
| --- | --- | --- |
| Jira ticket in branch | `<type>/<ticket>-<description>` | `feat/ABC-123-add-login` |
| Ticket optional | `<type>/[<ticket>-]<description>` | `feat/add-login` |
| Conventional Commits with optional scope | `<type>[(<scope>)]: <description>` | `feat(auth): add login` |
| Ticket before commit subject | `<ticket> <type>: <description>` | `ABC-123 feat: add login` |

## Configuration

`init` writes `.git-guardian.yml`. Edits take effect on the next Git command; no reinstall needed.

```yaml
version: 1
branch:
  enabled: true
  format: "<type>/<number>-<description>"
  types: "feat,chore,bugfix,task"
  protected: "main,master,develop,development,staging,production"  # always allowed
  suggestions: true
commit:
  enabled: true
  format: "<type>: <description>"
  types: "feat,chore,bugfix,task"
  maxSubjectLength: 72
  allowMergeCommits: true     # "Merge ..." messages skip the format check
  allowRevertCommits: true    # "Revert ..." messages skip the format check
secrets:
  enabled: true               # scan each commit for keys, tokens, passwords, .env files
  allow: ""                   # path globs never scanned, e.g. "test/fixtures/**"
hooks:
  referenceTransaction: true  # branch-name hook
  commitMsg: true             # commit-message and secret-scan hook
```

Every field is described in the [reference manual](docs/REFERENCE_MANUAL.md#configuration-fields).

## Commands

| Command | Purpose |
| --- | --- |
| `init [--yes] [--force] [--no-ci]` | Create `.git-guardian.yml` and install hooks; `--no-ci` skips the GitHub Actions question |
| `install [--force]` | Install or reinstall hooks in this clone |
| `uninstall` | Remove Guardian's hooks and restore any previous hooks |
| `doctor` | Check Git version, config and hooks |
| `validate [config]` | Validate the configuration |
| `validate branch [name]` | Check the current or a given branch name |
| `validate commit -m "<msg>"` / `-f <file>` | Check a commit message |
| `branch create <name> [--from <ref>]` | Validate, then create and switch to a branch |
| `validate commits <base>..<head>` | Check every commit message in a range, e.g. a pull request |
| `scan [-m "<msg>"]` | Scan staged changes (and optionally a message) for secrets |
| `scan --range <base>..<head>` | Scan the lines added in a range, for CI |
| `branch suggest "<text>"` | Suggest valid branch names, e.g. from `"ABC-42 Fix login crash"` |

Set `NO_COLOR=1` to turn colours off, or `FORCE_COLOR=1` to keep them when output is piped.

## Secret scanning

```text
$ git commit -m "feat: add config"
✗ Commit blocked by Git Guardian: possible secrets found.
  .env  Environment file  file should not be committed
  config.js:1  GitHub token  ghp_************
  config.js:2  Password in a URL  S3cr*******
```

The message continues with how to fix it. Only lines added by the commit are checked, so existing code doesn't trigger it, and merge commits aren't re-scanned. For a deliberate match, such as a test fixture, add `git-guardian:allow-secret` in a comment on that line, or list the path under `secrets.allow`. Templates such as `.env.example` are allowed.

This catches common mistakes; it isn't a full secret scanner. Pair it with your Git host's secret scanning (for example GitHub push protection). A secret that was pushed must be revoked and rotated, because removing it later doesn't erase it from history.

## GitHub Actions

Local hooks can be skipped, so run the same rules on every pull request too. In CI, Git Guardian validates the branch name, every commit message in the PR, the PR title (what lands on `main` with squash merge), and scans the PR's added lines for secrets.

**Recommended: answer yes to the last `init` question.** It installs [`@agnotic/ci-guardian`](../ci-guardian/Readme.md) from npm (no tarball needed), which also offers lint, Prettier and `npm audit`, then generates `.github/workflows/guardian-ci.yml` with one required status, `guardian-ci / required`. In an existing setup, run `npx ci-guardian init` instead.

**Git Guardian alone:** copy [examples/github-actions/git-guardian.yml](examples/github-actions/git-guardian.yml) to `.github/workflows/` and make its `conventions` check required.

Either way, failures show up as annotations on the PR:

```text
✓ 229e92e feat: add form
✗ 65c393e fixed stuff
    try: feat: fixed stuff
✗ 1 of 3 commit message(s) in 373d157..a59fc6e are invalid.
```

See [CI setup](docs/USAGE.md#ci-github-actions) for requirements (`fetch-depth: 0`, installing the CLI on the runner) and pitfalls.

## Uninstall

Order matters: remove the hooks **before** the package, or the leftover hooks can't find the CLI and block every commit.

**1. If CI Guardian runs Git Guardian checks** (`gitGuardian: enabled: true` in `.ciguardian.yml`), turn them off first, or the `git-guardian` CI job fails:

```bash
# in .ciguardian.yml set:  gitGuardian: enabled: false
git rm .github/workflows/guardian-ci.yml && npx ci-guardian generate --write
```

To remove CI Guardian as well, follow [its removal steps](../ci-guardian/Readme.md#remove) instead.

**2. Remove the hooks, the package and the files:**

```bash
npx git-guardian uninstall            # removes its hooks; restores any hooks you had before
npm uninstall @agnotic/git-guardian   # removes it from package.json and package-lock.json
git rm .git-guardian.yml
git rm tools/*git-guardian-*.tgz        # only if you installed from a tarball
```

If you use the standalone workflow (`.github/workflows/git-guardian.yml`), remove its required status in branch protection, then delete the file.

**3. Commit and push.** Hooks are per clone, so each teammate runs `npx git-guardian uninstall` after pulling and **before** their next `npm install` (until then the package is still in their `node_modules`). Anyone already blocked by "git-guardian: executable not found" can delete `.git/hooks/reference-transaction` and `.git/hooks/commit-msg`, then rename any `*.git-guardian-original` files back.

## Compared with Husky, commitlint and lefthook

| | Git Guardian | Husky + commitlint | lefthook |
| --- | --- | --- | --- |
| Setup | `npm i -D` + `npx git-guardian init` (guided) | `npm i -D`, `husky init`, hook files, commitlint config | Install binary, write `lefthook.yml` |
| Branch-name rules | Built in, checked before the branch exists | Not included; needs an extra script | Not included; needs a script |
| Commit-message rules | Built in, readable formats | commitlint rules (JS/JSON config) | Not included; needs commitlint or a script |
| Secret scan on commit | Built in | Not included | Not included |
| Existing hooks | Backed up, still run, restored on `uninstall` | You manage `.husky/` yourself | You manage `lefthook.yml` yourself |
| Teammate setup | `npx git-guardian install` (or automate it) | Automatic via the `prepare` script | `lefthook install` |
| Runs arbitrary tasks (lint, tests) on commit | No | Yes | Yes |
| CI enforcement | `validate commits`, or [CI Guardian](../ci-guardian/Readme.md) | Separate setup | Separate setup |

Pick Git Guardian when the goal is *naming and message conventions plus secret scanning*, with a CI check that matches. Keep Husky or lefthook for running linters and tests on commit; the two can coexist, because Git Guardian preserves hooks that are already there.

## Good to know

- **It's a local guard, not access control.** `git commit --no-verify` skips both the message check and the secret scan, and hooks can be disabled. Run the [GitHub Actions workflow](#github-actions) as a required check for enforcement.
- **Existing branches aren't re-checked**, and pushes and commit bodies aren't checked.
- **`protected` means "always allowed"**; it doesn't stop commits to `main`.
- **Each commit costs about 0.3 s**, because Git calls the hooks several times per commit.
- **GUI Git clients** that don't inherit your shell `PATH` need the project-local install (`node_modules`).

See [known limitations](docs/KNOWN_LIMITATIONS.md) before rolling out to a large team.

## Documentation

| Document | What's in it |
| --- | --- |
| [How it works](docs/HOW_IT_WORKS.md) | What gets installed, which hook runs at each Git command, how a name is checked |
| [Usage](docs/USAGE.md) | Setup, choosing conventions, daily work, CI, upgrade and removal |
| [Reference manual](docs/REFERENCE_MANUAL.md) | Commands, every config field, exit codes, troubleshooting |
| [Publishing](docs/PUBLISHING.md) | Steps to release on npm and make the repository public |
| [Development](docs/DEVELOPMENT.md) and [Contributing](CONTRIBUTING.md) | Building, testing and packaging |
| [Architecture](docs/ARCHITECTURE.md), [Decisions](docs/DECISIONS.md) | Module layout and design choices |
| [Testing](docs/TESTING.md), [Known limitations](docs/KNOWN_LIMITATIONS.md), [Roadmap](docs/ROADMAP.md) | Evidence, gaps and plans |
| [Security](docs/SECURITY.md), [Sources](docs/SOURCES.md), [Changelog](CHANGELOG.md) | Trust model, provenance, release history |

## Development

```bash
npm install
npm test               # build with tsc, then run the Node test suite
npm run docs:check     # required docs, local links and JSON syntax
```

To try a local build in another repository without packing: `export GIT_GUARDIAN_BIN=/path/to/git-guardian/dist/cli.js`.

## License

[MIT](LICENSE)
