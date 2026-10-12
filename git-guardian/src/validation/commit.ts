import type { CommitConfig } from '../config/types.js';
import { splitCsv } from '../config/validate.js';
import { compileFormat, fillFormat, leadingTypeCandidate, matchesFormat, type CompiledFormat } from './template.js';
import { extractParts, resolveType, typeOrder } from './parts.js';

export interface CommitValidationResult {
  valid: boolean;
  reason?: string;
  suggestions: string[];
}

export function compileCommitFormat(config: CommitConfig): CompiledFormat {
  return compileFormat(config.format, 'commit', splitCsv(config.types));
}

export function validateCommitMessage(message: string, config: CommitConfig): CommitValidationResult {
  if (!config.enabled) return { valid: true, suggestions: [] };

  const normalized = message
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .trim();
  if (config.allowMergeCommits && /^Merge\b/.test(normalized)) return { valid: true, suggestions: [] };
  if (config.allowRevertCommits && /^Revert\b/.test(normalized)) return { valid: true, suggestions: [] };

  const subject = normalized.split(/\r?\n/, 1)[0] ?? '';
  if (!subject) {
    return { valid: false, reason: 'Commit message is empty.', suggestions: [] };
  }

  const compiled = compileCommitFormat(config);
  if (subject.length > config.maxSubjectLength) {
    return {
      valid: false,
      reason: `Commit subject is too long: ${subject.length} characters (maximum ${config.maxSubjectLength}).`,
      suggestions: suggestCommitMessages(subject, config),
    };
  }
  if (matchesFormat(compiled, subject)) return { valid: true, suggestions: [] };

  let reason = `Commit message "${subject}" doesn't follow the format ${config.format}`;
  const type = leadingTypeCandidate(compiled, subject);
  if (type !== null && /^[A-Za-z]+$/.test(type) && !compiled.types.includes(type)) {
    reason += `\n"${type}" is not an allowed type.`;
  }
  return { valid: false, reason, suggestions: suggestCommitMessages(subject, config) };
}

export function suggestCommitMessages(input: string, config: CommitConfig): string[] {
  const compiled = compileCommitFormat(config);
  const parts = extractParts(input, compiled);

  let text = parts.rest.trim();
  let preferred: string | null = null;
  let scope: string | undefined;
  const prefix = /^([A-Za-z]+)(?:\(([^)]*)\))?!?\s*:\s*/.exec(text);
  if (prefix) {
    preferred = resolveType(prefix[1], compiled.types);
    scope = prefix[2]?.trim().toLowerCase() || undefined;
    text = text.slice(prefix[0].length);
  }

  const types = typeOrder(compiled.types, preferred);
  return types.map((type) => {
    const base = { type, scope, number: parts.number, ticket: parts.ticket };
    const room = config.maxSubjectLength - fillFormat(compiled, { ...base, description: '' }).length;
    const description = normalizeDescription(text || 'describe change', room);
    return fillFormat(compiled, { ...base, description });
  });
}

function normalizeDescription(value: string, max: number): string {
  const sentence = value.replace(/\s+/g, ' ').trim();
  const lowered = sentence.charAt(0).toLowerCase() + sentence.slice(1);
  const noPeriod = lowered.replace(/[.!]+$/, '');
  const allowed = Math.max(8, max);
  return noPeriod.length <= allowed ? noPeriod : noPeriod.slice(0, allowed).trimEnd();
}
