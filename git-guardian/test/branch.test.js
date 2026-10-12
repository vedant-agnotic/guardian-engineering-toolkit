import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig } from '../dist/config/defaults.js';
import { suggestBranchNames, validateBranchName } from '../dist/validation/branch.js';

const config = createDefaultConfig().branch;

test('accepts <type>/<number>-<description> with the default types', () => {
  for (const name of ['feat/123-add-login', 'chore/7-update-deps', 'bugfix/42-crash', 'task/1-x']) {
    assert.equal(validateBranchName(name, config).valid, true, name);
  }
});

test('rejects names that break the format', () => {
  for (const name of ['feature/123-add-login', 'feat/add-login', 'feat/123-Add-Login', 'feat/123-add_login', 'feat/123-', 'Bad_Branch']) {
    assert.equal(validateBranchName(name, config).valid, false, name);
  }
});

test('names the unknown type', () => {
  assert.match(validateBranchName('wip/123-thing', config).reason, /"wip" is not an allowed type/);
});

test('allows protected branches', () => {
  assert.equal(validateBranchName('main', config).valid, true);
  assert.equal(validateBranchName('develop', config).valid, true);
});

test('suggests from free text, mapping common type words', () => {
  assert.deepEqual(suggestBranchNames('ABC-42 Fix login crash', config), [
    'bugfix/42-login-crash',
    'feat/42-login-crash',
    'chore/42-login-crash',
  ]);
  assert.equal(suggestBranchNames('feature/99 Payment Timeout', config)[0], 'feat/99-payment-timeout');
});

test('leaves a placeholder when the number is unknown', () => {
  assert.equal(suggestBranchNames('Bad_Branch', config)[0], 'feat/<number>-bad-branch');
});

test('supports custom formats with tickets and optional parts', () => {
  const custom = { ...config, format: '<type>/<ticket>[-<description>]', types: 'feature,fix' };
  assert.equal(validateBranchName('feature/ABC-123', custom).valid, true);
  assert.equal(validateBranchName('fix/ABC-123-login', custom).valid, true);
  assert.equal(validateBranchName('fix/abc-123', custom).valid, false);
  assert.equal(suggestBranchNames('abc-9 fix login', custom)[0], 'fix/ABC-9-login');
});
