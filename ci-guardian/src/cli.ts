#!/usr/bin/env node
import { doctorCommand } from './commands/doctor.js';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { validateCommand } from './commands/validate.js';
import { EXIT, GuardianError } from './core/errors.js';
import { out, ui } from './core/log.js';
import { packageVersion } from './core/version.js';

const VERSION = packageVersion();

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return EXIT.ok;
  }
  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(VERSION);
    return EXIT.ok;
  }

  switch (command) {
    case 'init': {
      const flags = parseFlags(rest, { booleans: ['--defaults', '--with-git-guardian'] });
      return initCommand({ defaults: flags.booleans.has('--defaults'), withGitGuardian: flags.booleans.has('--with-git-guardian') });
    }
    case 'validate':
      parseFlags(rest, {});
      return validateCommand();
    case 'doctor':
      parseFlags(rest, {});
      return doctorCommand();
    case 'run': {
      const flags = parseFlags(rest, { values: ['--check'] });
      return runCommand({ check: flags.values.get('--check') });
    }
    case 'generate': {
      const flags = parseFlags(rest, { booleans: ['--write'], values: ['--provider'] });
      return generateCommand({ provider: flags.values.get('--provider'), write: flags.booleans.has('--write') });
    }
    default:
      throw new GuardianError(`Unknown command: ${command}. Run "ci-guardian help".`);
  }
}

interface ParsedFlags {
  booleans: Set<string>;
  values: Map<string, string>;
}

/** Strict parser: unknown flags, positional arguments and repeated flags are errors. */
function parseFlags(args: string[], spec: { booleans?: string[]; values?: string[] }): ParsedFlags {
  const parsed: ParsedFlags = { booleans: new Set(), values: new Map() };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [name, inline] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];

    if (spec.booleans?.includes(name) && inline === undefined) {
      if (parsed.booleans.has(name)) throw new GuardianError(`Repeated option: ${name}`);
      parsed.booleans.add(name);
    } else if (spec.values?.includes(name)) {
      if (parsed.values.has(name)) throw new GuardianError(`Repeated option: ${name}`);
      const value = inline ?? args[(index += 1)];
      if (value === undefined || value === '' || (inline === undefined && value.startsWith('-'))) {
        throw new GuardianError(`Option ${name} needs a value`);
      }
      parsed.values.set(name, value);
    } else {
      throw new GuardianError(`Unknown option or argument: ${arg}. Run "ci-guardian help".`);
    }
  }
  return parsed;
}

function printHelp(): void {
  const section = (name: string): string => `\n${out.bold(out.yellow(name))}`;
  const row = (command: string, description: string): string => `  ${out.cyan(command.padEnd(24))} ${description}`;
  const example = (command: string, note: string): string => `  ${out.green(command.padEnd(34))} ${out.dim(note)}`;

  console.log(
    [
      `${out.bold(out.cyan('CI Guardian'))} ${out.dim(VERSION)}`,
      out.dim('Run your project\'s quality checks the same way locally and in GitHub Actions.'),
      '',
      `${out.bold('Usage:')} ci-guardian ${out.cyan('<command>')} [options]`,
      section('Set up'),
      row('init', 'Guided setup: Git Guardian checks, lint, Prettier, npm audit, tests, workflow'),
      row('init --defaults', 'Write the React Native example config without questions'),
      section('Check'),
      row('validate', 'Check .ciguardian.yml (runs nothing)'),
      row('doctor', 'Check Node, paths and that every command exists (runs nothing)'),
      row('run', 'Run every check and write .guardian/ci/report.json'),
      row('run --check <id>', 'Run one check (report marked partial)'),
      section('GitHub Actions'),
      row('generate', 'Preview .github/workflows/guardian-ci.yml'),
      row('generate --write', 'Create it (never overwrites an existing file)'),
      section('Examples'),
      example('npx ci-guardian init', '# answer the questions; creates config and workflow'),
      example('npx ci-guardian run', '# run all checks like CI will'),
      example('npx ci-guardian run --check lint', '# quick feedback on one check'),
      section('Exit codes'),
      `  ${out.green('0')} passed   ${out.red('1')} a check failed   ${out.yellow('2')} invalid usage, config or report   ${out.yellow('130')} interrupted`,
      '',
      out.dim('Options: -h/--help, -v/--version. Set NO_COLOR=1 to turn colours off, FORCE_COLOR=1 to force them.'),
    ].join('\n'),
  );
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    ui.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error instanceof GuardianError ? error.exitCode : EXIT.usage;
  });
