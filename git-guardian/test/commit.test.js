import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig } from '../dist/config/defaults.js';
import { validateCommitMessage } from '../dist/validation/commit.js';

const config = createDefaultConfig().commit;

test('accepts conventional commit subject', () => {
  assert.equal(validateCommitMessage('feat(auth): add passkey login', config).valid, true);
});

test('rejects invalid commit and returns suggestions', () => {
  const result = validateCommitMessage('Added login screen', config);
  assert.equal(result.valid, false);
  assert.equal(result.suggestions[0], 'feat: added login screen');
});

test('allows merge commits by default', () => {
  assert.equal(validateCommitMessage('Merge branch \'main\' into develop', config).valid, true);
});
