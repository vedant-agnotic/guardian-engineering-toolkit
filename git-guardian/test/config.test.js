import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDefaultConfig } from '../dist/config/defaults.js';
import { loadConfig, writeConfig } from '../dist/config/load.js';

test('writes and reloads the default config', () => {
  const root = mkdtempSync(join(tmpdir(), 'git-guardian-config-'));
  const original = createDefaultConfig();
  const path = writeConfig(root, original);
  assert.match(readFileSync(path, 'utf8'), /Git Guardian configuration/);
  assert.deepEqual(loadConfig(root), original);
});

test('rejects 0.1.x regex configs with migration help', async () => {
  const { writeFileSync } = await import('node:fs');
  const root = mkdtempSync(join(tmpdir(), 'git-guardian-legacy-'));
  writeFileSync(join(root, '.git-guardian.yml'), 'version: 1\nbranch:\n  pattern: "^feature/.+$"\n');
  assert.throws(() => loadConfig(root), /branch\.pattern[\s\S]*format: "<type>\/<number>-<description>"/);
});

test('rejects invalid formats and types', async () => {
  const { writeFileSync } = await import('node:fs');
  const root = mkdtempSync(join(tmpdir(), 'git-guardian-bad-'));
  writeFileSync(join(root, '.git-guardian.yml'), 'version: 1\nbranch:\n  format: "<type>/<id>"\n  types: "Feat, ok"\n');
  assert.throws(() => loadConfig(root), /branch\.types: Feat[\s\S]*unknown placeholder <id>/);
});

test('colour follows NO_COLOR, FORCE_COLOR, TERM and TTY', async () => {
  const { colorEnabled, createPalette } = await import('../dist/core/log.js');
  assert.equal(colorEnabled({ isTTY: true }, {}), true);
  assert.equal(colorEnabled({ isTTY: false }, {}), false);
  assert.equal(colorEnabled({ isTTY: true }, { NO_COLOR: '1' }), false);
  assert.equal(colorEnabled({ isTTY: true }, { NO_COLOR: '' }), true);
  assert.equal(colorEnabled({ isTTY: false }, { FORCE_COLOR: '1' }), true);
  assert.equal(colorEnabled({ isTTY: true }, { FORCE_COLOR: '0' }), false);
  assert.equal(colorEnabled({ isTTY: true }, { TERM: 'dumb' }), false);
  assert.equal(createPalette(false).red('x'), 'x');
  assert.equal(createPalette(true).placeholders('feat/<number>'), 'feat/\u001b[33m<number>\u001b[39m');
});

test('rejects unknown options and wrong value types instead of silently using defaults', async () => {
  const { writeFileSync } = await import('node:fs');
  const root = mkdtempSync(join(tmpdir(), 'git-guardian-strict-'));
  const file = join(root, '.git-guardian.yml');

  writeFileSync(file, 'version: 1\nbrnach:\n  enabled: true\n');
  assert.throws(() => loadConfig(root), /unknown option "brnach"/);

  writeFileSync(file, 'version: 1\nbranch:\n  formt: "<type>/<description>"\n');
  assert.throws(() => loadConfig(root), /unknown option "branch\.formt"/);

  writeFileSync(file, 'version: 1\ncommit:\n  maxSubjectLength: "long"\n');
  assert.throws(() => loadConfig(root), /commit\.maxSubjectLength must be a number/);

  writeFileSync(file, 'version: 1\nsecrets:\n  enabled: "yes"\n');
  assert.throws(() => loadConfig(root), /secrets\.enabled must be a boolean/);

  writeFileSync(file, 'version: 1\nbranch:\n  enabled: false\n');
  assert.equal(loadConfig(root).branch.enabled, false); // partial configs still fall back to defaults
});
