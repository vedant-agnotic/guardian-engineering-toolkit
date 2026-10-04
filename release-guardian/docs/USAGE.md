# User guide

> Intended v1 behavior; implementation and provider validation remain outstanding.

## Prerequisites

The CLI proposes Node 22+ and a pinned package version. The consuming project must already build locally with a documented, locked toolchain. iOS delivery needs macOS, a compatible Xcode, app workspace and shared scheme, Apple team/app access and signing assets. Android needs compatible JDK, SDK, Gradle wrapper, signing setup, app registration and a service account authorized for the intended Play app. Ruby/Fastlane and CocoaPods, where used, must be pinned in the consuming setup rather than silently downloaded by a hook.

The package cannot create developer accounts, accept store agreements, grant itself access, fix missing app records or guarantee store processing/review time. Complete those steps in the relevant account before the pilot. Verify the chosen credential mechanism and platform requirements during adapter implementation.

## Install and initialize

Install the team's verified package tarball at a pinned version. Use a local dev dependency in RN projects. For future non-Node consumers, support a pinned global executable; Node remains necessary.

Run `release-guardian init`. The wizard detects candidate workspace/scheme or Gradle targets and asks the user to select them. It never silently selects the first target or prints credentials. It previews `.releaseguardian.yml`, chosen internal destinations and proposed workflow integration before writing a new config. Existing files cause a conflict.

For headless setup, commit a reviewed config based on [the example](../examples/releaseguardian.example.yml); init has no automatic defaults flag in this design. Run validate afterwards. Replace all placeholder identifiers. V1 may configure one or both platforms, but deploying an unconfigured platform is an error.

## Credentials and signing

Store credential values in GitHub environment secrets or an approved vault. Config contains only environment variable names and nonsecret identifiers. A runner setup step materializes credential files into a private temporary directory and exports their absolute paths; it must remove them in an always-run cleanup step.

For iOS, provision an App Store Connect API key for upload plus the certificate/private key and matching provisioning profile required to sign. An upload API key alone is not a signing identity. For Android, provision the upload keystore and service account separately; they serve different purposes. The consumer's Gradle signing configuration must use the documented environment references without committing passwords.

Run validate (no credential access) and doctor (local presence/format checks only). Passing doctor is not proof of account authorization; actual provider preflight happens only during deploy.

## GitHub workflow setup

The planned first release includes maintained central reusable workflows and a small caller workflow per consumer. An implementation release must supply the real repository owner and immutable revision; no runnable placeholder workflow is included here.

The caller is manually dispatched for a protected branch, selects ios or android and supplies an explicit unique build number. The reusable workflow must validate event/ref, checkout the exact approved commit, verify required CI on that commit, select a protected `internal` environment, install the pinned toolchain, materialize credentials, deploy, retain sanitized reports and clean up in all outcomes. Use a concurrency key per app/platform/destination; do not cancel an in-progress upload to start a new one.

Declare explicit workflow inputs and secrets. The deployment job in the called workflow declares the environment; environment approvals/secrets must be tested in the consumer repository. Environment secret behavior cannot be assumed from a caller's secret mappings. Choose the stable actual CI status name, not a similar display label.

## First iOS delivery

1. Confirm a clean approved commit passes all required checks.
2. Select a new build number compatible with the app's platform configuration. The example date-based number illustrates input only; uniqueness must be checked against the store.
3. Run `release-guardian plan ios --build-number 1001`; inspect app, commit, environment, target and stages.
4. Run the same deploy command with `--dry-run` to confirm the plan without provider calls or signing.
5. Trigger the protected workflow for that exact commit and number. Approve the reviewed environment request.
6. After upload, inspect report and App Store Connect processing status. An accepted upload is not yet proof the build is available to testers.
7. Complete any required compliance/review/tester-group steps in the store; v1 does not silently enroll external testers.

## First Android delivery

Use `plan android --build-number 1001`, review the selected app and internal track, then trigger the protected Android workflow. The integer is the intended versionCode and must be greater than prior uploaded codes as required by the platform. A retry is not a new version automatically. Verify the AAB's applicationId, versionName and versionCode before upload.

V1 fixes the destination to Internal Testing and does not promote to production. Store app setup, account state and review/compliance requirements can still prevent availability; report upload acceptance separately from tester availability.

## Upgrades

Update the package and reusable workflow SHA together in a reviewed PR with a compatibility record. Keep schemas explicit and refuse unsupported versions. Pilot on the internal destination before broad adoption. Downgrading the automation cannot remove an already uploaded store build; follow the [operations manual](OPERATIONS.md).
