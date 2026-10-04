# Current decisions versus the earlier draft

| Topic | Earlier design | Supplied v0.1.1 source, authoritative for this manual |
| --- | --- | --- |
| Config | .gitguardian.json | .git-guardian.yml; limited scalar YAML |
| Commands | check/check-branch/check-commit | validate branch / validate commit |
| Hooks | Reference + pre-commit + commit-msg | Reference + commit-msg |
| Existing hooks | Refuse conflicts/manual integration | Backup and chain executable originals |
| Runtime | Proposed Node 22/Git 2.30 | Declared Node 20/Git 2.28 |
| Branch protection | Separate direct-commit restriction | protected is only naming allowlist |
| Init automation | --defaults/config-only flags | --yes; TTY answer n for config only |
| Errors | Separate usage/policy codes | Shared nonzero exit 1 |
| License | Open decision | MIT supplied with source |

This documentation adopts the existing implementation rather than claiming the early draft was built exactly. Code-level gaps are in KNOWN_LIMITATIONS.md and future gates in ROADMAP.md. No runtime behavior changes were made in this documentation update.
