import { resolve } from 'node:path';
import { GuardianError } from '../core/errors.js';
import type { CiGuardianConfig } from '../config/types.js';

export interface PlannedCheck {
  readonly id: string;
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly timeoutSeconds: number;
}

export interface ExecutionPlan {
  readonly scope: 'full' | 'partial';
  readonly failFast: boolean;
  readonly checks: readonly PlannedCheck[];
}

/** Builds an immutable, ordered plan. `only` selects exactly one check by id. */
export function buildPlan(config: CiGuardianConfig, repoRoot: string, only?: string): ExecutionPlan {
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
      cwd,
      timeoutSeconds: check.timeoutSeconds,
    }),
  );

  return Object.freeze({
    scope: only === undefined ? 'full' : 'partial',
    failFast: config.execution.failFast,
    checks: Object.freeze(checks),
  });
}
