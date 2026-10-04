#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createBranchCommand, suggestBranchCommand } from './commands/branch.js';
import { doctorCommand } from './commands/doctor.js';
import { initCommand } from './commands/init.js';
import { installCommand, uninstallCommand } from './commands/install.js';
import { validateBranchCommand, validateCommitCommand, validateConfigCommand } from './commands/validate.js';
import { handleCommitMsg, handleReferenceTransaction } from './hooks/handlers.js';
import { ui } from './core/log.js';

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
      await initCommand({ force: hasFlag(args, '--force'), yes: hasFlag(args, '--yes') || hasFlag(args, '-y') });
      return;
    case 'install':
      installCommand(hasFlag(args, '--force'));
      return;
    case 'uninstall':
      uninstallCommand();
      return;
    case 'doctor':
      doctorCommand();
      return;
    case 'validate':
      handleValidate(args);
      return;
    case 'branch':
      handleBranch(args);
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
  if (target === 'commit') {
    validateCommitCommand({
      message: optionValue(args, '--message') ?? optionValue(args, '-m'),
      file: optionValue(args, '--file') ?? optionValue(args, '-f'),
    });
    return;
  }
  throw new Error(`Unknown validate target: ${target}`);
}

function handleBranch(args: string[]): void {
  const action = args.shift();
  if (action === 'create') {
    const name = args.shift();
    if (!name) throw new Error('Usage: git-guardian branch create <name> [--from <start-point>]');
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
  console.log(`Git Guardian ${VERSION}

Usage:
  git-guardian <command> [options]

Setup:
  init [--yes] [--force]                 Create .git-guardian.yml and install hooks
  install [--force]                      Install/reinstall repository hooks
  uninstall                              Remove Guardian hooks and restore previous hooks
  doctor                                 Check Git, config and hook installation

Validation:
  validate [config]                      Validate configuration
  validate branch [name]                 Validate current or supplied branch name
  validate commit -m "message"           Validate a commit message
  validate commit -f <message-file>      Validate a commit message file

Branches:
  branch create <name> [--from <ref>]     Validate, then create a branch
  branch suggest <description>            Generate compliant branch-name suggestions

Examples:
  git-guardian init
  git-guardian branch create feature/ABC-123-add-login
  git-guardian branch suggest "ABC-123 add passkey login"
  git-guardian validate commit -m "feat(auth): add passkey login"

Native Git commands are guarded too after installation:
  git switch -c Bad_Branch               # blocked before the branch ref is created
  git checkout -b Bad_Branch              # blocked
  git branch Bad_Branch                   # blocked
  git commit -m "bad message"             # blocked
`);
}

main().catch((error: unknown) => {
  ui.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
