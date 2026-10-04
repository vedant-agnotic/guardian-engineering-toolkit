import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GitGuardianConfig } from '../config/types.js';
import { hooksDirectory } from '../core/git.js';
import { commitMsgHookScript, MANAGED_MARKER, referenceTransactionHookScript } from './templates.js';

export interface HookInstallResult {
  hooksDir: string;
  installed: string[];
  skipped: string[];
}

export function installHooks(repoRoot: string, config: GitGuardianConfig, force = false): HookInstallResult {
  const hooksDir = hooksDirectory(repoRoot);
  mkdirSync(hooksDir, { recursive: true });
  const installed: string[] = [];
  const skipped: string[] = [];

  if (config.hooks.referenceTransaction && config.branch.enabled) {
    installOne(hooksDir, 'reference-transaction', referenceTransactionHookScript(), force);
    installed.push('reference-transaction');
  } else {
    skipped.push('reference-transaction');
  }

  if (config.hooks.commitMsg && config.commit.enabled) {
    installOne(hooksDir, 'commit-msg', commitMsgHookScript(), force);
    installed.push('commit-msg');
  } else {
    skipped.push('commit-msg');
  }

  return { hooksDir, installed, skipped };
}

export function uninstallHooks(repoRoot: string): string[] {
  const hooksDir = hooksDirectory(repoRoot);
  const restored: string[] = [];
  for (const name of ['reference-transaction', 'commit-msg']) {
    const hook = join(hooksDir, name);
    const backup = `${hook}.git-guardian-original`;
    if (existsSync(hook) && isManaged(hook)) unlinkSync(hook);
    if (existsSync(backup)) {
      renameSync(backup, hook);
      restored.push(name);
    }
  }
  return restored;
}

export function hooksStatus(repoRoot: string): Array<{ name: string; installed: boolean; managed: boolean }> {
  const hooksDir = hooksDirectory(repoRoot);
  return ['reference-transaction', 'commit-msg'].map((name) => {
    const path = join(hooksDir, name);
    return { name, installed: existsSync(path), managed: existsSync(path) && isManaged(path) };
  });
}

function installOne(hooksDir: string, name: string, script: string, force: boolean): void {
  const hook = join(hooksDir, name);
  const backup = `${hook}.git-guardian-original`;

  if (existsSync(hook) && !isManaged(hook)) {
    if (existsSync(backup) && !force) {
      throw new Error(
        `Cannot install ${name}: both ${hook} and ${backup} exist. Resolve the existing hook backup or use --force.`,
      );
    }
    if (existsSync(backup) && force) unlinkSync(backup);
    renameSync(hook, backup);
  }

  writeFileSync(hook, script, 'utf8');
  chmodSync(hook, 0o755);
}

function isManaged(path: string): boolean {
  try {
    return readFileSync(path, 'utf8').includes(MANAGED_MARKER);
  } catch {
    return false;
  }
}
