# Security and trust

All publicValues become readable app content. Never include service-role keys, signing passwords, private keys or privileged API credentials. An API URL or client-visible key must have appropriate backend access control; environment separation is not a substitute for authorization.

Validate paths and resolve symlinks before planning and again before writes. Refuse outputs outside the repo and collisions with untracked user files. Do not execute Gradle/project scripts during passive discovery or YAML validation. A later native build executes repository code and belongs in a trusted build context.

Plans and journals may contain public application settings and original file contents; keep them local/untracked and restrict access. They are not backups of secrets and must not include credential stores. Never silently revert unrelated changes after failed apply.

Choose a private security contact before public releases. There is no telemetry or online account requirement in the proposed configuration path.
