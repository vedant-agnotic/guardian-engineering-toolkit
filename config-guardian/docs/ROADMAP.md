# Implementation roadmap

| Milestone | Scope | Gate |
| --- | --- | --- |
| Cfg1 | CLI, strict config, inspect/validate/resolve | Typed output and semantic validation, zero native mutations |
| Cfg2 | iOS/Android read-only planners | Deterministic diffs against fixture projects |
| Cfg3 | Journaled apply and recovery | Conflicts/interruptions preserve user files |
| Cfg4 | One RN app, three environments | Real Debug/Release native builds and verified JS public values |
| Cfg5 | Second-project pilot + packaging | Idempotency, fresh clone, supported-toolchain evidence |

After v1: Flutter/native presets, multiple application targets, extensions, extra flavor dimensions, white-label products, resource generation and reviewed environment removal. Do not advertise these from a generic config schema alone.
