import type { GitGuardianConfig } from './types.js';

export const DEFAULT_BRANCH_PATTERN =
  '^(feature|fix|hotfix|chore|docs|refactor|test|release)/([A-Z][A-Z0-9]+-[0-9]+-)?[a-z0-9]+(?:-[a-z0-9]+)*$';

export const DEFAULT_COMMIT_PATTERN =
  '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\([a-z0-9._-]+\\))?!?: .{1,72}$';

export function createDefaultConfig(): GitGuardianConfig {
  return {
    version: 1,
    branch: {
      enabled: true,
      pattern: DEFAULT_BRANCH_PATTERN,
      protected: 'main,master,develop,development,staging,production',
      example: 'feature/ABC-123-add-login',
      suggestionPrefixes: 'feature,fix,hotfix,chore,docs,refactor,test,release',
      suggestions: true,
    },
    commit: {
      enabled: true,
      pattern: DEFAULT_COMMIT_PATTERN,
      example: 'feat(auth): add passkey login',
      suggestionTypes: 'feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert',
      maxSubjectLength: 72,
      allowMergeCommits: true,
      allowRevertCommits: true,
    },
    hooks: {
      referenceTransaction: true,
      commitMsg: true,
    },
  };
}
