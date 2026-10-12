import type { GitGuardianConfig } from '../config/types.js';
import { err, type Palette } from '../core/log.js';
import { compileBranchFormat } from './branch.js';
import { compileCommitFormat } from './commit.js';
import { describeFormat, exampleFor } from './template.js';
import { ALLOW_MARKER, type SecretFinding } from '../secrets/scan.js';

/**
 * The help printed under a rejected branch or commit: why it failed, the
 * format with each placeholder explained, an example and suggestions.
 * Written to stderr, so it uses stderr colours by default.
 */
export function explainViolation(
  kind: 'branch' | 'commit',
  config: GitGuardianConfig,
  result: { reason?: string; suggestions: string[] },
  p: Palette = err,
): string {
  const compiled = kind === 'branch' ? compileBranchFormat(config.branch) : compileCommitFormat(config.commit);
  const lines: string[] = [];

  if (result.reason) {
    const [headline, ...details] = result.reason.split('\n');
    lines.push(p.red(p.bold(headline)), ...details.map((line) => p.yellow(line)));
  }

  lines.push('', `${p.bold('Format:')}  ${p.placeholders(compiled.format)}`);
  lines.push(...describeFormat(compiled).map((line) => `  ${p.placeholders(line)}`));
  lines.push(`${p.bold('Example:')} ${p.green(exampleFor(compiled))}`);

  if (result.suggestions.length) {
    lines.push('', p.bold('Try:'), ...result.suggestions.map((item) => `  ${p.green(p.placeholders(item))}`));
    if (result.suggestions.some((item) => /<[a-z]+>/.test(item))) {
      lines.push(p.dim('  (replace any <placeholder> left in a suggestion)'));
    }
  }
  return lines.join('\n');
}

/** Lists secret findings with masked values and the ways to resolve them. */
export function explainSecrets(findings: SecretFinding[], p: Palette = err): string {
  const lines = findings.map((finding) => {
    const where = finding.line === null ? finding.path : `${finding.path}:${finding.line}`;
    return `  ${p.yellow(where)}  ${p.bold(finding.rule)}  ${p.dim(finding.preview)}`;
  });
  return [
    ...lines,
    '',
    p.bold('What to do:'),
    `  ${p.green('Remove the value')} and load it from an environment variable or secret manager instead.`,
    `  ${p.green('Unstage a file')} that should never be committed: git restore --staged <file>, then add it to .gitignore.`,
    `  ${p.green('If it is not a secret')} (a test fixture or example), add ${p.cyan(ALLOW_MARKER)} in a comment on that line,`,
    `  or list the path under secrets.allow in .git-guardian.yml.`,
    p.dim('  A real secret that was ever pushed must be revoked and rotated; deleting it later does not remove it from history.'),
  ].join('\n');
}
