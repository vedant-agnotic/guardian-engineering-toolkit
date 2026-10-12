import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { createConfig, reactNativeDefaults, stringifyConfig } from '../config/defaults.js';
import { CONFIG_FILE, configPath, formatIssues } from '../config/load.js';
import type { CheckConfig, CiGuardianConfig } from '../config/types.js';
import { CHECK_ID_PATTERN, validateSchema } from '../config/validate.js';
import { parseYaml } from '../config/yaml.js';
import { EXIT, GuardianError } from '../core/errors.js';
import { getRepoRoot } from '../core/git.js';
import { highlightYaml, out, ui } from '../core/log.js';
import { ensureInstalled, GIT_GUARDIAN, localBin } from '../core/packages.js';
import { renderWorkflow, REQUIRED_STATUS, WORKFLOW_PATH } from '../providers/github/workflow.js';
import { warnUnportableDependencies, workflowInputs, writeWorkflow } from './generate.js';

export interface InitOptions {
  defaults: boolean;
  /** Called from "git-guardian init": Git Guardian checks are wanted and already set up. */
  withGitGuardian: boolean;
}

export async function initCommand(options: InitOptions): Promise<number> {
  const repoRoot = getRepoRoot();
  const target = configPath(repoRoot);
  if (existsSync(target)) {
    throw new GuardianError(`${CONFIG_FILE} already exists; init never overwrites it. Edit it, then run "ci-guardian validate".`);
  }

  if (options.defaults) {
    writeConfig(target, reactNativeDefaults());
    ui.success(`Created ${CONFIG_FILE}`);
    ui.warn('These are the documented React Native defaults; they do not prove the scripts exist.');
    ui.info(`Next: review it, then run ${out.green('ci-guardian validate')} and ${out.green('ci-guardian doctor')}.`);
    return EXIT.ok;
  }
  if (!process.stdin.isTTY) {
    throw new GuardianError('init needs an interactive terminal. Use "ci-guardian init --defaults" in automation.');
  }

  printIntro();

  // Step 1: Git Guardian checks, setting Git Guardian up first if needed.
  stepHeader(1, 'Git Guardian checks', 'Branch name, every commit message, PR title and a secret scan on each pull request.');
  const gitGuardian = options.withGitGuardian ? announceGitGuardian() : await setUpGitGuardian(repoRoot);

  // Step 2: code checks.
  stepHeader(2, 'Code checks', 'Commands your project can already run. Nothing is installed or added to package.json.');
  const checks = await withPrompt((p) => chooseCodeChecks(repoRoot, p));
  if (!checks.length && !gitGuardian) {
    ui.warn('No checks selected, so there is nothing to set up. Nothing was written.');
    return EXIT.ok;
  }

  // Step 3: review and write.
  stepHeader(3, 'Review and create', `${CONFIG_FILE} lists the checks; the workflow runs them on every pull request.`);
  const config = createConfig(detectProjectType(repoRoot), '.', checks, false, gitGuardian);
  console.log(out.dim(`┌─ ${CONFIG_FILE}`));
  console.log(highlightYaml(stringifyConfig(config).trimEnd()).replace(/^/gm, out.dim('│ ')));
  console.log(out.dim('└─'));

  const write = await withPrompt((p) => p.confirm(`Write ${CONFIG_FILE}?`, true));
  if (!write) {
    ui.warn('Nothing written.');
    return EXIT.ok;
  }
  writeConfig(target, config);
  const created = [CONFIG_FILE];

  const workflow = await withPrompt((p) => p.confirm(`Create the GitHub Actions workflow (${WORKFLOW_PATH})?`, true));
  if (workflow && writeWorkflow(repoRoot, renderWorkflow(config, workflowInputs(repoRoot)), { quiet: true })) {
    created.push(WORKFLOW_PATH);
  }

  printSummary(repoRoot, created, workflow, checks.length > 0);
  return EXIT.ok;
}

function printIntro(): void {
  console.log('');
  ui.title('CI Guardian setup');
  console.log(`Three short steps. Press ${out.bold('Enter')} to accept the answer in capitals (${out.dim('[Y/n]')} means yes).`);
  console.log(`  ${out.cyan('1')} Git Guardian checks   ${out.cyan('2')} Code checks   ${out.cyan('3')} Review and create`);
}

function stepHeader(step: number, title: string, explanation: string): void {
  console.log(`\n${out.bold(out.cyan(`Step ${step} of 3 · ${title}`))}`);
  console.log(out.dim(explanation));
}

function printSummary(repoRoot: string, created: string[], workflow: boolean, hasChecks: boolean): void {
  console.log('');
  ui.success(out.bold('Setup complete'));
  for (const file of created) console.log(`  ${out.green('created')}  ${file}`);

  const toCommit = ['.ciguardian.yml'];
  if (created.includes(WORKFLOW_PATH)) toCommit.push('.github');
  for (const file of ['package.json', 'package-lock.json', '.git-guardian.yml', 'tools']) {
    if (existsSync(join(repoRoot, file))) toCommit.push(file);
  }

  console.log(`\n${out.bold('Next steps')}`);
  let step = 1;
  if (hasChecks) console.log(`  ${out.cyan(`${step++}.`)} ${out.green('npx ci-guardian run')}  ${out.dim('# try the checks locally, as CI will')}`);
  console.log(`  ${out.cyan(`${step++}.`)} ${out.green(`git add ${toCommit.join(' ')}`)}  ${out.dim('# then commit and push')}`);
  if (workflow) {
    console.log(`  ${out.cyan(`${step++}.`)} Open a pull request and watch the ${out.bold('guardian-ci')} workflow run.`);
    console.log(`  ${out.cyan(`${step++}.`)} In GitHub: Settings → Branches → require the ${out.bold(`"${REQUIRED_STATUS}"`)} status.`);
  } else {
    console.log(`  ${out.cyan(`${step++}.`)} Create the workflow when ready: ${out.green('npx ci-guardian generate --write')}`);
  }
  if (!existsSync(join(repoRoot, 'package-lock.json'))) {
    ui.warn('No package-lock.json yet: run "npm install" and commit it; the workflow installs with "npm ci".');
  }
  warnUnportableDependencies(repoRoot);
}

function writeConfig(target: string, config: CiGuardianConfig): void {
  const text = stringifyConfig(config);
  const { issues } = validateSchema(parseYaml(text));
  if (issues.length > 0) throw new GuardianError(`Generated configuration is invalid:\n${formatIssues(issues)}`);
  writeFileSync(target, text, { encoding: 'utf8', flag: 'wx' });
}

function announceGitGuardian(): boolean {
  ui.success('Included. Git Guardian was just set up.');
  return true;
}

async function setUpGitGuardian(repoRoot: string): Promise<boolean> {
  const wanted = await withPrompt((p) => p.confirm('Add Git Guardian checks to the CI pipeline?', true));
  if (!wanted) {
    console.log(out.dim('  Skipped.'));
    return false;
  }

  const configured = existsSync(join(repoRoot, '.git-guardian.yml'));
  const bin = localBin(repoRoot, GIT_GUARDIAN.bin);
  if (configured && bin) {
    ui.success('Git Guardian is already set up (.git-guardian.yml found).');
    return true;
  }

  ui.warn('Git Guardian is not set up in this repository yet.');
  const setUp = await withPrompt((p) => p.confirm('Set it up now?', true));
  if (!setUp) {
    ui.warn('Git Guardian checks skipped. Run "ci-guardian init" again after setting it up.');
    return false;
  }

  const installed = bin ?? (await withPrompt((p) => ensureInstalled(repoRoot, GIT_GUARDIAN, (question) => p.ask(question))));
  if (!installed) {
    ui.warn('Git Guardian checks skipped because Git Guardian could not be installed.');
    return false;
  }

  if (!configured) {
    // Hand the terminal to Git Guardian's own setup; --no-ci stops it from offering CI Guardian back.
    console.log(`\n${out.dim('──────── Git Guardian setup ────────')}`);
    const result = spawnSync(installed, ['init', '--no-ci'], { cwd: repoRoot, stdio: 'inherit' });
    console.log(out.dim('──────── back to CI Guardian ────────'));
    if (result.status !== 0 || !existsSync(join(repoRoot, '.git-guardian.yml'))) {
      ui.warn('Git Guardian setup did not finish; its checks are skipped.');
      return false;
    }
  }
  ui.success('Git Guardian is set up; its checks are included.');
  return true;
}

interface Candidate {
  id: string;
  label: string;
  command: string[] | null;
  /** Why it is unavailable and how to fix it, when command is null. */
  missing?: string;
  timeoutSeconds: number;
}

async function chooseCodeChecks(repoRoot: string, p: Prompter): Promise<CheckConfig[]> {
  const pkg = readPackageJson(repoRoot);
  if (!pkg) ui.warn('No package.json found; lint, Prettier and npm audit need a Node project.');

  const all = candidates(repoRoot, pkg);
  const available = all.filter((candidate) => candidate.command);
  const missing = all.filter((candidate) => !candidate.command && candidate.missing);
  const width = Math.max(...all.map((candidate) => candidate.label.length));

  if (available.length) {
    console.log('Found in this project:');
    for (const candidate of available) {
      console.log(`  ${out.green('✓')} ${candidate.label.padEnd(width)}  ${out.green(candidate.command!.join(' '))}`);
    }
  }
  if (missing.length) {
    console.log(available.length ? 'Not available yet:' : 'None of the usual checks are available yet:');
    for (const candidate of missing) {
      console.log(`  ${out.dim('·')} ${out.dim(candidate.label.padEnd(width))}  ${out.dim(candidate.missing!)}`);
    }
  }

  const checks: CheckConfig[] = [];
  const add = (candidate: Candidate): void => {
    checks.push({ id: candidate.id, command: candidate.command!, timeoutSeconds: candidate.timeoutSeconds });
  };
  if (available.length) {
    const names = available.map((candidate) => candidate.label).join(', ');
    if (await p.confirm(`Add all ${available.length} (${names})?`, true)) {
      available.forEach(add);
    } else {
      for (const candidate of available) {
        if (await p.confirm(`  Add ${candidate.label}?`, true)) add(candidate);
      }
    }
  }

  while (await p.confirm('Add another check, e.g. build?', false)) {
    const id = (await p.ask('  Check id (lowercase, e.g. build)')).trim();
    if (!CHECK_ID_PATTERN.test(id) || checks.some((check) => check.id === id)) {
      ui.error('Use a new id: lowercase letters, numbers or hyphens, starting with a letter.');
      continue;
    }
    const command = (await p.ask(`  Command for "${id}" (e.g. npm run build)`)).split(/\s+/).filter(Boolean);
    if (!command.length) continue;
    checks.push({ id, command, timeoutSeconds: 900 });
    ui.success(`Added ${id}: ${command.join(' ')}`);
  }
  return checks;
}

type PackageJson = { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

/** Only offers commands the project can already run; init never adds scripts or dependencies. */
function candidates(repoRoot: string, pkg: PackageJson | null): Candidate[] {
  if (!pkg) return [];
  const scripts = pkg.scripts ?? {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const lockfile = existsSync(join(repoRoot, 'package-lock.json'));
  const script = (name: string): string[] | null => (scripts[name] ? ['npm', 'run', name] : null);

  return [
    {
      id: 'lint',
      label: 'lint',
      command: script('lint') ?? (deps.eslint ? ['npx', 'eslint', '.'] : null),
      missing: 'needs a "lint" script or eslint → npm install --save-dev eslint',
      timeoutSeconds: 600,
    },
    {
      id: 'format',
      label: 'Prettier',
      command: script('format:check') ?? (deps.prettier ? ['npx', 'prettier', '--check', '.'] : null),
      missing: 'needs prettier → npm install --save-dev prettier',
      timeoutSeconds: 300,
    },
    {
      id: 'audit',
      label: 'npm audit',
      command: lockfile ? ['npm', 'audit', '--audit-level=high'] : null,
      missing: 'needs package-lock.json → npm install',
      timeoutSeconds: 300,
    },
    { id: 'typecheck', label: 'type check', command: script('typecheck'), timeoutSeconds: 600 },
    { id: 'test', label: 'tests', command: script('test') && !/no test specified/.test(scripts.test) ? ['npm', 'test'] : null, timeoutSeconds: 900 },
  ];
}

function readPackageJson(repoRoot: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as PackageJson;
  } catch {
    return null;
  }
}

function detectProjectType(repoRoot: string): 'react-native' | 'generic' {
  const pkg = readPackageJson(repoRoot);
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  return deps['react-native'] ? 'react-native' : 'generic';
}

interface Prompter {
  ask(question: string, fallback?: string): Promise<string>;
  confirm(question: string, fallback: boolean): Promise<boolean>;
}

/**
 * Opens the terminal prompt only for the duration of fn, so a child process
 * (another Guardian's init) can own the terminal in between. Prompts look like
 * Git Guardian's: bold cyan question, dim default, "> " for text answers.
 */
async function withPrompt<T>(fn: (prompter: Prompter) => Promise<T>): Promise<T> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const prompter: Prompter = {
    async ask(question, fallback = '') {
      const suffix = fallback ? ` ${out.dim(`(${fallback})`)}` : '';
      return (await rl.question(`${out.bold(out.cyan(question))}${suffix}\n${out.cyan('>')} `)).trim() || fallback;
    },
    async confirm(question, fallback) {
      for (;;) {
        const answer = (await rl.question(`${out.bold(out.cyan(question))} ${out.dim(fallback ? '[Y/n]' : '[y/N]')} `)).trim().toLowerCase();
        if (!answer) return fallback;
        if (/^y(es)?$/.test(answer)) return true;
        if (/^n(o)?$/.test(answer)) return false;
        ui.warn('Please answer y or n.');
      }
    },
  };
  try {
    return await fn(prompter);
  } finally {
    rl.close();
  }
}
