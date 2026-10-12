import { relative } from 'node:path';
import { formatIssues, inspectConfig } from '../config/load.js';
import { EXIT } from '../core/errors.js';
import { getRepoRoot } from '../core/git.js';
import { ui } from '../core/log.js';

/** Parses and validates configuration. Never executes a check. */
export function validateCommand(): number {
  const repoRoot = getRepoRoot();
  const result = inspectConfig(repoRoot);
  if (!result.ok) {
    ui.error(`${relative(process.cwd(), result.path) || result.path} is invalid:`);
    console.error(formatIssues(result.issues));
    return EXIT.usage;
  }
  const { config } = result.loaded;
  ui.success(
    `${relative(process.cwd(), result.loaded.path) || result.loaded.path} is valid: ` +
      `${config.project.type} project, ${config.checks.length} check(s): ${config.checks.map((check) => check.id).join(', ')}`,
  );
  return EXIT.ok;
}
