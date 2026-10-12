import { loadConfig } from '../config/load.js';
import { branchExists, getRepoRoot } from '../core/git.js';
import { run } from '../core/exec.js';
import { out, ui } from '../core/log.js';
import { suggestBranchNames, validateBranchName } from '../validation/branch.js';
import { explainViolation } from '../validation/explain.js';

export function createBranchCommand(name: string, from?: string): void {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const result = validateBranchName(name, config.branch);
  if (!result.valid) throw new Error(explainViolation('branch', config, result));
  if (branchExists(repoRoot, name)) throw new Error(`Branch already exists: ${name}`);

  const args = ['switch', '-c', name];
  if (from) args.push(from);
  const execution = run('git', args, { cwd: repoRoot, stdio: 'inherit' });
  if (execution.status !== 0) throw new Error('git switch failed.');
  ui.success(`Created branch ${name}`);
}

export function suggestBranchCommand(input: string): void {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const suggestions = suggestBranchNames(input, config.branch);
  ui.title('Suggested branch names');
  for (const suggestion of suggestions) console.log(`  ${out.green(out.placeholders(suggestion))}`);
}
