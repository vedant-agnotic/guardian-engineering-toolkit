/**
 * Human-readable name formats such as "<type>/<number>-<description>".
 *
 * A format is literal text plus placeholders in angle brackets. Parts wrapped
 * in square brackets are optional: "<type>[(<scope>)]: <description>".
 * Formats compile to an anchored regular expression; users never write regex.
 */

export type FormatKind = 'branch' | 'commit';

interface PlaceholderSpec {
  /** Regex source for the value. `<type>` is built from the configured types instead. */
  pattern: (kind: FormatKind) => string;
  help: (kind: FormatKind, types: string[]) => string;
  sample: (kind: FormatKind, types: string[]) => string;
}

const PLACEHOLDERS: Record<string, PlaceholderSpec> = {
  type: {
    pattern: () => '',
    help: (_kind, types) => `one of: ${types.join(', ')}`,
    sample: (_kind, types) => types[0] ?? 'feat',
  },
  number: {
    pattern: () => '[0-9]+',
    help: () => 'a number, e.g. 123',
    sample: () => '123',
  },
  ticket: {
    pattern: () => '[A-Z][A-Z0-9]*-[0-9]+',
    help: () => 'a ticket key in capitals, e.g. ABC-123',
    sample: () => 'ABC-123',
  },
  scope: {
    pattern: () => '[a-z0-9][a-z0-9._-]*',
    help: () => 'lowercase area of the code, e.g. auth',
    sample: () => 'auth',
  },
  description: {
    pattern: (kind) => (kind === 'branch' ? '[a-z0-9]+(?:-[a-z0-9]+)*' : '\\S.*'),
    help: (kind) =>
      kind === 'branch'
        ? 'lowercase words joined by hyphens, e.g. add-login'
        : 'a short summary of the change, e.g. add login page',
    sample: (kind) => (kind === 'branch' ? 'add-login' : 'add login page'),
  },
};

export const PLACEHOLDER_NAMES = Object.keys(PLACEHOLDERS);

type Token =
  | { kind: 'literal'; text: string }
  | { kind: 'placeholder'; name: string }
  | { kind: 'optional'; tokens: Token[] };

export interface CompiledFormat {
  readonly format: string;
  readonly kind: FormatKind;
  readonly types: string[];
  readonly regex: RegExp;
  readonly placeholders: string[];
  readonly tokens: Token[];
}

export function compileFormat(format: string, kind: FormatKind, types: string[]): CompiledFormat {
  const tokens = parse(format);
  const placeholders = collectPlaceholders(tokens);
  if (!placeholders.length) throw new Error(`format "${format}" has no placeholders such as <type> or <description>`);
  if (placeholders.includes('type') && !types.length) throw new Error('format uses <type> but no types are configured');
  if (kind === 'branch') {
    if (/\s/.test(format)) throw new Error(`branch format "${format}" must not contain spaces`);
    if (format.includes(':')) throw new Error(`branch format "${format}" must not contain colons (:) because Git forbids them in branch names`);
    if (/[~^?*\\]/.test(format)) throw new Error(`branch format "${format}" contains characters forbidden by Git (~, ^, ?, *, \\)`);
    if (format.includes('..')) throw new Error(`branch format "${format}" must not contain ".."`);
    if (format.includes('//')) throw new Error(`branch format "${format}" must not contain consecutive slashes "//"`);
    if (format.endsWith('.lock')) throw new Error(`branch format "${format}" must not end in ".lock"`);
  }

  const typeAlternation = types.map(escapeRegex).join('|');
  const source = toRegex(tokens, kind, typeAlternation);
  return { format, kind, types, regex: new RegExp(`^${source}$`), placeholders, tokens };
}

export function matchesFormat(compiled: CompiledFormat, value: string): boolean {
  return compiled.regex.test(value);
}

/** A valid sample value, with optional parts included. */
export function exampleFor(compiled: CompiledFormat): string {
  return render(compiled.tokens, (name) => PLACEHOLDERS[name].sample(compiled.kind, compiled.types), true);
}

/** One line per placeholder, e.g. "<number>  a number, e.g. 123". */
export function describeFormat(compiled: CompiledFormat): string[] {
  const width = Math.max(...compiled.placeholders.map((name) => name.length)) + 2;
  return compiled.placeholders.map(
    (name) => `<${name}>`.padEnd(width + 2) + PLACEHOLDERS[name].help(compiled.kind, compiled.types),
  );
}

/**
 * Fills the format from known values. Optional parts are kept only when all of
 * their placeholders are known; a missing required value stays as "<name>" so
 * the user can see what to fill in.
 */
export function fillFormat(compiled: CompiledFormat, values: Partial<Record<string, string>>): string {
  return render(compiled.tokens, (name) => values[name], false);
}

/** If the value starts with "<word><separator>" where <type> leads the format, returns that word. */
export function leadingTypeCandidate(compiled: CompiledFormat, value: string): string | null {
  const [first, second] = compiled.tokens;
  if (first?.kind !== 'placeholder' || first.name !== 'type' || second?.kind !== 'literal') return null;
  const index = value.indexOf(second.text[0]);
  return index > 0 ? value.slice(0, index) : null;
}

function parse(format: string): Token[] {
  if (!format.trim()) throw new Error('format must not be empty');
  const stack: Token[][] = [[]];
  let index = 0;

  const pushLiteral = (text: string): void => {
    const current = stack[stack.length - 1];
    const last = current[current.length - 1];
    if (last?.kind === 'literal') last.text += text;
    else current.push({ kind: 'literal', text });
  };

  while (index < format.length) {
    const char = format[index];
    if (char === '<') {
      const end = format.indexOf('>', index);
      if (end === -1) throw new Error(`format "${format}" has a "<" without a closing ">"`);
      const name = format.slice(index + 1, end).trim().toLowerCase();
      if (!PLACEHOLDERS[name]) {
        throw new Error(`unknown placeholder <${name}>; use ${PLACEHOLDER_NAMES.map((item) => `<${item}>`).join(', ')}`);
      }
      stack[stack.length - 1].push({ kind: 'placeholder', name });
      index = end + 1;
    } else if (char === '>') {
      throw new Error(`format "${format}" has a ">" without an opening "<"`);
    } else if (char === '[') {
      stack.push([]);
      index += 1;
    } else if (char === ']') {
      if (stack.length === 1) throw new Error(`format "${format}" has a "]" without an opening "["`);
      const tokens = stack.pop()!;
      if (!tokens.length) throw new Error(`format "${format}" has an empty optional part "[]"`);
      stack[stack.length - 1].push({ kind: 'optional', tokens });
      index += 1;
    } else {
      pushLiteral(char);
      index += 1;
    }
  }
  if (stack.length !== 1) throw new Error(`format "${format}" has a "[" without a closing "]"`);
  return stack[0];
}

function collectPlaceholders(tokens: Token[], seen: string[] = []): string[] {
  for (const token of tokens) {
    if (token.kind === 'placeholder' && !seen.includes(token.name)) seen.push(token.name);
    if (token.kind === 'optional') collectPlaceholders(token.tokens, seen);
  }
  return seen;
}

function toRegex(tokens: Token[], kind: FormatKind, typeAlternation: string): string {
  return tokens
    .map((token) => {
      if (token.kind === 'literal') return escapeRegex(token.text);
      if (token.kind === 'optional') return `(?:${toRegex(token.tokens, kind, typeAlternation)})?`;
      if (token.name === 'type') return `(?:${typeAlternation})`;
      return `(?:${PLACEHOLDERS[token.name].pattern(kind)})`;
    })
    .join('');
}

function render(tokens: Token[], value: (name: string) => string | undefined, includeOptional: boolean): string {
  return tokens
    .map((token) => {
      if (token.kind === 'literal') return token.text;
      if (token.kind === 'placeholder') return value(token.name) ?? `<${token.name}>`;
      const inner = collectPlaceholders(token.tokens);
      const complete = inner.every((name) => value(name) !== undefined);
      return includeOptional || complete ? render(token.tokens, value, includeOptional) : '';
    })
    .join('');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
