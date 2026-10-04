import { readFileSync } from 'node:fs';
import { loadConfig } from '../config/load.js';
import { currentBranch, getRepoRoot } from '../core/git.js';
import { ui } from '../core/log.js';
import { validateBranchName } from '../validation/branch.js';
import { validateCommitMessage } from '../validation/commit.js';

export function validateConfigCommand(): void {
  const repoRoot = getRepoRoot();
  loadConfig(repoRoot);
  ui.success('.git-guardian.yml is valid.');

  const branch = currentBranch(repoRoot);
  if (branch) {
    const result = validateBranchName(branch, loadConfig(repoRoot).branch);
    if (result.valid) ui.success(`Current branch is valid: ${branch}`);
    else ui.warn(`Current branch does not match policy: ${branch}`);
  }
}

export function validateBranchCommand(name?: string): void {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const branch = name ?? currentBranch(repoRoot);
  if (!branch) throw new Error('Detached HEAD. Pass a branch name explicitly.');

  const result = validateBranchName(branch, config.branch);
  if (!result.valid) {
    const suggestions = result.suggestions.length ? `\nSuggestions:\n${result.suggestions.map((s) => `  - ${s}`).join('\n')}` : '';
    throw new Error(`${result.reason}\nExpected example: ${config.branch.example}${suggestions}`);
  }
  ui.success(`Valid branch: ${branch}`);
}

export function validateCommitCommand(options: { message?: string; file?: string }): void {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const message = options.file ? readFileSync(options.file, 'utf8') : options.message;
  if (!message) throw new Error('Provide --message "..." or --file <path>.');

  const result = validateCommitMessage(message, config.commit);
  if (!result.valid) {
    const suggestions = result.suggestions.length ? `\nSuggestions:\n${result.suggestions.map((s) => `  - ${s}`).join('\n')}` : '';
    throw new Error(`${result.reason}\nExpected example: ${config.commit.example}${suggestions}`);
  }
  ui.success('Commit message is valid.');
}
