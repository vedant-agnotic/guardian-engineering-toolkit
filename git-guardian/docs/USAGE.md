# User guide — v0.1.1

## Setup

Use Node 20+ and Git 2.28+ as declared by the package. Start in a disposable ordinary Git repository and install a verified local tarball as shown in the [Readme](../Readme.md). This avoids relying on unverified public registry ownership.

Run `git-guardian init`. It asks for branch regex, commit regex and whether hooks should be installed. Empty responses retain defaults. Answer `n` to write only configuration. `init --yes` writes defaults and installs without prompting. Non-TTY init also proceeds with defaults even without --yes; do not invoke it merely to inspect a repository.

An existing config causes init to fail unless `--force` is supplied. Avoid force during normal onboarding; it replaces policy and can also affect hook backups. Commit `.git-guardian.yml`. A colleague then installs dependencies and runs `git-guardian install`, followed by doctor. Hook activation is local to each clone.

## Choose conventions

The default branch pattern accepts types feature/fix/hotfix/chore/docs/refactor/test/release, an optional uppercase ticket and a lowercase hyphenated description. Examples: `feature/ABC-123-add-login`, `fix/LERA-428-payment-timeout`, `chore/update-dependencies`. The default release example is `release/v2-1-0`; dotted release versions require a custom pattern.

Edit the generated YAML to change rules. Lists such as protected names are comma-separated scalar strings, not YAML arrays. Keep regexes anchored with ^ and $ if you want whole-string matching; the code does not add anchors. Run `git-guardian validate config`, then explicitly validate representative accepted/rejected inputs. Config validation does not prove that examples or suggestions satisfy a custom pattern.

## Daily work

```bash
git switch -c feature/ABC-123-add-login
git-guardian validate branch feature/ABC-123-add-login
git-guardian validate commit -m 'feat(auth): add login'
git-guardian branch suggest 'ABC-123 add login'
```

Native branch operations are checked when Git invokes the installed reference hook. The helper `git-guardian branch create feature/ABC-123-add-login --from develop` validates and runs `git switch -c`; it also switches the current branch.

On rejection, correct the input and retry. Suggestions are candidates; custom regexes can reject them, so run the explicit validator before using one. Existing branches are not retroactively rejected by a pre-commit hook because this version has none.

The commit hook validates the message and does not rewrite it. Default Merge/Revert prefix exemptions are enabled; disable them in YAML if your policy needs checks on those subjects. These are prefix-based exemptions, not verification that Git generated the message.

## Existing hooks and Husky

The installer uses the effective hooks directory, including a configured core.hooksPath. It renames an existing target hook to `<hook>.git-guardian-original` and installs a wrapper. An executable original handler runs first; failure stops the chain. Reference-transaction stdin is captured and replayed for both handlers.

Inspect the effective hook files before and after installation. Compatibility with every Husky version/layout has not been proven. If another manager regenerates its hooks, Guardian may need deliberate reintegration. If both a hook and backup already exist, resolve the conflict manually; force may discard the previous backup. A shared global hooks directory can affect other repositories, so prefer repository-local ownership for a pilot.

## CI

Use the actual PR source branch from provider metadata:

```sh
./node_modules/.bin/git-guardian validate branch "$GITHUB_HEAD_REF"
```

Pass values as data, not interpolated shell source. Do not use plain `validate` as a strict branch gate: it warns on an invalid current branch without failing. Validate every intended commit separately using `validate commit --file <file>` until a range command exists. Git Guardian does not collect PR ranges or generate workflows in this version. Required host rules remain authoritative.

## Upgrade and remove

Upgrade a pinned artifact in a branch, inspect config changes, run validators and test hook behavior in a disposable clone. The current installer overwrites hooks carrying its marker without comparing content hashes; preserve local edits first.

Before uninstall, inspect both managed hooks and `.git-guardian-original` backups. Current uninstall restores backups even if another hook has appeared at the destination; preserve any user changes before running it. Then run `git-guardian uninstall` and remove the package dependency. Config remains available for deliberate removal. For limitations and future safety work see [known limitations](KNOWN_LIMITATIONS.md).
