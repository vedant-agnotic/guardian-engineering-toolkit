import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createDefaultConfig } from '../dist/config/defaults.js';
import { writeConfig } from '../dist/config/load.js';

const CLI = join(process.cwd(), 'dist', 'cli.js');
const FAKE_TOKEN = ['gh', 'p_', 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'].join('');

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function cli(cwd, args, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', GITHUB_ACTIONS: '', ...env },
  });
}

/** A repo with main plus a feature branch, no hooks installed (as on a CI runner). */
function prRepo(messages, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'git-guardian-ci-'));
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'ci@example.com');
  git(root, 'config', 'user.name', 'CI');
  writeConfig(root, createDefaultConfig());
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'chore: setup');
  git(root, 'switch', '-qc', 'feat/1-thing');
  messages.forEach((message, index) => {
    const name = Object.keys(files)[index] ?? `file${index}.txt`;
    writeFileSync(join(root, name), files[name] ?? `${index}\n`);
    git(root, 'add', '.');
    git(root, 'commit', '-qm', message);
  });
  return root;
}

test('validate commits passes when every commit follows the format', () => {
  const root = prRepo(['feat: add thing', 'bugfix: fix thing']);
  const result = cli(root, ['validate', 'commits', 'main..HEAD']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /All 2 commit message\(s\) in main\.\.HEAD are valid/);
});

test('validate commits lists each bad commit with a suggestion and fails', () => {
  const root = prRepo(['feat: good one', 'fixed stuff', 'WIP']);
  const result = cli(root, ['validate', 'commits', 'main..HEAD']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /✓ [0-9a-f]{7} feat: good one/);
  assert.match(result.stderr, /✗ [0-9a-f]{7} fixed stuff\n {4}try: feat: fixed stuff/);
  assert.match(result.stderr, /2 of 3 commit message\(s\) in main\.\.HEAD are invalid/);
  assert.match(result.stderr, /git rebase -i/);
});

test('validate commits accepts merge commits and empty ranges', () => {
  const root = prRepo(['feat: one']);
  git(root, 'switch', '-q', 'main');
  writeFileSync(join(root, 'main.txt'), 'x\n');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'chore: main moves on');
  git(root, 'switch', '-q', 'feat/1-thing');
  git(root, 'merge', '-q', '--no-ff', '-m', "Merge branch 'main' into feat/1-thing", 'main');
  assert.equal(cli(root, ['validate', 'commits', 'main..HEAD']).status, 0);
  assert.match(cli(root, ['validate', 'commits', 'HEAD..HEAD']).stdout, /No commits/);
});

test('validate commits explains missing history (shallow clone)', () => {
  const root = prRepo(['feat: one']);
  const result = cli(root, ['validate', 'commits', 'origin/main..HEAD']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not available in this clone[\s\S]*fetch-depth: 0/);
  assert.match(cli(root, ['validate', 'commits', 'main']).stderr, /Expected a range like origin\/main\.\.HEAD/);
});

test('in GitHub Actions, failures are also printed as annotations', () => {
  const root = prRepo(['fixed stuff']);
  const commits = cli(root, ['validate', 'commits', 'main..HEAD'], { GITHUB_ACTIONS: 'true' });
  assert.match(commits.stdout, /^::error title=Commit [0-9a-f]{7}::Commit message "fixed stuff" doesn't follow the format <type>: <description>\. Try: feat: fixed stuff$/m);
  const branch = cli(root, ['validate', 'branch', 'Bad_Branch'], { GITHUB_ACTIONS: 'true' });
  assert.equal(branch.status, 1);
  assert.match(branch.stdout, /^::error title=Branch name::Branch "Bad_Branch" doesn't follow the format/m);
  assert.doesNotMatch(cli(root, ['validate', 'branch', 'Bad_Branch']).stdout, /::error/, 'no annotations outside Actions');
});

test('scan --range finds secrets added anywhere in the pull request', () => {
  const clean = prRepo(['feat: one']);
  assert.equal(cli(clean, ['scan', '--range', 'main..HEAD']).status, 0);

  const leaky = prRepo(['feat: add config', 'chore: tidy'], { 'config.js': `const t = "${FAKE_TOKEN}";\n`, 'b.txt': 'b\n' });
  const result = cli(leaky, ['scan', '--range', 'main..HEAD'], { GITHUB_ACTIONS: 'true' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^::error file=config\.js,line=1,title=Possible secret::GitHub token \(ghp_\*+\)/m);
  assert.ok(!result.stdout.includes(FAKE_TOKEN) && !result.stderr.includes(FAKE_TOKEN), 'secret never printed in full');
});
