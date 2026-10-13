export interface BranchConfig {
  enabled: boolean;
  /** Readable format, e.g. "<type>/<number>-<description>". */
  format: string;
  /** Comma-separated values allowed for <type>. */
  types: string;
  /** Comma-separated branch names that are always allowed, e.g. main. */
  protected: string;
  suggestions: boolean;
}

export interface CommitConfig {
  enabled: boolean;
  /** Readable format for the first line, e.g. "<type>: <description>". */
  format: string;
  /** Comma-separated values allowed for <type>. */
  types: string;
  maxSubjectLength: number;
  allowMergeCommits: boolean;
  allowRevertCommits: boolean;
  /** Automatically populate <ticket> or <number> from the current branch name if omitted in the commit message. */
  autoTicket: boolean;
}

export interface SecretsConfig {
  /** Block commits whose staged changes or message contain likely secrets. */
  enabled: boolean;
  /** Comma-separated path globs never scanned, e.g. "test/fixtures/**". */
  allow: string;
}

export interface HooksConfig {
  referenceTransaction: boolean;
  commitMsg: boolean;
}

export interface GitGuardianConfig {
  version: number;
  branch: BranchConfig;
  commit: CommitConfig;
  secrets: SecretsConfig;
  hooks: HooksConfig;
}
