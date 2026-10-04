# Sources and provenance

Authoritative local source: supplied `git-guardian-v0.1.1.zip`, including src, dist, test, package.json and LICENSE. Reviewed CLI dispatcher, config parser/defaults/validator, policy validators, hook templates/installer/handlers and command modules. Source and compiled code are included unchanged in this project.

The earlier 2 October README is historical design only; its JSON config and three-hook interface do not describe v0.1.1. CI/Release Guardian integration examples in this bundle use the actual v0.1.1 validate commands.

Official external behavior reference: [Git hooks](https://git-scm.com/docs/githooks). Consult the documentation for the actual Git version used; source comments about hook states are not compatibility evidence. The minimum version in package metadata is a declaration that still needs matrix validation.
