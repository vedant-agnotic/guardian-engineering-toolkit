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

export interface EnrichmentResult {
  updatedMessage: string;
  ticketOrNumber: string;
}

/**
 * If the commit format contains <ticket> or <number> (or optional ones) and the
 * message omits them, extracts them from the branch name and injects them.
 */
export function enrichCommitMessageWithBranch(
  message: string,
  branchName: string,
  config: CommitConfig,
): EnrichmentResult | null {
  if (!config.enabled) return null;
  const compiled = compileCommitFormat(config);
  const needsTicket = compiled.placeholders.includes('ticket');
  const needsNumber = compiled.placeholders.includes('number');
  if (!needsTicket && !needsNumber) return null;

  const branchParts = extractParts(branchName, compiled);
  const branchTicket = branchParts.ticket;
  const branchNumber = branchParts.number;
  if (!branchTicket && !branchNumber) return null;

  const lines = message.split(/\r?\n/);
  const subjectIndex = lines.findIndex((line) => !line.startsWith('#') && line.trim().length > 0);
  if (subjectIndex === -1) return null;

  const subject = lines[subjectIndex].trim();
  if (matchesFormat(compiled, subject)) return null;

  const msgParts = extractParts(subject, compiled);
  if (needsTicket && msgParts.ticket) return null;
  if (needsNumber && msgParts.number) return null;

  let preferredType: string | null = null;
  let description = msgParts.rest.trim();
  let scope = msgParts.scope;

  const prefix = /^([A-Za-z]+)(?:\(([^)]*)\))?!?\s*:\s*/.exec(description);
  if (prefix) {
    preferredType = resolveType(prefix[1], compiled.types);
    if (prefix[2]) scope = prefix[2].trim().toLowerCase();
    description = description.slice(prefix[0].length).trim();
  } else {
    const leading = /^([A-Za-z]+)[/:\s_-]/.exec(branchName.trim());
    if (leading) {
      preferredType = resolveType(leading[1], compiled.types);
    }
  }

  const type = preferredType ?? compiled.types[0];
  const ticket = needsTicket ? branchTicket : undefined;
  const number = needsNumber ? branchNumber : undefined;

  const newSubject = fillFormat(compiled, { type, ticket, number, scope, description });
  if (newSubject && matchesFormat(compiled, newSubject) && newSubject.length <= config.maxSubjectLength) {
    lines[subjectIndex] = newSubject;
    return {
      updatedMessage: lines.join('\n'),
      ticketOrNumber: (ticket ?? number)!,
    };
  }
  return null;
}
