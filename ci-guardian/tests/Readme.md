# Tests

`npm test` builds `dist/` and runs `node --test tests/*.test.js`.

- `yaml.test.js`: restricted YAML parser.
- `config.test.js`: schema, path and symlink validation, serialization.
- `cli.test.js`: the built CLI end to end in temporary Git repositories, including timeouts, process trees and SIGINT.

See the [test plan](../docs/TESTING.md) for coverage and gaps.
