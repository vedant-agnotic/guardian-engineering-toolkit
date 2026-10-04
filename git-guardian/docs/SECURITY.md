# Security and trust — v0.1.1

Local hooks can be disabled or bypassed; require server-side checks for team enforcement. Config and custom regexes are trusted repository policy; no adversarial-regex protection is implemented. Review configuration changes like code changes.

Installed wrappers execute an existing executable original hook before Guardian. Inspect hooks in untrusted clones. GIT_GUARDIAN_BIN and PATH influence the executable chosen; keep them under the developer's control. Hook execution has no download fallback or intentional telemetry.

The current installer can write to a configured shared hooks directory, overwrite marker-bearing hooks and replace changed targets on uninstall when a backup exists. Preserve edits and inspect ownership before these operations. See [known limitations](KNOWN_LIMITATIONS.md) for the exact gaps and development priorities.

Avoid credentials in commit text or logs. A secret accidentally committed requires a separate incident response; this package is not a secret scanner. A formal private security-reporting channel should be chosen before public maintenance promises are made.
