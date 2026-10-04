# User guide

Commands in this guide are the planned interface. There is no operational Config Guardian executable in this scaffold.

## Prepare a project

Use a committed React Native project with checked-in native projects and a known-good local build. Record the existing Xcode targets/schemes/configurations and Android flavors/build types. Start adoption in a branch with a clean working tree. Select one iOS app target and one Android application module; additional targets/extensions require a later adapter.

After a verified package exists, install a pinned local tarball as a dev dependency. Invoke the local executable. React Native, Xcode, Gradle, JDK and CocoaPods versions remain consumer-owned and must be tested in the adapter support matrix.

## Initial setup

1. Run inspect to discover candidates. Ambiguous targets require explicit selection.
2. Run init, choose platform targets and define development/staging/production. Preview the config before writing `.config-guardian.yml`; no native editing occurs yet.
3. Replace sample app IDs, paths and API URLs with project-specific values. Public values will be embedded in the app.
4. Run validate to check schema and cross-environment consistency.
5. Run plan and review each proposed native/configuration change, including existing configuration adoption.
6. Commit the central config before applying; its hash will be checked independently of source commit identity.
7. Apply the reviewed plan. If files changed since planning, regenerate it and review again.
8. Follow the reported dependency-sync steps, then run doctor and build both modes for each environment on the appropriate platform.
9. Review and commit generated files and native integration edits with the central configuration.

The exact init/add prompts are implementation work. V1 noninteractive callers create a complete reviewed config from the example instead of relying on guessed defaults.

## Everyday changes

Use add staging to add a missing profile, or edit the YAML directly. Add refuses an existing environment. Plan prints the resulting mappings and diff. Repeated apply on unchanged inputs must do nothing. Plans contain environment values; keep `.config-guardian/` untracked.

No implicit switching of global project state occurs when building. Select the scheme/configuration or flavor/build type explicitly in your build command. Dev/staging/production remain separate from Debug/Release. Unique application IDs are required by this product's v1 policy so environments can coexist as distinct installed apps.

## Existing configurations

Inspect before generation. If a requested name belongs to an existing scheme, configuration or flavor, plan reports a conflict unless an explicit adoption step has recorded its ownership. The initial implementation must refuse collisions; automatic adoption can be added only with a reviewed diff and fixture coverage.

A plan should never rewrite all of a Gradle file or Xcode project merely to add one environment. Native adapters use structural editing and minimal integration points. If the parser cannot safely handle a project, leave it untouched and explain the unsupported layout.

## Runtime values and services

Native build settings alone do not make values available to React Native JavaScript. The RN adapter must explicitly generate and wire an environment-specific JS/TS module, choose it as part of the native build, and verify the bundled output. Until that integration passes real build tests, report it unsupported rather than claiming API_BASE_URL is automatically wired.

Firebase config, URL schemes, associated domains, entitlements, service registrations and app-group changes are manual integration tasks in the initial scope. Doctor should identify relevant unhandled inputs when possible. Distinct app IDs may need corresponding external registrations; Config Guardian does not create them.

## CI and delivery

CI Guardian can run Config Guardian validation and an explicitly selected native build matrix once those commands exist. Release Guardian consumes the selected profile's resolved scheme, release configuration, Android variant and application ID. Use a versioned resolved-output contract rather than both tools editing the same files. Signing credentials stay in Release Guardian/CI secret management.

## Remove or upgrade

Upgrade in a branch and inspect schema/adapter compatibility before applying changes. Do not silently migrate config. V1 has no uninstall or destructive environment-removal command. To stop using the tool, retain the native generated configuration as project-owned files and remove automation invocations/dependency. To remove a profile, review native references, runtime modules and any external app registration separately; use version control for deliberate reversion.
