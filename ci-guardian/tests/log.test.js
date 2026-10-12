import test from 'node:test';
import assert from 'node:assert/strict';
import { colorEnabled, createPalette, highlightYaml } from '../dist/core/log.js';

test('colour follows NO_COLOR, FORCE_COLOR, TERM and TTY', () => {
  assert.equal(colorEnabled({ isTTY: true }, {}), true);
  assert.equal(colorEnabled({ isTTY: false }, {}), false);
  assert.equal(colorEnabled({ isTTY: true }, { NO_COLOR: '1' }), false);
  assert.equal(colorEnabled({ isTTY: true }, { NO_COLOR: '' }), true);
  assert.equal(colorEnabled({ isTTY: false }, { FORCE_COLOR: '1' }), true);
  assert.equal(colorEnabled({ isTTY: true }, { FORCE_COLOR: '0' }), false);
  assert.equal(colorEnabled({ isTTY: true }, { TERM: 'dumb' }), false);
});

test('YAML highlighting colours keys and comments, and is plain without colour', () => {
  const yaml = '# note\nchecks:\n  - id: lint # main\n    command: [npm, run, lint]';
  assert.equal(highlightYaml(yaml, createPalette(false)), yaml);
  const coloured = highlightYaml(yaml, createPalette(true));
  assert.match(coloured, /^\u001b\[2m# note/);
  assert.match(coloured, /\u001b\[36mchecks\u001b\[39m:/);
  assert.match(coloured, /- \u001b\[36mid\u001b\[39m:\u001b\[32m lint\u001b\[39m\u001b\[2m # main/);
});
