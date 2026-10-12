import { spawnSync } from 'node:child_process';
import { GuardianError } from './errors.js';

function git(args: string[], cwd: string): { status: number; stdout: string } {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) throw new GuardianError(`Git is not available: ${result.error.message}`);
  return { status: result.status ?? 1, stdout: result.stdout.trim() };
}

export function getRepoRoot(cwd = process.cwd()): string {
  const result = git(['rev-parse', '--show-toplevel'], cwd);
  if (result.status !== 0 || !result.stdout) {
    throw new GuardianError('Not inside a Git repository. CI Guardian reads .ciguardian.yml from the Git root.');
  }
  return result.stdout;
}

export function headCommit(repoRoot: string): string | null {
  const result = git(['rev-parse', '--verify', '--quiet', 'HEAD'], repoRoot);
  return result.status === 0 && result.stdout ? result.stdout : null;
}

export function isIgnored(repoRoot: string, relativePath: string): boolean {
  return git(['check-ignore', '--quiet', '--no-index', relativePath], repoRoot).status === 0;
}

function refExists(repoRoot: string, ref: string): boolean {
  return git(['rev-parse', '--verify', '--quiet', ref], repoRoot).status === 0;
}

/** origin's default branch if known, else main/master if present, else the current branch, else "main". */
export function defaultBranch(repoRoot: string): string {
  const remote = git(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], repoRoot);
  if (remote.status === 0 && remote.stdout.startsWith('origin/')) return remote.stdout.slice('origin/'.length);
  for (const name of ['main', 'master']) {
    if (refExists(repoRoot, `refs/heads/${name}`)) return name;
  }
  const current = git(['symbolic-ref', '--quiet', '--short', 'HEAD'], repoRoot);
  return current.status === 0 && current.stdout ? current.stdout : 'main';
}
