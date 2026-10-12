import { run } from '../core/exec.js';
import { mask, secretFileName, SECRET_RULES } from './rules.js';

/** Put this text on a line to accept a deliberate match, e.g. a test fixture. */
export const ALLOW_MARKER = 'git-guardian:allow-secret';

const MAX_LINE_LENGTH = 4096;

export interface SecretFinding {
  /** Repository-relative path, or "commit message". */
  path: string;
  /** 1-based line number; null for a whole-file finding. */
  line: number | null;
  rule: string;
  /** Masked preview; never the full secret. */
  preview: string;
}

export interface AddedLine {
  path: string;
  line: number;
  text: string;
}

/** Checks lines against every rule. */
export function scanLines(lines: AddedLine[]): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const { path, line, text } of lines) {
    if (text.length > MAX_LINE_LENGTH || text.includes(ALLOW_MARKER)) continue;
    for (const rule of SECRET_RULES) {
      const match = rule.pattern.exec(text);
      if (!match) continue;
      const value = match[rule.group ?? 0] ?? match[0];
      if (rule.accept && !rule.accept(value)) continue;
      findings.push({ path, line, rule: rule.name, preview: mask(value) });
      break; // one finding per line is enough to block
    }
  }
  return findings;
}

export function scanMessage(message: string): SecretFinding[] {
  const lines = message
    .split(/\r?\n/)
    .map((text, index) => ({ path: 'commit message', line: index + 1, text }))
    .filter((item) => !item.text.startsWith('#'));
  return scanLines(lines);
}

export interface StagedScanOptions {
  /** Path globs to skip, e.g. "test/fixtures/**". */
  allow: string[];
}

/** Scans what is about to be committed: added lines and newly staged credential files. */
export function scanStaged(repoRoot: string, options: StagedScanOptions): SecretFinding[] {
  return scanDiff(repoRoot, ['--cached'], options);
}

/** Scans lines added between base and head (from their merge base), e.g. a pull request. */
export function scanRange(repoRoot: string, base: string, head: string, options: StagedScanOptions): SecretFinding[] {
  return scanDiff(repoRoot, [`${base}...${head}`], options);
}

function scanDiff(repoRoot: string, target: string[], options: StagedScanOptions): SecretFinding[] {
  const allowed = compileGlobs(options.allow);
  const diff = run(
    'git',
    ['-c', 'core.quotepath=false', 'diff', ...target, '--no-color', '--no-ext-diff', '--unified=0', '--diff-filter=ACMR', '--no-renames'],
    { cwd: repoRoot },
  );
  if (diff.status !== 0) throw new Error(`Could not read changes: ${diff.stderr.trim()}`);

  const files = parseAddedLines(diff.stdout);
  const findings: SecretFinding[] = [];
  for (const [path, lines] of files) {
    if (allowed.some((glob) => glob.test(path))) continue;
    const fileKind = secretFileName(path);
    if (fileKind) findings.push({ path, line: null, rule: fileKind, preview: 'file should not be committed' });
    findings.push(...scanLines(lines));
  }
  return findings;
}

/** Parses `git diff --unified=0` output into added lines per file. */
export function parseAddedLines(diff: string): Map<string, AddedLine[]> {
  const files = new Map<string, AddedLine[]>();
  let path: string | null = null;
  let next = 0;
  let inHeader = false; // between "diff --git" and the first "@@"; content lines can start with "+++" too

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      path = null;
      inHeader = true;
      continue;
    }
    if (inHeader && raw.startsWith('+++ ')) {
      const target = unquote(raw.slice(4));
      path = target === '/dev/null' ? null : target.replace(/^b\//, '');
      if (path !== null && !files.has(path)) files.set(path, []);
      continue;
    }
    if (raw.startsWith('@@')) {
      inHeader = false;
      const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      next = hunk ? Number(hunk[1]) : 0;
      continue;
    }
    if (!inHeader && path !== null && raw.startsWith('+')) {
      files.get(path)!.push({ path, line: next, text: raw.slice(1) });
      next += 1;
    }
  }
  return files;
}

function unquote(value: string): string {
  if (!value.startsWith('"')) return value;
  try {
    return JSON.parse(value) as string;
  } catch {
    return value.slice(1, -1);
  }
}

export function compileGlobs(globs: string[]): RegExp[] {
  return globs.map((glob) => {
    const source = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\//g, '\u0000') // "**/" = any folders, including none
      .replace(/\*\*/g, '\u0001') // trailing "**" = anything below
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/\u0000/g, '(?:.*/)?')
      .replace(/\u0001/g, '.*');
    return new RegExp(`^${source}${glob.endsWith('/') ? '.*' : ''}$`);
  });
}
