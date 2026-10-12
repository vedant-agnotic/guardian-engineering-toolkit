import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseYaml } from '../dist/config/yaml.js';

test('parses the React Native example', () => {
  const value = parseYaml(readFileSync(new URL('../examples/ciguardian.example.yml', import.meta.url), 'utf8'));
  assert.deepEqual(value.checks[2], { id: 'unit', command: ['npm', 'run', 'test', '--', '--runInBand'], timeoutSeconds: 900 });
  assert.equal(value.execution.failFast, false);
});

test('parses block and compact sequences, quotes and comments', () => {
  const value = parseYaml(`---
# comment
a:
- x # trailing
- "y # not a comment"
- 'it''s'
b:
  - c: 1
    d: [one, "two, three", 'four']
  -
    e: true
f: []
g: null
`);
  assert.deepEqual(value, {
    a: ['x', 'y # not a comment', "it's"],
    b: [{ c: 1, d: ['one', 'two, three', 'four'] }, { e: true }],
    f: [],
    g: null,
  });
});

const rejected = {
  'duplicate keys': 'a: 1\na: 2\n',
  anchors: 'a: &x 1\n',
  aliases: 'a: *x\n',
  tags: 'a: !!str 1\n',
  'merge keys': '<<: {}\n',
  'flow mappings': 'a: {b: 1}\n',
  'nested flow sequences': 'a: [[b]]\n',
  'block scalars': 'a: |\n  text\n',
  'multi-line flow': 'a: [b,\n  c]\n',
  tabs: 'a:\n\tb: 1\n',
  'multiple documents': 'a: 1\n---\nb: 2\n',
  'ambiguous booleans': 'a: yes\n',
  'bad indentation': 'a:\n  b: 1\n c: 2\n',
  'unterminated quotes': 'a: "b\n',
  empty: '# only a comment\n',
};
for (const [name, input] of Object.entries(rejected)) {
  test(`rejects ${name}`, () => assert.throws(() => parseYaml(input)));
}

test('rejects oversized and deeply nested input', () => {
  assert.throws(() => parseYaml(`a: "${'x'.repeat(70 * 1024)}"\n`), /larger than/);
  const deep = Array.from({ length: 20 }, (_, depth) => `${'  '.repeat(depth)}k${depth}:`).join('\n') + ' 1\n';
  assert.throws(() => parseYaml(deep), /Nesting/);
});
