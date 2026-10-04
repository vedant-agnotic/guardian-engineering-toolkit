import type { GitGuardianConfig } from './types.js';

export function validateConfig(config: GitGuardianConfig): void {
  const errors: string[] = [];

  if (config.version !== 1) errors.push(`version must be 1 (received ${config.version})`);
  validateRegex('branch.pattern', config.branch.pattern, errors);
  validateRegex('commit.pattern', config.commit.pattern, errors);

  if (config.commit.maxSubjectLength < 1 || !Number.isInteger(config.commit.maxSubjectLength)) {
    errors.push('commit.maxSubjectLength must be a positive integer');
  }

  if (!splitCsv(config.branch.protected).length) errors.push('branch.protected cannot be empty');
  if (!splitCsv(config.branch.suggestionPrefixes).length) errors.push('branch.suggestionPrefixes cannot be empty');
  if (!splitCsv(config.commit.suggestionTypes).length) errors.push('commit.suggestionTypes cannot be empty');

  if (errors.length) {
    throw new Error(`Invalid .git-guardian.yml:\n- ${errors.join('\n- ')}`);
  }
}

function validateRegex(field: string, value: string, errors: string[]): void {
  try {
    new RegExp(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`${field} is not a valid regular expression: ${message}`);
  }
}

export function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
