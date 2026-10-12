import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { cli, cliAsync, isAlive, node, tempRepo, writeConfig } from './helpers.js';

const readReport = (repo) => JSON.parse(readFileSync(join(repo, '.guardian/ci/report.json'), 'utf8'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('help, version and invalid invocations', () => {
  const repo = tempRepo();
  assert.match(cli(['--help'], repo).stdout, /ci-guardian <command>/);
  assert.match(cli(['--version'], repo).stdout, /^\d+\.\d+\.\d+/);
  assert.equal(cli(['nope'], repo).status, 2);
  assert.equal(cli(['validate', '--strict'], repo).status, 2);
  assert.equal(cli(['run', '--check'], repo).status, 2);
  assert.equal(cli(['generate', '--provider', 'github-actions'], repo).status, 2);
});

test('commands outside a Git repository exit 2', async () => {
  const { mkdtempSync, realpathSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ci-guardian-nogit-')));
  const result = cli(['validate'], dir);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Not inside a Git repository/);
});

test('init --defaults writes a valid config and refuses to overwrite', () => {
  const repo = tempRepo();
  assert.equal(cli(['init', '--defaults'], repo).status, 0);
  assert.match(readFileSync(join(repo, '.ciguardian.yml'), 'utf8'), /react-native/);
  assert.equal(cli(['validate'], repo).status, 0);
  const again = cli(['init', '--defaults'], repo);
  assert.equal(again.status, 2);
  assert.match(again.stderr, /already exists/);
});

test('interactive init requires a TTY', () => {
  const result = cli(['init'], tempRepo());
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--defaults/);
});

test('validate lists every issue and never executes checks', () => {
  const repo = tempRepo();
  const marker = join(repo, 'executed');
  writeConfig(repo, [{ id: 'a', command: node(`require('fs').writeFileSync(${JSON.stringify(marker)}, '')`) }]);
  assert.equal(cli(['validate'], repo).status, 0);
  assert.equal(cli(['doctor'], repo).status, 0);
  assert.equal(existsSync(marker), false);

  writeFileSync(join(repo, '.ciguardian.yml'), 'version: 2\nproject:\n  type: generic\n');
  const bad = cli(['validate'], repo);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /version: must be exactly 1/);
  assert.match(bad.stderr, /checks: is required/);
});

test('doctor reports missing executables', () => {
  const repo = tempRepo();
  writeConfig(repo, [{ id: 'a', command: ['ci-guardian-no-such-tool'] }, { id: 'b', command: ['./scripts/local.sh'] }]);
  const result = cli(['doctor'], repo);
  assert.equal(result.status, 2);
  assert.match(result.output, /a: executable "ci-guardian-no-such-tool" not found/);
  assert.match(result.output, /b: executable "\.\/scripts\/local\.sh" not found/);
});

test('a full passing run exits 0 and writes a full report', () => {
  const repo = tempRepo();
  writeConfig(repo, [
    { id: 'one', command: node('process.exit(0)') },
    { id: 'two', command: node('console.log(process.argv[1])'), timeoutSeconds: 5 },
  ]);
  const result = cli(['run'], repo);
  assert.equal(result.status, 0, result.output);
  const report = readReport(repo);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.scope, 'full');
  assert.equal(report.status, 'passed');
  assert.equal(report.commitSha, null);
  assert.match(report.configHash, /^sha256:/);
  assert.deepEqual(report.checks.map((c) => [c.id, c.status, c.exitCode]), [['one', 'passed', 0], ['two', 'passed', 0]]);
  assert.deepEqual(readdirSync(join(repo, '.guardian/ci')), ['report.json'], 'no temporary files remain');
});

test('records the commit sha when HEAD exists', async () => {
  const { spawnSync } = await import('node:child_process');
  const repo = tempRepo();
  writeConfig(repo, [{ id: 'one', command: node('') }]);
  spawnSync('git', ['add', '.'], { cwd: repo });
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init'], { cwd: repo });
  assert.equal(cli(['run'], repo).status, 0);
  assert.match(readReport(repo).commitSha, /^[0-9a-f]{40}$/);
});

test('arguments reach the child verbatim, without a shell', () => {
  const repo = tempRepo();
  const out = join(repo, 'args.json');
  const tricky = ['$HOME', '`id`', 'a b', '; rm -rf /', '*'];
  writeConfig(repo, [{ id: 'args', command: [...node(`require('fs').writeFileSync(${JSON.stringify(out)}, JSON.stringify(process.argv.slice(1)))`), ...tricky] }]);
  assert.equal(cli(['run'], repo).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), tricky);
});

test('checks run in project.root', () => {
  const repo = tempRepo();
  mkdirSync(join(repo, 'app'));
  writeConfig(repo, [{ id: 'cwd', command: node(`if (!process.cwd().endsWith('app')) process.exit(9)`) }], { projectRoot: 'app' });
  assert.equal(cli(['run'], repo).status, 0);
  assert.equal(existsSync(join(repo, '.guardian/ci/report.json')), true, 'report is relative to the Git root');
});

test('failures, missing executables and timeouts fail the run but later checks still run', () => {
  const repo = tempRepo();
  writeConfig(repo, [
    { id: 'fails', command: node('process.exit(3)') },
    { id: 'missing', command: ['ci-guardian-no-such-tool'] },
    { id: 'hangs', command: node('setInterval(() => {}, 1000)'), timeoutSeconds: 1 },
    { id: 'passes', command: node('') },
  ]);
  const result = cli(['run'], repo);
  assert.equal(result.status, 1);
  const checks = Object.fromEntries(readReport(repo).checks.map((c) => [c.id, c]));
  assert.equal(readReport(repo).status, 'failed');
  assert.deepEqual([checks.fails.status, checks.fails.exitCode, checks.fails.reason], ['failed', 3, 'exited with code 3']);
  assert.match(checks.missing.reason, /executable not found/);
  assert.match(checks.hangs.reason, /timed out after 1s/);
  assert.equal(checks.passes.status, 'passed');
});

test('failFast skips remaining checks with a reason', () => {
  const repo = tempRepo();
  writeConfig(repo, [{ id: 'fails', command: node('process.exit(1)') }, { id: 'later', command: node('') }], { failFast: true });
  assert.equal(cli(['run'], repo).status, 1);
  const later = readReport(repo).checks[1];
  assert.equal(later.status, 'skipped');
  assert.match(later.reason, /failFast after "fails"/);
});

test('run --check executes exactly one check and marks the report partial', () => {
  const repo = tempRepo();
  writeConfig(repo, [{ id: 'fails', command: node('process.exit(1)') }, { id: 'ok', command: node('') }]);
  assert.equal(cli(['run', '--check', 'ok'], repo).status, 0);
  const report = readReport(repo);
  assert.equal(report.scope, 'partial');
  assert.deepEqual(report.checks.map((c) => c.id), ['ok']);
  assert.equal(cli(['run', '--check=fails'], repo).status, 1);
  const unknown = cli(['run', '--check', 'nope'], repo);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /Configured checks: fails, ok/);
});

test('a timeout terminates the whole process tree', { skip: process.platform === 'win32' }, async () => {
  const repo = tempRepo();
  const pidFile = join(repo, 'grandchild.pid');
  const script = `
    const { spawn } = require('child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
    setInterval(() => {}, 1000);`;
  writeConfig(repo, [{ id: 'tree', command: node(script), timeoutSeconds: 1 }]);
  assert.equal(cli(['run'], repo).status, 1);
  const pid = Number(readFileSync(pidFile, 'utf8'));
  for (let i = 0; i < 20 && isAlive(pid); i += 1) await sleep(100);
  assert.equal(isAlive(pid), false, 'grandchild survived the timeout');
});

test('SIGINT cancels the running check, skips the rest and exits 130', { skip: process.platform === 'win32' }, async () => {
  const repo = tempRepo();
  writeConfig(repo, [
    { id: 'long', command: node("console.log('started'); setInterval(() => {}, 1000)"), timeoutSeconds: 60 },
    { id: 'never', command: node('') },
  ]);
  const child = cliAsync(['run'], repo);
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  for (let i = 0; i < 100 && !output.includes('started'); i += 1) await sleep(50);
  child.kill('SIGINT');
  const code = await new Promise((resolve) => child.on('exit', resolve));
  assert.equal(code, 130);
  const report = readReport(repo);
  assert.equal(report.status, 'cancelled');
  assert.deepEqual(report.checks.map((c) => c.status), ['cancelled', 'skipped']);
});

test('a report write failure exits 2', () => {
  const repo = tempRepo();
  mkdirSync(join(repo, 'reports'));
  writeFileSync(join(repo, 'reports', 'blocker'), '');
  writeConfig(repo, [{ id: 'ok', command: node('') }], { reportPath: 'reports/blocker/report.json' });
  const result = cli(['run'], repo);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Could not write report/);
});
