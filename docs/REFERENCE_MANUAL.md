# Git Guardian reference manual — v0.1.1

This manual describes the supplied source, not the superseded JSON/three-hook draft.

## Commands

| Command | Behavior |
| --- | --- |
| `init [--yes|-y] [--force] [--no-ci]` | Create YAML; prompt on TTY unless yes; optionally install hooks; force replaces config. The last prompt offers to set up CI Guardian (installs it and runs `ci-guardian init --with-git-guardian`); `--no-ci` or `--yes` skips it |
| `install [--force]` | Load config and install enabled hooks in effective directory |
| `uninstall` | Remove marked hooks and restore backups; inspect edits first |
| `doctor` | Load config; report Git version, effective hooks path, marker and executability |
| `validate` / `validate config` | Validate config; warn about invalid current branch |
| `validate branch [name]` | Fail for invalid explicit/current branch; explicit name required in detached HEAD |
| `validate commit --message <text>` / `-m` | Validate supplied message |
| `validate commit --file <path>` / `-f` | Read UTF-8 file and validate; file takes precedence when both given |
| `validate commits <base>..<head>` | Validate every commit message in the range (git log base..head); exit 1 if any fails; needs both commits locally |
| `scan [--message <text>]` | Scan staged added lines (and an optional message) for secrets; exit 1 on findings |
| `scan --range <base>..<head>` | Scan lines added since the branch split (git diff base...head); for CI |
| `branch create <name> [--from <ref>]` | Validate, reject existing branch, then run git switch -c |
| `branch suggest <description>` | Print candidate names; does not create anything |
| `hook commit-msg <file>` | Internal message-hook entry point |
| `hook reference-transaction <state>` | Internal ref hook; reads stdin |
| `help`, `--help`, `-h` | Usage |
| `version`, `--version`, `-v` | Package version |

Exit 0 means the command completed; exit 1 represents caught errors or rejected validation. The current CLI does not implement the earlier draft's distinct exit 2. Doctor warnings and plain validate's branch warning can still return 0. Unknown top-level commands fail, but strict rejection of every unknown option is not implemented.

## Configuration fields

File: `.git-guardian.yml` at Git root. Defaults are in [the example](../examples/git-guardian.example.yml). The parser supports nested mappings and scalars with two-space indentation. Arrays and tabs are unsupported; use CSV strings for list fields. Double-quoted strings are parsed using JSON escaping. This is not a full YAML implementation.

| Field | Default / type | Actual meaning |
| --- | --- | --- |
| `version` | 1 / number | Must equal 1 |
| `branch.enabled` | true / boolean | Enable branch validation |
| `branch.format` | `<type>/<number>-<description>` / string | Readable format; see the [user guide](USAGE.md#choose-conventions). Whole name must match |
| `branch.types` | feat,chore,bugfix,task / CSV | Values allowed for `<type>`; lowercase letters, numbers, hyphens |
| `branch.protected` | main,master,develop,development,staging,production / CSV | Names always accepted; does not prevent commits/pushes |
| `branch.suggestions` | true / boolean | Include suggestions on validation failure |
| `commit.enabled` | true / boolean | Enable message validation |
| `commit.format` | `<type>: <description>` / string | Readable format for the first line. Whole line must match |
| `commit.types` | feat,chore,bugfix,task / CSV | Values allowed for `<type>` |
| `commit.maxSubjectLength` | 72 / positive integer | Maximum first-line length; suggestions are shortened to fit |
| `commit.allowMergeCommits` | true / boolean | Accept normalized text beginning with Merge word |
| `commit.allowRevertCommits` | true / boolean | Accept normalized text beginning with Revert word |
| `secrets.enabled` | true / boolean | Scan staged added lines and the message of each commit for likely secrets |
| `secrets.allow` | empty / CSV of path globs | Paths never scanned; `*` within a folder, `**` across folders, e.g. `test/fixtures/**` |
| `hooks.referenceTransaction` | true / boolean | Install reference hook when branch validation enabled |
| `hooks.commitMsg` | true / boolean | Install the commit-msg hook when commit validation or secret scanning is enabled |

Missing or wrong-typed fields fall back to defaults. Unknown keys are ignored; duplicate parsed keys overwrite earlier ones. The 0.1.x fields `pattern`, `example`, `suggestionPrefixes` and `suggestionTypes` are rejected with migration instructions. Validation checks schema version, that formats use known placeholders with balanced brackets, valid type names, positive integer maxSubjectLength and nonempty CSV sets. It does not impose a strict schema, validate examples or enforce Git syntax on explicit string validation. Native Git still validates its own ref syntax.

## Commit semantics

The validator trims the whole message before taking its first line, so whitespace is normalized rather than explicitly rejected. Lines starting with `#` (Git's editor comments) are ignored. Prefix exemptions run before length/format checks. The first line must be at most maxSubjectLength characters (JavaScript string length, i.e. UTF-16 code units) and match commit.format. Body/footers are not checked. No file rewrite occurs.

## Hooks and runtime lookup

Two hooks: reference-transaction and commit-msg. No pre-commit hook. Handler code accepts preparing and prepared states; other states return success. It examines refs/heads and a symbolic HEAD target when the old value is zero and the target ref is absent. Cross-version behavior, especially unborn branches, needs verification; the handler's source comments do not establish a universal Git guarantee.

Wrapper resolution order: `GIT_GUARDIAN_BIN` JavaScript entry path executed through node → root-local node_modules executable → PATH executable → error. No package download fallback. Reference input is replayed from a temporary file; executable original hooks run before Guardian.

Owned-hook detection uses the text marker `# git-guardian-managed-hook v1`, not hashes. Backups use `.git-guardian-original`. Installer does not change core.hooksPath and can write to an inherited/shared configured directory. Disabled settings skip installation, but do not remove a previously installed hook. The runtime branch/commit enabled switches disable their corresponding validator; hook-install flags alone do not.

## Troubleshooting

| Symptom | Check and action |
| --- | --- |
| Missing config | Run init in correct repo or restore `.git-guardian.yml`; old `.gitguardian.json` is not loaded |
| "possible secrets found" on a false positive | Add `git-guardian:allow-secret` in a comment on the line, or add the path to `secrets.allow` |
| A real secret was blocked | Remove it and use an environment variable; if it was ever pushed anywhere, revoke and rotate it |
| Suggestion contains `<number>` or another placeholder | The value could not be found in your input; fill it in |
| "uses fields from an older version" | Replace regex `pattern` fields with `format` and `types`, or delete the config and rerun init |
| Doctor succeeds but hook absent | Read warnings; doctor is not a strict installation gate |
| Invalid branch passes CI | Use `validate branch "$BRANCH"` with the PR head ref, not bare validate |
| "is not available in this clone" in CI | Set `fetch-depth: 0` on actions/checkout so the base commit exists |
| Existing hook/backups conflict | Preserve both and reconcile; avoid blind force |
| CLI not found in GUI | Configure Node/PATH or local install used by that client |
| Invalid branch creation not blocked | Verify effective hook, Git version and client implementation; test ordinary and unborn repos separately |
| Setting hook flag false has no effect | It controls installation; reconcile installed files or validator enabled setting |

Local hooks are bypassable. No remote permission control, secret scanning, PR range validation, universal GUI compatibility or automatic cleanup transaction is provided.
