import type { ExecutionPlan, PlannedCheck } from '../planner/plan.js';
import { startProcess, type RunningProcess } from './process.js';

export type CheckStatus = 'passed' | 'failed' | 'skipped' | 'cancelled';
export type RunStatus = 'passed' | 'failed' | 'cancelled';

export interface CheckResult {
  id: string;
  status: CheckStatus;
  exitCode: number | null;
  durationMs: number;
  reason: string | null;
}

export interface RunOutcome {
  status: RunStatus;
  startedAt: Date;
  finishedAt: Date;
  checks: CheckResult[];
}

export interface RunHooks {
  onCheckStart?(check: PlannedCheck, index: number, total: number): void;
  onCheckEnd?(result: CheckResult): void;
}

/** A cancellation token that the CLI trips on SIGINT/SIGTERM. */
export class Cancellation {
  private listeners = new Set<() => void>();
  private reasonText: string | null = null;

  get cancelled(): boolean {
    return this.reasonText !== null;
  }

  get reason(): string | null {
    return this.reasonText;
  }

  cancel(reason: string): void {
    if (this.reasonText !== null) return;
    this.reasonText = reason;
    for (const listener of this.listeners) listener();
  }

  onCancel(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Runs checks in plan order (sequentially or in parallel). Never throws for check failures. */
export async function runPlan(plan: ExecutionPlan, cancellation = new Cancellation(), hooks: RunHooks = {}): Promise<RunOutcome> {
  const startedAt = new Date();
  if (plan.parallel) {
    return runParallel(plan, startedAt, cancellation, hooks);
  }
  return runSequential(plan, startedAt, cancellation, hooks);
}

async function runSequential(
  plan: ExecutionPlan,
  startedAt: Date,
  cancellation: Cancellation,
  hooks: RunHooks,
): Promise<RunOutcome> {
  const results: CheckResult[] = [];
  let stopReason: string | null = null;

  for (const [index, check] of plan.checks.entries()) {
    if (cancellation.cancelled) {
      results.push(skipped(check.id, `not started: run ${cancellation.reason ?? 'cancelled'}`));
      continue;
    }
    if (stopReason) {
      results.push(skipped(check.id, stopReason));
      continue;
    }

    hooks.onCheckStart?.(check, index, plan.checks.length);
    const result = await runCheck(check, cancellation);
    results.push(result);
    hooks.onCheckEnd?.(result);

    if (result.status === 'failed' && plan.failFast) {
      stopReason = `not started: failFast after "${check.id}" failed`;
    }
  }

  return { status: aggregate(results), startedAt, finishedAt: new Date(), checks: results };
}

async function runParallel(
  plan: ExecutionPlan,
  startedAt: Date,
  cancellation: Cancellation,
  hooks: RunHooks,
): Promise<RunOutcome> {
  const results: CheckResult[] = new Array(plan.checks.length);
  let stopReason: string | null = null;
  const concurrency = Math.max(1, Math.min(plan.concurrency, plan.checks.length));
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < plan.checks.length) {
      const index = nextIndex++;
      const check = plan.checks[index];

      if (cancellation.cancelled) {
        results[index] = skipped(check.id, `not started: run ${cancellation.reason ?? 'cancelled'}`);
        continue;
      }
      if (stopReason) {
        results[index] = skipped(check.id, stopReason);
        continue;
      }

      hooks.onCheckStart?.(check, index, plan.checks.length);
      const result = await runCheck(check, cancellation);
      results[index] = result;
      hooks.onCheckEnd?.(result);

      if (result.status === 'failed' && plan.failFast) {
        stopReason = `not started: failFast after "${check.id}" failed`;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  for (let i = 0; i < plan.checks.length; i++) {
    if (!results[i]) {
      results[i] = skipped(plan.checks[i].id, stopReason ?? 'not started');
    }
  }

  return { status: aggregate(results), startedAt, finishedAt: new Date(), checks: results };
}

export function aggregate(results: CheckResult[]): RunStatus {
  if (results.some((result) => result.status === 'cancelled')) return 'cancelled';
  if (results.length > 0 && results.every((result) => result.status === 'passed')) return 'passed';
  return 'failed';
}

async function runCheck(check: PlannedCheck, cancellation: Cancellation): Promise<CheckResult> {
  const start = performance.now();
  const child: RunningProcess = startProcess(check.executable, check.args, check.cwd);

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.terminate();
  }, check.timeoutSeconds * 1000);
  const unsubscribe = cancellation.onCancel(() => child.terminate());

  const outcome = await child.done;
  clearTimeout(timer);
  unsubscribe();
  const durationMs = Math.round(performance.now() - start);

  if (outcome.kind === 'spawn-error') {
    const reason =
      outcome.code === 'ENOENT'
        ? `executable not found: ${check.executable}`
        : outcome.code === 'EACCES'
          ? `executable is not runnable (permission denied): ${check.executable}`
          : `could not start: ${outcome.message}`;
    return { id: check.id, status: 'failed', exitCode: null, durationMs, reason };
  }

  const exitCode = outcome.exitCode;
  if (cancellation.cancelled) {
    return { id: check.id, status: 'cancelled', exitCode, durationMs, reason: `run ${cancellation.reason ?? 'cancelled'}` };
  }
  if (timedOut) {
    return { id: check.id, status: 'failed', exitCode, durationMs, reason: `timed out after ${check.timeoutSeconds}s` };
  }
  if (exitCode === 0) return { id: check.id, status: 'passed', exitCode, durationMs, reason: null };
  if (exitCode === null) {
    return { id: check.id, status: 'failed', exitCode, durationMs, reason: `terminated by signal ${outcome.signal ?? 'unknown'}` };
  }
  return { id: check.id, status: 'failed', exitCode, durationMs, reason: `exited with code ${exitCode}` };
}

function skipped(id: string, reason: string): CheckResult {
  return { id, status: 'skipped', exitCode: null, durationMs: 0, reason };
}
