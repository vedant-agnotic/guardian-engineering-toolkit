import { readFileSync } from 'node:fs';
import { loadConfig } from '../config/load.js';
import { currentBranch, getRepoRoot } from '../core/git.js';
import { annotate, plain } from '../core/annotate.js';
import { err, ui } from '../core/log.js';
import { commitsInRange, displayRange, resolveRange } from '../core/range.js';
import { validateBranchName } from '../validation/branch.js';
import { validateCommitMessage } from '../validation/commit.js';
import { explainViolation } from '../validation/explain.js';

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
    const explanation = explainViolation('branch', config, result);
    annotate('error', 'Branch name', plain(explanation));
    throw new Error(explanation);
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
    const explanation = explainViolation('commit', config, result);
    annotate('error', 'Commit message', plain(explanation));
    throw new Error(explanation);
  }
  ui.success('Commit message is valid.');
}

/** Validates every commit in <base>..<head>, e.g. all commits of a pull request. */
export function validateCommitsCommand(rangeText: string): void {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const range = resolveRange(repoRoot, rangeText);
  const commits = commitsInRange(repoRoot, range);
  const label = displayRange(range);
  if (!commits.length) {
    ui.success(`No commits in ${label}.`);
    return;
  }

  let failed = 0;
  for (const commit of commits) {
    const short = commit.sha.slice(0, 7);
    const subject = commit.message.split('\n', 1)[0];
    const result = validateCommitMessage(commit.message, config.commit);
    if (result.valid) {
      ui.success(`${short} ${subject}`);
      continue;
    }
    failed += 1;
    console.error(`${err.red(err.bold('✗'))} ${err.yellow(short)} ${err.red(subject)}`);
    if (result.suggestions[0]) console.error(`    ${err.dim('try:')} ${err.green(result.suggestions[0])}`);
    const hint = result.suggestions[0] ? `. Try: ${result.suggestions[0]}` : '';
    annotate('error', `Commit ${short}`, `${plain(result.reason ?? `"${subject}" is invalid`)}${hint}`);
  }

  if (!failed) {
    ui.success(`All ${commits.length} commit message(s) in ${label} are valid.`);
    return;
  }
  const help = explainViolation('commit', config, { suggestions: [] });
  throw new Error(
    `${failed} of ${commits.length} commit message(s) in ${label} are invalid.\n${help}\n\n` +
      'Fix with an interactive rebase (git rebase -i <base>, mark commits "reword"), then force-push.',
  );
}
