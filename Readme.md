<p align="center">
  <img src="assets/guardian-toolkit-logo.png" alt="Guardian Engineering Toolkit logo" width="250">
</p>

# Guardian Engineering Toolkit

Independent packages that standardize engineering guardrails across projects: Git conventions, quality checks, mobile app environments and mobile releases.

| Package | Status | Responsibility | First target |
| --- | --- | --- | --- |
| <img src="git-guardian/assets/git-guardian-logo.png" alt="" width="50"> <p>[git-guardian](git-guardian/Readme.md)</p> | **v0.1.1, working CLI** | Readable branch-name and commit-message rules (`<type>/<number>-<description>`) plus secret scanning on commit, enforced by local Git hooks | Ordinary Git repos across project languages |
| <img src="ci-guardian/assets/ci-guardian-logo.png" alt="" width="50"> <p>[ci-guardian](ci-guardian/Readme.md)</p> | **v0.1.0-alpha.0, runner and workflow generation** | Run quality checks and generate CI workflows | RN JS checks, generic explicit commands, GitHub Actions |
| <img src="config-guardian/assets/config-guardian-logo.png" alt="" width="50"> <p>[config-guardian](config-guardian/Readme.md)</p> | Design draft | Define app environments once; generate and validate native configuration | RN development/staging/production on iOS and Android |
| <img src="release-guardian/assets/release-guardian-logo.png" alt="" width="50"> <p>[release-guardian](release-guardian/Readme.md)</p> | Design draft | Build, sign and upload mobile internal releases | RN iOS/TestFlight, then Android/Play Internal |

Git Guardian and CI Guardian have implementations and tests. CI Guardian covers config, `validate`, `doctor`, `run` with JSON reports and GitHub Actions workflow generation. Config and Release Guardian are documentation-first scaffolds: their commands are proposed interfaces, not working CLIs. All manifests except Git Guardian's are private. No package has been published to a registry.

Start with [GUARDIAN_TOOLKIT_MANUAL.md](GUARDIAN_TOOLKIT_MANUAL.md) for the overall reference and implementation sequence.

## Set up the whole toolkit

Each package works on its own, and they also set each other up. Starting from either one gives the same result:

```bash
npx git-guardian init   # branch/commit rules, secret scan, hooks; last question: "Also run these checks in GitHub Actions?"
# or
npx ci-guardian init    # "Add Git Guardian checks to CI?" (sets up Git Guardian if missing), then lint, Prettier, npm audit, tests
```

The result: local hooks for branch names, commit messages and secrets, plus `.ciguardian.yml` and `.github/workflows/guardian-ci.yml` that run the same rules and your code checks on every pull request, behind one required status, `guardian-ci / required`. The tools only call each other's commands; no code is shared. Until they're on npm, setup asks for the other package's `.tgz` and copies it into `tools/` so CI can install it.

## Install and remove

Neither package is on npm yet. Build a tarball with `npm install && npm pack` in the package folder, copy it into your project's `tools/` folder, commit it, and install it from there: `npm install --save-dev ./tools/<file>.tgz`. Keeping it inside the project lets teammates and CI install it with a plain `npm install`.

| | Install | Remove |
| --- | --- | --- |
| Git Guardian | [Install](git-guardian/Readme.md#install), then `npx git-guardian init` | [Uninstall](git-guardian/Readme.md#uninstall): hooks first, then the package |
| CI Guardian | [Install](ci-guardian/Readme.md#install), then `npx ci-guardian init` | [Remove](ci-guardian/Readme.md#remove): the required status on GitHub first, then the files |
| Both | Install either one and say yes when it offers the other | Remove CI Guardian first, then Git Guardian |

Read Git Guardian's [how it works](git-guardian/docs/HOW_IT_WORKS.md) for what runs at each Git command, and [publishing](git-guardian/docs/PUBLISHING.md) for the steps to release it on npm. The npm name `git-guardian` is already taken by an unrelated package, so the public release needs a scoped or different name.

## Repository layout

Each package folder is self-contained: it has its own `package.json`, changelog, docs, examples and version, and its documentation links stay inside the folder. A package can be extracted into its own repository or kept here and versioned independently. See [config-guardian's repository layout](config-guardian/docs/REPOSITORY_LAYOUT.md) for the monorepo conventions.

Every package includes:

- `Readme.md`, `CONTRIBUTING.md`, `CHANGELOG.md` and `package.json`.
- Usage guide, reference manual, development guide, architecture, testing plan, roadmap, security notes and decisions.
- Configuration examples and `scripts/check_docs.py`, which checks required documents, local links and JSON syntax.

Package-specific extras: Release Guardian has a release operations and credential-rotation manual; Config Guardian has a JSON Schema for its configuration.

## Verify a checkout

```bash
# Documentation integrity, per package
for p in git-guardian ci-guardian config-guardian release-guardian; do
  (cd "$p" && python3 scripts/check_docs.py)
done

# Git Guardian build and tests (Node 20+, Git 2.28+)
(cd git-guardian && npm install && npm test)

# CI Guardian build and tests (Node 20+)
(cd ci-guardian && npm install && npm test)
```

## Recommended build order

Git Guardian hardening and first public npm release → safe installer → CI Guardian runner and reports → CI workflow generation → Release Guardian iOS pilot → Android pilot. Config Guardian does not depend on Release Guardian and starts with its inspect/validate milestone. The packages remain independently usable; any integration should be optional and versioned.

## License

Git Guardian is [MIT](git-guardian/LICENSE). The other packages have no license selected yet and are marked `UNLICENSED` until they are ready to publish.
