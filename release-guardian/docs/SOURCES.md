# Sources and provenance

Scope is based on the earlier mobile CD toolkit discussion: a configurable thin orchestration package, GitHub Actions first, RN first, with iOS/TestFlight followed by Android/Internal Testing. Detailed CLI/schema/operations contracts here are proposals for review.

Official references checked on 2 October 2026:

- [GitHub reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows): called workflows, inputs and secret/environment boundaries.
- [Fastlane TestFlight upload](https://docs.fastlane.tools/actions/upload_to_testflight/): upload tooling and processing-related behavior.
- [Fastlane Play upload](https://docs.fastlane.tools/actions/upload_to_play_store/): app bundle and track tooling.

These references support selecting an integration approach; they do not verify our unpublished adapters. Confirm current Apple/Google account rules, signing requirements, API permissions and supported toolchains against official provider documentation during implementation and each package release.
