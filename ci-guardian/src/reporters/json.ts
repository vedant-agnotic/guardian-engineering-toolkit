import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { CheckResult, RunOutcome, RunStatus } from '../runner/run.js';

export const REPORT_SCHEMA_VERSION = 1;

export interface JsonReport {
  schemaVersion: 1;
  packageVersion: string;
  configHash: string;
  commitSha: string | null;
  scope: 'full' | 'partial';
  startedAt: string;
  finishedAt: string;
  status: RunStatus;
  checks: CheckResult[];
}

export function buildReport(input: {
  outcome: RunOutcome;
  scope: 'full' | 'partial';
  packageVersion: string;
  configHash: string;
  commitSha: string | null;
}): JsonReport {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    packageVersion: input.packageVersion,
    configHash: input.configHash,
    commitSha: input.commitSha,
    scope: input.scope,
    startedAt: input.outcome.startedAt.toISOString(),
    finishedAt: input.outcome.finishedAt.toISOString(),
    status: input.outcome.status,
    checks: input.outcome.checks,
  };
}

/** Writes via a temporary file and rename so a half-written report never looks complete. */
export function writeReportAtomic(path: string, report: JsonReport): void {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true });
  const temporary = join(directory, `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  try {
    writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    renameSync(temporary, path);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}
