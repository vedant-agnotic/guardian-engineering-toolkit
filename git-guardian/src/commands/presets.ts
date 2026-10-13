import { configFromPreset, findPreset, PRESETS } from '../config/presets.js';
import { out, ui } from '../core/log.js';
import { validateBranchName } from '../validation/branch.js';
import { validateCommitMessage } from '../validation/commit.js';

/** Lists the presets, with names each one accepts and rejects. Nothing is written or installed. */
export function listPresetsCommand(): void {
  ui.title('Presets');
  for (const preset of PRESETS) {
    console.log(`\n${out.bold(out.cyan(preset.name))}  ${preset.summary}`);
    console.log(`  branch  ${out.placeholders(preset.branchFormat)}`);
    console.log(`  commit  ${out.placeholders(preset.commitFormat)}`);
    console.log(`  types   ${preset.types.split(',').join(', ')}`);
    console.log(`  ${out.green('accepts')} ${[...preset.branchAccepts, ...preset.commitAccepts].join('   ')}`);
    console.log(`  ${out.red('rejects')} ${[...preset.branchRejects, ...preset.commitRejects].join('   ')}`);
  }
  console.log(`\n${out.dim('Try your own names first: git-guardian presets test <name> --branch <branch> --commit "<message>"')}`);
  console.log(out.dim('Use one: git-guardian init --preset <name>'));
}

/** Checks names against a preset without touching the repository or its hooks. Returns false when anything is rejected. */
export function testPresetCommand(name: string, branch?: string, commit?: string): boolean {
  if (!branch && !commit) throw new Error('Usage: git-guardian presets test <name> [--branch <branch>] [--commit "<message>"]');
  const config = configFromPreset(findPreset(name));
  let allValid = true;
  if (branch) {
    const result = validateBranchName(branch, config.branch);
    allValid &&= result.valid;
    if (result.valid) ui.success(`Branch "${branch}" is accepted by "${name}".`);
    else ui.error(`${result.reason}${result.suggestions.length ? `\nTry: ${result.suggestions.slice(0, 3).join(', ')}` : ''}`);
  }
  if (commit) {
    const result = validateCommitMessage(commit, config.commit);
    allValid &&= result.valid;
    if (result.valid) ui.success(`Commit message "${commit}" is accepted by "${name}".`);
    else ui.error(`${result.reason}${result.suggestions.length ? `\nTry: ${result.suggestions.slice(0, 3).join(', ')}` : ''}`);
  }
  return allValid;
}
