import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GuardianError } from '../core/errors.js';
import { err } from '../core/log.js';
import type { CiGuardianConfig, ConfigIssue } from './types.js';
import { validatePaths, validateSchema } from './validate.js';
import { parseYaml, YamlError } from './yaml.js';

export const CONFIG_FILE = '.ciguardian.yml';

export interface LoadedConfig {
  config: CiGuardianConfig;
  path: string;
  /** sha256 of the exact configuration bytes. */
  hash: string;
}

export type LoadResult =
  | { ok: true; loaded: LoadedConfig }
  | { ok: false; path: string; issues: ConfigIssue[] };

export function configPath(repoRoot: string): string {
  return join(repoRoot, CONFIG_FILE);
}

/** Parses and validates without throwing for config problems, so callers can list every issue. */
export function inspectConfig(repoRoot: string): LoadResult {
  const path = configPath(repoRoot);
  if (!existsSync(path)) {
    return { ok: false, path, issues: [{ path: CONFIG_FILE, message: 'not found; run "ci-guardian init"' }] };
  }

  const bytes = readFileSync(path);
  let raw;
  try {
    raw = parseYaml(bytes.toString('utf8'));
  } catch (error) {
    if (error instanceof YamlError) return { ok: false, path, issues: [{ path: 'yaml', message: error.message }] };
    throw error;
  }

  const { config, issues } = validateSchema(raw);
  if (!config) return { ok: false, path, issues };

  const pathIssues = validatePaths(config, repoRoot);
  if (pathIssues.length > 0) return { ok: false, path, issues: pathIssues };

  return { ok: true, loaded: { config, path, hash: `sha256:${createHash('sha256').update(bytes).digest('hex')}` } };
}

export function loadConfig(repoRoot: string): LoadedConfig {
  const result = inspectConfig(repoRoot);
  if (result.ok) return result.loaded;
  throw new GuardianError(`Invalid ${CONFIG_FILE}:\n${formatIssues(result.issues)}`);
}

export function formatIssues(issues: ConfigIssue[]): string {
  return issues.map((issue) => `  ${err.yellow(issue.path)}: ${issue.message}`).join('\n');
}
