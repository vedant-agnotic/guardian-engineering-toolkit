import type { CommitConfig } from '../config/types.js';
import { splitCsv } from '../config/validate.js';

export interface CommitValidationResult {
  valid: boolean;
  reason?: string;
  suggestions: string[];
}

export function validateCommitMessage(message: string, config: CommitConfig): CommitValidationResult {
  if (!config.enabled) return { valid: true, suggestions: [] };

  const normalized = message.trim();
  if (config.allowMergeCommits && /^Merge\b/.test(normalized)) return { valid: true, suggestions: [] };
  if (config.allowRevertCommits && /^Revert\b/.test(normalized)) return { valid: true, suggestions: [] };

  const firstLine = normalized.split(/\r?\n/, 1)[0] ?? '';
  if (firstLine.length > config.maxSubjectLength + 32) {
    return {
      valid: false,
      reason: `Commit subject is too long (${firstLine.length} characters).`,
      suggestions: suggestCommitMessages(firstLine, config),
    };
  }

  const regex = new RegExp(config.pattern);
  if (regex.test(firstLine)) return { valid: true, suggestions: [] };

  return {
    valid: false,
    reason: `Commit message does not match ${config.pattern}`,
    suggestions: suggestCommitMessages(firstLine, config),
  };
}

export function suggestCommitMessages(input: string, config: CommitConfig): string[] {
  const types = splitCsv(config.suggestionTypes);
  const stripped = input
    .replace(/^[a-z]+(?:\([^)]*\))?!?:\s*/i, '')
    .replace(/^[-:]+\s*/, '')
    .trim();

  const subject = normalizeSubject(stripped || 'describe change', config.maxSubjectLength);
  const candidates = ['feat', 'fix', 'chore']
    .filter((type) => types.includes(type))
    .concat(types)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3);

  return candidates.map((type) => `${type}: ${subject}`);
}

function normalizeSubject(value: string, max: number): string {
  const sentence = value.charAt(0).toLowerCase() + value.slice(1);
  const noPeriod = sentence.replace(/[.!]+$/, '');
  const allowed = Math.max(8, Math.min(max, 72));
  return noPeriod.length <= allowed ? noPeriod : noPeriod.slice(0, allowed - 1).trimEnd();
}
