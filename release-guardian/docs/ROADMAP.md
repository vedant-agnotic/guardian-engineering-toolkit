# Delivery roadmap

| Milestone | Scope | Exit gate |
| --- | --- | --- |
| R1 | Config, validate, doctor, plan/dry-run | No secret leaks or external side effects; clear prerequisites |
| R2 | RN iOS build/sign/TestFlight path | Approved real internal upload, cleanup and identity verified |
| R3 | Reusable workflow + consumer pilot | Protected environment, exact-SHA CI verification and pinned caller work |
| R4 | RN Android build/sign/Play Internal | Real internal upload, duplicate/timeout handling and cleanup |
| R5 | V1 hardening | Two consuming projects, tarball/workflow matrix, operations docs |

Flutter and native adapters follow v1. Defer production rollout, Expo/EAS, other CI providers, notifications, changelog generation and automated rollback. Concentrate on one reliable iOS path before creating a broad framework abstraction. Milestones are engineering gates rather than delivery-date promises; account access and real signing pilots affect scheduling.
