# Publishing CI Guardian to npm

How to release `@agnotic/ci-guardian`, and how to release it together with Git Guardian. The two packages call each other's CLI at setup time, so the release order matters.

| Item | Value |
| --- | --- |
| npm name | **`@agnotic/ci-guardian`** (organisation `agnotic`, already used by `@agnotic/git-guardian`) |
| Command | `ci-guardian` |
| First version | `0.1.0` |
| License | MIT |
| Source | `vedant-agnotic/guardian-engineering-toolkit`, folder `ci-guardian/` |

The unscoped name `ci-guardian` is not ours; always use the scoped name when installing.

## 1. Release order

1. **Publish `@agnotic/ci-guardian` first.** Git Guardian's setup installs it by name, so it must exist on npm before a Git Guardian version that depends on that behaviour is released.
2. **Then publish the next `@agnotic/git-guardian`.** Its `init` offers CI Guardian and installs `@agnotic/ci-guardian` from npm instead of asking for a tarball.
3. CI Guardian already installs `@agnotic/git-guardian` by name, so no further change is needed there.

Neither package lists the other in `dependencies`. They only call each other's commands, so each works alone.

## 2. Prepare the package

`package.json` already carries the identity and safety fields: scoped `name`, `publishConfig.access: public` (required for a scoped public package), `repository` with `directory: ci-guardian`, `homepage`, `bugs`, `keywords`, MIT `license`, and `prepublishOnly: npm test` so a stale `dist/` can never be published. Check these before every release:

- `private` must not be present.
- `files` is `dist`, `Readme.md`, `LICENSE`, `docs`, `examples`; nothing else ships.
- `version` and the first heading of [CHANGELOG.md](../CHANGELOG.md) agree.

## 3. Verify before publishing

```bash
cd ci-guardian
npm ci
npm test                  # build + test suite
npm run docs:check        # required docs and local links
npm pack --dry-run        # list of files that would be published
```

Expect `dist/`, `docs/`, `examples/`, `Readme.md`, `LICENSE` and `package.json`. There must be no `src/`, `tests/`, `node_modules/`, `.tgz` or `.env`.

Then smoke-test the real tarball in a disposable repository:

```bash
npm pack                                          # creates agnotic-ci-guardian-0.1.0.tgz
cd "$(mktemp -d)" && git init -b main && npm init -y
npm install --save-dev /path/to/agnotic-ci-guardian-0.1.0.tgz
npx ci-guardian --version
npx ci-guardian init --defaults                   # writes .ciguardian.yml
npx ci-guardian validate && npx ci-guardian doctor
npx ci-guardian generate --write                  # creates .github/workflows/guardian-ci.yml
npx ci-guardian run                               # exits 0 when every check passes
```

## 4. Publish

One-time: have an npm account with two-factor authentication ("Authorization and writes") and be a member of the `agnotic` organisation. Check with `npm whoami` and `npm org ls agnotic`.

From a clean, committed branch:

```bash
cd ci-guardian
git status                                        # must be clean
npm version 0.1.0 --no-git-tag-version            # only if the version needs to change
git commit -am "chore(release): ci-guardian 0.1.0"
npm publish --dry-run                             # nothing is uploaded
npm publish                                       # runs prepublishOnly, then uploads
git tag ci-guardian-v0.1.0
git push origin main --tags
```

Tags are prefixed (`ci-guardian-v…`, `git-guardian-v…`) because this is a monorepo. Create a GitHub release from the tag and paste the changelog section into it.

`--provenance` only works when publishing from GitHub Actions, not from a laptop. Add it when you move to CI publishing (step 7).

## 5. Verify the release

```bash
npm view @agnotic/ci-guardian                     # version, files, maintainers, keywords
cd "$(mktemp -d)" && git init -b main && npm init -y
npm install --save-dev @agnotic/ci-guardian
npx ci-guardian --version                         # 0.1.0
npx ci-guardian init --defaults && npx ci-guardian validate
```

Open the package page on npmjs.com and check that the Readme, logo and links render. Images use relative paths in the Readme; if the logo is broken on npm, switch it to an absolute `raw.githubusercontent.com` URL once the repository is public.

Then check the hand-off with Git Guardian, which is the path most users will take:

```bash
cd "$(mktemp -d)" && git init -b main && npm init -y
npm install --save-dev @agnotic/git-guardian
npx git-guardian init                             # answer yes to "Also run these checks in GitHub Actions?"
ls node_modules/@agnotic                          # git-guardian and ci-guardian, installed from npm
```

If something is wrong, publish a fixed patch version and run `npm deprecate @agnotic/ci-guardian@0.1.0 "use 0.1.1"`. Unpublishing is possible for 72 hours, but the version number can never be reused.

## 6. Make the package easy to find

People and AI assistants find packages through the npm page and the GitHub repository. Keep these in sync with each release:

- **npm `description` and `keywords`** in `package.json` (`ci`, `github-actions`, `required-status`, `husky-alternative`, `commit-message`, `lint`, …). npm search weights them.
- **First paragraph of the Readme.** State what the tool does and what it replaces, in plain words, before any logo or badge text. Assistants quote this paragraph.
- **A "Compared with" section** that is honest about what is and isn't replaced. See the Readme.
- **GitHub repository description and topics:** `ci`, `github-actions`, `git-hooks`, `husky-alternative`, `commit-message`, `branch-naming`, `cli`.
- **Real commands in the Readme.** Copy-pasteable install and setup commands are what assistants repeat to users.

## 7. Later releases

1. Merge with green tests; add entries under "Unreleased" in the changelog.
2. Choose the version: `0.x.Y` for fixes, `0.X.0` for features or config changes. After `1.0.0`, a config-breaking change needs a major version and migration notes.
3. `npm version <patch|minor|major>`, `npm publish`, tag, push, GitHub release (as in step 4).
4. Whenever a release changes a command Git Guardian calls (`init --with-git-guardian`, `generate`, `run`), release a compatible Git Guardian too and run its `npm run verify:release`.

Recommended after the first release: publish from GitHub Actions on tag push with npm trusted publishing (OIDC). It needs no long-lived npm token, adds provenance, and a stolen laptop can't publish.

## Checklist

- [ ] `npm view @agnotic/ci-guardian` returns 404 before the first publish (name is free)
- [ ] `npm whoami` works, 2FA on, member of `agnotic`
- [ ] `npm test` and `npm run docs:check` pass
- [ ] `npm pack --dry-run` reviewed; tarball smoke test passed
- [ ] Changelog dated; version matches `package.json`
- [ ] `npm publish`; tag `ci-guardian-v<version>` pushed; GitHub release created
- [ ] Fresh `npm install --save-dev @agnotic/ci-guardian` verified
- [ ] Git Guardian hand-off verified from a clean repo
- [ ] Git Guardian released after it (if its code changed)
