import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig } from '../dist/config/defaults.js';
import { suggestBranchNames, validateBranchName } from '../dist/validation/branch.js';

const config = createDefaultConfig().branch;

test('validates a ticketed feature branch', () => {
  assert.equal(validateBranchName('feature/ABC-123-add-login', config).valid, true);
});

test('allows protected branches', () => {
  assert.equal(validateBranchName('main', config).valid, true);
  assert.equal(validateBranchName('develop', config).valid, true);
});

test('rejects an invalid branch and suggests replacements', () => {
  const result = validateBranchName('ABC-123 Add Login', config);
  assert.equal(result.valid, false);
  assert.match(result.suggestions[0], /^feature\/ABC-123-add-login$/);
});

test('preserves an existing known prefix in suggestions', () => {
  const values = suggestBranchNames('fix/ABC-99 Payment Timeout', config);
  assert.equal(values[0], 'fix/ABC-99-payment-timeout');
});
