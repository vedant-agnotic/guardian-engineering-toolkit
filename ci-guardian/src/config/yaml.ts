/**
 * Restricted, data-only YAML subset so the runtime stays dependency-free.
 *
 * Supported: block mappings, block sequences (including `- key: value` items),
 * single-line flow sequences of scalars (`[npm, run, lint]`), quoted and plain
 * scalars, comments and a single leading `---`.
 *
 * Rejected: duplicate keys, anchors, aliases, tags, directives, flow mappings,
 * nested flow collections, block scalars, multi-line plain scalars, multiple
 * documents and tabs in indentation. Input size and nesting depth are limited.
 */

export type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

export const YAML_LIMITS = {
  maxBytes: 64 * 1024,
  maxDepth: 16,
} as const;

export class YamlError extends Error {
  constructor(message: string, line?: number) {
    super(line === undefined ? message : `${message} (line ${line})`);
    this.name = 'YamlError';
  }
}

interface Line {
  indent: number;
  text: string;
  number: number;
}

export function parseYaml(input: string): YamlValue {
  if (Buffer.byteLength(input, 'utf8') > YAML_LIMITS.maxBytes) {
    throw new YamlError(`File is larger than ${YAML_LIMITS.maxBytes} bytes`);
  }
  const lines = tokenize(input);
  if (lines.length === 0) throw new YamlError('Document is empty');

  const parser = new Parser(lines);
  const value = parser.parseNode(0, 0);
  parser.expectEnd();
  return value;
}

function tokenize(input: string): Line[] {
  const lines: Line[] = [];
  const raw = input.replace(/^﻿/, '').split(/\r?\n/);
  let seenContent = false;

  raw.forEach((source, index) => {
    const number = index + 1;
    const leading = /^[ \t]*/.exec(source)![0];
    if (leading.includes('\t')) throw new YamlError('Tabs are not allowed in indentation', number);

    const text = stripComment(source.slice(leading.length)).trimEnd();
    if (!text) return;

    if (text.startsWith('%')) throw new YamlError('YAML directives are not supported', number);
    if (text === '---' || text.startsWith('--- ')) {
      if (seenContent) throw new YamlError('Multiple YAML documents are not supported', number);
      if (text !== '---') throw new YamlError('Content after "---" is not supported', number);
      return;
    }
    if (text === '...') throw new YamlError('Document end markers are not supported', number);

    seenContent = true;
    lines.push({ indent: leading.length, text, number });
  });
  return lines;
}

class Parser {
  private index = 0;

  constructor(private readonly lines: Line[]) {}

  expectEnd(): void {
    const line = this.lines[this.index];
    if (line) throw new YamlError('Unexpected content; check indentation', line.number);
  }

  parseNode(minIndent: number, depth: number): YamlValue {
    if (depth > YAML_LIMITS.maxDepth) {
      throw new YamlError(`Nesting deeper than ${YAML_LIMITS.maxDepth} levels`, this.peek()?.number);
    }
    const line = this.peek();
    if (!line || line.indent < minIndent) throw new YamlError('Expected a nested value', line?.number);

    if (isSequenceItem(line.text)) return this.parseSequence(line.indent, depth);
    if (findKeySeparator(line.text) !== -1) return this.parseMapping(line.indent, depth);

    this.index += 1;
    return parseInlineValue(line.text, line.number);
  }

  private parseMapping(indent: number, depth: number): { [key: string]: YamlValue } {
    const result: { [key: string]: YamlValue } = Object.create(null);

    for (let line = this.peek(); line && line.indent >= indent; line = this.peek()) {
      if (line.indent > indent) throw new YamlError('Unexpected indentation', line.number);
      if (isSequenceItem(line.text)) throw new YamlError('Unexpected sequence item inside a mapping', line.number);

      const separator = findKeySeparator(line.text);
      if (separator === -1) throw new YamlError('Expected "key: value"', line.number);

      const key = parseKey(line.text.slice(0, separator).trim(), line.number);
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        throw new YamlError(`Duplicate key "${key}"`, line.number);
      }
      const rest = line.text.slice(separator + 1).trim();
      this.index += 1;

      if (rest) {
        result[key] = parseInlineValue(rest, line.number);
        continue;
      }

      const next = this.peek();
      if (next && next.indent > indent) {
        result[key] = this.parseNode(indent + 1, depth + 1);
      } else if (next && next.indent === indent && isSequenceItem(next.text)) {
        // Compact form: a sequence may sit at the same indent as its parent key.
        result[key] = this.parseSequence(indent, depth + 1);
      } else {
        result[key] = null;
      }
    }

    return { ...result };
  }

  private parseSequence(indent: number, depth: number): YamlValue[] {
    const result: YamlValue[] = [];

    for (let line = this.peek(); line && line.indent >= indent; line = this.peek()) {
      if (line.indent > indent) throw new YamlError('Unexpected indentation', line.number);
      if (!isSequenceItem(line.text)) break;

      const rest = line.text.slice(1).trimStart();
      if (!rest) {
        this.index += 1;
        const next = this.peek();
        result.push(next && next.indent > indent ? this.parseNode(indent + 1, depth + 1) : null);
        continue;
      }

      if (isSequenceItem(rest) || findKeySeparator(rest) !== -1) {
        // Re-read the remainder of this line as a nested block at its column.
        const column = indent + (line.text.length - rest.length);
        this.lines[this.index] = { indent: column, text: rest, number: line.number };
        result.push(this.parseNode(column, depth + 1));
        continue;
      }

      this.index += 1;
      result.push(parseInlineValue(rest, line.number));
    }

    return result;
  }

  private peek(): Line | undefined {
    return this.lines[this.index];
  }
}

function isSequenceItem(text: string): boolean {
  return text === '-' || text.startsWith('- ');
}

/** Index of the `:` that separates a mapping key, or -1 if the text is not a mapping entry. */
function findKeySeparator(text: string): number {
  if (text.startsWith('[') || text.startsWith('{')) return -1;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === '\\' && quote === '"') i += 1;
      else if (char === quote) {
        if (quote === "'" && text[i + 1] === "'") i += 1;
        else quote = null;
      }
      continue;
    }
    if ((char === '"' || char === "'") && i === 0) {
      quote = char;
      continue;
    }
    if (char === ':' && (i + 1 === text.length || text[i + 1] === ' ')) return i;
  }
  return -1;
}

function parseKey(raw: string, line: number): string {
  if (!raw) throw new YamlError('Empty key', line);
  if (raw.startsWith('"') || raw.startsWith("'")) {
    return parseQuoted(raw, line);
  }
  rejectIndicators(raw, line);
  if (raw === '<<') throw new YamlError('Merge keys are not supported', line);
  return raw;
}

function parseInlineValue(raw: string, line: number): YamlValue {
  if (raw.startsWith('[')) return parseFlowSequence(raw, line);
  if (raw.startsWith('{')) throw new YamlError('Flow mappings are not supported', line);
  if (raw.startsWith('|') || raw.startsWith('>')) throw new YamlError('Block scalars are not supported', line);
  return parseScalar(raw, line);
}

function parseFlowSequence(raw: string, line: number): YamlValue[] {
  if (!raw.endsWith(']')) throw new YamlError('Flow sequences must open and close on one line', line);
  const body = raw.slice(1, -1).trim();
  if (!body) return [];

  const items: string[] = [];
  let current = '';
  let quote: string | null = null;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quote) {
      current += char;
      if (char === '\\' && quote === '"') {
        current += body[i + 1] ?? '';
        i += 1;
      } else if (char === quote) {
        if (quote === "'" && body[i + 1] === "'") {
          current += "'";
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if ((char === '"' || char === "'") && !current.trim()) quote = char;
    if (char === '[' || char === ']' || char === '{' || char === '}') {
      throw new YamlError('Nested flow collections are not supported', line);
    }
    if (char === ',') {
      items.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (quote) throw new YamlError('Unterminated quoted string', line);
  // A trailing comma ("[a, b,]") is tolerated; an empty item ("[a, , b]") is not.
  if (current.trim()) items.push(current.trim());

  return items.map((item) => {
    if (!item) throw new YamlError('Empty item in flow sequence', line);
    return parseScalar(item, line);
  });
}

function parseScalar(raw: string, line: number): YamlValue {
  if (raw.startsWith('"') || raw.startsWith("'")) return parseQuoted(raw, line);
  rejectIndicators(raw, line);

  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null' || raw === '~') return null;
  if (/^[-+]?\d+$/.test(raw)) return Number(raw);
  if (/^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$/.test(raw)) return Number(raw);
  if (/^(true|false|yes|no|on|off|null)$/i.test(raw)) {
    throw new YamlError(`Ambiguous value "${raw}"; use lowercase true/false/null or quote it`, line);
  }
  return raw;
}

function parseQuoted(raw: string, line: number): string {
  const quote = raw[0];
  if (raw.length < 2 || !raw.endsWith(quote)) throw new YamlError('Unterminated quoted string', line);
  if (quote === "'") {
    const body = raw.slice(1, -1);
    if (/(^|[^'])'($|[^'])/.test(body.replace(/''/g, ''))) {
      throw new YamlError('Unexpected quote inside single-quoted string', line);
    }
    return body.replace(/''/g, "'");
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'string') throw new Error('not a string');
    return value;
  } catch {
    throw new YamlError('Invalid double-quoted string', line);
  }
}

function rejectIndicators(raw: string, line: number): void {
  const first = raw[0];
  if (first === '&') throw new YamlError('Anchors are not supported', line);
  if (first === '*') throw new YamlError('Aliases are not supported', line);
  if (first === '!') throw new YamlError('Tags are not supported', line);
  if (first === '@' || first === '`') throw new YamlError(`Reserved indicator "${first}"; quote the value`, line);
  if (first === '?') throw new YamlError('Complex keys are not supported', line);
}

function stripComment(text: string): string {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === '\\' && quote === '"') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if ((char === '"' || char === "'") && (i === 0 || /[\s[,:-]/.test(text[i - 1]))) {
      quote = char;
      continue;
    }
    if (char === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i);
  }
  return text;
}
