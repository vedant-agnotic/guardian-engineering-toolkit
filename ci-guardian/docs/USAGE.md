# User guide

> Proposed v1 workflow. Guardian commands are not implemented in this scaffold.

## Install and prepare

Install our verified tarball at a pinned version as a local dev dependency, or globally for a non-Node repository. See the package identity requirement in [development](DEVELOPMENT.md). The CLI baseline is Node 22+. Application dependencies and toolchains remain the consuming project's responsibility.

Before setup, identify commands that already work: lint, type checking, unit tests and optionally a build check. For React Native, use the project's actual package manager and test framework. The example `--runInBand` applies to Jest-style commands and must not be copied to a different runner.

## Configure a new or existing project

1. Run `ci-guardian init` at the repository root. Select React Native or generic, project root and available check commands.
2. Review `.ciguardian.yml`. Init must not invent scripts, alter package scripts or install application dependencies.
3. Run `ci-guardian validate`, then `ci-guardian doctor` to identify missing executables or directories.
4. Run `ci-guardian run`. This executes repository code; use it only in a trusted checkout.
5. Use `ci-guardian run --check lint` for feedback during development. A partial run is labelled partial and cannot stand in for the full required gate.
6. Commit the configuration once the checks are meaningful and reproducible.

If init finds existing config, it refuses overwrite. In noninteractive automation use `init --defaults`, which writes the documented React Native example contract without proving that those scripts exist; review it and run doctor before execution.

## Generate GitHub Actions

`ci-guardian generate --provider github-actions` displays proposed output without changing the repository. Add `--write` to create a new `.github/workflows/guardian-ci.yml`. Existing workflows are never overwritten in v1; generation prints a conflict and requires manual merging.

The generator must require verified action revisions, the package version, dependency bootstrap commands and approved runtime versions before output is executable. There is no working workflow shipped in this scaffold; names and pins cannot be fabricated before the implementation repository exists.

For an existing CI pipeline, keep its installation, cache and environment setup. Replace only the check invocation after verifying equivalent behavior. Run the new job alongside old checks until results agree. Then update required status names deliberately; do not leave a required check pointing at a removed job.

Use a normal pull-request workflow with minimal read permissions. Checkout untrusted PR code only on isolated runners without deployment credentials. A trusted main-branch workflow can additionally run the same checks after merge.

## Dependency setup and artifacts

CI Guardian runs checks; it does not bootstrap every language. The workflow must install the locked Node/Python/Ruby/Java/SDK dependencies that the project actually needs. A native iOS build check requires an appropriate macOS/Xcode runner; the first React Native JS-check preset does not imply iOS compilation.

The proposed JSON report is `.guardian/ci/report.json`. Upload it and explicitly configured project test reports even after check failure. Do not include environment dumps or entire home directories. Report absence is an error, not a pass.

## Integrate Git Guardian

Install the separately pinned Git Guardian executable. Use `git-guardian validate branch <name>` and `git-guardian validate commit --file <path>`; bare `validate` is not a strict branch gate. Invoke its explicit branch validator using provider metadata and validate all commit subjects in the defined PR range. For the future CI adapter: fetch base and head history, compute the merge base, enumerate reachable head commits not reachable from the merge base, and fail clearly if history is insufficient. Make merge-commit and squash-title rules explicit. Never use a detached CI checkout's branch name as the PR source branch.

This adapter is milestone C4; it is not represented by an invented enabled field in the initial configuration. Until it exists, the consuming workflow owns these steps.

## Updating and removing

Update the pinned package and generated workflow revisions in a pull request. Compare generated output, run validation, observe a complete PR run, then adjust repository rules if required. Preserve a known-good revision for reversion.

To remove CI Guardian, replace its invocations with equivalent direct commands, update required statuses, remove only its owned config/report output and remove the package dependency. Existing tests, lint rules and unrelated workflows stay. There is no destructive uninstall command in v1.
