import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadConfig } from '../config/load.js';
import { EXIT, GuardianError } from '../core/errors.js';
import { getRepoRoot } from '../core/git.js';
import { out, ui } from '../core/log.js';
import type { CheckConfig } from '../config/types.js';

export function inferFixCommand(check: CheckConfig): string[] | null {
  if (check.fixCommand && check.fixCommand.length > 0) {
    return check.fixCommand;
  }

  // Infer ESLint fix
  if (check.command.some((arg) => arg.includes('eslint'))) {
    const args = [...check.command];
    if (!args.includes('--fix')) args.push('--fix');
    return args;
  }

  // Infer Prettier fix
  if (check.command.some((arg) => arg.includes('prettier'))) {
    return check.command.map((arg) => (arg === '--check' ? '--write' : arg));
  }

  // Infer npm run lint -> npm run lint -- --fix
  if (
    check.command[0] === 'npm' &&
    check.command[1] === 'run' &&
    (check.command[2] === 'lint' || check.command[2] === 'format')
  ) {
    return [...check.command, '--', '--fix'];
  }

  return null;
}

export async function fixCommand(options: { check?: string }): Promise<number> {
  const repoRoot = getRepoRoot();
  const loaded = loadConfig(repoRoot);
  const cwd = resolve(repoRoot, loaded.config.project.root);

  let targetChecks = loaded.config.checks;
  if (options.check !== undefined) {
    targetChecks = loaded.config.checks.filter((c) => c.id === options.check);
    if (targetChecks.length === 0) {
      const known = loaded.config.checks.map((c) => c.id).join(', ');
      throw new GuardianError(`Unknown check id "${options.check}". Configured checks: ${known}`);
    }
  }

  ui.title('CI Guardian Auto-Fix');
  let fixedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const check of targetChecks) {
    const fixCmd = inferFixCommand(check);
    if (!fixCmd) {
      console.log(`${ui.dim('○')} ${out.bold(check.id)}: no autofix command configured or inferred`);
      skippedCount++;
      continue;
    }

    console.log(`\n${out.bold(out.cyan(`▶ Fixing ${check.id}`))} ${out.dim(`$ ${fixCmd.join(' ')}`)}`);
    const [executable, ...args] = fixCmd;
    const result = spawnSync(executable, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    if (result.status === 0) {
      ui.success(`Fixed ${check.id}`);
      fixedCount++;
    } else {
      ui.error(`Auto-fix for ${check.id} exited with code ${result.status ?? 'error'}`);
      failedCount++;
    }
  }

  console.log('');
  if (failedCount > 0) {
    ui.error(`Auto-fix completed with errors: ${fixedCount} fixed, ${failedCount} failed, ${skippedCount} skipped.`);
    return EXIT.checkFailed;
  }

  if (fixedCount > 0) {
    ui.success(`Auto-fix complete: ${fixedCount} check(s) successfully fixed!`);
  } else {
    ui.info(`No autofixable checks found.`);
  }
  return EXIT.ok;
}
