# How Git Guardian works

This guide explains what Git Guardian puts in a repository, which program runs at each Git operation, and how a branch name or commit message is accepted or blocked. It is written for developers adopting the tool and for contributors changing it.

## The pieces

| Piece | Where it lives | Who creates it | Committed? |
| --- | --- | --- | --- |
| The CLI (`git-guardian`) | `node_modules/.bin/git-guardian` → `dist/cli.js` | `npm install` | No |
| The rules | `.git-guardian.yml` at the repository root | `git-guardian init` | **Yes**, so every clone uses the same rules |
| Two hook scripts | `.git/hooks/reference-transaction` and `.git/hooks/commit-msg` | `git-guardian init` or `install` | No; hooks are local to each clone |
| Backups of hooks that were already there | `.git/hooks/<name>.git-guardian-original` | `install`, only if a hook already existed | No |

Nothing runs in the background. Git Guardian only runs when Git calls one of its two hooks, or when you run the CLI yourself.

## Lifecycle

```
npm install ──► npx git-guardian init ──► commit .git-guardian.yml
                    │                          │
                    │ writes config            │ teammates clone, npm install,
                    │ installs 2 hooks         │ then: npx git-guardian install
                    ▼                          ▼
           every git switch -c / checkout -b / branch / commit
                    │
                    ▼
     Git runs .git/hooks/<hook> ──► finds the CLI ──► CLI loads .git-guardian.yml
                    │                                       │
                    │                       name OK ◄───────┴───────► name not OK
                    ▼                          │                           │
             any hook you had before       exit 0: Git continues    exit 1: Git aborts,
             runs first                                             message + suggestions
```

`npm install` does **not** install the hooks by itself. Each clone needs `npx git-guardian install` once, unless the project automates it (see [Automating install for a team](#automating-install-for-a-team)).

## What runs when

Git calls the `reference-transaction` hook whenever it changes any ref: branches, tags, `HEAD` and internal refs such as `ORIG_HEAD` or `AUTO_MERGE`. It calls `commit-msg` once per commit, after you write the message and before the commit is recorded.

Observed with Git 2.48.1 on macOS:

| You run | Hook calls | What Guardian checks | Result |
| --- | --- | --- | --- |
| `git commit -m "feat: add x"` | 1 × commit-msg, then 6 × reference-transaction | The message | Allowed |
| `git commit -m "bad"` | 1 × commit-msg | The message | **Blocked**; no ref is touched |
| `git commit` with a staged API key or `.env` | 1 × commit-msg | Staged added lines and the message | **Blocked**; no ref is touched |
| `git switch -c feat/1-x` | 10 × reference-transaction | The new branch name | Allowed |
| `git switch -c Bad` | 2 × reference-transaction (`prepared`, then `aborted`) | The new branch name | **Blocked**; the branch is never created |
| `git checkout -b …`, `git branch …` | Same as `switch -c` | The new branch name | Same |
| `git switch main` (existing branch) | 8 × reference-transaction | Nothing; not a new branch | Allowed |
| `git merge`, `git rebase`, `git tag`, `git branch -d` | 3–6 × reference-transaction | Nothing | Allowed |

Most of these calls are not new branches, so Guardian accepts them right away. A branch name is checked only when all of these are true:

1. The hook state is `prepared` (or `preparing`, which some Git versions send). These are the states where Git still allows a hook to cancel the change; `committed` and `aborted` are ignored.
2. The ref is `refs/heads/<name>`, or `HEAD` is being pointed at `refs/heads/<name>`. The second case is a new branch in a repository with no commits yet.
3. The old value is all zeros and the branch does not exist yet, meaning this is a genuinely new branch rather than an update.
4. The name is not in `branch.protected` (`main`, `develop`, …), which are always allowed.

Existing branches are never re-checked. A badly named branch created before Guardian was installed keeps working.

### Cost

Each hook call starts Node.js. On the machine above, a commit took about 330 ms with hooks installed and 16 ms without, so the cost is roughly 0.3 s per commit. This is noticeable in scripts that make many commits, such as large rebases. Filtering states and refs inside the shell script before starting Node would remove most of these calls (see [Roadmap](ROADMAP.md)).

## Inside a hook

Both hook scripts are short POSIX shell wrappers generated from `src/hooks/templates.ts`. Each one does the following, in order:

1. **Reads the input.** For `reference-transaction`, Git sends one line per ref on stdin (`<old-sha> <new-sha> <ref-name>`). The wrapper saves it to a temporary file so it can be passed to more than one program; the file is removed on exit.
2. **Runs any hook you had before.** If `<name>.git-guardian-original` exists and is executable, it runs first with the same arguments and input. If it fails, Git's operation stops there.
3. **Finds the CLI**, in this order:
   1. `GIT_GUARDIAN_BIN`, a path to a JavaScript file run with `node` (useful for testing a local build);
   2. `<repo>/node_modules/.bin/git-guardian` (the normal case);
   3. `git-guardian` on `PATH` (a global install).
4. **Fails closed.** If none is found, it prints `git-guardian: executable not found` and exits 1. Git then blocks the operation rather than letting an unchecked name through.
5. **Runs the check**: `git-guardian hook commit-msg <file>` or `git-guardian hook reference-transaction <state>`. Its exit code becomes the hook's exit code.

The scripts contain the marker `# git-guardian-managed-hook v1`. `install`, `uninstall` and `doctor` use it to tell Guardian's hooks apart from yours.

## Inside the CLI

```
src/cli.ts                     parse the command
  └─ core/git.ts               find the repository root (git rev-parse --show-toplevel)
  └─ config/load.ts            read .git-guardian.yml (config/yaml.ts: small YAML subset)
       └─ config/validate.ts   check version, types, formats, max length
  └─ validation/template.ts    turn "<type>/<number>-<description>" into a matcher
  └─ validation/branch.ts      branch rules, protected names, suggestions
     validation/commit.ts      commit rules, Merge/Revert exemptions, length, suggestions
  └─ validation/explain.ts     the message shown when something is blocked
  └─ core/log.ts               colours (off when not a terminal, NO_COLOR, FORCE_COLOR)
```

The config is read fresh on every call, so edits to `.git-guardian.yml` take effect on the next Git operation without reinstalling hooks. Re-run `install` only after enabling or disabling a hook in the `hooks:` section.

### How a format becomes a rule

A format like `<type>/<number>-<description>` is split into literal text and placeholders. Each placeholder stands for a fixed kind of value:

| Placeholder | Accepts |
| --- | --- |
| `<type>` | Exactly one of the configured `types` |
| `<number>` | Digits |
| `<ticket>` | Capital letters, a hyphen and digits, e.g. `ABC-123` |
| `<scope>` | A lowercase area of the code, e.g. `auth` |
| `<description>` | Branches: lowercase words joined by hyphens. Commits: any text that starts with a non-space |

Square brackets mark an optional part. The whole name must match, so extra text before or after is rejected. Users never write regular expressions; Guardian builds one internally from the format.

### Commits

The `commit-msg` hook runs after you write the message and before Git records the commit. Everything being committed is already staged at that point, including files picked up by `git commit -a`. Guardian checks two things, in this order:

**1. Secrets** (when `secrets.enabled` is true, and not while concluding a merge):

1. It reads the staged changes with `git diff --cached --unified=0` and keeps only **added** lines, so code that was already committed isn't re-reported.
2. Paths matching `secrets.allow` are skipped, and so is any line containing `git-guardian:allow-secret`.
3. Each added line, and each line of the message, is checked against the rules in `src/secrets/rules.ts`: private-key headers; AWS, GitHub, GitLab, Slack, Stripe, Google, OpenAI, Anthropic, npm, SendGrid and Twilio key formats; passwords embedded in URLs; and `password`/`secret`/`api_key`/`token`-style assignments to quoted values that look random. Values that look like placeholders (`${VAR}`, `process.env`, `changeme`, `your-key-here`, …) are ignored.
4. File names that almost always hold credentials are flagged: `.env*` (except `.env.example`, `.sample`, `.template`), `id_rsa`/`id_ed25519`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore`, `.netrc`, `credentials.json`.
5. Any finding blocks the commit. The output shows path, line, rule and a masked preview (first 4 characters only).

Merges are skipped because their changes were already scanned when they were committed on the other branch. `git-guardian scan` runs the same check on whatever is staged, without committing.

**2. The message format:**

1. Lines starting with `#` (Git's editor comments) are removed.
2. If the message starts with `Merge` or `Revert` and those exemptions are on (the default), it is accepted.
3. The first line must be at most `maxSubjectLength` characters (default 72).
4. The first line must match `commit.format`. The body is not checked.

### When something is blocked

Guardian prints, in order: the reason (red), any specific hint such as `"wip" is not an allowed type` (yellow), the format with each placeholder explained, a valid example, and up to three suggestions built from what you typed. A suggestion may keep a placeholder like `<number>` when the value could not be guessed from your input.

## In CI

On a CI runner no hooks are installed; the workflow calls the CLI directly. A pull request is a range of commits, `<base>..<head>`:

- `validate commits <base>..<head>` lists the commits with `git log <base>..<head>` (commits on the PR branch that aren't on the base) and checks each message, including merge-commit exemptions.
- `scan --range <base>..<head>` reads `git diff <base>...<head>` (three dots: changes since the branch split off, ignoring what's new on the base) and applies the same secret rules to the added lines.
- Both need the full history, so the checkout must use `fetch-depth: 0`.
- When `GITHUB_ACTIONS=true`, failures are also printed as `::error ...::` workflow commands, which GitHub shows as annotations on the PR. Secret findings carry the file and line.

See [CI setup](USAGE.md#ci-github-actions) and the [example workflow](../examples/github-actions/git-guardian.yml).

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Accepted, or the command succeeded |
| 1 | Blocked, invalid config, or any other error (inside a hook, this makes Git abort) |
| 128 | Printed by Git itself (not Guardian) when a ref change is aborted by the hook |

## What it does not do

- **It is not server-side enforcement.** `git commit --no-verify` skips `commit-msg`; `core.hooksPath=/dev/null`, deleting `.git/hooks`, or tools that write refs without running hooks skip both checks. Use CI or branch-protection rules on your Git host for guarantees.
- **It does not check pushes, existing branches, or commit-message bodies against the format.**
- **The secret scan is pattern-based.** It catches common, well-formatted credentials and obvious mistakes, not every secret. Binary files, lines longer than 4,096 characters, and secrets split across lines aren't detected. Use your Git host's secret scanning as well.
- **It does not block commits to `main`.** `branch.protected` means "names that are always allowed", not "branches that cannot be committed to".
- **It does not change your message or branch name.** It only accepts, rejects and suggests.

## Automating install for a team

So nobody forgets `npx git-guardian install`, a Node project can run it on every `npm install`:

```json
{
  "scripts": {
    "prepare": "git-guardian install || echo 'git-guardian: hooks not installed'"
  }
}
```

The `||` fallback keeps `npm install` working where there is no Git repository, such as Docker builds or CI caches. Re-running `install` is safe: Guardian replaces its own hooks and leaves your backups alone.

## Removing it

`npx git-guardian uninstall` deletes Guardian's hooks and moves any `.git-guardian-original` backups back into place. Run it **before** removing the package; otherwise the remaining hooks cannot find the CLI and block every commit and new branch. See [Usage](USAGE.md) for full removal steps.

## Package scripts (for contributors)

| Script | Runs | When to use |
| --- | --- | --- |
| `npm run build` | `tsc -p tsconfig.json`, compiling `src/` to `dist/` | After changing TypeScript |
| `npm test` | Build, then `node --test test/*.test.js` | Before every commit; tests import `dist/` |
| `npm run check` | Same as `npm test` | CI alias |
| `npm run docs:check` | `python3 scripts/check_docs.py`: required docs, local links, JSON syntax | After editing docs |
| `npm run pack:local` | `npm pack`, which creates `git-guardian-<version>.tgz` | To try a build in another repository |

To try a local build in a real repository without packing, point the hooks at it: `export GIT_GUARDIAN_BIN=/path/to/git-guardian/dist/cli.js`.
