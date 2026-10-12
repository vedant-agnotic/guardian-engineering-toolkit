import { resolve } from 'node:path';
import { formatIssues, inspectConfig } from '../config/load.js';
import { EXIT } from '../core/errors.js';
import { getRepoRoot, isIgnored } from '../core/git.js';
import { ui } from '../core/log.js';
import { resolveExecutable } from '../core/resolve.js';

const MIN_NODE_MAJOR = 20;

/** Inspects runtime, paths and executable availability. Never runs a check. */
export function doctorCommand(): number {
  let problems = 0;
  const fail = (text: string): void => {
    problems += 1;
    ui.error(text);
  };

  ui.title('CI Guardian doctor');

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor >= MIN_NODE_MAJOR) ui.success(`Node.js ${process.versions.node}`);
  else fail(`Node.js ${process.versions.node} is older than the supported ${MIN_NODE_MAJOR}.x`);

  const repoRoot = getRepoRoot();
  ui.success(`Git root: ${repoRoot}`);

  const result = inspectConfig(repoRoot);
  if (!result.ok) {
    fail('Configuration is invalid:');
    console.error(formatIssues(result.issues));
    return EXIT.usage;
  }
  const { config } = result.loaded;
  ui.success(`Configuration valid (${config.checks.length} check(s))`);

  const cwd = resolve(repoRoot, config.project.root);
  ui.success(`Project root: ${config.project.root}`);

  for (const check of config.checks) {
    const executable = check.command[0];
    const found = resolveExecutable(executable, cwd);
    if (found) ui.success(`${check.id}: ${executable} → ${found}`);
    else fail(`${check.id}: executable "${executable}" not found on PATH or relative to ${config.project.root}`);
  }

  if (isIgnored(repoRoot, config.report.path)) ui.success(`Report path ignored by Git: ${config.report.path}`);
  else ui.warn(`Report path is not Git-ignored: ${config.report.path} (consider adding it to .gitignore)`);

  if (problems > 0) {
    ui.error(`${problems} problem(s) found. Checks were not run.`);
    return EXIT.usage;
  }
  ui.info('Ready. Doctor does not run checks; use "ci-guardian run".');
  return EXIT.ok;
}
