#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createBranchCommand, suggestBranchCommand } from './commands/branch.js';
import { guidedBranchCommand } from './commands/guided.js';
import { listPresetsCommand, testPresetCommand } from './commands/presets.js';
import { doctorCommand } from './commands/doctor.js';
import { scanCommand } from './commands/scan.js';
import { initCommand } from './commands/init.js';
import { installCommand, uninstallCommand } from './commands/install.js';
import { validateBranchCommand, validateCommitCommand, validateCommitsCommand, validateConfigCommand } from './commands/validate.js';
import { handleCommitMsg, handleReferenceTransaction } from './hooks/handlers.js';
import { out, ui } from './core/log.js';

const VERSION = readVersion();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args.shift();

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(VERSION);
    return;
  }

  switch (command) {
    case 'init':
      await initCommand({
        force: hasFlag(args, '--force'),
        yes: hasFlag(args, '--yes') || hasFlag(args, '-y'),
        preset: optionValue(args, '--preset'),
        ci: !hasFlag(args, '--no-ci'),
      });
      return;
    case 'install':
      installCommand(hasFlag(args, '--force'));
      return;
    case 'uninstall':
      uninstallCommand();
      return;
    case 'doctor':
      doctorCommand(hasFlag(args, '--strict'));
      return;
    case 'presets':
      handlePresets(args);
      return;
    case 'validate':
      handleValidate(args);
      return;
    case 'branch':
      await handleBranch(args);
      return;
    case 'scan':
      scanCommand({ message: optionValue(args, '--message') ?? optionValue(args, '-m'), range: optionValue(args, '--range') });
      return;
    case 'hook':
      handleInternalHook(args);
      return;
    default:
      throw new Error(`Unknown command: ${command}. Run git-guardian help.`);
  }
}

function handleValidate(args: string[]): void {
  const target = args.shift();
  if (!target || target === 'config') {
    validateConfigCommand();
    return;
  }
  if (target === 'branch') {
    validateBranchCommand(args[0]);
    return;
  }
  if (target === 'commits') {
    const range = args[0];
    if (!range) throw new Error('Usage: git-guardian validate commits <base>..<head>   e.g. origin/main..HEAD');
    validateCommitsCommand(range);
    return;
  }
  if (target === 'commit') {
    validateCommitCommand({
      message: optionValue(args, '--message') ?? optionValue(args, '-m'),
      file: optionValue(args, '--file') ?? optionValue(args, '-f'),
    });
    return;
  }
  throw new Error(`Unknown validate target: ${target}`);
}

function handlePresets(args: string[]): void {
  if (args[0] !== 'test') {
    listPresetsCommand();
    return;
  }
  args.shift();
  const name = args.shift();
  if (!name) throw new Error('Usage: git-guardian presets test <name> [--branch <branch>] [--commit "<message>"]');
  const ok = testPresetCommand(name, optionValue(args, '--branch'), optionValue(args, '--commit'));
  if (!ok) process.exitCode = 1;
}

async function handleBranch(args: string[]): Promise<void> {
  const action = args.shift();
  if (action === 'create') {
    const name = args[0] && !args[0].startsWith('--') ? args.shift() : undefined;
    if (!name) {
      await guidedBranchCommand(optionValue(args, '--from'));
      return;
    }
    createBranchCommand(name, optionValue(args, '--from'));
    return;
  }
  if (action === 'suggest') {
    const input = args.join(' ').trim();
    if (!input) throw new Error('Usage: git-guardian branch suggest <description>');
    suggestBranchCommand(input);
    return;
  }
  throw new Error('Usage: git-guardian branch <create|suggest> ...');
}

function handleInternalHook(args: string[]): void {
  const hook = args.shift();
  if (hook === 'commit-msg') {
    const file = args.shift();
    if (!file) process.exitCode = 1;
    else process.exitCode = handleCommitMsg(file);
    return;
  }
  if (hook === 'reference-transaction') {
    const state = args.shift();
    if (!state) {
      process.exitCode = 1;
      return;
    }
    const input = readFileSync(0, 'utf8');
    process.exitCode = handleReferenceTransaction(state, input);
    return;
  }
  throw new Error(`Unknown internal hook: ${hook ?? '(missing)'}`);
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const packagePath = resolve(here, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function printHelp(): void {
  const section = (name: string): string => `\n${out.bold(out.yellow(name))}`;
  const row = (command: string, description: string): string =>
    `  ${out.cyan(command.padEnd(38))} ${description}`;
  const example = (command: string, note = ''): string =>
    `  ${out.green(command.padEnd(38))} ${note ? out.dim(note) : ''}`.trimEnd();

  console.log(
    [
      `${out.bold(out.cyan('Git Guardian'))} ${out.dim(VERSION)}`,
      '',
      `${out.bold('Usage:')} git-guardian ${out.cyan('<command>')} [options]`,
      section('Setup'),
      row('init [--yes] [--preset <name>] [--force]', 'Create .git-guardian.yml, install hooks, optionally set up CI'),
      row('presets', 'List ready-made rule sets with names they accept and reject'),
      row('presets test <name> --branch <b>', 'Try names against a preset before enabling it'),
      row('install [--force]', 'Install/reinstall repository hooks'),
      row('uninstall', 'Remove Guardian hooks and restore previous hooks'),
      row('doctor [--strict]', 'Check Git, config and hooks; --strict exits 1 if anything is wrong'),
      section('Validation'),
      row('validate [config]', 'Validate configuration'),
      row('validate branch [name]', 'Validate current or supplied branch name'),
      row('validate commit -m "message"', 'Validate a commit message'),
      row('validate commit -f <message-file>', 'Validate a commit message file'),
      row('validate commits <base>..<head>', 'Validate every commit in a range, e.g. a pull request'),
      section('Secrets'),
      row('scan [-m "message"]', 'Scan staged changes for keys, tokens and passwords'),
      row('scan --range <base>..<head>', 'Scan the lines added in a range (for CI)'),
      section('Branches'),
      row('branch create [<name>] [--from <ref>]', 'Validate, then create a branch (prompts for the parts if no name)'),
      row('branch suggest <description>', 'Suggest branch names that follow the format'),
      section('Examples'),
      example('git-guardian init'),
      example('git-guardian branch create feat/123-add-login'),
      example('git-guardian branch suggest "123 add passkey login"'),
      example('git-guardian validate commit -m "feat: add passkey login"'),
      section('Native Git commands are guarded too after installation'),
      `  ${out.red('git switch -c Bad_Branch'.padEnd(38))} ${out.dim('# blocked before the branch is created')}`,
      `  ${out.red('git checkout -b Bad_Branch'.padEnd(38))} ${out.dim('# blocked')}`,
      `  ${out.red('git branch Bad_Branch'.padEnd(38))} ${out.dim('# blocked')}`,
      `  ${out.red('git commit -m "bad message"'.padEnd(38))} ${out.dim('# blocked')}`,
      `  ${out.red('git commit (staging an API key or .env)'.padEnd(38))} ${out.dim('# blocked')}`,
      '',
      out.dim('Set NO_COLOR=1 to disable colours, FORCE_COLOR=1 to force them.'),
    ].join('\n'),
  );
}

main().catch((error: unknown) => {
  ui.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
