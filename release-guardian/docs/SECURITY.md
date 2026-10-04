# Security and trust

Deployment handles signing material and store write access. It must run only from reviewed code in protected workflows. Never expose release credentials to fork pull requests or use an untrusted PR checkout in a privileged release job. Restrict central workflow changes and pin immutable revisions.

Separate upload API credentials from signing identities and from CI-read permissions. Configuration stores variable names only. Use explicit secret mappings and ephemeral credential files with restrictive permissions. Disable shell tracing around secret setup, redact known secret values, avoid env dumps and never upload credential folders as artifacts. Masking is a fallback, not permission to print secrets.

Do not execute application code merely to validate the YAML. Doctor performs local inspection; actual deploy invokes build tools and therefore executes reviewed repository code. Validate app identity in the produced binary before uploading to the configured account.

Environment approval is a host control and must be verified in the consuming repo. The CLI cannot provide a secure trust boundary against an attacker who can change the workflow and its code. Report potential credential compromise privately; configure a formal security contact before public release. Follow the [rotation and recovery runbook](OPERATIONS.md).
