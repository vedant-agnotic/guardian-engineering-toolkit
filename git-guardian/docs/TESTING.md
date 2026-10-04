# Test evidence and release acceptance

## This documentation task

Ran the supplied compiled-output test suite on 2 October 2026. The branch, commit, config and YAML test files passed. The hooks test file could not complete: its Git subprocess calls were blocked by the execution environment with `spawnSync git EPERM` at `git config --get core.hooksPath`. A direct rerun confirmed that environmental block. This is not evidence that hook integration passes or fails on the user's Mac.

No runtime code was changed to work around the block. No fresh TypeScript build, npm dependency install, macOS/Windows matrix or registry publication was performed. Documentation integrity, example parsing and packaging are checked separately.

## Existing tests

`test/branch.test.js`, `commit.test.js`, `config.test.js`, `yaml.test.js` and `hooks.test.js` run against dist. The hook tests cover backup/restore, ordinary switch creation, unborn checkout creation and commit messages in temporary repositories.

## Required before wider rollout

- Rebuild and rerun all tests in an environment permitting Git hook/config operations.
- Test native branch/checkout/switch, existing updates, force updates, ref deletions, multiple refs, SHA formats and symbolic/unborn cases.
- Assert rejected ordinary creation leaves no new ref and preserves expected HEAD/index/worktree state.
- Test hooks with stdin-consuming existing handlers, configured shared paths, changed backups, edited wrappers, interrupted install and uninstall conflicts.
- Add strict config, candidate-suggestion and commit-length regressions when hardening those contracts.
- Test actual packed local/global resolution and GUI PATH, paths with spaces, missing runtime and executable permissions.
- Verify minimum/current declared Git/Node on each supported OS before announcing compatibility.

Passing a documentation checker proves neither product correctness nor store/CI integration.
