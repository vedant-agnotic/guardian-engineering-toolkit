import type { GitGuardianConfig } from './types.js';

export const DEFAULT_BRANCH_FORMAT = '<type>/<number>-<description>';
export const DEFAULT_COMMIT_FORMAT = '<type>: <description>';
export const DEFAULT_TYPES = 'feat,chore,bugfix,task';

export function createDefaultConfig(): GitGuardianConfig {
  return {
    version: 1,
    branch: {
      enabled: true,
      format: DEFAULT_BRANCH_FORMAT,
      types: DEFAULT_TYPES,
      protected: 'main,master,develop,development,staging,production',
      suggestions: true,
    },
    commit: {
      enabled: true,
      format: DEFAULT_COMMIT_FORMAT,
      types: DEFAULT_TYPES,
      maxSubjectLength: 72,
      allowMergeCommits: true,
      allowRevertCommits: true,
    },
    secrets: {
      enabled: true,
      allow: '',
    },
    hooks: {
      referenceTransaction: true,
      commitMsg: true,
    },
  };
}
