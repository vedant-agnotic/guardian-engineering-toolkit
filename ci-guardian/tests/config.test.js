import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfig, reactNativeDefaults, stringifyConfig } from '../dist/config/defaults.js';
import { inspectConfig } from '../dist/config/load.js';
import { validateSchema } from '../dist/config/validate.js';
import { parseYaml } from '../dist/config/yaml.js';
import { tempRepo, writeConfig } from './helpers.js';

const example = (name) => readFileSync(new URL(`../examples/${name}`, import.meta.url), 'utf8');

test('both examples pass schema validation', () => {
  for (const name of ['ciguardian.example.yml', 'ciguardian.python.example.yml']) {
    assert.deepEqual(validateSchema(parseYaml(example(name))).issues, [], name);
  }
});

test('stringified defaults round-trip to the same config', () => {
  const config = reactNativeDefaults();
  assert.deepEqual(validateSchema(parseYaml(stringifyConfig(config))).config, config);
  const awkward = createConfig('generic', 'my app', [{ id: 'x', command: ['run', 'a b', 'yes', '1', '--flag=on', '#x', 'k: v'], timeoutSeconds: 5 }]);
  assert.deepEqual(validateSchema(parseYaml(stringifyConfig(awkward))).config, awkward);
});

function issuesFor(mutate) {
  const value = parseYaml(example('ciguardian.example.yml'));
  mutate(value);
  return validateSchema(value).issues.map((issue) => `${issue.path}: ${issue.message}`);
}

test('rejects schema violations with field paths', () => {
  assert.match(issuesFor((v) => { v.version = 2; }).join(), /version: must be exactly 1/);
  assert.match(issuesFor((v) => { v.extra = 1; }).join(), /extra: unknown field/);
  assert.match(issuesFor((v) => { v.checks[0].shell = true; }).join(), /checks\[0\]\.shell: unknown field/);
  assert.match(issuesFor((v) => { delete v.report; }).join(), /report: is required/);
  assert.match(issuesFor((v) => { v.project.type = 'flutter'; }).join(), /project\.type/);
  assert.match(issuesFor((v) => { v.provider = 'gitlab'; }).join(), /provider/);
  assert.match(issuesFor((v) => { v.checks = []; }).join(), /checks: must list at least one check \(or enable gitGuardian\)/);
  assert.match(issuesFor((v) => { v.checks[1].id = 'lint'; }).join(), /duplicate check id/);
  assert.match(issuesFor((v) => { v.checks[0].id = 'Lint'; }).join(), /checks\[0\]\.id/);
  assert.match(issuesFor((v) => { v.checks[0].command = 'npm run lint'; }).join(), /must be a non-empty list/);
  assert.match(issuesFor((v) => { v.checks[0].command = ['sleep', 1]; }).join(), /command\[1\]: must be a string/);
  assert.match(issuesFor((v) => { v.checks[0].timeoutSeconds = 0; }).join(), /timeoutSeconds/);
  assert.match(issuesFor((v) => { v.checks[0].timeoutSeconds = 7201; }).join(), /timeoutSeconds/);
  assert.match(issuesFor((v) => { v.execution.failFast = 'no'; }).join(), /failFast/);
  assert.match(issuesFor((v) => { v.project.root = '../other'; }).join(), /project\.root: must not contain ".."/);
  assert.match(issuesFor((v) => { v.report.path = '/tmp/report.json'; }).join(), /report\.path: must be relative/);
});

test('rejects missing project root and symlink escapes', () => {
  const repo = tempRepo();
  writeConfig(repo, [{ id: 'a', command: ['true'] }], { projectRoot: 'missing' });
  assert.match(JSON.stringify(inspectConfig(repo)), /directory does not exist/);

  const outside = mkdtempSync(join(tmpdir(), 'ci-guardian-outside-'));
  symlinkSync(outside, join(repo, 'escape'));
  writeConfig(repo, [{ id: 'a', command: ['true'] }], { projectRoot: 'escape' });
  assert.match(JSON.stringify(inspectConfig(repo)), /project\.root.*symlink escape/);

  writeConfig(repo, [{ id: 'a', command: ['true'] }], { reportPath: 'escape/report.json' });
  assert.match(JSON.stringify(inspectConfig(repo)), /report\.path.*symlink escape/);

  writeConfig(repo, [{ id: 'a', command: ['true'] }], { reportPath: '.git/report.json' });
  assert.match(JSON.stringify(inspectConfig(repo)), /inside \.git/);
});

test('accepts a nested project root and records a config hash', () => {
  const repo = tempRepo();
  mkdirSync(join(repo, 'app dir'));
  writeConfig(repo, [{ id: 'a', command: ['true'] }], { projectRoot: 'app dir' });
  const result = inspectConfig(repo);
  assert.equal(result.ok, true);
  assert.match(result.loaded.hash, /^sha256:[0-9a-f]{64}$/);
});

test('reports a YAML error instead of throwing', () => {
  const repo = tempRepo();
  writeFileSync(join(repo, '.ciguardian.yml'), 'version: 1\nversion: 1\n');
  const result = inspectConfig(repo);
  assert.equal(result.ok, false);
  assert.match(result.issues[0].message, /Duplicate key/);
});
