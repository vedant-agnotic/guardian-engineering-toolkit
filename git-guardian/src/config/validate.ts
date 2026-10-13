import type { GitGuardianConfig } from './types.js';
import { compileFormat } from '../validation/template.js';

export const TYPE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export function validateConfig(config: GitGuardianConfig): void {
  const errors = configErrors(config);
  if (errors.length) {
    throw new Error(`Invalid .git-guardian.yml:\n- ${errors.join('\n- ')}`);
  }
}

export function configErrors(config: GitGuardianConfig): string[] {
  const errors: string[] = [];

  if (config.version !== 1) errors.push(`version must be 1 (received ${config.version})`);
  validateTypes('branch.types', config.branch.types, errors);
  validateTypes('commit.types', config.commit.types, errors);
  validateFormat('branch.format', config.branch.format, 'branch', config.branch.types, errors);
  validateFormat('commit.format', config.commit.format, 'commit', config.commit.types, errors);

  if (config.commit.maxSubjectLength < 1 || !Number.isInteger(config.commit.maxSubjectLength)) {
    errors.push('commit.maxSubjectLength must be a positive integer');
  }

  return errors;
}

/** Problems with a comma-separated type list, for config validation and init prompts. */
export function typeListErrors(value: string): string[] {
  const types = splitCsv(value);
  if (!types.length) return ['list at least one type'];
  const invalid = types.filter((type) => !TYPE_NAME_PATTERN.test(type));
  if (invalid.length) {
    return [`${invalid.join(', ')}: types must be lowercase letters, numbers or hyphens, starting with a letter`];
  }
  return [];
}

function validateTypes(field: string, value: string, errors: string[]): void {
  for (const error of typeListErrors(value)) errors.push(`${field}: ${error}`);
}

function validateFormat(field: string, format: string, kind: 'branch' | 'commit', types: string, errors: string[]): void {
  try {
    compileFormat(format, kind, splitCsv(types));
  } catch (error) {
    errors.push(`${field}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
