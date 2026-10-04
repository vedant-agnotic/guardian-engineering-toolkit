import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createDefaultConfig } from './defaults.js';
import { parseSimpleYaml, stringifySimpleYaml } from './yaml.js';
import type { GitGuardianConfig } from './types.js';
import { validateConfig } from './validate.js';

export const CONFIG_FILE = '.git-guardian.yml';

export function configPath(repoRoot: string): string {
  return join(repoRoot, CONFIG_FILE);
}

export function configExists(repoRoot: string): boolean {
  return existsSync(configPath(repoRoot));
}

export function loadConfig(repoRoot: string): GitGuardianConfig {
  const path = configPath(repoRoot);
  if (!existsSync(path)) {
    throw new Error(`Missing ${CONFIG_FILE}. Run \"git-guardian init\" first.`);
  }

  const parsed = parseSimpleYaml(readFileSync(path, 'utf8'));
  const config = mergeConfig(parsed);
  validateConfig(config);
  return config;
}

export function writeConfig(repoRoot: string, config: GitGuardianConfig): string {
  validateConfig(config);
  const path = configPath(repoRoot);
  const banner = '# Git Guardian configuration\n# Regex values are evaluated by Node.js.\n';
  writeFileSync(path, `${banner}${stringifySimpleYaml(config as unknown as Record<string, unknown>)}\n`, 'utf8');
  return path;
}

function mergeConfig(raw: Record<string, unknown>): GitGuardianConfig {
  const defaults = createDefaultConfig();
  const branch = asObject(raw.branch);
  const commit = asObject(raw.commit);
  const hooks = asObject(raw.hooks);

  return {
    version: numberValue(raw.version, defaults.version),
    branch: {
      enabled: booleanValue(branch.enabled, defaults.branch.enabled),
      pattern: stringValue(branch.pattern, defaults.branch.pattern),
      protected: stringValue(branch.protected, defaults.branch.protected),
      example: stringValue(branch.example, defaults.branch.example),
      suggestionPrefixes: stringValue(branch.suggestionPrefixes, defaults.branch.suggestionPrefixes),
      suggestions: booleanValue(branch.suggestions, defaults.branch.suggestions),
    },
    commit: {
      enabled: booleanValue(commit.enabled, defaults.commit.enabled),
      pattern: stringValue(commit.pattern, defaults.commit.pattern),
      example: stringValue(commit.example, defaults.commit.example),
      suggestionTypes: stringValue(commit.suggestionTypes, defaults.commit.suggestionTypes),
      maxSubjectLength: numberValue(commit.maxSubjectLength, defaults.commit.maxSubjectLength),
      allowMergeCommits: booleanValue(commit.allowMergeCommits, defaults.commit.allowMergeCommits),
      allowRevertCommits: booleanValue(commit.allowRevertCommits, defaults.commit.allowRevertCommits),
    },
    hooks: {
      referenceTransaction: booleanValue(hooks.referenceTransaction, defaults.hooks.referenceTransaction),
      commitMsg: booleanValue(hooks.commitMsg, defaults.hooks.commitMsg),
    },
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
