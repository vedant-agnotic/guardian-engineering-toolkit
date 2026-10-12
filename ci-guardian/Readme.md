<p align="center">
  <img src="assets/ci-guardian-logo.png" alt="CI Guardian logo" width="250">
</p>

# ci-guardian

**A consistent way to configure, run and maintain project quality checks.**

> v0.1.0-alpha.0 · Requires Node 20+ and Git. Not published yet; [install from a tarball](#install).
> Implemented: config, `init`, `validate`, `doctor`, `run` with JSON reports, `generate` for GitHub Actions, and optional Git Guardian checks in the generated workflow.
> The generated workflow has been parsed and its scripts exercised locally, but not yet run on GitHub.
> Tested on macOS with Node 20; Linux is expected to behave the same; Windows is untested.
> Names, registry scope, license and release versions are not finalized.

## Purpose and scope

CI Guardian standardizes how projects invoke their existing linters, type checkers, tests and build checks. It supplies a typed configuration contract, a local runner, reports and a reviewable GitHub Actions workflow. It does not replace those tools, invent missing tests or host CI runners.

The first preset is React Native; a generic profile runs explicit commands for any other project without claiming a tested framework preset.

## Install

CI Guardian isn't on npm yet, so install it from a tarball. Requirements: Node.js 20+, Git, and a `package.json` in the project (run `npm init -y` if there isn't one).

**1. Build the tarball** (once, from this toolkit):

```bash
cd guardian-engineering-toolkit/ci-guardian
npm install
npm pack                     # creates ci-guardian-0.1.0-alpha.0.tgz
```

**2. Add it to your project.** Keep the tarball *inside* the project, in `tools/`, and commit it. A path outside the project works on your machine but makes `npm ci` fail on GitHub's runners.

```bash
cd /path/to/your-project
mkdir -p tools
cp /path/to/guardian-engineering-toolkit/ci-guardian/ci-guardian-0.1.0-alpha.0.tgz tools/
npm install --save-dev ./tools/ci-guardian-0.1.0-alpha.0.tgz
printf '.guardian/\n' >> .gitignore       # local run reports
```

**3. Run the setup** (next section): `npx ci-guardian init`.

Once published to npm, steps 1–2 become `npm install --save-dev <package-name>`.

Already using Git Guardian? Answer yes to its last setup question, "Also run these checks in GitHub Actions?"; it installs CI Guardian for you (asking for the tarball path) and continues with the setup below.

## Set up

```bash
npx ci-guardian init
```

Three short steps:

1. **Git Guardian checks in CI?** Adds branch-name, commit-message, PR-title and secret checks to the workflow. If [Git Guardian](../git-guardian/Readme.md) isn't set up yet, CI Guardian offers to install it and runs its setup first.
2. **Code checks.** Shows what the project can already run (a `lint` script or eslint, a `format:check` script or prettier, `npm audit` with a `package-lock.json`, type check, tests), lists anything missing with the command to add it, and asks "Add all?". You can add your own checks, e.g. `build`. Init never installs your app's dependencies.
3. **Review and create.** Previews `.ciguardian.yml`, writes it, and creates `.github/workflows/guardian-ci.yml`.

It ends with the exact next steps. In short:

```bash
npx ci-guardian run                  # try the checks locally, as CI will
git add .ciguardian.yml .github package.json package-lock.json tools
git commit                           # and push; open a pull request to see the workflow run
```

Then, on GitHub: **Settings → Branches → branch protection rule for `main` → require the `guardian-ci / required` status.** That one status passes only when every Guardian job passed, and its name doesn't change when you add or remove checks.

Output is colour-coded in a terminal (errors red, warnings yellow, success and commands green); set `NO_COLOR=1` to turn it off.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npx ci-guardian run` | Run every check, as CI will; writes `.guardian/ci/report.json` |
| `npx ci-guardian run --check lint` | Run one check (report marked partial) |
| `npx ci-guardian validate` | Check `.ciguardian.yml`; runs nothing |
| `npx ci-guardian doctor` | Check Node, paths and that every command exists; runs nothing |
| `npx ci-guardian generate` | Preview the workflow; `--write` creates it (never overwrites) |

To change checks, edit `.ciguardian.yml`; the workflow picks the change up automatically, because it runs `ci-guardian run`. To turn Git Guardian checks on or off, change `gitGuardian.enabled`, delete `.github/workflows/guardian-ci.yml` and run `npx ci-guardian generate --write`.

## Remove

CI Guardian installs no hooks and changes nothing outside the files it created, so removing it is just deleting those files. Do it in this order:

1. **On GitHub first:** Settings → Branches → edit the rule for `main` → remove the `guardian-ci / required` status. If you skip this, open pull requests wait forever for a status that will never report.
2. **Delete CI Guardian's files and the package:**

   ```bash
   git rm .ciguardian.yml .github/workflows/guardian-ci.yml tools/ci-guardian-*.tgz
   rm -rf .guardian                     # local reports
   npm uninstall ci-guardian            # removes it from package.json and package-lock.json
   ```

3. **Commit and push.**

Git Guardian is a separate tool and stays installed; its local hooks keep working. To remove it too, follow [Git Guardian's uninstall steps](../git-guardian/Readme.md#uninstall). Your lint, Prettier and test scripts are untouched; if you still want them in CI, call them from your own workflow.

## What works today

- `.ciguardian.yml` at the Git root, parsed by a restricted, dependency-free YAML reader: duplicate keys, anchors, aliases, tags and unknown fields are rejected, and every field is required.
- Commands are argv arrays run with `shell: false`; `$HOME`, `*` or `;` reach the program literally.
- `project.root` and `report.path` must stay inside the repository, including through symlinks.
- `run` executes checks in order with per-check timeouts. A timeout or Ctrl-C terminates the check's whole process tree. Stdin is closed, so an interactive command fails instead of hanging.
- `execution.failFast` marks unstarted checks as skipped with a reason.
- `run --check <id>` runs one check; its report says `scope: partial`.
- `generate` previews the GitHub Actions workflow and `generate --write` creates it, never overwriting an existing file. Actions are pinned to full commit SHAs, permissions are read-only, and pull-request values reach scripts only through environment variables.
- The JSON report is written atomically and records package version, config hash, commit SHA, scope, timestamps and each check's status, exit code, duration and reason.

## Try it without a project

A playground configuration with one passing, one failing and one hanging check:

```yaml
# .ciguardian.yml
version: 1
project:
  type: generic
  root: .
provider: github-actions
checks:
  - id: passes
    command: [node, -e, "console.log('ok')"]
    timeoutSeconds: 30
  - id: fails
    command: [node, -e, "process.exit(3)"]
    timeoutSeconds: 30
  - id: hangs
    command: [node, -e, "setInterval(() => {}, 1000)"]
    timeoutSeconds: 2
execution:
  failFast: false
report:
  path: .guardian/ci/report.json
```

`ci-guardian run` exits 1 and the report shows one passed check, one exit-code failure and one timeout. Set `failFast: true` to see the later checks skipped, or press Ctrl-C during `hangs` to see exit 130 and a `cancelled` report. Without installing anything, you can also run the built CLI directly: `node /path/to/ci-guardian/dist/cli.js run`.

To develop CI Guardian itself: `npm install`, then `npm test` (builds and runs the test suite). See [Development](docs/DEVELOPMENT.md).

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Requested checks passed (a partial run can pass, but its report says `partial`) |
| 1 | A check failed, could not start or timed out |
| 2 | Invalid invocation or config, not in a Git repository, doctor found problems, or the report could not be written |
| 130 | Interrupted; the report says `cancelled` |

## Documentation

- [Usage](docs/USAGE.md), [reference manual](docs/REFERENCE_MANUAL.md), [architecture](docs/ARCHITECTURE.md).
- [Development](docs/DEVELOPMENT.md), [testing](docs/TESTING.md), [roadmap](docs/ROADMAP.md).
- [Security](docs/SECURITY.md), [decisions](docs/DECISIONS.md), [sources](docs/SOURCES.md).
- [React Native configuration](examples/ciguardian.example.yml), [generic Python configuration](examples/ciguardian.python.example.yml).

The examples assume the consumer already defines the named commands and installs its own dependencies. CI Guardian does not report successful testing when a project has no test command; a missing executable is a failed check.
