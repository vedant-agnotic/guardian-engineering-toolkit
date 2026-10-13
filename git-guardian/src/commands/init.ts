import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { configExists, writeConfig } from '../config/load.js';
import { createDefaultConfig } from '../config/defaults.js';
import { configFromPreset, findPreset } from '../config/presets.js';
import type { GitGuardianConfig } from '../config/types.js';
import { splitCsv, typeListErrors } from '../config/validate.js';
import { getRepoRoot, gitVersion, supportsReferenceTransaction } from '../core/git.js';
import { setUpCiGuardian } from '../core/guardians.js';
import { out, ui } from '../core/log.js';
import { installHooks } from '../hooks/install.js';
import { compileBranchFormat } from '../validation/branch.js';
import { compileCommitFormat } from '../validation/commit.js';
import { compileFormat, exampleFor } from '../validation/template.js';

export interface InitOptions {
  force?: boolean;
  yes?: boolean;
  /** Start from a named preset (see `git-guardian presets`) instead of the defaults. */
  preset?: string;
  /** Offer to set up CI Guardian at the end (false when CI Guardian itself runs this init). */
  ci?: boolean;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const repoRoot = getRepoRoot();
  if (configExists(repoRoot) && !options.force) {
    throw new Error('.git-guardian.yml already exists. Use --force to replace it.');
  }

  const config = options.preset ? configFromPreset(findPreset(options.preset)) : createDefaultConfig();
  let install = true;
  let ci = false;

  if (!options.yes && process.stdin.isTTY) {
    const rl = createInterface({ input, output });
    try {
      ({ install, ci } = await promptForRules(rl, config, options.ci ?? true));
    } finally {
      rl.close();
    }
  }

  const path = writeConfig(repoRoot, config);
  ui.success(`Created ${path}`);

  const version = gitVersion();
  if (!supportsReferenceTransaction(version)) {
    ui.warn(`Git ${version} is older than 2.28; native branch-creation blocking may not work.`);
  }

  if (install) {
    const result = installHooks(repoRoot, config, options.force ?? false);
    ui.success(`Installed hooks: ${result.installed.join(', ') || 'none'}`);
    ui.info(`Hooks directory: ${result.hooksDir}`);
  } else {
    ui.info('Hooks not installed. Run git-guardian install when ready.');
  }

  console.log(`\n${out.bold('Try:')}`);
  console.log(`  ${out.green(`git switch -c ${exampleFor(compileBranchFormat(config.branch))}`)}`);
  console.log(`  ${out.green(`git commit -m "${exampleFor(compileCommitFormat(config.commit))}"`)}`);

  if (ci) await setUpCiGuardian(repoRoot);
}

type Prompt = { question(query: string): Promise<string> };

async function promptForRules(rl: Prompt, config: GitGuardianConfig, offerCi: boolean): Promise<{ install: boolean; ci: boolean }> {
  ui.title('Git Guardian setup');
  const legend: Array<[string, string]> = [
    ['<type>', 'one of your allowed types (question 2)'],
    ['<number>', 'a number, e.g. 123'],
    ['<ticket>', 'a ticket key, e.g. ABC-123'],
    ['<scope>', 'area of the code, e.g. auth'],
    ['<description>', 'what the change does'],
    ['[ ... ]', `an optional part, e.g. ${out.placeholders('"<type>[(<scope>)]: <description>"')}`],
  ];
  console.log('Names are described with placeholders, no regex needed:');
  for (const [name, help] of legend) console.log(`  ${out.yellow(name.padEnd(13))}  ${help}`);
  console.log(out.dim('Press Enter to accept the default shown in parentheses.\n'));

  const ask = async (label: string, fallback: string): Promise<string> =>
    (await rl.question(`${out.bold(out.cyan(label))} ${out.dim(`(${fallback})`)}\n${out.cyan('>')} `)).trim() || fallback;

  for (;;) {
    const format = await ask('1/3 Branch name format', config.branch.format);
    const error = formatError(format, 'branch', ['type']);
    if (!error) {
      config.branch.format = format;
      break;
    }
    ui.error(error);
  }

  for (;;) {
    const answer = await ask('\n2/3 Allowed types, comma-separated (used for branches and commits)', splitCsv(config.branch.types).join(', '));
    const errors = typeListErrors(answer);
    if (!errors.length) {
      const types = splitCsv(answer).join(',');
      config.branch.types = types;
      config.commit.types = types;
      break;
    }
    ui.error(errors.join('; '));
  }
  ui.info(`Branch example: ${out.green(exampleFor(compileBranchFormat(config.branch)))}`);

  for (;;) {
    const format = await ask('\n3/3 Commit message format', config.commit.format);
    const error = formatError(format, 'commit', splitCsv(config.commit.types));
    if (!error) {
      config.commit.format = format;
      break;
    }
    ui.error(error);
  }
  ui.info(`Commit example: ${out.green(exampleFor(compileCommitFormat(config.commit)))}`);

  const excludeAnswer = await rl.question(
    `\n${out.bold(out.cyan('Exclude standard branches (main, master, develop, staging) from naming rules?'))} ${out.dim('[Y/n]')} `,
  );
  const trimmedExclude = excludeAnswer.trim();
  if (/^n(o)?$/i.test(trimmedExclude)) {
    config.branch.protected = '';
  } else if (trimmedExclude && !/^y(es)?$/i.test(trimmedExclude)) {
    config.branch.protected = splitCsv(trimmedExclude).join(',');
  }

  const secretAnswer = await rl.question(
    `\n${out.bold(out.cyan('Block commits that contain secrets (API keys, tokens, passwords, .env files)?'))} ${out.dim('[Y/n]')} `,
  );
  config.secrets.enabled = !/^n(o)?$/i.test(secretAnswer.trim());

  const hookAnswer = await rl.question(`\n${out.bold(out.cyan('Install Git hooks now?'))} ${out.dim('[Y/n]')} `);
  const install = !/^n(o)?$/i.test(hookAnswer.trim());

  let ci = false;
  if (offerCi) {
    const ciAnswer = await rl.question(
      `\n${out.bold(out.cyan('Also run these checks in GitHub Actions on every pull request? (sets up CI Guardian)'))} ${out.dim('[y/N]')} `,
    );
    ci = /^y(es)?$/i.test(ciAnswer.trim());
  }
  return { install, ci };
}

function formatError(format: string, kind: 'branch' | 'commit', types: string[]): string | null {
  try {
    compileFormat(format, kind, types);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
