import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig } from '../dist/config/defaults.js';
import { validateCommitMessage } from '../dist/validation/commit.js';

const config = createDefaultConfig().commit;

test('accepts <type>: <description>', () => {
  assert.equal(validateCommitMessage('feat: add passkey login', config).valid, true);
  assert.equal(validateCommitMessage('bugfix: handle empty cart\n\nLonger body text.', config).valid, true);
});

test('rejects other shapes and names unknown types', () => {
  assert.equal(validateCommitMessage('feat(auth): add login', config).valid, false);
  assert.equal(validateCommitMessage('feat:add login', config).valid, false);
  assert.match(validateCommitMessage('update: readme', config).reason, /"update" is not an allowed type/);
});

test('rejects invalid commit and returns suggestions', () => {
  const result = validateCommitMessage('Added login screen.', config);
  assert.equal(result.valid, false);
  assert.deepEqual(result.suggestions, ['feat: added login screen', 'chore: added login screen', 'bugfix: added login screen']);
  assert.equal(validateCommitMessage('fix: crash', config).suggestions[0], 'bugfix: crash');
});

test('enforces the subject length', () => {
  const result = validateCommitMessage(`feat: ${'x'.repeat(80)}`, config);
  assert.match(result.reason, /too long: 86 characters \(maximum 72\)/);
  assert.ok(result.suggestions.every((item) => item.length <= 72));
});

test('ignores Git comment lines', () => {
  assert.equal(validateCommitMessage('# Please enter a message\nfeat: add login\n# comment', config).valid, true);
});

test('supports an optional scope', () => {
  const scoped = { ...config, format: '<type>[(<scope>)]: <description>' };
  assert.equal(validateCommitMessage('feat(auth): add login', scoped).valid, true);
  assert.equal(validateCommitMessage('feat: add login', scoped).valid, true);
  assert.equal(validateCommitMessage('fix(Auth): x', scoped).suggestions[0], 'bugfix(auth): x');
});

test('allows merge commits by default', () => {
  assert.equal(validateCommitMessage("Merge branch 'main' into develop", config).valid, true);
});
