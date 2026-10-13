# Making Git Guardian public

A checklist for the first public release on npm and GitHub, then the routine for later releases. Status as of 9 October 2026:

| Item | Current state |
| --- | --- |
| npm name | **`@agnotic/git-guardian`** (npm organisation `agnotic`, owned by `vedant-agnotic`). The unscoped `git-guardian` belongs to an unrelated package. |
| GitHub repository | `vedant-agnotic/guardian-engineering-toolkit`, **private** |
| CI | None (`.github/workflows` does not exist) |
| `package.json` | Version `0.1.1`; no `repository`, `homepage`, `bugs` or `author` fields |
| License | MIT, copyright "Guardian Engineering Toolkit" |
| Tests | 39 passing locally on macOS, Node 20, Git 2.48 |

## 1. Decide before publishing

These choices are hard to change after the first release.

1. **Package name.** Options:
   - **Scoped, e.g. `@agnotic/git-guardian`** (recommended). Install with `npm i -D @agnotic/git-guardian`; the command is still `git-guardian`. Requires creating an npm organisation named `agnotic` (free for public packages) at npmjs.com → Add Organization. Check first with `npm view @agnotic/git-guardian`; a 404 means it's free.
   - **A new unscoped name**, e.g. `git-name-guardian`. Check with `npm view <name>`.

   Don't use `git-guardian` itself. Besides the npm package, GitGuardian (gitguardian.com) is a well-known security company, so users may confuse the two.
2. **Repository layout.** Publish from this monorepo (`git-guardian/` folder), or move the package to its own public repository. A dedicated repository is simpler for issues, stars and release tags. This guide works for either; the monorepo variant is noted where it differs.
3. **Copyright holder.** Replace "Guardian Engineering Toolkit" in `LICENSE` with the legal owner, such as the company name.
4. **Version.** The switch from regex to formats breaks old configs, so release as **`0.2.0`**. Versions below 1.0 signal that the config may still change.
5. **Which known gaps must be fixed first.** Review [Known limitations](KNOWN_LIMITATIONS.md). Items worth fixing before strangers use it:
   - strict config validation (typos are currently ignored silently);
   - safe uninstall when a managed hook was edited;
   - skipping irrelevant hook calls in the shell script (about 0.3 s per commit today; see [How it works](HOW_IT_WORKS.md#cost)).

## 2. Prepare the package

### `package.json`

Add the identity, links and safety fields. Example for a scoped name published from the monorepo:

```json
{
  "name": "@agnotic/git-guardian",
  "version": "0.2.0",
  "description": "Readable branch-name and commit-message rules, enforced with Git hooks.",
  "author": "Agnotic",
  "license": "MIT",
  "homepage": "https://github.com/vedant-agnotic/guardian-engineering-toolkit/tree/main/git-guardian#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vedant-agnotic/guardian-engineering-toolkit.git",
    "directory": "git-guardian"
  },
  "bugs": { "url": "https://github.com/vedant-agnotic/guardian-engineering-toolkit/issues" },
  "publishConfig": { "access": "public" },
  "scripts": {
    "prepublishOnly": "npm test"
  }
}
```

- `publishConfig.access: public` is required for a scoped package; without it, npm tries to publish it as private.
- `prepublishOnly` builds and tests automatically before every `npm publish`, so a stale `dist/` can't be published.
- Keep the existing `bin`, `files`, `engines`, `type` and `keywords`. Drop `"git": ">=2.28"` from `engines`; npm only understands `node` and `npm` there and ignores the rest. The Git requirement is documented in the Readme.
- With a dedicated repository, remove `directory` and use the new URLs.

### Documentation

- In `Readme.md`, replace the tarball install with `npm install --save-dev <final-name>`. Keep the tarball steps in [Development](DEVELOPMENT.md) for contributors.
- Move the "Unreleased" changelog entries under `## 0.2.0 — <date>`.
- Replace the private wording in [Security](SECURITY.md) with a real reporting channel (an email address, or GitHub private vulnerability reporting).
- Images in the Readme use relative paths (`assets/…`). npm tries to rewrite these using the `repository` field, which often fails for private repositories and package subfolders. Switch the logo to an absolute URL (for example `https://raw.githubusercontent.com/<owner>/<repo>/main/git-guardian/assets/git-guardian-logo.png`) once the repository is public.

### Check the tarball contents

```bash
cd git-guardian
npm ci
npm test
npm pack --dry-run      # lists every file that would be published
```

Expect `dist/`, `docs/`, `examples/`, `Readme.md`, `LICENSE` and `package.json`. There must be no `src/`, `test/`, `node_modules/`, `.tgz` or `.env` files.

### Smoke-test the real tarball

```bash
npm pack                                   # → agnotic-git-guardian-0.2.0.tgz
cd "$(mktemp -d)" && git init -b main && npm init -y
npm install --save-dev /path/to/agnotic-git-guardian-0.2.0.tgz
npx git-guardian init --yes && npx git-guardian doctor
git switch -c Bad_Branch                    # must be blocked
git commit --allow-empty -m "feat: works"   # must succeed
npx git-guardian uninstall
```

## 3. Add CI

Add tests on every push and pull request, so outside contributions are checked. Create `.github/workflows/git-guardian.yml` (at the repository root):

```yaml
name: git-guardian
on:
  push:
    branches: [main]
    paths: ['git-guardian/**']
  pull_request:
    paths: ['git-guardian/**']
permissions:
  contents: read
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        node: [20, 22]
    runs-on: ${{ matrix.os }}
    defaults:
      run:
        working-directory: git-guardian
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
      - run: python3 scripts/check_docs.py
```

Before publishing, pin each action to a full commit SHA rather than a tag. Add `windows-latest` only after the hooks have been tested on Windows; until then, say in the Readme that Windows is untested.

## 4. Make the GitHub repository public

1. Remove anything that shouldn't be public. Check the full history, not just current files: `git log -p | grep -iE "password|secret|token|api[_-]?key"`. The packages marked `UNLICENSED` (CI, Config and Release Guardian) become visible too; decide whether that's acceptable or publish Git Guardian from its own repository.
2. GitHub → repository → Settings → General → Danger Zone → **Change visibility → Public**.
3. Settings → Code security → enable **Private vulnerability reporting** and **Dependabot alerts**.
4. Settings → Branches → protect `main`: require pull requests and the `git-guardian` CI check.
5. Add a description and topics: `git`, `git-hooks`, `branch-naming`, `commit-message`, `cli`.

## 5. Publish to npm

One-time setup:

1. Create an npmjs.com account and **turn on two-factor authentication** (Account → Two-Factor Authentication, "Authorization and writes").
2. Create the organisation if you use a scope (step 1).
3. Run `npm login` on your machine, then check with `npm whoami`.

First release, from a clean, committed `main`:

```bash
cd git-guardian
git status                                     # must be clean
npm version 0.2.0 --no-git-tag-version         # updates package.json and package-lock.json
git commit -am "chore(release): git-guardian 0.2.0"
npm publish --dry-run                          # final check, nothing uploaded
npm publish                                    # runs prepublishOnly (build + tests), then uploads
git tag git-guardian-v0.2.0                    # prefix the tag in a monorepo; just v0.2.0 in a dedicated repo
git push origin main --tags
```

Commit before publishing, so the tag points at exactly the code that is on npm.

Create a GitHub release from that tag and paste the changelog section into it.

`provenance: true` only works when publishing from CI. From a laptop npm stops with `Automatic provenance generation not supported for provider: null`, so `package.json` doesn't set it; add `--provenance` when publishing from a GitHub Actions workflow (step 7).

## 6. Verify the release

```bash
npm view @agnotic/git-guardian           # version, files, maintainers
cd "$(mktemp -d)" && git init -b main && npm init -y
npm install --save-dev @agnotic/git-guardian
npx git-guardian --version               # 0.2.0
npx git-guardian init --yes && git switch -c Bad_Branch   # blocked
```

Also open the package page on npmjs.com and check that the Readme, logo and links render.

If something is wrong, you can unpublish within 72 hours (`npm unpublish <name>@0.2.0`), but that version number can never be reused. Usually it's better to publish a fixed `0.2.1` and run `npm deprecate <name>@0.2.0 "use 0.2.1"`.

## 7. Later releases

1. Merge changes with green CI. Add entries under "Unreleased" in the changelog.
2. Pick the version: `0.x.Y` for fixes, `0.X.0` for new features or config changes. After `1.0.0`, any config-breaking change needs a major version and migration notes.
3. Run `npm version <patch|minor|major>`, `npm publish`, tag, push and create a GitHub release, as in step 5.

Recommended once the first release is out: publish from GitHub Actions on tag push, using npm trusted publishing (OIDC). This needs no long-lived npm token, adds provenance automatically, and means a stolen laptop can't publish.

## Checklist

- [ ] Name chosen and available; npm org created if scoped
- [ ] `LICENSE` copyright holder corrected
- [ ] Must-fix known limitations done
- [ ] `package.json`: name, version 0.2.0, repository, homepage, bugs, author, `publishConfig`, `prepublishOnly`
- [ ] Readme install command updated; changelog dated; security contact set
- [ ] `npm pack --dry-run` reviewed; tarball smoke test passed
- [ ] CI workflow green on Linux and macOS
- [ ] Repository history checked for secrets; repository public; `main` protected
- [ ] npm account with 2FA; `npm whoami` works
- [ ] `npm publish`; tag `git-guardian-v0.2.0` pushed; GitHub release created
- [ ] Fresh install from npm verified
