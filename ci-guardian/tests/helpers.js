import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');

export function tempRepo(prefix = 'ci-guardian-') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  spawnSync('git', ['init', '-q'], { cwd: root });
  return root;
}

/** Writes .ciguardian.yml with the given checks (objects with id, command, timeoutSeconds). */
export function writeConfig(root, checks, { failFast = false, projectRoot = '.', reportPath = '.guardian/ci/report.json' } = {}) {
  const lines = ['version: 1', 'project:', '  type: generic', `  root: ${JSON.stringify(projectRoot)}`, 'provider: github-actions', 'checks:'];
  for (const check of checks) {
    lines.push(`  - id: ${check.id}`);
    lines.push(`    command: [${check.command.map((part) => JSON.stringify(part)).join(', ')}]`);
    lines.push(`    timeoutSeconds: ${check.timeoutSeconds ?? 30}`);
  }
  lines.push('execution:', `  failFast: ${failFast}`, 'report:', `  path: ${JSON.stringify(reportPath)}`);
  writeFileSync(join(root, '.ciguardian.yml'), `${lines.join('\n')}\n`);
}

export function node(code) {
  return [process.execPath, '-e', code];
}

export function cli(args, cwd) {
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, output: result.stdout + result.stderr };
}

export function cliAsync(args, cwd) {
  return spawn(process.execPath, [CLI, ...args], { cwd, env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
}

export function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
