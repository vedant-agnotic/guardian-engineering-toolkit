import { existsSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { YamlValue } from './yaml.js';
import { PROJECT_TYPES, PROVIDERS, type CiGuardianConfig, type ConfigIssue } from './types.js';

export const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
export const MAX_TIMEOUT_SECONDS = 7200;
const MAX_CHECKS = 100;

type Shape = { [key: string]: YamlValue };

/**
 * Schema validation. Every field is required; nothing is defaulted silently.
 * Returns the typed config only when there are no issues.
 */
export function validateSchema(raw: YamlValue): { config?: CiGuardianConfig; issues: ConfigIssue[] } {
  const issues: ConfigIssue[] = [];
  const add = (path: string, message: string): void => {
    issues.push({ path, message });
  };

  const root = expectMapping(raw, '(root)', ['version', 'project', 'provider', 'checks', 'execution', 'report'], add, ['gitGuardian']);
  if (!root) return { issues };

  let gitGuardianEnabled = false;
  if (root.gitGuardian !== undefined) {
    const gitGuardian = expectMapping(root.gitGuardian, 'gitGuardian', ['enabled'], add);
    if (gitGuardian && gitGuardian.enabled !== undefined) {
      if (typeof gitGuardian.enabled !== 'boolean') add('gitGuardian.enabled', 'must be true or false');
      else gitGuardianEnabled = gitGuardian.enabled;
    }
  }

  if (root.version !== undefined && root.version !== 1) add('version', 'must be exactly 1');

  const project = expectMapping(root.project, 'project', ['type', 'root'], add);
  if (project) {
    if (project.type !== undefined && !isOneOf(project.type, PROJECT_TYPES)) {
      add('project.type', `must be one of: ${PROJECT_TYPES.join(', ')}`);
    }
    if (project.root !== undefined) checkRelativePath(project.root, 'project.root', add);
  }

  if (root.provider !== undefined && !isOneOf(root.provider, PROVIDERS)) {
    add('provider', `must be one of: ${PROVIDERS.join(', ')}`);
  }

  if (root.checks !== undefined) {
    if (!Array.isArray(root.checks)) {
      add('checks', 'must be a list');
    } else if (root.checks.length === 0 && !gitGuardianEnabled) {
      add('checks', 'must list at least one check (or enable gitGuardian)');
    } else if (root.checks.length > MAX_CHECKS) {
      add('checks', `must not list more than ${MAX_CHECKS} checks`);
    } else {
      const seen = new Set<string>();
      root.checks.forEach((item, index) => {
        const path = `checks[${index}]`;
        const check = expectMapping(item, path, ['id', 'command', 'timeoutSeconds'], add);
        if (!check) return;

        if (check.id !== undefined) {
          if (typeof check.id !== 'string' || !CHECK_ID_PATTERN.test(check.id)) {
            add(`${path}.id`, 'must start with a lowercase letter and contain only lowercase letters, numbers or hyphens');
          } else if (seen.has(check.id)) {
            add(`${path}.id`, `duplicate check id "${check.id}"`);
          } else {
            seen.add(check.id);
          }
        }

        if (check.command !== undefined) {
          if (!Array.isArray(check.command) || check.command.length === 0) {
            add(`${path}.command`, 'must be a non-empty list: [executable, arg, ...]');
          } else {
            check.command.forEach((part, partIndex) => {
              if (typeof part !== 'string') {
                add(`${path}.command[${partIndex}]`, `must be a string; quote it, e.g. "${String(part)}"`);
              } else if (partIndex === 0 && !part.trim()) {
                add(`${path}.command[0]`, 'executable must not be empty');
              } else if (part.includes('\0')) {
                add(`${path}.command[${partIndex}]`, 'must not contain NUL characters');
              }
            });
          }
        }

        if (check.timeoutSeconds !== undefined) {
          const timeout = check.timeoutSeconds;
          if (typeof timeout !== 'number' || !Number.isInteger(timeout) || timeout < 1 || timeout > MAX_TIMEOUT_SECONDS) {
            add(`${path}.timeoutSeconds`, `must be an integer from 1 to ${MAX_TIMEOUT_SECONDS}`);
          }
        }
      });
    }
  }

  const execution = expectMapping(root.execution, 'execution', ['failFast'], add);
  if (execution && execution.failFast !== undefined && typeof execution.failFast !== 'boolean') {
    add('execution.failFast', 'must be true or false');
  }

  const report = expectMapping(root.report, 'report', ['path'], add);
  if (report && report.path !== undefined) checkRelativePath(report.path, 'report.path', add);

  if (issues.length > 0) return { issues };
  return { config: raw as unknown as CiGuardianConfig, issues };
}

/**
 * Filesystem validation against the repository: real paths must stay inside the
 * Git root, following symlinks. Does not create anything.
 */
export function validatePaths(config: CiGuardianConfig, repoRoot: string): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const realRoot = realpathSync(repoRoot);

  const projectRoot = resolve(repoRoot, config.project.root);
  if (!existsSync(projectRoot)) {
    issues.push({ path: 'project.root', message: `directory does not exist: ${config.project.root}` });
  } else if (!statSync(projectRoot).isDirectory()) {
    issues.push({ path: 'project.root', message: `not a directory: ${config.project.root}` });
  } else if (!isInside(realRoot, realpathSync(projectRoot))) {
    issues.push({ path: 'project.root', message: 'resolves outside the repository (symlink escape)' });
  }

  const reportPath = resolve(repoRoot, config.report.path);
  if (existsSync(reportPath) && statSync(reportPath).isDirectory()) {
    issues.push({ path: 'report.path', message: `is a directory: ${config.report.path}` });
  }
  const existing = nearestExisting(reportPath);
  const realExisting = realpathSync(existing);
  const realTarget = resolve(realExisting, relative(existing, reportPath));
  if (!isInside(realRoot, realTarget) || realTarget === realRoot) {
    issues.push({ path: 'report.path', message: 'resolves outside the repository (symlink escape)' });
  } else if (relative(realRoot, realTarget).split(sep)[0] === '.git') {
    issues.push({ path: 'report.path', message: 'must not be inside .git' });
  }

  return issues;
}

function expectMapping(
  value: YamlValue | undefined,
  path: string,
  allowed: string[],
  add: (path: string, message: string) => void,
  optional: string[] = [],
): Shape | undefined {
  if (value === undefined) {
    add(path, 'is required');
    return undefined;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    add(path, 'must be a mapping');
    return undefined;
  }
  const prefix = path === '(root)' ? '' : `${path}.`;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key) && !optional.includes(key)) add(`${prefix}${key}`, 'unknown field');
  }
  for (const key of allowed) {
    if (!(key in value)) add(`${prefix}${key}`, 'is required');
  }
  return value;
}

function checkRelativePath(value: YamlValue, path: string, add: (path: string, message: string) => void): void {
  if (typeof value !== 'string' || !value.trim()) {
    add(path, 'must be a non-empty string');
    return;
  }
  if (value.includes('\0')) {
    add(path, 'must not contain NUL characters');
    return;
  }
  if (isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.startsWith('\\')) {
    add(path, 'must be relative to the repository root');
    return;
  }
  const normalized = value.replace(/\\/g, '/').split('/');
  if (normalized.includes('..')) add(path, 'must not contain ".." segments');
}

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function nearestExisting(path: string): string {
  let current = path;
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return current;
}

function isOneOf<T extends string>(value: YamlValue, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}
