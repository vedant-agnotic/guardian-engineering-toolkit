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
  rejectLegacyFields(parsed);
  const config = mergeConfig(parsed);
  validateConfig(config);
  return config;
}

export function writeConfig(repoRoot: string, config: GitGuardianConfig): string {
  validateConfig(config);
  const path = configPath(repoRoot);
  const banner = [
    '# Git Guardian configuration',
    '# Formats use placeholders: <type> <number> <ticket> <scope> <description>.',
    '# Wrap optional parts in [ ], e.g. "<type>[(<scope>)]: <description>".',
    '# secrets.allow takes comma-separated path globs that are never scanned, e.g. "test/fixtures/**".',
    '',
  ].join('\n');
  writeFileSync(path, `${banner}${stringifySimpleYaml(config as unknown as Record<string, unknown>)}\n`, 'utf8');
  return path;
}

function mergeConfig(raw: Record<string, unknown>): GitGuardianConfig {
  const defaults = createDefaultConfig();
  const branch = asObject(raw.branch);
  const commit = asObject(raw.commit);
  const secrets = asObject(raw.secrets);
  const hooks = asObject(raw.hooks);

  return {
    version: numberValue(raw.version, defaults.version),
    branch: {
      enabled: booleanValue(branch.enabled, defaults.branch.enabled),
      format: stringValue(branch.format, defaults.branch.format),
      types: stringValue(branch.types, defaults.branch.types),
      protected: stringValue(branch.protected, defaults.branch.protected),
      suggestions: booleanValue(branch.suggestions, defaults.branch.suggestions),
    },
    commit: {
      enabled: booleanValue(commit.enabled, defaults.commit.enabled),
      format: stringValue(commit.format, defaults.commit.format),
      types: stringValue(commit.types, defaults.commit.types),
      maxSubjectLength: numberValue(commit.maxSubjectLength, defaults.commit.maxSubjectLength),
      allowMergeCommits: booleanValue(commit.allowMergeCommits, defaults.commit.allowMergeCommits),
      allowRevertCommits: booleanValue(commit.allowRevertCommits, defaults.commit.allowRevertCommits),
    },
    secrets: {
      enabled: booleanValue(secrets.enabled, defaults.secrets.enabled),
      allow: stringValue(secrets.allow, defaults.secrets.allow),
    },
    hooks: {
      referenceTransaction: booleanValue(hooks.referenceTransaction, defaults.hooks.referenceTransaction),
      commitMsg: booleanValue(hooks.commitMsg, defaults.hooks.commitMsg),
    },
  };
}

/** 0.1.x regex configs need a manual move to formats; silently ignoring them would change the rules. */
function rejectLegacyFields(raw: Record<string, unknown>): void {
  const legacy: string[] = [];
  for (const section of ['branch', 'commit']) {
    const values = asObject(raw[section]);
    for (const key of ['pattern', 'example', 'suggestionPrefixes', 'suggestionTypes']) {
      if (key in values) legacy.push(`${section}.${key}`);
    }
  }
  if (!legacy.length) return;
  throw new Error(
    `.git-guardian.yml uses fields from an older version: ${legacy.join(', ')}.\n` +
      'Regex patterns were replaced by readable formats. Replace them with, for example:\n' +
      '  branch:\n    format: "<type>/<number>-<description>"\n    types: "feat,chore,bugfix,task"\n' +
      '  commit:\n    format: "<type>: <description>"\n    types: "feat,chore,bugfix,task"\n' +
      'or delete the file and run "git-guardian init" again.',
  );
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
