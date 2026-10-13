# Documentation changelog

## 0.1.2 — 2026-10-13

- Added `commit.autoTicket: true` (default): automatically extracts the ticket or number from the current branch name and enriches the commit message when omitted.
- Added `git-guardian commit`: interactive guided commit wizard prompting for type, ticket/scope, and description with instant validation.
- Added standard Git ref name validation rules checking against Git forbidden characters (`:`, `..`, `~`, `^`, `?`, `*`, `[`, `\`, `@{`, `//`, `.lock`).
- Added Question 4 to `git-guardian init` to easily exclude standard branches (`main`, `develop`, etc.) from naming rules.
- Seamless integration with published `@agnotic/ci-guardian` package.

## Unreleased

- Replaced regular expressions with readable formats such as `<type>/<number>-<description>`; placeholders are `<type>`, `<number>`, `<ticket>`, `<scope>` and `<description>`, with `[ ]` for optional parts.
- `init` now asks for branch format, allowed types and commit format, validates each answer and shows an example.
- New defaults: branch `<type>/<number>-<description>`, commit `<type>: <description>`, types `feat, chore, bugfix, task`.
- Rejections now explain each placeholder, show an example and suggest names built from the input.
- The commit subject limit is now exactly `maxSubjectLength`; Git comment lines are ignored.
- Colour-coded output: errors red, warnings yellow, success green, placeholders yellow, examples and suggestions green, coloured help and init prompts. Colour is off when output is not a terminal; `NO_COLOR=1` disables it and `FORCE_COLOR=1` forces it.
- Published on npm as `@agnotic/git-guardian` (the unscoped `git-guardian` belongs to an unrelated package); the command stays `git-guardian`. `publishConfig.provenance` removed, because provenance only works when publishing from CI.
- Security: the example workflow uses `npx --no git-guardian`, so a missing dependency fails the job instead of downloading the unrelated npm package named `git-guardian`.
- Rewrote install and uninstall steps: tarballs live in the project's `tools/` folder; uninstall covers CI Guardian, teammates and recovery.
- `init` asks a final question, "Also run these checks in GitHub Actions?" On yes it installs CI Guardian (prompting for its tarball until it is published, copying it into `tools/`) and runs CI Guardian's setup. New `--no-ci` flag skips the question.
- Added CI support: `validate commits <base>..<head>` checks every commit message in a pull request, `scan --range <base>..<head>` scans a pull request's added lines for secrets, and failures print GitHub Actions annotations. Added a ready-to-copy workflow at `examples/github-actions/git-guardian.yml` that also checks the branch name and the PR title.
- Added secret scanning to the commit-msg hook: staged added lines and the commit message are checked for private keys, common cloud/SaaS tokens, passwords in URLs, hard-coded passwords and credential files such as `.env`. Findings are masked. New `secrets.enabled` and `secrets.allow` settings, an inline `git-guardian:allow-secret` marker, a `scan` command, and a fourth `init` question.
- Added [How it works](docs/HOW_IT_WORKS.md) (what is installed, which hook runs at each Git command, measured cost) and [Publishing](docs/PUBLISHING.md) (steps to release on npm and open the repository); rewrote the Readme.
- Breaking: `pattern`, `example`, `suggestionPrefixes` and `suggestionTypes` were removed; old configs fail with migration instructions.

## 2026-10-02 — documentation baseline for v0.1.1

- Included the supplied v0.1.1 runtime source/compiled output/tests unchanged.
- Replaced the earlier draft instructions with actual YAML configuration and validate commands.
- Added development, usage, reference, security, testing and limitation documentation.
- Added docs:check; adjusted package file allowlist to include documentation/examples.
- No registry release or runtime version bump performed.
