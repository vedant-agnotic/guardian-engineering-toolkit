/**
 * Git Guardian intentionally supports a small YAML subset so the runtime stays
 * dependency-free: nested mappings with scalar values only.
 */
export function parseSimpleYaml(input: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; value: Record<string, unknown> }> = [
    { indent: -1, value: root },
  ];

  const lines = input.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    if (raw.includes('\t')) throw new Error(`Tabs are not supported in YAML (line ${index + 1})`);

    const indent = raw.length - raw.trimStart().length;
    if (indent % 2 !== 0) {
      throw new Error(`Indentation must use multiples of two spaces (line ${index + 1})`);
    }

    const line = stripComment(raw.trim());
    const match = /^([^:]+):(.*)$/.exec(line);
    if (!match) throw new Error(`Expected "key: value" (line ${index + 1})`);

    const key = match[1].trim();
    const rawValue = match[2].trim();
    if (!key) throw new Error(`Empty key (line ${index + 1})`);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;

    if (rawValue === '') {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else {
      parent[key] = parseScalar(rawValue, index + 1);
    }
  }

  return root;
}

function stripComment(value: string): string {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if ((char === '"' || char === "'") && value[i - 1] !== '\\') {
      quote = quote === char ? null : quote ?? char;
    }
    if (char === '#' && quote === null && (i === 0 || /\s/.test(value[i - 1]))) {
      return value.slice(0, i).trimEnd();
    }
  }
  return value;
}

function parseScalar(value: string, line: number): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid quoted string (line ${line})`);
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  if (value.startsWith('[') || value.startsWith('- ')) {
    throw new Error(`Sequence syntax is not supported (line ${line})`);
  }

  return value;
}

export function stringifySimpleYaml(value: Record<string, unknown>, indent = 0): string {
  const lines: string[] = [];
  const padding = ' '.repeat(indent);

  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      lines.push(`${padding}${key}:`);
      lines.push(stringifySimpleYaml(item as Record<string, unknown>, indent + 2));
    } else {
      lines.push(`${padding}${key}: ${formatScalar(item)}`);
    }
  }

  return lines.filter(Boolean).join('\n');
}

function formatScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const text = String(value);
  if (text === '' || /[:#{}[\],&*!|>'"%@`]|^[-?]|\s$|^\s|\\/.test(text)) {
    return JSON.stringify(text);
  }
  return text;
}
