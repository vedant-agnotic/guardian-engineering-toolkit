import type { CheckConfig, CiGuardianConfig, ProjectType } from './types.js';

export const DEFAULT_REPORT_PATH = '.guardian/ci/report.json';

/** The documented React Native example. Init writes it; the loader never injects it. */
export function reactNativeDefaults(): CiGuardianConfig {
  return createConfig('react-native', '.', [
    { id: 'lint', command: ['npm', 'run', 'lint'], timeoutSeconds: 300 },
    { id: 'typecheck', command: ['npm', 'run', 'typecheck'], timeoutSeconds: 300 },
    { id: 'unit', command: ['npm', 'run', 'test', '--', '--runInBand'], timeoutSeconds: 900 },
  ]);
}

export function createConfig(
  type: ProjectType,
  root: string,
  checks: CheckConfig[],
  failFast = false,
  gitGuardian?: boolean,
): CiGuardianConfig {
  const config: CiGuardianConfig = {
    version: 1,
    project: { type, root },
    provider: 'github-actions',
    checks,
    execution: { failFast },
    report: { path: DEFAULT_REPORT_PATH },
  };
  if (gitGuardian !== undefined) config.gitGuardian = { enabled: gitGuardian };
  return config;
}

export function stringifyConfig(config: CiGuardianConfig): string {
  const lines = [
    '# CI Guardian configuration. Commands are argv arrays; no shell is involved.',
    'version: 1',
    'project:',
    `  type: ${scalar(config.project.type)}`,
    `  root: ${scalar(config.project.root)}`,
    `provider: ${scalar(config.provider)}`,
    config.checks.length ? 'checks:' : 'checks: []',
  ];
  for (const check of config.checks) {
    lines.push(`  - id: ${scalar(check.id)}`);
    lines.push(`    command: [${check.command.map(scalar).join(', ')}]`);
    if (check.fixCommand && check.fixCommand.length > 0) {
      lines.push(`    fixCommand: [${check.fixCommand.map(scalar).join(', ')}]`);
    }
    lines.push(`    timeoutSeconds: ${check.timeoutSeconds}`);
  }
  lines.push('execution:', `  failFast: ${config.execution.failFast}`);
  if (config.execution.parallel !== undefined) {
    lines.push(`  parallel: ${config.execution.parallel}`);
  }
  if (config.execution.concurrency !== undefined) {
    lines.push(`  concurrency: ${config.execution.concurrency}`);
  }
  lines.push('report:', `  path: ${scalar(config.report.path)}`);
  if (config.gitGuardian) {
    lines.push('# Branch name, commit messages, PR title and secrets, checked by Git Guardian in the generated workflow.');
    lines.push('gitGuardian:', `  enabled: ${config.gitGuardian.enabled}`);
  }
  return `${lines.join('\n')}\n`;
}

/** Plain when unambiguous, otherwise a JSON (YAML double-quoted) string. */
function scalar(value: string): string {
  const plain =
    /^[A-Za-z0-9_./+=][A-Za-z0-9_./+=:-]*$/.test(value) ||
    /^--?[A-Za-z0-9][A-Za-z0-9_./+=:-]*$/.test(value) ||
    value === '--';
  const ambiguous = /^(true|false|yes|no|on|off|null|~)$/i.test(value) || /^[-+]?(\d|\.\d)/.test(value);
  return plain && !ambiguous && !value.includes(': ') && !value.endsWith(':') ? value : JSON.stringify(value);
}
