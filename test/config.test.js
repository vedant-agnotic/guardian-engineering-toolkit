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
