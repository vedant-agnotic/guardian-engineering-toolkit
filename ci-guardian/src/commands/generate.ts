import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { loadConfig } from '../config/load.js';
import { EXIT, GuardianError } from '../core/errors.js';
import { defaultBranch, getRepoRoot } from '../core/git.js';
import { highlightYaml, out, ui } from '../core/log.js';
import { REQUIRED_STATUS, renderWorkflow, WORKFLOW_PATH, type WorkflowInputs } from '../providers/github/workflow.js';

export function workflowInputs(repoRoot: string): WorkflowInputs {
  const nodeFile = ['.nvmrc', '.node-version'].find((file) => existsSync(join(repoRoot, file)));
  return {
    defaultBranch: defaultBranch(repoRoot),
    node: nodeFile ? { file: nodeFile } : { version: '20' },
  };
}

/**
 * Warns about dependencies the CI runner cannot install: "file:" paths that
 * point outside the repository (common when a Guardian tarball was installed
 * from a download folder).
 */
export function warnUnportableDependencies(repoRoot: string): void {
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  } catch {
    return;
  }
  for (const [name, spec] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (!spec.startsWith('file:')) continue;
    const inside = relative(repoRoot, resolve(repoRoot, spec.slice('file:'.length)));
    if (inside.startsWith('..') || isAbsolute(inside)) {
      ui.warn(
        `package.json installs "${name}" from ${spec}, outside this repository; "npm ci" will fail on the CI runner. ` +
          `Copy the file into tools/, commit it, and run: npm install --save-dev ./tools/<file>.tgz`,
      );
    }
  }
}

/** Writes the workflow as a new file. Returns false (and explains) if one already exists. */
export function writeWorkflow(repoRoot: string, text: string, options: { quiet?: boolean } = {}): boolean {
  const target = join(repoRoot, WORKFLOW_PATH);
  if (existsSync(target)) {
    ui.warn(`${WORKFLOW_PATH} already exists; it was not changed. Compare it with "ci-guardian generate" and merge by hand.`);
    return false;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text, { encoding: 'utf8', flag: 'wx' });
  if (options.quiet) return true;
  ui.success(`Created ${WORKFLOW_PATH}`);
  ui.info(`Commit it, then require the ${out.bold(`"${REQUIRED_STATUS}"`)} status in your branch protection rules.`);
  return true;
}

export function generateCommand(options: { provider?: string; write: boolean }): number {
  if (options.provider !== undefined && options.provider !== 'github-actions') {
    throw new GuardianError(`Unknown provider "${options.provider}". Supported: github-actions`);
  }
  const repoRoot = getRepoRoot();
  const { config } = loadConfig(repoRoot);
  const inputs = workflowInputs(repoRoot);
  const text = renderWorkflow(config, inputs);

  if (!existsSync(join(repoRoot, 'package-lock.json'))) {
    ui.warn('No package-lock.json found; the workflow installs with "npm ci", which needs one.');
  }
  warnUnportableDependencies(repoRoot);
  if (!options.write) {
    console.log(highlightYaml(text));
    ui.info(`Preview only. Run ${out.green('ci-guardian generate --write')} to create ${WORKFLOW_PATH}.`);
    return EXIT.ok;
  }
  return writeWorkflow(repoRoot, text) ? EXIT.ok : EXIT.usage;
}
