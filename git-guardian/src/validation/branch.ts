import type { BranchConfig } from '../config/types.js';
import { splitCsv } from '../config/validate.js';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  suggestions: string[];
}

export function isProtectedBranch(name: string, config: BranchConfig): boolean {
  return splitCsv(config.protected).includes(name);
}

export function validateBranchName(name: string, config: BranchConfig): ValidationResult {
  if (!config.enabled) return { valid: true, suggestions: [] };
  if (isProtectedBranch(name, config)) return { valid: true, suggestions: [] };

  const regex = new RegExp(config.pattern);
  if (regex.test(name)) return { valid: true, suggestions: [] };

  const suggestions = config.suggestions ? suggestBranchNames(name, config) : [];
  return {
    valid: false,
    reason: `Branch \"${name}\" does not match ${config.pattern}`,
    suggestions,
  };
}

export function suggestBranchNames(input: string, config: BranchConfig): string[] {
  const prefixes = splitCsv(config.suggestionPrefixes);
  const knownPrefix = prefixes.find((prefix) => input.toLowerCase().startsWith(`${prefix.toLowerCase()}/`));
  const rawBody = knownPrefix ? input.slice(knownPrefix.length + 1) : input;
  const ticket = extractTicket(rawBody);
  let body = rawBody.replace(/[A-Z][A-Z0-9]+-\d+/i, ' ');
  body = slugify(body);

  const base = [ticket, body].filter(Boolean).join('-') || 'describe-change';
  const preferred = knownPrefix ?? prefixes[0] ?? 'feature';
  const candidates = [preferred, ...prefixes.filter((item) => item !== preferred)].slice(0, 3);

  return candidates.map((prefix) => `${prefix}/${base}`);
}

function extractTicket(value: string): string | null {
  const match = /\b([A-Za-z][A-Za-z0-9]+-\d+)\b/.exec(value);
  return match ? match[1].toUpperCase() : null;
}

function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
