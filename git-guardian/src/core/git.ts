import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { run, runChecked } from './exec.js';

export function getRepoRoot(cwd = process.cwd()): string {
  return runChecked('git', ['rev-parse', '--show-toplevel'], { cwd });
}

export function isGitRepo(cwd = process.cwd()): boolean {
  const result = run('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
  return result.status === 0 && result.stdout.trim() === 'true';
}

export function currentBranch(repoRoot: string): string | null {
  const result = run('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd: repoRoot });
  return result.status === 0 ? result.stdout.trim() : null;
}

export function gitVersion(): string {
  const result = runChecked('git', ['--version']);
  return result.replace(/^git version\s+/, '').trim();
}

export function supportsReferenceTransaction(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (major > 2) return true;
  return major === 2 && minor >= 28;
}

export function branchExists(repoRoot: string, branch: string): boolean {
  return run('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: repoRoot }).status === 0;
}

export function refExists(repoRoot: string, ref: string): boolean {
  return run('git', ['show-ref', '--verify', '--quiet', ref], { cwd: repoRoot }).status === 0;
}

export function hooksDirectory(repoRoot: string): string {
  const configured = run('git', ['config', '--get', 'core.hooksPath'], { cwd: repoRoot });
  if (configured.status === 0 && configured.stdout.trim()) {
    const value = configured.stdout.trim();
    if (value === '/dev/null') throw new Error('Git hooks are disabled because core.hooksPath is /dev/null.');
    return isAbsolute(value) ? value : resolve(repoRoot, value);
  }

  const gitPath = runChecked('git', ['rev-parse', '--git-path', 'hooks'], { cwd: repoRoot });
  const absolute = isAbsolute(gitPath) ? gitPath : resolve(repoRoot, gitPath);
  if (!existsSync(absolute)) return absolute;
  return absolute;
}

/** True while a merge is being concluded (MERGE_HEAD exists). */
export function isMerging(repoRoot: string): boolean {
  return run('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { cwd: repoRoot }).status === 0;
}
