# User guide — v0.1.1

## Setup

Use Node 20+ and Git 2.28+ as declared by the package. Start in a disposable ordinary Git repository and install a verified local tarball as shown in the [Readme](../Readme.md). This avoids relying on unverified public registry ownership.

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

## CI (GitHub Actions)

Local hooks can be skipped (`--no-verify`, a GUI client without Node, a teammate who never ran `install`). Running the same checks on every pull request, as a required status check, closes that gap. There are two ways:

- **With CI Guardian (recommended).** Answer yes to the last `git-guardian init` question, or run `npx ci-guardian init` later. CI Guardian generates `.github/workflows/guardian-ci.yml` with these checks plus lint, Prettier, npm audit and tests, behind one required status, `guardian-ci / required`. See [CI Guardian's usage guide](../../ci-guardian/docs/USAGE.md#generate-github-actions).
- **Git Guardian alone.** Copy [examples/github-actions/git-guardian.yml](../examples/github-actions/git-guardian.yml) to `.github/workflows/git-guardian.yml`.

Both run the same four checks:

| Step | Command | Catches |
| --- | --- | --- |
| Branch name | `validate branch "$BRANCH"` | A PR from a badly named branch |
| Commit messages | `validate commits "$BASE_SHA..$HEAD_SHA"` | Every commit in the PR, not just the last |
| PR title | `validate commit -m "$PR_TITLE"` | The message that lands on `main` with **squash merge** |
| Secrets | `scan --range "$BASE_SHA..$HEAD_SHA"` | Keys, tokens, passwords or `.env` files added anywhere in the PR |

Each check runs even if an earlier one failed, so one run lists every problem. Inside GitHub Actions, failures also appear as annotations on the pull request (secret findings point to the file and line). Colours are kept with `FORCE_COLOR: '1'`.

Requirements and pitfalls:

- **`fetch-depth: 0` is required** on `actions/checkout`. With the default shallow clone, the base commit is missing and `validate commits` stops with a message asking for it.
- **Use the PR's `head_ref` for the branch.** On a pull request the runner checks out a detached merge commit, so the "current branch" is meaningless. Plain `validate` isn't a gate either; it only warns.
- **Pass event values through `env:`** and quote them (`"$BRANCH"`). Branch names and PR titles are user input; pasting `${{ github.head_ref }}` straight into a `run:` script lets a crafted name run commands. The example workflow does this correctly, and a branch named `wip/$(touch${IFS}PWNED)` was verified to execute nothing.
- **Bot branches** (`dependabot/…`, `renovate/…`) don't follow team conventions; the example skips them.
- **The CLI must be installable on the runner.** Until Git Guardian is on npm, commit the tarball (e.g. `tools/git-guardian-0.1.1.tgz`) and add it as a devDependency: `"git-guardian": "file:tools/git-guardian-0.1.1.tgz"`. `npm ci` then installs it. After publishing, a non-Node project can run `npm install --global <name>@<version>` instead.
- **Make it required:** repository Settings → Branches (or Rules) → require the `conventions` check before merging. Pin actions to full commit SHAs in production.

The range commands also work locally, e.g. `npx git-guardian validate commits origin/main..HEAD` before opening a PR. To fix bad commit messages: `git rebase -i origin/main`, mark them `reword`, then `git push --force-with-lease`.

## Upgrade and remove

**Upgrade:** replace the tarball in `tools/` with the new one, run `npm install --save-dev ./tools/git-guardian-<version>.tgz`, delete the old tarball, then `npx git-guardian install` to refresh the hooks and `npx git-guardian validate config`. Test in a branch before merging. Re-installing replaces hooks that carry Guardian's marker without comparing content, so keep any local edits to them first.

**Remove:** follow the ordered steps in the [Readme](../Readme.md#uninstall). In short:

1. If CI Guardian runs Git Guardian checks, set `gitGuardian.enabled: false` in `.ciguardian.yml` and regenerate the workflow.
2. `npx git-guardian uninstall` (hooks first), then `npm uninstall git-guardian`, then delete `.git-guardian.yml` and the tarball in `tools/`.
3. Each teammate runs `npx git-guardian uninstall` before their next `npm install`.

Uninstall restores `.git-guardian-original` backups even if another hook has appeared at the destination since; check `.git/hooks` first if you've added hooks after installing. For limitations and future safety work see [known limitations](KNOWN_LIMITATIONS.md).
