# User guide

> v0.1.0-alpha.0: `init`, `validate`, `doctor` and `run` are implemented. `generate` and the Git Guardian adapter are still proposals.

## Install and prepare

Until CI Guardian is published, install it from a tarball kept in the project's `tools/` folder, so the same path works on CI runners:

```bash
mkdir -p tools && cp /path/to/ci-guardian-0.1.0-alpha.0.tgz tools/
npm install --save-dev ./tools/ci-guardian-0.1.0-alpha.0.tgz
printf '.guardian/\n' >> .gitignore
```

Build the tarball with `npm pack` in the `ci-guardian` folder. Full steps are in the [Readme](../Readme.md#install). Git Guardian's setup can also install it for you (its last question). In a repository without `package.json`, you can run `node <path>/dist/cli.js` locally, but the generated workflow needs a Node project. The CLI needs Node 20+; the application's own dependencies and toolchains remain the project's responsibility.

Before setup, identify commands that already work: lint, type checking, unit tests and optionally a build check. For React Native, use the project's actual package manager and test framework. The example `--runInBand` applies to Jest-style commands and must not be copied to a different runner.

## Configure a new or existing project

1. Run `ci-guardian init` at the repository root and answer:
   1. **Add Git Guardian checks to the CI pipeline?** If yes and Git Guardian isn't set up, it offers to set it up now: installs it (asking for the tarball path until it's on npm, then copying it into `tools/`) and runs `git-guardian init --no-ci`.
   2. **Code checks:** lint, Prettier, npm audit, type check and tests, each offered only when the project can already run it. You can add other checks by id and command.
   3. **Write `.ciguardian.yml`?** and **create the workflow?**
2. Review `.ciguardian.yml`. Init doesn't invent scripts, change package scripts or install application dependencies.
3. Run `ci-guardian validate`, then `ci-guardian doctor` to find missing executables or directories.
4. Run `ci-guardian run`. This executes repository code; use it only in a trusted checkout.
5. Use `ci-guardian run --check lint` for feedback during development. A partial run is labelled partial and can't stand in for the full required gate.
6. Commit `.ciguardian.yml`, the workflow, `package-lock.json` and any tarballs in `tools/`.

If init finds existing config, it refuses to overwrite it. In noninteractive automation use `init --defaults`, which writes the documented React Native example without proving those scripts exist; review it and run doctor before execution.

## Generate GitHub Actions

`ci-guardian generate` prints the workflow without changing anything; `generate --write` creates `.github/workflows/guardian-ci.yml`. An existing file is never overwritten: compare it with the preview and merge by hand, or delete it and write again.

The workflow has up to three jobs:

| Job | Runs on | What it does |
| --- | --- | --- |
| `git-guardian` (if `gitGuardian.enabled`) | Pull requests, except `dependabot/` and `renovate/` branches | `validate branch`, `validate commits <base>..<head>`, the PR title (the commit message on squash merge), and `scan --range` for secrets. Full history (`fetch-depth: 0`). Each check runs even if an earlier one failed. |
| `checks` (if any checks) | Pull requests and pushes to the default branch | `npm ci`, then `ci-guardian run`; uploads the JSON report even on failure |
| `required` | Always | Fails unless `checks` succeeded and `git-guardian` succeeded or was skipped by design |

Require **`guardian-ci / required`** in branch protection. Its name never changes when checks are added or removed.

Other details: actions are pinned to full commit SHAs (checkout, setup-node, upload-artifact); permissions are `contents: read`; Node comes from `.nvmrc`/`.node-version` if present, else 20; dependencies are installed with `npm ci`, so commit `package-lock.json`. Pull-request values (branch name, title, SHAs) are passed as environment variables and quoted, never pasted into scripts, so a crafted branch name can't run commands.

Generation warns when `package.json` installs a package from a `file:` path outside the repository: that works on your machine but fails on the runner. Keep Guardian tarballs in `tools/` and commit them until the packages are published.

For an existing CI pipeline, keep its installation, cache and environment setup. Run the new workflow alongside the old checks until results agree, then switch required statuses deliberately.

## Dependency setup and artifacts

CI Guardian runs checks; it does not bootstrap every language. The workflow must install the locked Node/Python/Ruby/Java/SDK dependencies that the project actually needs. A native iOS build check requires an appropriate macOS/Xcode runner; the first React Native JS-check preset does not imply iOS compilation.

The proposed JSON report is `.guardian/ci/report.json`. Upload it and explicitly configured project test reports even after check failure. Do not include environment dumps or entire home directories. Report absence is an error, not a pass.

## Integrate Git Guardian

Set `gitGuardian.enabled: true` in `.ciguardian.yml` (init does this when you answer yes) and regenerate the workflow. The generated `git-guardian` job calls Git Guardian's own commands. CI Guardian doesn't copy its rules, so `.git-guardian.yml` stays the single source for branch and commit formats and secret settings. Git Guardian must be a devDependency so `npm ci` installs it on the runner.

`ci-guardian run` doesn't run the Git Guardian checks locally; locally, Git Guardian's hooks already check every branch and commit. To check a whole branch before opening a PR, run `npx git-guardian validate commits origin/main..HEAD`.

## Updating and removing

### Update CI Guardian

1. Build or download the new tarball, replace the old one in `tools/`, and install it: `npm install --save-dev ./tools/ci-guardian-<version>.tgz`. Delete the old tarball.
2. Run `npx ci-guardian validate` and `npx ci-guardian run`.
3. Compare the workflow: `npx ci-guardian generate > /tmp/new.yml && diff .github/workflows/guardian-ci.yml /tmp/new.yml`. To take the new version, delete the old file and run `npx ci-guardian generate --write`. Generation never overwrites an existing file.
4. Commit everything in a pull request and check that `guardian-ci / required` passes before merging. Keep the previous tarball's commit, so you can revert.

### Change checks

Edit `.ciguardian.yml` and commit; the workflow runs `ci-guardian run`, so it picks the change up without regeneration. Only turning `gitGuardian.enabled` on or off changes the workflow itself: delete it and run `generate --write` again.

### Remove CI Guardian

CI Guardian installs no hooks; it owns only the files it created. Remove them in this order:

1. **On GitHub first:** Settings → Branches → edit the rule for the default branch → remove the `guardian-ci / required` required status. Otherwise open pull requests wait for a status that never reports.
2. **Delete its files and the dependency:**

   ```bash
   git rm .ciguardian.yml .github/workflows/guardian-ci.yml tools/ci-guardian-*.tgz
   rm -rf .guardian
   npm uninstall ci-guardian
   ```

3. **Commit and push.**

Git Guardian, if installed, stays and keeps working locally. Project scripts (lint, tests, Prettier) are untouched. To keep running them in CI, call them from your own workflow, e.g. `npm run lint` and `npm test` steps after `npm ci`.

### Remove Git Guardian but keep CI Guardian

Turn the Git Guardian job off first, then remove Git Guardian:

1. In `.ciguardian.yml`, set `gitGuardian.enabled: false` (with no checks left, add at least one check, or remove CI Guardian entirely).
2. Regenerate the workflow: `git rm .github/workflows/guardian-ci.yml && npx ci-guardian generate --write`.
3. Follow [Git Guardian's uninstall steps](../../git-guardian/Readme.md#uninstall).

If Git Guardian were removed while the job still referenced it, the job would fail with "npx canceled due to missing packages". The workflow runs `npx --no`, which refuses to download a package of the same name from npm instead.
