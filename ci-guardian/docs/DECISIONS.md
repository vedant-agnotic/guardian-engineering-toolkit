# Decisions

All CI Guardian-specific choices below are new proposals for this documentation baseline, not recovered user approvals.

| Decision | Reason |
| --- | --- |
| TypeScript CLI, Node baseline shared with toolkit | Reduce maintenance across packages |
| YAML config with argv arrays | Familiar CI configuration without implicit shell interpretation |
| Sequential runner in v1 | Clear cancellation and reporting before optimization |
| Existing project commands remain authoritative | Avoid another test/lint framework |
| GitHub Actions first | Align with current project workflows |
| React Native preset and generic commands first | Keep the initial support promise narrow |
| Preview/new-file generation, no overwrite | Adopt safely mid-project |
| Optional Git Guardian executable integration | Avoid copying policy logic or requiring sibling source |
| Node 20 baseline (was proposed as 22) | Same baseline as Git Guardian; nothing in v1 needs Node 22 |
| Hand-written restricted YAML parser, no runtime dependencies | The config needs only maps, lists and scalars; rejecting everything else is easier to audit than configuring a full parser |
| Guardians call each other only through their CLIs | Each package stays usable alone; no shared code or versions to keep in step |
| Install specs for the other Guardian come from an env var or a prompt until published | The npm name `git-guardian` belongs to an unrelated package; never install a Guardian by an unverified name |
| Workflow pins actions to full commit SHAs | Tags can be moved; SHAs verified via the GitHub API when generated code is updated |
| One `required` gate job | Branch protection needs a single stable status that doesn't change when checks change |
| Checks run in their own process group with stdin closed | Timeouts and Ctrl-C can kill the whole tree; interactive commands fail fast instead of hanging |

Open: exact dependencies, action revisions, provider test repository, supported OS matrix, whether future workflow rendering should use reusable workflows or self-contained jobs. V1 proposes self-contained generated CI workflows; Release Guardian separately proposes central reusable delivery workflows.
