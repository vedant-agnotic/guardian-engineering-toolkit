import type { CompiledFormat } from './template.js';

/** Common names people type for a change type, mapped to likely configured equivalents. */
const TYPE_ALIASES: Record<string, string[]> = {
  feature: ['feat'],
  feat: ['feature'],
  fix: ['bugfix', 'bug', 'hotfix'],
  bugfix: ['fix', 'bug'],
  bug: ['bugfix', 'fix'],
  hotfix: ['bugfix', 'fix'],
  task: ['chore'],
  chore: ['task'],
};

export interface ExtractedParts {
  ticket?: string;
  number?: string;
  scope?: string;
  /** The input with ticket/number removed. */
  rest: string;
}

/** Finds a configured type for a word the user typed, including common aliases. */
export function resolveType(word: string, types: string[]): string | null {
  const lower = word.toLowerCase();
  if (types.includes(lower)) return lower;
  return (TYPE_ALIASES[lower] ?? []).find((alias) => types.includes(alias)) ?? null;
}

/** Preferred type first, then the others, at most three. */
export function typeOrder(types: string[], preferred: string | null): string[] {
  const ordered = preferred ? [preferred, ...types.filter((type) => type !== preferred)] : types;
  return ordered.slice(0, 3);
}

/** Pulls a ticket key (ABC-123) and/or a number out of free text, as the format needs them. */
export function extractParts(input: string, compiled: CompiledFormat): ExtractedParts {
  let rest = input;
  const parts: ExtractedParts = { rest };

  const ticketMatch = /\b([A-Za-z][A-Za-z0-9]*)-(\d+)\b/.exec(rest);
  if (ticketMatch && (compiled.placeholders.includes('ticket') || compiled.placeholders.includes('number'))) {
    if (compiled.placeholders.includes('ticket')) parts.ticket = `${ticketMatch[1].toUpperCase()}-${ticketMatch[2]}`;
    if (compiled.placeholders.includes('number')) parts.number = ticketMatch[2];
    rest = rest.replace(ticketMatch[0], ' ');
  }

  if (compiled.placeholders.includes('number') && parts.number === undefined) {
    const numberMatch = /(?:^|[^A-Za-z0-9])#?(\d+)(?=$|[^A-Za-z0-9])/.exec(rest);
    if (numberMatch) {
      parts.number = numberMatch[1];
      rest = rest.replace(numberMatch[0], ' ');
    }
  }

  parts.rest = rest;
  return parts;
}
