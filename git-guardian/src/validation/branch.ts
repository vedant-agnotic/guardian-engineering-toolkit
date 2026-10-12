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

export function validateBranchName(name: string, config: BranchConfig): ValidationResult {
  if (!config.enabled) return { valid: true, suggestions: [] };
  if (isProtectedBranch(name, config)) return { valid: true, suggestions: [] };

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

function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
