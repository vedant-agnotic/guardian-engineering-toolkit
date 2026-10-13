#!/usr/bin/env node
/**
 * Release verification: packs the package, installs the real tarball into a
 * disposable Git repository and exercises it end to end (install, branch and
 * commit validation, existing hooks, core.hooksPath, worktrees, CI range
 * validation, uninstall). Run with: npm run verify:release
 *
 * Exits nonzero when any check fails. Needs Node 20+, Git 2.28+ and npm.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const pkgDir = resolve(new URL('..', import.meta.url).pathname);
const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const results = [];
const sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'guardian-verify-')));

function sh(cmd, args, cwd, input) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', input, env: { ...process.env, NO_COLOR: '1', GIT_TERMINAL_PROMPT: '0' } });
}
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : detail ? `\n      ${String(detail).trim().split('\n').slice(0, 6).join('\n      ')}` : ''}`);
}
const combined = (r) => `${r.stdout}${r.stderr}`;

try {
  // 1. Package consistency ------------------------------------------------------------
  const pack = sh('npm', ['pack', '--json', '--pack-destination', sandbox], pkgDir);
  if (pack.status !== 0) throw new Error(`npm pack failed\n${pack.stderr}`);
  const info = JSON.parse(pack.stdout)[0];
  const files = info.files.map((f) => f.path);
  const tarball = join(sandbox, info.filename);
  check('tarball name and version match package.json', info.name === manifest.name && info.version === manifest.version, `${info.name}@${info.version}`);
  check('tarball ships dist, Readme, LICENSE and docs', ['dist/cli.js', 'Readme.md', 'LICENSE', 'package.json'].every((f) => files.includes(f)) && files.some((f) => f.startsWith('docs/')));
  check('tarball has no src, tests, .env or .tgz files', !files.some((f) => /^(src|test)\//.test(f) || /\.env|\.tgz$/.test(f)), files.join(', '));
  check('manifest has repository, homepage, bugs and public access', Boolean(manifest.repository?.url && manifest.homepage && manifest.bugs?.url && manifest.publishConfig?.access === 'public'));
  check('Readme documents the published package name', readFileSync(join(pkgDir, 'Readme.md'), 'utf8').includes(`npm install --save-dev ${manifest.name}`));

  // 2. Clean repository install -------------------------------------------------------
  const repo = join(sandbox, 'my project'); // a space in the path on purpose
  mkdirSync(repo);
  const g = (...a) => sh('git', a, repo);
  g('init', '-b', 'main');
  g('config', 'user.email', 'verify@example.com');
  g('config', 'user.name', 'Verify');
  writeFileSync(join(repo, 'package.json'), '{"name":"verify","version":"1.0.0"}\n');
  const install = sh('npm', ['install', '--save-dev', tarball, '--no-audit', '--no-fund'], repo);
  check('npm install of the tarball works in a clean repo', install.status === 0, combined(install));
  const bin = join(repo, 'node_modules', '.bin', 'git-guardian');
  const gg = (...a) => sh(bin, a, repo);
  check('--version prints the package version', gg('--version').stdout.includes(manifest.version), combined(gg('--version')));

  // Pre-existing hook that must be preserved.
  const hookDir = join(repo, '.git', 'hooks');
  mkdirSync(hookDir, { recursive: true });
  const existing = '#!/bin/sh\necho "existing-hook-ran" >&2\nexit 0\n';
  writeFileSync(join(hookDir, 'commit-msg'), existing);
  chmodSync(join(hookDir, 'commit-msg'), 0o755);

  const init = gg('init', '--yes', '--no-ci');
  check('init --yes succeeds', init.status === 0, combined(init));
  check('init is repeatable (install twice is safe)', gg('install').status === 0 && gg('install').status === 0);
  check('doctor reports the hooks', /commit-msg hook installed/.test(gg('doctor').stdout) && /reference-transaction hook installed/.test(gg('doctor').stdout), combined(gg('doctor')));

  check('doctor --strict exits 0 when everything is installed', gg('doctor', '--strict').status === 0, combined(gg('doctor', '--strict')));
  check('presets lists rule sets without needing a repository config', sh(bin, ['presets'], sandbox).status === 0);
  check('presets test accepts a valid name and exits 0', gg('presets', 'test', 'jira', '--branch', 'feat/ABC-1-login').status === 0);
  check('presets test rejects an invalid name with exit 1', gg('presets', 'test', 'jira', '--branch', 'feat/login').status === 1);

  // 3. Branch validation --------------------------------------------------------------
  writeFileSync(join(repo, '.gitignore'), 'node_modules/\n');
  g('add', '.');
  const first = g('commit', '-m', 'chore: add git guardian');
  check('committing the config and lockfile works', first.status === 0, combined(first));
  const bad = g('switch', '-c', 'Bad_Branch');
  check('git switch -c <invalid> is blocked with suggestions', bad.status !== 0 && /Try:/.test(combined(bad)), combined(bad));
  check('blocked branch was not created', g('branch', '--list', 'Bad_Branch').stdout.trim() === '');
  check('git checkout -b <invalid> is blocked', g('checkout', '-b', 'wip/12-login').status !== 0);
  check('git branch <invalid> is blocked', g('branch', 'Another_Bad').status !== 0);
  check('git switch -c <valid> passes', g('switch', '-c', 'feat/123-add-login').status === 0);
  check('protected branch names are allowed', g('branch', 'develop').status === 0);
  check('validate branch exits nonzero for an invalid name', gg('validate', 'branch', 'nope').status !== 0);

  // 4. Commit validation --------------------------------------------------------------
  check('valid commit passes and the pre-existing hook still runs', (() => {
    const r = g('commit', '--allow-empty', '-m', 'feat: add login');
    return r.status === 0 && combined(r).includes('existing-hook-ran');
  })());
  check('invalid commit is blocked', g('commit', '--allow-empty', '-m', 'fixed stuff').status !== 0);
  check('multiline message: valid subject + body passes', g('commit', '--allow-empty', '-m', 'feat: add thing', '-m', 'Body line one.\n\nBody line two.').status === 0);
  check('multiline message: invalid subject is blocked even with a valid-looking body', g('commit', '--allow-empty', '-m', 'oops', '-m', 'feat: hidden').status !== 0);
  check('amend with an invalid message is blocked', g('commit', '--amend', '--allow-empty', '-m', 'bad message').status !== 0);

  writeFileSync(join(repo, 'a.txt'), 'a\n');
  g('add', 'a.txt');
  g('commit', '-m', 'feat: add a');
  g('switch', '-c', 'feat/2-other');
  writeFileSync(join(repo, 'b.txt'), 'b\n');
  g('add', 'b.txt');
  g('commit', '-m', 'feat: add b');
  g('switch', 'feat/123-add-login');
  const merge = g('merge', '--no-ff', 'feat/2-other', '-m', 'Merge branch feat/2-other');
  check('merge commit is accepted (allowMergeCommits)', merge.status === 0, combined(merge));
  writeFileSync(join(repo, 'r.txt'), 'r\n');
  g('add', 'r.txt');
  g('commit', '-m', 'feat: to be reverted');
  const revert = g('revert', '--no-edit', 'HEAD');
  check('revert commit is accepted (allowRevertCommits)', revert.status === 0, combined(revert));
  g('switch', '-c', 'feat/3-pick');
  g('reset', '--hard', 'main');
  const pick = g('cherry-pick', 'feat/2-other');
  check('cherry-pick of a valid commit works', pick.status === 0, combined(pick));

  // 5. Secret scan --------------------------------------------------------------------
  writeFileSync(join(repo, '.env'), 'TOKEN=abc\n');
  g('add', '.env');
  check('commit containing .env is blocked by the secret scan', g('commit', '-m', 'feat: add env').status !== 0);
  g('reset', '-q', '.env');
  rmSync(join(repo, '.env'));

  // 6. CI range validation ------------------------------------------------------------
  g('switch', '-c', 'feat/4-ci');
  g('commit', '--allow-empty', '-m', 'feat: good one');
  g('commit', '--allow-empty', '--no-verify', '-m', 'sloppy message');
  const range = gg('validate', 'commits', 'main..HEAD');
  check('validate commits <range> exits nonzero and names the bad commit', range.status !== 0 && /sloppy message/.test(combined(range)), combined(range));
  check('validate commits <range> exits zero for a clean range', gg('validate', 'commits', 'HEAD~1..HEAD~1').status === 0 || gg('validate', 'commits', 'HEAD..HEAD').status === 0);
  const actions = readFileSync(join(pkgDir, 'examples', 'github-actions', 'git-guardian.yml'), 'utf8');
  check('GitHub Actions example uses full history and the published package', /fetch-depth:\s*0/.test(actions) && /validate commits/.test(actions) && actions.includes(manifest.name));

  // 7. Config validation --------------------------------------------------------------
  const cfgPath = join(repo, '.git-guardian.yml');
  const goodCfg = readFileSync(cfgPath, 'utf8');
  writeFileSync(cfgPath, 'branch:\n  format: [unclosed\n  : :\n');
  check('malformed YAML fails validate with a nonzero exit', gg('validate').status !== 0);
  writeFileSync(cfgPath, goodCfg.replace(/format: "<type>\/<number>-<description>"/, 'format: "<nonsense>/<type>"'));
  check('unknown placeholder in a format is rejected', gg('validate').status !== 0);
  writeFileSync(cfgPath, goodCfg + '\nunknownSection:\n  x: 1\n');
  check('unknown top-level option is rejected', gg('validate').status !== 0);
  writeFileSync(cfgPath, goodCfg.replace(/maxSubjectLength: \d+/, 'maxSubjectLength: "lots"'));
  check('wrong value type is rejected', gg('validate').status !== 0);
  writeFileSync(cfgPath, goodCfg);

  // 8. Repository compatibility -------------------------------------------------------
  mkdirSync(join(repo, 'packages', 'app'), { recursive: true });
  const sub = join(repo, 'packages', 'app');
  check('works from a nested directory', sh('git', ['switch', '-c', 'Bad_Nested'], sub).status !== 0 && sh(bin, ['validate', 'branch', 'feat/1-ok'], sub).status === 0);
  const wt = join(sandbox, 'work tree');
  const wtAdd = g('worktree', 'add', '-b', 'feat/9-wt', wt);
  check('worktree: creating a valid branch works', wtAdd.status === 0, combined(wtAdd));
  check('worktree: invalid branch is blocked', sh('git', ['worktree', 'add', '-b', 'Bad_WT', join(sandbox, 'wt2')], repo).status !== 0);
  check('worktree: commit validation runs', (() => {
    writeFileSync(join(wt, 'w.txt'), 'w');
    sh('git', ['add', 'w.txt'], wt);
    return sh('git', ['commit', '-m', 'nonsense'], wt).status !== 0 && sh('git', ['commit', '-m', 'feat: worktree'], wt).status === 0;
  })());

  // 9. core.hooksPath -----------------------------------------------------------------
  const custom = join(repo, '.githooks');
  mkdirSync(custom);
  writeFileSync(join(custom, 'commit-msg'), '#!/bin/sh\necho "team-hook-ran" >&2\n');
  chmodSync(join(custom, 'commit-msg'), 0o755);
  g('config', 'core.hooksPath', '.githooks');
  const reinstall = gg('install');
  check('install respects core.hooksPath and keeps the team hook', reinstall.status === 0 && existsSync(join(custom, 'commit-msg.git-guardian-original')), combined(reinstall));
  check('team hook still runs with Guardian installed', combined(g('commit', '--allow-empty', '-m', 'feat: hooks path')).includes('team-hook-ran'));
  check('uninstall restores the team hook under core.hooksPath', (() => {
    gg('uninstall');
    return readFileSync(join(custom, 'commit-msg'), 'utf8').includes('team-hook-ran') && !existsSync(join(custom, 'reference-transaction'));
  })());
  g('config', '--unset', 'core.hooksPath');

  // 10. Uninstall restores the original setup -----------------------------------------
  gg('install');
  const un = gg('uninstall');
  check('uninstall succeeds', un.status === 0, combined(un));
  check('uninstall restores the original commit-msg hook byte for byte', readFileSync(join(hookDir, 'commit-msg'), 'utf8') === existing);
  check('uninstall removes reference-transaction', !existsSync(join(hookDir, 'reference-transaction')));
  check('after uninstall, invalid names and messages are accepted', g('branch', 'Totally_Free').status === 0);
  check('doctor --strict reports the missing hooks after uninstall with a fix', (() => {
    const r = gg('doctor', '--strict');
    return r.status !== 0 && /Fix:/.test(combined(r));
  })());
  check('uninstall is repeatable', gg('uninstall').status === 0);
  const rm = sh('npm', ['uninstall', manifest.name, '--no-audit', '--no-fund'], repo);
  check('npm uninstall removes the package', rm.status === 0 && !existsSync(bin), combined(rm));
} catch (error) {
  check('verification ran to completion', false, error instanceof Error ? error.message : String(error));
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
