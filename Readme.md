<p align="center">
  <img src="assets/guardian-toolkit-logo.png" alt="Guardian Engineering Toolkit logo" width="250">
</p>

# Guardian Engineering Toolkit

Independent packages that standardize engineering guardrails across projects: Git conventions, quality checks, mobile app environments and mobile releases.

| Package | Status | Responsibility | First target |
| --- | --- | --- | --- |
| <img src="git-guardian/assets/git-guardian-logo.png" alt="" width="50"> <p>[git-guardian](git-guardian/Readme.md)</p> | **v0.1.1, working CLI** | Branch and commit conventions; safe local hooks | Ordinary Git repos across project languages |
| <img src="ci-guardian/assets/ci-guardian-logo.png" alt="" width="50"> <p>[ci-guardian](ci-guardian/Readme.md)</p> | Design draft | Run quality checks and generate CI workflows | RN JS checks, generic explicit commands, GitHub Actions |
| <img src="config-guardian/assets/config-guardian-logo.png" alt="" width="50"> <p>[config-guardian](config-guardian/Readme.md)</p> | Design draft | Define app environments once; generate and validate native configuration | RN development/staging/production on iOS and Android |
| <img src="release-guardian/assets/release-guardian-logo.png" alt="" width="50"> <p>[release-guardian](release-guardian/Readme.md)</p> | Design draft | Build, sign and upload mobile internal releases | RN iOS/TestFlight, then Android/Play Internal |

Only Git Guardian has an implementation and tests today. CI, Config and Release Guardian are documentation-first scaffolds: their commands are proposed interfaces, not working CLIs, and their manifests are private. No package has been published to a registry.

Start with [GUARDIAN_TOOLKIT_MANUAL.md](GUARDIAN_TOOLKIT_MANUAL.md) for the overall reference and implementation sequence.

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
cd git-guardian && npm install && npm test
```

## Recommended build order

Git Guardian v0.1.1 hardening → safe installer → CI Guardian runner and reports → CI workflow generation → Release Guardian iOS pilot → Android pilot. Config Guardian does not depend on Release Guardian and starts with its inspect/validate milestone. The packages remain independently usable; any integration should be optional and versioned.

## License

Git Guardian is [MIT](git-guardian/LICENSE). The other packages have no license selected yet and are marked `UNLICENSED` until they are ready to publish.
