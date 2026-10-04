# Architecture — supplied v0.1.1

| Actual module | Responsibility |
| --- | --- |
| `src/cli.ts` | Hand-written argument dispatch, help and exit mapping |
| `src/config/` | Defaults, limited YAML parser, merging and validation |
| `src/validation/` | Branch/commit decisions and candidate suggestions |
| `src/core/` | Git discovery, synchronous argv subprocesses, terminal output |
| `src/hooks/handlers.ts` | Commit message and reference input validation |
| `src/hooks/templates.ts` | Shell wrappers, prior hook chaining and CLI discovery |
| `src/hooks/install.ts` | Marker-based install, backup, restore and status |
| `src/commands/` | Init, doctor, validation, branch helpers and installation |
| `test/` | Node test-runner tests against compiled dist |

Flow: command → discover Git root → load/merge config → validate input → report result. Native Git invokes wrappers which run an executable original first and then Guardian. Reference stdin is captured and replayed. Git commands use argument arrays.

The installer performs sequential writes, not an atomic multi-hook transaction. It trusts a marker in content as ownership and uses the current effective hooks directory. It does not capture a previous installation manifest or preserve edited hooks through hash checks. These are future hardening tasks, not current capabilities.

Git Guardian is a separate CLI dependency. CI Guardian should invoke its actual `validate branch` and `validate commit` interface, not private modules. No supported public JS API is declared.
