import { ui } from '../core/log.js';
import type { CheckResult, RunOutcome } from '../runner/run.js';

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s`;
}

function label(result: CheckResult): string {
  switch (result.status) {
    case 'passed':
      return ui.green('✓ passed   ');
    case 'failed':
      return ui.red(ui.bold('✗ failed   '));
    case 'cancelled':
      return ui.yellow('■ cancelled');
    default:
      return ui.dim('○ skipped  ');
  }
}

export function printSummary(outcome: RunOutcome, scope: 'full' | 'partial'): void {
  const width = Math.max(...outcome.checks.map((check) => check.id.length), 5);
  console.log('');
  ui.title(`CI Guardian summary ${ui.dim(`(${scope} run)`)}`);
  for (const result of outcome.checks) {
    const reason = !result.reason ? '' : result.status === 'failed' ? ui.red(`  ${result.reason}`) : ui.dim(`  ${result.reason}`);
    console.log(`  ${ui.bold(result.id.padEnd(width))}  ${label(result)}  ${ui.dim(formatDuration(result.durationMs).padStart(7))}${reason}`);
  }
  const total = formatDuration(outcome.finishedAt.getTime() - outcome.startedAt.getTime());
  const counts = (['passed', 'failed', 'skipped', 'cancelled'] as const)
    .map((status) => [status, outcome.checks.filter((check) => check.status === status).length] as const)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${status}`)
    .join(', ');
  console.log('');
  if (outcome.status === 'passed') ui.success(`All requested checks passed (${counts}) in ${total}`);
  else if (outcome.status === 'cancelled') ui.warn(`Run interrupted (${counts}) after ${total}`);
  else {
    ui.error(`Run failed (${counts}) in ${total}`);
    const failed = outcome.checks.find((check) => check.status === 'failed');
    if (failed) ui.info(`Fix it, then re-run just that check: ${ui.green(`npx ci-guardian run --check ${failed.id}`)}`);
  }
}
