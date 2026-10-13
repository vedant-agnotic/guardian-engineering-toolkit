<p align="center">
  <img src="assets/guardian-toolkit-logo.png" alt="Guardian Engineering Toolkit logo" width="250">
</p>

# Guardian Engineering Toolkit

Independent packages that standardize engineering guardrails across projects: Git conventions, quality checks, mobile app environments and mobile releases.

| Package | Status | Responsibility | First target |
| --- | --- | --- | --- |
| <img src="git-guardian/assets/git-guardian-logo.png" alt="" width="50"> <p>[@agnotic/git-guardian](git-guardian/Readme.md)</p> | **Published on npm (`@agnotic/git-guardian`)** | Modern, zero-regex Husky alternative: readable branch-name rules enforced natively before branch creation, commit-message format validation, auto branch ticket extraction, interactive commit wizard (`git-guardian commit`), and secret scanning on commit | Ordinary Git repos across project languages |
| <img src="ci-guardian/assets/ci-guardian-logo.png" alt="" width="50"> <p>[@agnotic/ci-guardian](ci-guardian/Readme.md)</p> | **Published on npm (`@agnotic/ci-guardian`)** | Standardized CI quality checks (lint, test, type-check, audit) locally and across CI providers (GitHub Actions, GitLab CI, Bitbucket) with parallel execution, auto-fix mode (`ci-guardian fix`), smart file scoping, and GitHub Step Summary reports | JavaScript / TypeScript, React Native, generic CLIs |
| <img src="config-guardian/assets/config-guardian-logo.png" alt="" width="50"> <p>[config-guardian](config-guardian/Readme.md)</p> | Design draft | Define app environments once; generate and validate native configuration | RN development/staging/production on iOS and Android |
| <img src="release-guardian/assets/release-guardian-logo.png" alt="" width="50"> <p>[release-guardian](release-guardian/Readme.md)</p> | Design draft | Build, sign and upload mobile internal releases | RN iOS/TestFlight, then Android/Play Internal |

Git Guardian and CI Guardian are production-ready CLIs with comprehensive test suites. Git Guardian is published on npm as [`@agnotic/git-guardian`](https://www.npmjs.com/package/@agnotic/git-guardian). CI Guardian is published on npm as [`@agnotic/ci-guardian`](https://www.npmjs.com/package/@agnotic/ci-guardian) with MIT licensing and seamless two-way integration.

Start with [GUARDIAN_TOOLKIT_MANUAL.md](GUARDIAN_TOOLKIT_MANUAL.md) for the overall reference and implementation sequence.

## Set up the whole toolkit

Each package works independently or hand-in-hand. When setting up Git Guardian, it can automatically install and configure `@agnotic/ci-guardian` directly from npm:

```bash
npx git-guardian init   # branch/commit rules, secret scan, hooks; offers to set up CI Guardian
# or
npx ci-guardian init    # CI runner, quality checks, GitHub Actions workflow generation
```

The result: local hooks for branch names, commit messages and secrets, plus `.ciguardian.yml` and `.github/workflows/guardian-ci.yml` that run the same rules and your code checks on every pull request, behind one required status, `guardian-ci / required`.

## Install and remove

Both packages are designed as lightweight devDependencies installed directly from npm:

```bash
# Git Guardian (Husky alternative for branch & commit validation + secret scanning)
npm install --save-dev @agnotic/git-guardian
npx git-guardian init

# CI Guardian (Consistent local runner and GitHub Actions generator)
npm install --save-dev @agnotic/ci-guardian
npx ci-guardian init
```

| | Install | Remove |
| --- | --- | --- |
| Git Guardian | `npm i -D @agnotic/git-guardian` then `npx git-guardian init` | [Uninstall](git-guardian/Readme.md#uninstall): hooks first (`npx git-guardian uninstall`), then package |
| CI Guardian | `npm i -D @agnotic/ci-guardian` then `npx ci-guardian init` | [Remove](ci-guardian/Readme.md#remove): GitHub status rule first, then remove generated workflow and config |
| Both | Install either one and say yes when it offers the other | Remove CI Guardian first, then Git Guardian |

Git Guardian is published as **`@agnotic/git-guardian`** (`npm install --save-dev @agnotic/git-guardian`; the CLI command is `git-guardian`). The unscoped name `git-guardian` on npm is an unrelated package. Read [how it works](git-guardian/docs/HOW_IT_WORKS.md) for what runs at each Git command, and [publishing](git-guardian/docs/PUBLISHING.md) for release workflows.

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

Git Guardian and CI Guardian are [MIT](git-guardian/LICENSE). The other packages have no license selected yet and are marked `UNLICENSED` until they are ready to publish.
