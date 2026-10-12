import { loadConfig } from '../config/load.js';
import { splitCsv } from '../config/validate.js';
import { getRepoRoot } from '../core/git.js';
import { ui } from '../core/log.js';
import { annotate } from '../core/annotate.js';
import { displayRange, resolveRange } from '../core/range.js';
import { scanMessage, scanRange, scanStaged } from '../secrets/scan.js';
import { explainSecrets } from '../validation/explain.js';

/** Scans staged changes (and an optional message) the same way the commit hook does. */
export function scanCommand(options: { message?: string; range?: string }): void {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  if (!config.secrets.enabled) ui.warn('secrets.enabled is false; commits are not scanned. Scanning anyway.');

  const allow = splitCsv(config.secrets.allow);
  const range = options.range ? resolveRange(repoRoot, options.range) : null;
  const findings = [
    ...(range ? scanRange(repoRoot, range.base, range.head, { allow }) : scanStaged(repoRoot, { allow })),
    ...(options.message ? scanMessage(options.message) : []),
  ];
  if (findings.length) {
    process.exitCode = 1;
    for (const finding of findings) {
      const where = finding.line === null ? '' : `,line=${finding.line}`;
      if (process.env.GITHUB_ACTIONS === 'true' && finding.path !== 'commit message') {
        console.log(`::error file=${finding.path}${where},title=Possible secret::${finding.rule} (${finding.preview})`);
      } else {
        annotate('error', 'Possible secret', `${finding.path}: ${finding.rule} (${finding.preview})`);
      }
    }
    ui.error(`Possible secrets found (${findings.length}):`);
    console.error(explainSecrets(findings));
    return;
  }
  ui.success(range ? `No secrets found in ${displayRange(range)}.` : 'No secrets found in staged changes.');
}
