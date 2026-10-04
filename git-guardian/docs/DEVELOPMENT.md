# Package development — v0.1.1

## Included code and setup

This folder includes the supplied TypeScript source, compiled dist, Node tests, tsconfig and MIT license. Runtime implementation is unchanged by this documentation update. Node >=20 and Git >=2.28 are declared by package metadata.

```bash
# Source development, with dependency access:
npm install
npm run build
npm test
# Documentation integrity:
python3 scripts/check_docs.py
# Local distributable; does not publish:
npm pack
```

No lockfile was supplied. After choosing reviewed exact TypeScript/@types/node versions, generate and commit a lockfile; only then standardize on npm ci. Existing devDependency ranges are preserved, not claimed reproducible pins. Tests import dist; rebuild before testing source edits. The supplied compiled files can be tested directly with `node --test test/*.test.js` without dependency downloads.

## Contribution process

Work on one behavior at a time. Update command help, examples, manuals and tests together. Keep validation pure where possible and return structured results; CLI code owns terminal output and process exits. Continue using argv subprocess calls and never build shell commands from branch/message input.

Run regression tests around hook stdin, repository state, reinstall and uninstall before changing the installer. Make safety changes compatible or document migration. See [known limitations](KNOWN_LIMITATIONS.md) for concrete first issues.

## Packaging

`bin` points to dist/cli.js. This documentation update adjusts the files allowlist to include Readme.md, docs and examples alongside dist/LICENSE and adds docs:check. Source implementation is preserved. Verify actual packed contents and install the tarball in an isolated consumer clone before publishing. Keep shebang and executable metadata working.

Preserve MIT attribution from LICENSE. Registry owner/name and release approval still need verification; a package.json name alone proves no registry ownership. A documentation-only delivery does not publish or bump the existing runtime version. Choose the next package version when releasing changes and record exactly what changed.

Use semantic versioning for package releases and explicit migration for config changes. The early JSON draft is incompatible with this YAML implementation; there is no automatic conversion command. Future strict parsing may expose previously ignored typos and must be documented.
