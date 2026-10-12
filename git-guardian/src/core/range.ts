import { run } from './exec.js';

export interface CommitRange {
  base: string;
  head: string;
}

/** Parses "<base>..<head>" and checks both ends exist locally. */
export function resolveRange(repoRoot: string, value: string): CommitRange {
  const match = /^([^.\s][^\s]*?)\.\.(?!\.)([^\s]*)$/.exec(value);
  if (!match) throw new Error(`Expected a range like origin/main..HEAD, got "${value}".`);
  const range = { base: match[1], head: match[2] || 'HEAD' };
  for (const ref of [range.base, range.head]) {
    if (run('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: repoRoot }).status !== 0) {
      throw new Error(
        `Commit "${ref}" is not available in this clone. In GitHub Actions, check out with fetch-depth: 0 ` +
          'so the base branch history is present.',
      );
    }
  }
  return range;
}

export interface CommitInfo {
  sha: string;
  message: string;
}

/** Commits reachable from head but not from base, oldest first. */
export function commitsInRange(repoRoot: string, range: CommitRange): CommitInfo[] {
  const log = run('git', ['log', '--reverse', '--format=%H%x1f%B%x1e', `${range.base}..${range.head}`], { cwd: repoRoot });
  if (log.status !== 0) throw new Error(`git log failed: ${log.stderr.trim()}`);
  return log.stdout
    .split('\u001e')
    .map((entry) => entry.replace(/^\n/, ''))
    .filter((entry) => entry.includes('\u001f'))
    .map((entry) => {
      const [sha, message] = entry.split('\u001f');
      return { sha, message: message.trim() };
    });
}

/** "a1b2c3d..e4f5a6b" instead of two 40-character SHAs; branch names are kept. */
export function displayRange(range: CommitRange): string {
  const short = (ref: string): string => (/^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref);
  return `${short(range.base)}..${short(range.head)}`;
}
