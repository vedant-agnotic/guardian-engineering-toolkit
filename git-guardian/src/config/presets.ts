import { createDefaultConfig } from './defaults.js';
import type { GitGuardianConfig } from './types.js';

export interface Preset {
  name: string;
  summary: string;
  branchFormat: string;
  commitFormat: string;
  types: string;
  /** Names the preset must accept and reject; verified by the test suite and shown by `presets`. */
  branchAccepts: string[];
  branchRejects: string[];
  commitAccepts: string[];
  commitRejects: string[];
}

export const PRESETS: Preset[] = [
  {
    name: 'default',
    summary: 'Numbered work items: feat/123-add-login, "feat: add login"',
    branchFormat: '<type>/<number>-<description>',
    commitFormat: '<type>: <description>',
    types: 'feat,chore,bugfix,task',
    branchAccepts: ['feat/123-add-login', 'task/7-update-docs'],
    branchRejects: ['feat/add-login', 'wip/12-login', 'Feat/1-Login'],
    commitAccepts: ['feat: add login page', 'chore: bump dependencies'],
    commitRejects: ['fixed stuff', 'wip: things'],
  },
  {
    name: 'jira',
    summary: 'Jira ticket keys: feat/ABC-123-add-login, "feat(auth): add login"',
    branchFormat: '<type>/<ticket>-<description>',
    commitFormat: '<type>[(<scope>)]: <description>',
    types: 'feat,fix,chore,docs,refactor,test',
    branchAccepts: ['feat/ABC-123-add-login', 'fix/PAY-9-rounding-error'],
    branchRejects: ['feat/123-add-login', 'feat/add-login'],
    commitAccepts: ['feat(auth): add login', 'fix: handle empty cart'],
    commitRejects: ['ABC-123 add login', 'feature: add login'],
  },
  {
    name: 'conventional',
    summary: 'Conventional Commits with an optional ticket: feat/add-login, "feat(auth): add login"',
    branchFormat: '<type>/[<ticket>-]<description>',
    commitFormat: '<type>[(<scope>)]: <description>',
    types: 'feat,fix,docs,style,refactor,perf,test,build,ci,chore,revert',
    branchAccepts: ['feat/add-login', 'fix/ABC-12-null-pointer'],
    branchRejects: ['add-login', 'feature/add-login'],
    commitAccepts: ['feat(auth): add login', 'docs: update readme'],
    commitRejects: ['Added login', 'feat add login'],
  },
  {
    name: 'simple',
    summary: 'No ticket numbers: feat/add-login, "feat: add login"',
    branchFormat: '<type>/<description>',
    commitFormat: '<type>: <description>',
    types: 'feat,fix,chore,docs',
    branchAccepts: ['feat/add-login', 'docs/update-readme'],
    branchRejects: ['feat/Add_Login', 'add-login'],
    commitAccepts: ['fix: handle empty cart'],
    commitRejects: ['fix handle empty cart'],
  },
];

export function findPreset(name: string): Preset {
  const preset = PRESETS.find((candidate) => candidate.name === name);
  if (!preset) throw new Error(`Unknown preset "${name}". Available: ${PRESETS.map((p) => p.name).join(', ')}.`);
  return preset;
}

export function configFromPreset(preset: Preset): GitGuardianConfig {
  const config = createDefaultConfig();
  config.branch.format = preset.branchFormat;
  config.branch.types = preset.types;
  config.commit.format = preset.commitFormat;
  config.commit.types = preset.types;
  return config;
}
