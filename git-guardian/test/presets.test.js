import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, configFromPreset, findPreset } from '../dist/config/presets.js';
import { validateConfig } from '../dist/config/validate.js';
import { validateBranchName } from '../dist/validation/branch.js';
import { validateCommitMessage } from '../dist/validation/commit.js';

for (const preset of PRESETS) {
  test(`preset "${preset.name}" is a valid config`, () => {
    assert.doesNotThrow(() => validateConfig(configFromPreset(preset)));
  });

  test(`preset "${preset.name}" accepts and rejects its documented examples`, () => {
    const config = configFromPreset(preset);
    for (const name of preset.branchAccepts) assert.equal(validateBranchName(name, config.branch).valid, true, `branch ${name}`);
    for (const name of preset.branchRejects) assert.equal(validateBranchName(name, config.branch).valid, false, `branch ${name}`);
    for (const msg of preset.commitAccepts) assert.equal(validateCommitMessage(msg, config.commit).valid, true, `commit ${msg}`);
    for (const msg of preset.commitRejects) assert.equal(validateCommitMessage(msg, config.commit).valid, false, `commit ${msg}`);
  });
}

test('unknown preset names list the available ones', () => {
  assert.throws(() => findPreset('nope'), /Available: default, jira/);
});
