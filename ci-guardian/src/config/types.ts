export const PROJECT_TYPES = ['react-native', 'generic'] as const;
export const PROVIDERS = ['github-actions'] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type Provider = (typeof PROVIDERS)[number];

export interface CheckConfig {
  id: string;
  /** Executable followed by its arguments; never evaluated by a shell. */
  command: string[];
  timeoutSeconds: number;
}

export interface CiGuardianConfig {
  version: 1;
  project: {
    type: ProjectType;
    /** Repository-relative working directory for every check. */
    root: string;
  };
  provider: Provider;
  checks: CheckConfig[];
  execution: {
    failFast: boolean;
  };
  report: {
    /** Repository-relative JSON report path (relative to the Git root, not project.root). */
    path: string;
  };
  /** Optional: run Git Guardian's branch, commit, PR-title and secret checks in the generated workflow. */
  gitGuardian?: {
    enabled: boolean;
  };
}

export interface ConfigIssue {
  path: string;
  message: string;
}
