import { resolve } from 'node:path';
import { loadConfig } from '../config/load.js';
import { EXIT, GuardianError } from '../core/errors.js';
import { changedFiles, getRepoRoot, headCommit } from '../core/git.js';
import { out, ui } from '../core/log.js';
import { packageVersion } from '../core/version.js';
import { buildPlan } from '../planner/plan.js';
import { writeStepSummary } from '../reporters/github.js';
import { printSummary } from '../reporters/human.js';
import { buildReport, writeReportAtomic } from '../reporters/json.js';
import { Cancellation, runPlan } from '../runner/run.js';

export interface RunOptions {
  check?: string;
  parallel?: boolean;
  changed?: boolean;
  staged?: boolean;
}

export async function runCommand(options: RunOptions = {}): Promise<number> {
  const repoRoot = getRepoRoot();
  const loaded = loadConfig(repoRoot);
  if (loaded.config.checks.length === 0) {
    throw new GuardianError('No checks are configured in .ciguardian.yml; nothing to run. (Git Guardian checks run in the generated workflow.)');
  }

  if (options.changed || options.staged) {
    const files = changedFiles(repoRoot, options.staged);
    ui.info(`Scoped to ${files.length} changed file(s)${options.staged ? ' (staged)' : ''}`);
  }

  const plan = buildPlan(loaded.config, repoRoot, {
    only: options.check,
    parallel: options.parallel,
  });
  const reportPath = resolve(repoRoot, loaded.config.report.path);

  const cancellation = new Cancellation();
  const onSignal = (signal: NodeJS.Signals): void => {
    if (cancellation.cancelled) return;
    console.error('');
    ui.warn(`Received ${signal}; stopping the current check…`);
    cancellation.cancel('interrupted');
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  let outcome;
  try {
    outcome = await runPlan(plan, cancellation, {
      onCheckStart(check, index, total) {
        console.log('');
        console.log(`${out.bold(out.cyan(`▶ ${check.id}`))} ${out.dim(`(${index + 1}/${total})`)}`);
        console.log(out.dim(`$ ${[check.executable, ...check.args].map(displayArg).join(' ')}`));
      },
    });
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }

  printSummary(outcome, plan.scope);
  writeStepSummary(outcome, plan.scope, loaded.config.report.path);

  const report = buildReport({
    outcome,
    scope: plan.scope,
    packageVersion: packageVersion(),
    configHash: loaded.hash,
    commitSha: headCommit(repoRoot),
  });
  try {
    writeReportAtomic(reportPath, report);
  } catch (error) {
    throw new GuardianError(`Could not write report ${loaded.config.report.path}: ${(error as Error).message}`);
  }
  console.log(ui.dim(`Report: ${loaded.config.report.path}${plan.scope === 'partial' ? ' (partial; not a full gate)' : ''}`));

  if (outcome.status === 'cancelled') return EXIT.interrupted;
  return outcome.status === 'passed' ? EXIT.ok : EXIT.checkFailed;
}

function displayArg(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : JSON.stringify(arg);
}
