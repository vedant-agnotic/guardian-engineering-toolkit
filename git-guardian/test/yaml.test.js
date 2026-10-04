import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSimpleYaml, stringifySimpleYaml } from '../dist/config/yaml.js';

const fixture = {
  version: 1,
  branch: {
    enabled: true,
    pattern: '^(feature|fix)/[a-z0-9-]+$',
  },
  commit: {
    pattern: '^feat\\([a-z]+\\): .+$',
  },
};

test('simple YAML round trips regex strings', () => {
  const text = stringifySimpleYaml(fixture);
  const parsed = parseSimpleYaml(text);
  assert.deepEqual(parsed, fixture);
});
