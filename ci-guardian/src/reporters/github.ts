import { appendFileSync } from 'node:fs';
import type { CheckResult, RunOutcome } from '../runner/run.js';
import { formatDuration } from './human.js';

function markdownBadge(result: CheckResult): string {
  switch (result.status) {
    case 'passed':
      return '✅ Passed';
    case 'failed':
      return '❌ Failed';
    case 'cancelled':
      return '⚠️ Cancelled';
    default:
      return '⚪ Skipped';
  }
}

export function writeStepSummary(outcome: RunOutcome, scope: 'full' | 'partial', reportPath: string): void {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const total = formatDuration(outcome.finishedAt.getTime() - outcome.startedAt.getTime());
  const counts = (['passed', 'failed', 'skipped', 'cancelled'] as const)
    .map((status) => [status, outcome.checks.filter((check) => check.status === status).length] as const)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${status}`)
    .join(', ');

  const rows = outcome.checks.map((check) => {
    const status = markdownBadge(check);
    const duration = formatDuration(check.durationMs);
    const notes = check.reason ? `\`${check.reason}\`` : '—';
    return `| ${status} | **\`${check.id}\`** | ${duration} | ${notes} |`;
  });

  const lines = [
    `### 🛡️ CI Guardian Quality Summary (${scope} run)`,
    '',
    `| Status | Check | Duration | Notes |`,
    `| :---: | :--- | :---: | :--- |`,
    ...rows,
    '',
    `**Result:** ${outcome.status === 'passed' ? '🎉 All checks passed' : '❌ Checks failed'} (${counts}) in ${total}. Report written to \`${reportPath}\`.`,
  ];

  const failed = outcome.checks.find((check) => check.status === 'failed');
  if (failed) {
    lines.push(
      '',
      `> 💡 **Tip:** To re-run only the failed check locally: \`npx ci-guardian run --check ${failed.id}\``,
    );
  }
  lines.push('\n');

  try {
    appendFileSync(summaryFile, lines.join('\n'), { encoding: 'utf8' });
  } catch {
    // Non-fatal if GitHub Actions step summary cannot be written
  }
}
