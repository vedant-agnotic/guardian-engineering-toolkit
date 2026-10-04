# Package development

## Current deliverable

This is a standalone documentation project with a strict JSON schema and examples. There is no CLI executable, build script or claimed operational adapter. `python3 scripts/check_docs.py` and `npm run docs:check` verify document links/JSON and required files; they do not verify native behavior.

## Establish tooling

1. Use Node 22+ as the proposed baseline and strict TypeScript.
2. Choose reviewed exact CLI/parser/YAML/schema/test dependencies and commit a lockfile. Do not use npm ci before a lockfile exists.
3. Add src/cli.ts and compiled dist/cli.js with a shebang. Add bin only after it runs.
4. Add actual build/typecheck/unit/integration scripts and meaningful fixtures as features are implemented.
5. Implement discovery/validate/resolve before file mutation. Then plan, then apply with recovery.

Keep config-model logic platform-independent. Native adapters return intended edits rather than writing directly. Only apply owns mutations. Paths and process arguments must remain data, not shell source. Strict schema errors should include the exact field and a correction example.

## Contributor workflow

For each change: define behavior, update manual/schema/examples, implement, add failure-case coverage and attach diff/build evidence. Native-edit changes require before/after fixtures and repeat-run idempotency. Unsupported layouts should produce a refusal with no filesystem changes.

## Release preparation

Run build/type/unit/native integration tests, inspect npm pack output and install the packed artifact into clean fixtures. Verify minimum runtime and tested Xcode/Gradle/RN combinations. A CI syntax check alone does not prove iOS/Android support.

Before publishing choose verified npm scope, repository and license; remove private intentionally only when ready. Current UNLICENSED indicates no license choice, not a recommended final license. Use independent semantic versions, a changelog and schema migration notes. Avoid postinstall mutation. No package publication is part of this documentation delivery.

See [repository layout](REPOSITORY_LAYOUT.md) for optional npm workspaces. Keeping code under packages/config-guardian does not prevent independent installation or publishing.
