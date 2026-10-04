export interface BranchConfig {
  enabled: boolean;
  pattern: string;
  protected: string;
  example: string;
  suggestionPrefixes: string;
  suggestions: boolean;
}

export interface CommitConfig {
  enabled: boolean;
  pattern: string;
  example: string;
  suggestionTypes: string;
  maxSubjectLength: number;
  allowMergeCommits: boolean;
  allowRevertCommits: boolean;
}

export interface HooksConfig {
  referenceTransaction: boolean;
  commitMsg: boolean;
}

export interface GitGuardianConfig {
  version: number;
  branch: BranchConfig;
  commit: CommitConfig;
  hooks: HooksConfig;
}
