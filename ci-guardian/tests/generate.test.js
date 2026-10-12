import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createConfig } from '../dist/config/defaults.js';
import { validateSchema } from '../dist/config/validate.js';
import { parseYaml } from '../dist/config/yaml.js';
import { stringifyConfig } from '../dist/config/defaults.js';
import { renderWorkflow } from '../dist/providers/github/workflow.js';
import { cli, tempRepo, writeConfig } from './helpers.js';

const lint = { id: 'lint', command: ['npm', 'run', 'lint'], timeoutSeconds: 300 };
const inputs = { defaultBranch: 'main', node: { version: '20' } };
const hasRuby = spawnSync('ruby', ['-e', 'require "yaml"']).status === 0;

/** Parses YAML with a real parser (Ruby's) when available. */
function parseWithRuby(text) {
  const result = spawnSync('ruby', ['-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.safe_load(STDIN.read, aliases: false))'], {
    input: text,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('gitGuardian section is optional and allows zero code checks', () => {
  const withGg = createConfig('generic', '.', [], false, true);
  const text = stringifyConfig(withGg);
  assert.match(text, /checks: \[\]/);
  assert.deepEqual(validateSchema(parseYaml(text)).config, withGg);
  const withoutAnything = createConfig('generic', '.', [], false);
  assert.match(validateSchema(parseYaml(stringifyConfig(withoutAnything))).issues[0].message, /at least one check/);
  assert.match(JSON.stringify(validateSchema(parseYaml(text.replace('enabled: true', 'enabled: "yes"'))).issues), /gitGuardian\.enabled/);
});

test('workflow with both jobs: pinned actions, safe env, required gate', () => {
  const text = renderWorkflow(createConfig('generic', '.', [lint], false, true), inputs);
  assert.match(text, /uses: actions\/checkout@[0-9a-f]{40} # v/);
  assert.match(text, /uses: actions\/setup-node@[0-9a-f]{40} # v/);
  assert.doesNotMatch(text, /run: .*\$\{\{/, 'event values must never be pasted into run scripts');
  assert.match(text, /BRANCH: \$\{\{ github\.head_ref \}\}/);
  assert.match(text, /npx --no git-guardian validate commits "\$BASE_SHA\.\.\$HEAD_SHA"/);
  assert.match(text, /npx --no git-guardian scan --range/);
  assert.doesNotMatch(text, /run: npx (?!--no )/, 'every npx call must refuse to download packages');
  assert.match(text, /npx --no ci-guardian run/);
  assert.match(text, /needs: \[git-guardian, checks\]/);
  assert.match(text, /case "\$GIT_GUARDIAN" in success\|skipped\) ;;/);
  assert.match(text, /\[ "\$CHECKS" = success \]/);
});

test('workflow omits jobs that have nothing to do', () => {
  const onlyGg = renderWorkflow(createConfig('generic', '.', [], false, true), inputs);
  assert.doesNotMatch(onlyGg, /ci-guardian run/);
  assert.match(onlyGg, /needs: \[git-guardian\]/);
  const onlyChecks = renderWorkflow(createConfig('generic', '.', [lint]), { defaultBranch: 'develop', node: { file: '.nvmrc' } });
  assert.doesNotMatch(onlyChecks, /git-guardian/);
  assert.match(onlyChecks, /branches: \["develop"\]/);
  assert.match(onlyChecks, /node-version-file: \.nvmrc/);
});

test('generated workflow is valid YAML with the expected structure', { skip: !hasRuby && 'ruby not installed' }, () => {
  const doc = parseWithRuby(renderWorkflow(createConfig('generic', '.', [lint], false, true), inputs));
  assert.equal(doc.name, 'guardian-ci');
  assert.deepEqual(Object.keys(doc.jobs), ['git-guardian', 'checks', 'required']);
  assert.deepEqual(doc.permissions, { contents: 'read' });
  assert.equal(doc.jobs['git-guardian'].steps[0].with['fetch-depth'], 0);
  assert.equal(doc.jobs.required.if, '${{ always() }}');
  const gate = doc.jobs.required.steps[0];
  assert.match(gate.run, /exit 1/);
  assert.deepEqual(Object.keys(gate.env), ['GIT_GUARDIAN', 'CHECKS']);
  // "on" is parsed as boolean true by YAML 1.1 parsers; GitHub reads it as the trigger key.
  assert.ok(doc.on ?? doc.true);
});

test('the required gate script fails unless jobs passed', () => {
  const doc = renderWorkflow(createConfig('generic', '.', [lint], false, true), inputs);
  const script = doc.split('        run: |\n')[1].split('\n').map((line) => line.replace(/^ {10}/, '')).join('\n');
  const gate = (env) => spawnSync('sh', ['-c', script], { env: { PATH: process.env.PATH, ...env } }).status;
  assert.equal(gate({ GIT_GUARDIAN: 'success', CHECKS: 'success' }), 0);
  assert.equal(gate({ GIT_GUARDIAN: 'skipped', CHECKS: 'success' }), 0, 'skipped on push / bot branches');
  assert.equal(gate({ GIT_GUARDIAN: 'failure', CHECKS: 'success' }), 1);
  assert.equal(gate({ GIT_GUARDIAN: 'cancelled', CHECKS: 'success' }), 1);
  assert.equal(gate({ GIT_GUARDIAN: 'success', CHECKS: 'skipped' }), 1);
  assert.equal(gate({ GIT_GUARDIAN: 'success', CHECKS: 'failure' }), 1);
});

test('generate previews by default, writes once, never overwrites', () => {
  const repo = tempRepo();
  writeConfig(repo, [lint]);
  const preview = cli(['generate'], repo);
  assert.equal(preview.status, 0);
  assert.match(preview.stdout, /name: guardian-ci/);
  assert.equal(existsSync(join(repo, '.github/workflows/guardian-ci.yml')), false);

  assert.equal(cli(['generate', '--provider', 'github-actions', '--write'], repo).status, 0);
  const path = join(repo, '.github/workflows/guardian-ci.yml');
  writeFileSync(path, readFileSync(path, 'utf8') + '# my edit\n');
  const again = cli(['generate', '--write'], repo);
  assert.equal(again.status, 2);
  assert.match(again.stderr, /already exists/);
  assert.match(readFileSync(path, 'utf8'), /# my edit/);
  assert.equal(cli(['generate', '--provider', 'gitlab'], repo).status, 2);
});

test('run refuses when only Git Guardian checks are configured', () => {
  const repo = tempRepo();
  writeFileSync(join(repo, '.ciguardian.yml'), stringifyConfig(createConfig('generic', '.', [], false, true)));
  const result = cli(['run'], repo);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /No checks are configured/);
});

test('generate warns about file: dependencies outside the repository', () => {
  const repo = tempRepo();
  writeConfig(repo, [lint]);
  writeFileSync(
    join(repo, 'package.json'),
    JSON.stringify({ devDependencies: { 'git-guardian': 'file:../downloads/git-guardian-0.1.1.tgz', 'ci-guardian': 'file:tools/ci-guardian.tgz' } }),
  );
  const result = cli(['generate'], repo);
  assert.match(result.stderr, /installs "git-guardian" from file:\.\.\/downloads\/git-guardian-0\.1\.1\.tgz, outside this repository/);
  assert.doesNotMatch(result.stderr, /"ci-guardian" from/);
});
