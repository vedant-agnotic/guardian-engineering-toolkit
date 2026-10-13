import type { BranchConfig } from '../config/types.js';
import { splitCsv } from '../config/validate.js';
import { compileFormat, fillFormat, leadingTypeCandidate, matchesFormat, type CompiledFormat } from './template.js';
import { extractParts, resolveType, typeOrder } from './parts.js';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  suggestions: string[];
}

export function compileBranchFormat(config: BranchConfig): CompiledFormat {
  return compileFormat(config.format, 'branch', splitCsv(config.types));
}

export function isProtectedBranch(name: string, config: BranchConfig): boolean {
  return splitCsv(config.protected).includes(name);
}

export function checkGitBranchSyntax(name: string): string | null {
  if (name.includes(':')) return 'colons (:) are not allowed in Git branch names';
  if (name.includes('..')) return 'two consecutive dots (..) are not allowed in Git branch names';
  if (name.includes('~')) return 'tilde (~) is not allowed in Git branch names';
  if (name.includes('^')) return 'caret (^) is not allowed in Git branch names';
  if (name.includes('?')) return 'question mark (?) is not allowed in Git branch names';
  if (name.includes('*')) return 'asterisk (*) is not allowed in Git branch names';
  if (name.includes('[')) return 'brackets ([) are not allowed in Git branch names';
  if (name.includes('\\')) return 'backslash (\\) is not allowed in Git branch names';
  if (name.includes('@{')) return '"@{" is not allowed in Git branch names';
  if (name.includes('//')) return 'consecutive slashes (//) are not allowed in Git branch names';
  if (/\s/.test(name)) return 'spaces are not allowed in Git branch names';
  if (name.startsWith('/')) return 'cannot start with a slash (/)';
  if (name.endsWith('/')) return 'cannot end with a slash (/)';
  if (name.startsWith('.')) return 'cannot start with a dot (.)';
  if (name.endsWith('.')) return 'cannot end with a dot (.)';
  if (name.endsWith('.lock')) return 'cannot end with ".lock"';
  return null;
}

export function validateBranchName(name: string, config: BranchConfig): ValidationResult {
  if (!config.enabled) return { valid: true, suggestions: [] };
  if (isProtectedBranch(name, config)) return { valid: true, suggestions: [] };

  const gitSyntaxError = checkGitBranchSyntax(name);
  if (gitSyntaxError) {
    return {
      valid: false,
      reason: `Branch "${name}" is invalid: ${gitSyntaxError}.`,
      suggestions: config.suggestions ? suggestBranchNames(name, config) : [],
    };
  }

  const compiled = compileBranchFormat(config);
  if (matchesFormat(compiled, name)) return { valid: true, suggestions: [] };

  let reason = `Branch "${name}" doesn't follow the format ${config.format}`;
  const type = leadingTypeCandidate(compiled, name);
  if (type !== null && !compiled.types.includes(type)) reason += `\n"${type}" is not an allowed type.`;

  return { valid: false, reason, suggestions: config.suggestions ? suggestBranchNames(name, config) : [] };
}

/** Builds names from free text such as "ABC-42 Fix login crash". Unknown parts stay as <placeholders>. */
export function suggestBranchNames(input: string, config: BranchConfig): string[] {
  const compiled = compileBranchFormat(config);
  const parts = extractParts(input, compiled);

  const leading = /^([A-Za-z]+)[/:\s_-]/.exec(parts.rest.trim());
  const preferred = leading ? resolveType(leading[1], compiled.types) : null;
  const words = preferred ? parts.rest.trim().slice(leading![1].length) : parts.rest;
  const description = slugify(words) || undefined;

  return typeOrder(compiled.types, preferred).map((type) =>
    fillFormat(compiled, { type, number: parts.number, ticket: parts.ticket, scope: parts.scope, description }),
  );
}

export function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
