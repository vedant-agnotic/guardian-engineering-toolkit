import type { CiGuardianConfig } from '../../config/types.js';

export const WORKFLOW_PATH = '.github/workflows/guardian-ci.yml';
/** The status to mark as required in branch protection: workflow "guardian-ci", job "required". */
export const REQUIRED_STATUS = 'guardian-ci / required';

/**
 * Actions pinned to full commit SHAs (verified against the GitHub API on
 * 2026-10-12). Update these deliberately, in a reviewed release.
 */
export const ACTIONS = {
  checkout: { uses: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1', version: 'v7.0.1' },
  setupNode: { uses: 'actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1', version: 'v7.1.0' },
  uploadArtifact: { uses: 'actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9', version: 'v7.0.2' },
} as const;

export interface WorkflowInputs {
  /** Branch that receives merges, e.g. main; pushes to it also run the code checks. */
  defaultBranch: string;
  /** `.nvmrc`/`.node-version` path if the project has one, otherwise a version such as "20". */
  node: { file: string } | { version: string };
}

/** Renders the workflow. Event values reach scripts only through env:, never as script text. */
export function renderWorkflow(config: CiGuardianConfig, inputs: WorkflowInputs): string {
  const gitGuardian = config.gitGuardian?.enabled === true;
  const codeChecks = config.checks.length > 0;
  const nodeSetup =
    'file' in inputs.node
      ? [`          node-version-file: ${inputs.node.file}`]
      : [`          node-version: ${JSON.stringify(inputs.node.version)}`];

  const setup = (fetchDepth: boolean): string[] => [
    `      - uses: ${ACTIONS.checkout.uses} # ${ACTIONS.checkout.version}`,
    ...(fetchDepth ? ['        with:', '          fetch-depth: 0 # commit ranges need the base branch history'] : []),
    `      - uses: ${ACTIONS.setupNode.uses} # ${ACTIONS.setupNode.version}`,
    '        with:',
    ...nodeSetup,
    '          cache: npm',
    '      - name: Install dependencies',
    '        id: install',
    '        run: npm ci',
  ];

  const jobs: string[] = [];
  const needs: string[] = [];

  if (gitGuardian) {
    needs.push('git-guardian');
    const step = (name: string, command: string): string[] => [
      `      - name: ${name}`,
      "        if: ${{ !cancelled() && steps.install.outcome == 'success' }}",
      `        run: ${command}`,
    ];
    jobs.push(
      '  git-guardian:',
      '    name: git-guardian',
      '    # Pull requests only; bot branches (dependabot/..., renovate/...) use their own naming.',
      "    if: ${{ github.event_name == 'pull_request' && !startsWith(github.head_ref, 'dependabot/') && !startsWith(github.head_ref, 'renovate/') }}",
      '    runs-on: ubuntu-latest',
      '    env:',
      "      FORCE_COLOR: '1'",
      '      BRANCH: ${{ github.head_ref }}',
      '      PR_TITLE: ${{ github.event.pull_request.title }}',
      '      BASE_SHA: ${{ github.event.pull_request.base.sha }}',
      '      HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
      '    steps:',
      ...setup(true),
      '      # Each check runs even if an earlier one failed, so one run lists every problem.',
      '      # "npx --no" only runs the installed devDependency; it never downloads a same-named package.',
      ...step('Branch name', 'npx --no git-guardian validate branch "$BRANCH"'),
      ...step('Commit messages', 'npx --no git-guardian validate commits "$BASE_SHA..$HEAD_SHA"'),
      ...step('Pull request title (the commit message on squash merge)', 'npx --no git-guardian validate commit -m "$PR_TITLE"'),
      ...step('Secrets in added lines', 'npx --no git-guardian scan --range "$BASE_SHA..$HEAD_SHA"'),
      '',
    );
  }

  if (codeChecks) {
    needs.push('checks');
    jobs.push(
      '  checks:',
      `    name: checks (${config.checks.map((check) => check.id).join(', ')})`,
      '    runs-on: ubuntu-latest',
      '    env:',
      "      FORCE_COLOR: '1'",
      '    steps:',
      ...setup(false),
      '      - name: Run checks from .ciguardian.yml',
      '        run: npx --no ci-guardian run',
      '      - name: Upload report',
      '        if: ${{ !cancelled() }}',
      `        uses: ${ACTIONS.uploadArtifact.uses} # ${ACTIONS.uploadArtifact.version}`,
      '        with:',
      '          name: guardian-ci-report',
      `          path: ${config.report.path}`,
      '          if-no-files-found: warn',
      '',
    );
  }

  const results = needs.map((job) => `          ${envName(job)}: \${{ needs.${job}.result }}`);
  const verdicts = needs.map((job) =>
    job === 'git-guardian'
      ? // Skipped on pushes and bot branches by design; failure or cancellation still fails.
        `          case "$${envName(job)}" in success|skipped) ;; *) echo "${job}: $${envName(job)}"; exit 1 ;; esac`
      : `          [ "$${envName(job)}" = success ] || { echo "${job}: $${envName(job)}"; exit 1; }`,
  );

  jobs.push(
    `  # The one status to require in branch protection: "${REQUIRED_STATUS}".`,
    '  required:',
    '    name: required',
    '    if: ${{ always() }}',
    `    needs: [${needs.join(', ')}]`,
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: All required jobs passed',
    '        env:',
    ...results,
    '        run: |',
    ...verdicts,
    '          echo "All required Guardian jobs passed."',
  );

  return [
    '# Generated by CI Guardian from .ciguardian.yml. Review it, then commit it.',
    `# To regenerate: delete this file and run "ci-guardian generate --write".`,
    `# Require the "${REQUIRED_STATUS}" status in your branch protection rules.`,
    'name: guardian-ci',
    '',
    'on:',
    '  pull_request:',
    '    types: [opened, synchronize, reopened, edited] # "edited" re-checks a renamed PR title',
    '  push:',
    `    branches: [${JSON.stringify(inputs.defaultBranch)}]`,
    '',
    'permissions:',
    '  contents: read',
    '',
    'concurrency:',
    '  group: guardian-ci-${{ github.ref }}',
    '  cancel-in-progress: true',
    '',
    'jobs:',
    ...jobs,
    '',
  ].join('\n');
}

function envName(job: string): string {
  return job.toUpperCase().replace(/-/g, '_');
}
