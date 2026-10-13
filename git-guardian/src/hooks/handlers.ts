import { readFileSync, writeFileSync } from 'node:fs';
import { loadConfig } from '../config/load.js';
import { currentBranch, getRepoRoot, isMerging, refExists } from '../core/git.js';
import { out, ui } from '../core/log.js';
import { validateBranchName } from '../validation/branch.js';
import { enrichCommitMessageWithBranch, validateCommitMessage } from '../validation/commit.js';
import { explainSecrets, explainViolation } from '../validation/explain.js';
import { splitCsv } from '../config/validate.js';
import { scanMessage, scanStaged } from '../secrets/scan.js';

export function handleCommitMsg(messageFile: string, cwd = process.cwd()): number {
  const repoRoot = getRepoRoot(cwd);
  const config = loadConfig(repoRoot);
  let message = readFileSync(messageFile, 'utf8');

  // Auto-enrich commit message with ticket/number from branch if enabled
  if (config.commit.enabled && config.commit.autoTicket !== false && !isMerging(repoRoot)) {
    const branch = currentBranch(repoRoot);
    if (branch) {
      const enrichment = enrichCommitMessageWithBranch(message, branch, config.commit);
      if (enrichment) {
        writeFileSync(messageFile, enrichment.updatedMessage, 'utf8');
        message = enrichment.updatedMessage;
        ui.info(`Git Guardian: added ${out.green(enrichment.ticketOrNumber)} from branch to commit message.`);
      }
    }
  }

  if (config.secrets.enabled && !isMerging(repoRoot)) {
    // A merge brings in changes already committed elsewhere; scan those where they were written.
    const findings = [...scanStaged(repoRoot, { allow: splitCsv(config.secrets.allow) }), ...scanMessage(message)];
    if (findings.length) {
      ui.error('Commit blocked by Git Guardian: possible secrets found.');
      console.error(explainSecrets(findings));
      return 1;
    }
  }

  const result = validateCommitMessage(message, config.commit);
  if (result.valid) return 0;

  ui.error('Commit blocked by Git Guardian.');
  console.error(explainViolation('commit', config, result));
  return 1;
}

export function handleReferenceTransaction(
  state: string,
  input: string,
  cwd = process.cwd(),
): number {
  // Git versions differ on whether the earliest rejectable state is
  // "preparing" or "prepared". Both states may abort the transaction.
  // Rejecting in either keeps Guardian compatible across Git versions.
  if (state !== 'preparing' && state !== 'prepared') return 0;

  const repoRoot = getRepoRoot(cwd);
  const config = loadConfig(repoRoot);
  if (!config.branch.enabled) return 0;

  const violations: Array<{ branch: string; suggestions: string[]; reason?: string }> = [];
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    const [oldValue, newValue, refName] = parts;

    let branchRef: string | undefined;

    if (refName.startsWith('refs/heads/')) {
      branchRef = refName;
    } else if (refName === 'HEAD' && newValue.startsWith('ref:refs/heads/')) {
      // In a repository with no commits yet, `git checkout -b foo` /
      // `git switch -c foo` updates symbolic HEAD only. No refs/heads/foo
      // exists until the first commit, so validate the symbolic target too.
      branchRef = newValue.slice('ref:'.length);
    }

    if (!branchRef || !isZeroOid(oldValue)) continue;

    // An all-zero old value can also represent a forced update. Reject only
    // when the branch ref does not exist yet, i.e. a genuine new local branch
    // (or an unborn branch selected through symbolic HEAD).
    if (refExists(repoRoot, branchRef)) continue;

    const branch = branchRef.slice('refs/heads/'.length);
    const result = validateBranchName(branch, config.branch);
    if (!result.valid) violations.push({ branch, suggestions: result.suggestions, reason: result.reason });
  }

  if (!violations.length) return 0;

  for (const violation of violations) {
    ui.error(`Branch creation blocked: ${violation.branch}`);
    console.error(explainViolation('branch', config, violation));
  }
  return 1;
}

function isZeroOid(value: string): boolean {
  return /^0+$/.test(value);
}
