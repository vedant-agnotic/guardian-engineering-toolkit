import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createDefaultConfig } from '../dist/config/defaults.js';
import { writeConfig } from '../dist/config/load.js';
import { installHooks, uninstallHooks } from '../dist/hooks/install.js';

function git(cwd, args, env = process.env) {
  return spawnSync('git', args, { cwd, env, encoding: 'utf8' });
}

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'git-guardian-test-'));
  assert.equal(git(root, ['init']).status, 0);
  assert.equal(git(root, ['config', 'user.email', 'guardian@example.com']).status, 0);
  assert.equal(git(root, ['config', 'user.name', 'Guardian Test']).status, 0);
  writeFileSync(join(root, 'README.md'), '# test\n');
  assert.equal(git(root, ['add', '.']).status, 0);
  assert.equal(git(root, ['commit', '-m', 'initial']).status, 0);
  return root;
}

test('install preserves and chains an existing commit-msg hook', () => {
  const root = repo();
  writeConfig(root, createDefaultConfig());
  const hooks = join(root, '.git', 'hooks');
  const existing = join(hooks, 'commit-msg');
  writeFileSync(existing, '#!/bin/sh\nexit 0\n');
  chmodSync(existing, 0o755);

  installHooks(root, createDefaultConfig());
  assert.equal(existsSync(`${existing}.git-guardian-original`), true);
  assert.match(readFileSync(existing, 'utf8'), /git-guardian-managed-hook/);

  uninstallHooks(root);
  assert.equal(existsSync(`${existing}.git-guardian-original`), false);
  assert.match(readFileSync(existing, 'utf8'), /exit 0/);
});

test('reference-transaction hook blocks invalid native branch creation', () => {
  const root = repo();
  const config = createDefaultConfig();
  writeConfig(root, config);
  installHooks(root, config);

  const cli = join(process.cwd(), 'dist', 'cli.js');
  const env = { ...process.env, GIT_GUARDIAN_BIN: cli };
  const invalid = git(root, ['switch', '-c', 'Bad_Branch'], env);
  assert.notEqual(invalid.status, 0, invalid.stdout + invalid.stderr);
  assert.match(invalid.stderr + invalid.stdout, /Branch creation blocked/);
  assert.equal(git(root, ['show-ref', '--verify', '--quiet', 'refs/heads/Bad_Branch']).status, 1);

  const valid = git(root, ['switch', '-c', 'feature/ABC-123-add-login'], env);
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
});



test('reference-transaction hook blocks invalid branch creation in an unborn repository', () => {
  const root = mkdtempSync(join(tmpdir(), 'git-guardian-unborn-test-'));
  assert.equal(git(root, ['init']).status, 0);
  const config = createDefaultConfig();
  writeConfig(root, config);
  installHooks(root, config);

  const cli = join(process.cwd(), 'dist', 'cli.js');
  const env = { ...process.env, GIT_GUARDIAN_BIN: cli };
  const invalid = git(root, ['checkout', '-b', 'new-branch'], env);
  assert.notEqual(invalid.status, 0, invalid.stdout + invalid.stderr);
  assert.match(invalid.stderr + invalid.stdout, /Branch creation blocked/);

  const head = git(root, ['symbolic-ref', '--short', 'HEAD'], env);
  assert.equal(head.status, 0);
  assert.notEqual(head.stdout.trim(), 'new-branch');

  const valid = git(root, ['checkout', '-b', 'feature/ABC-123-add-login'], env);
  assert.equal(valid.status, 0, valid.stdout + valid.stderr);
});

test('commit-msg hook blocks invalid messages', () => {
  const root = repo();
  const config = createDefaultConfig();
  writeConfig(root, config);
  installHooks(root, config);

  writeFileSync(join(root, 'file.txt'), 'change\n');
  assert.equal(git(root, ['add', '.']).status, 0);
  const cli = join(process.cwd(), 'dist', 'cli.js');
  const env = { ...process.env, GIT_GUARDIAN_BIN: cli };
  const bad = git(root, ['commit', '-m', 'bad message'], env);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr + bad.stdout, /Commit blocked by Git Guardian/);

  const good = git(root, ['commit', '-m', 'feat: add file'], env);
  assert.equal(good.status, 0, good.stdout + good.stderr);
});
