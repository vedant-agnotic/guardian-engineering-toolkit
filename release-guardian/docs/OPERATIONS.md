# Release operations manual

## Before the first pilot

Record the application owner, signing owner, store account administrator and engineering operator. Confirm app IDs/team/track and choose one internal destination. Build from a clean checkout with the documented toolchain. Record package and reusable workflow pins. Store signing backups through the organization's controlled credential process, not in Git or build artifacts.

## Per-release checklist

1. Identify exact source SHA and confirm full required CI on it.
2. Confirm marketing version and select an unused platform-valid build number.
3. Review plan: app, platform, branch, environment, destination and signing references.
4. Confirm no conflicting release is running and approve the environment gate.
5. Record workflow run ID and artifact hash; retain sanitized report.
6. Verify upload receipt, then separately confirm processing and tester availability in the store.
7. Communicate status accurately through the team's normal process. Automated notifications are outside v1.

## Failure decision table

| Last confirmed stage | Safe next step |
| --- | --- |
| Validation or authorization | Correct config/access; no upload occurred |
| Build | Fix toolchain/code and rerun using an explicit build identity |
| Signing | Check app/team/profile/key alignment; replace assets if needed |
| Before upload request | Retry after fixing the known failure |
| Upload request sent; response missing | Inspect store for the app/version/build; do not blindly retry |
| Upload accepted | Wait for/review processing; never label it absent because local job failed |
| Build available but defective | Stop tester use if possible and ship a corrected higher build through the store process |

## Credential rotation runbook

1. Identify credential type, consumer workflows and owner; pause new release runs while changing signing-sensitive assets.
2. Provision replacement with minimum needed access. Where the platform supports overlapping valid credentials, retain the old one during validation.
3. Update the protected environment secret/file source without changing values in repository config.
4. Run local-format checks and one approved internal delivery with the new material.
5. Verify provider receipt and affected consumers, then revoke the old credential through the provider.
6. Remove temporary copies and record rotation date/owner without secret values.

If exposed, revoke promptly under the incident process instead of waiting for a normal overlap window. Rotating an API/service-account credential is different from rotating an Android upload key or app-signing key; the latter may require the provider's specific reset/upgrade process. Do not assume replacing a keystore file is a safe key rotation. An Apple signing certificate/profile change similarly needs a matching signing set.

## Recovery and retention

V1 has no automated store rollback. Revert automation to a known-good pinned package/workflow when the automation regresses. For defective application code, create and test a corrected build with a new valid number; do not try to overwrite an accepted build.

Retain source SHA, version/build, artifact hash, package/workflow revisions and provider ID for each attempt. Decide artifact retention in the consuming organization; signed binaries may contain proprietary material. Never retain credential directories. If cleanup fails, fail the run and let an operator verify the runner and credential exposure before reuse.
