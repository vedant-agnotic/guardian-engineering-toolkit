# Known limitations and implementation gaps — v0.1.1

These findings come from reading the supplied source. They are documented here rather than silently altering runtime code during a documentation task.

| Area | Current behavior | Follow-up |
| --- | --- | --- |
| Config strictness | Defaults replace wrong/missing types; unknown keys ignored; duplicate keys overwrite | Reject invalid types, unknown and duplicate fields |
| Suggestions | Candidates not revalidated against custom policy/Git syntax | Filter candidates and validate diagnostic examples |
| Commit length | Guard is maxSubjectLength + 32; JS UTF-16 length | Define and implement precise total-subject semantics |
| Merge/revert | Prefix-based bypass enabled by default | Document or implement structured exemptions |
| Branch protection | protected means naming allowlist only | Rename field or add distinct direct-commit rule |
| Existing branches | No pre-commit branch validation | Decide whether to add explicit check hook |
| Hook ownership | Marker only; edited managed hooks can be overwritten | Manifest/hashes and conflict refusal |
| Uninstall | Existing backup can replace a changed target hook | Preserve user edits before restoring |
| Force install | Can delete an existing backup | Safer recovery flow with explicit backup preservation |
| Multi-hook mutation | No all-or-nothing rollback | Transactional install and failure recovery |
| Configured hooks path | Inherited/shared path may be written | Detect scope and prevent unintended multi-repo impact |
| Hook toggles | Disabling install flag does not remove old installed wrapper | Reconcile enabled/disabled state explicitly |
| Doctor | Warnings can exit zero; no end-to-end hook proof | Machine-readable/strict diagnostic mode |
| Compatibility | Minimum declared versions are not full matrix evidence | Test native Git versions, OSes, GUIs, worktrees/submodules |
| CI | No PR range collector or workflow generator | Keep explicit validation in consumer CI |
| Secret scan | Pattern rules only; added lines only; binary files and very long lines skipped; no entropy-only detection | Pair with host-side secret scanning; add rules as needed |

Ordinary native ref creation and symbolic/unborn paths need their own integration evidence. A hook only protects operations that invoke it; client libraries and disabled hooks can bypass it. Never present these local checks as remote access control.
