# Security and trust

`run` executes project-controlled programs. Treat a pull request's scripts, configuration and dependencies as untrusted code. Use isolated ephemeral CI runners with minimal token permissions and no store/signing credentials. Do not use a privileged pull-request-target workflow to checkout and execute untrusted PR code.

`validate` and `doctor` are inspection operations and must not execute arbitrary commands from configuration. Config is restricted YAML data, not a JavaScript plugin loader. Reject path escapes and unsafe tags; never eval strings. Limit parsing resources.

Pass provider event values as data. Cache keys must separate incompatible toolchains and trust levels; never cache secrets. Repository maintainers must protect workflows and policies with review so a PR cannot silently relax the required checks. The host enforces trust; a locally generated passing JSON file is not an authorization token.

Redact known secret values from diagnostics and avoid capturing unnecessary output. Report security defects privately to the project maintainer; configure a formal reporting channel before publication.
