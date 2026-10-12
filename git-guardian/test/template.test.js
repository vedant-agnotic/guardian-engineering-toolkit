import test from 'node:test';
import assert from 'node:assert/strict';
import { compileFormat, describeFormat, exampleFor, fillFormat } from '../dist/validation/template.js';

const types = ['feat', 'chore'];

test('builds examples and descriptions', () => {
  const branch = compileFormat('<type>/<number>-<description>', 'branch', types);
  assert.equal(exampleFor(branch), 'feat/123-add-login');
  assert.match(describeFormat(branch).join('\n'), /<type>\s+one of: feat, chore/);
  const commit = compileFormat('<type>[(<scope>)]: <description>', 'commit', types);
  assert.equal(exampleFor(commit), 'feat(auth): add login page');
  assert.equal(fillFormat(commit, { type: 'chore', description: 'x' }), 'chore: x');
});

test('treats regex characters in literal text literally', () => {
  const compiled = compileFormat('<type>.<number>+<description>', 'branch', types);
  assert.equal(compiled.regex.test('feat.1+a'), true);
  assert.equal(compiled.regex.test('featX1+a'), false);
});

test('rejects broken formats with readable errors', () => {
  assert.throws(() => compileFormat('<type>/<id>', 'branch', types), /unknown placeholder <id>/);
  assert.throws(() => compileFormat('<type/<number>', 'branch', types), /</);
  assert.throws(() => compileFormat('<type>[-<number>', 'branch', types), /without a closing "\]"/);
  assert.throws(() => compileFormat('feature/', 'branch', types), /no placeholders/);
  assert.throws(() => compileFormat('<type> <description>', 'branch', types), /must not contain spaces/);
  assert.throws(() => compileFormat('<type>: <description>', 'commit', []), /no types/);
});
