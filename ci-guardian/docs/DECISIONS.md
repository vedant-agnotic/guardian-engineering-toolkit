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

Open: exact dependencies, action revisions, provider test repository, supported OS matrix, whether future workflow rendering should use reusable workflows or self-contained jobs. V1 proposes self-contained generated CI workflows; Release Guardian separately proposes central reusable delivery workflows.
