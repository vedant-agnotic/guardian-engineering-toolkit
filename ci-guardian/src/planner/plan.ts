import { resolve } from 'node:path';
import { GuardianError } from '../core/errors.js';
import type { CiGuardianConfig } from '../config/types.js';

export interface PlannedCheck {
  readonly id: string;
  readonly executable: string;
  readonly args: readonly string[];
  readonly fixExecutable?: string;
  readonly fixArgs?: readonly string[];
  readonly cwd: string;
  readonly timeoutSeconds: number;
}

export interface ExecutionPlan {
  readonly scope: 'full' | 'partial';
  readonly failFast: boolean;
  readonly parallel: boolean;
  readonly concurrency: number;
  readonly checks: readonly PlannedCheck[];
}

export interface PlanOptions {
  only?: string;
  parallel?: boolean;
  concurrency?: number;
}

/** Builds an immutable, ordered plan. `only` selects exactly one check by id. */
export function buildPlan(config: CiGuardianConfig, repoRoot: string, options?: PlanOptions | string): ExecutionPlan {
  const only = typeof options === 'string' ? options : options?.only;
  const parallelOverride = typeof options === 'object' ? options.parallel : undefined;
  const concurrencyOverride = typeof options === 'object' ? options.concurrency : undefined;

  const cwd = resolve(repoRoot, config.project.root);
  let selected = config.checks;
  if (only !== undefined) {
    selected = config.checks.filter((check) => check.id === only);
    if (selected.length === 0) {
      const known = config.checks.map((check) => check.id).join(', ');
      throw new GuardianError(`Unknown check id "${only}". Configured checks: ${known}`);
    }
  }

  const checks = selected.map((check) =>
    Object.freeze({
      id: check.id,
      executable: check.command[0],
      args: Object.freeze(check.command.slice(1)),
      fixExecutable: check.fixCommand?.[0],
      fixArgs: check.fixCommand ? Object.freeze(check.fixCommand.slice(1)) : undefined,
      cwd,
      timeoutSeconds: check.timeoutSeconds,
    }),
  );

  const parallel = parallelOverride ?? config.execution.parallel ?? false;
  const concurrency = concurrencyOverride ?? config.execution.concurrency ?? 4;

  return Object.freeze({
    scope: only === undefined ? 'full' : 'partial',
    failFast: config.execution.failFast,
    parallel,
    concurrency,
    checks: Object.freeze(checks),
  });
}
