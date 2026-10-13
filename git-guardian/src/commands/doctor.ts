import { accessSync, constants } from 'node:fs';
import { configPath, loadConfig } from '../config/load.js';
import { getRepoRoot, gitVersion, hooksDirectory, supportsReferenceTransaction } from '../core/git.js';
import { run } from '../core/exec.js';
import { ui } from '../core/log.js';
import { hooksStatus } from '../hooks/install.js';

export function doctorCommand(strict = false): void {
  let problems = 0;
  const problem = (text: string, fix: string): void => {
    problems += 1;
    ui.warn(`${text}\n  Fix: ${fix}`);
  };
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  ui.title('Git Guardian doctor');
  ui.success(`Repository: ${repoRoot}`);
  ui.success(`Config: ${configPath(repoRoot)}`);

  const version = gitVersion();
  if (supportsReferenceTransaction(version)) ui.success(`Git ${version} supports branch transaction guarding.`);
  else problem(`Git ${version} is older than 2.28; branch creation can't be blocked.`, 'upgrade Git to 2.28 or newer.');

  if (config.secrets.enabled) ui.success('Secret scanning is on for commits.');
  else ui.warn('Secret scanning is off (secrets.enabled: false). Set it to true in .git-guardian.yml to turn it on.');

  const dir = hooksDirectory(repoRoot);
  ui.info(`Hooks directory: ${dir}`);
  for (const hook of hooksStatus(repoRoot)) {
    if (hook.installed && hook.managed) {
      try {
        accessSync(`${dir}/${hook.name}`, constants.X_OK);
        ui.success(`${hook.name} hook installed and executable.`);
      } catch {
        problem(`${hook.name} hook exists but is not executable.`, `chmod +x ${dir}/${hook.name}, or run "git-guardian install".`);
      }
    } else if (hook.installed) {
      problem(`${hook.name} exists but is not managed by Git Guardian.`, 'run "git-guardian install"; your existing hook is kept as a backup and still runs.');
    } else {
      problem(`${hook.name} hook is not installed.`, 'run "git-guardian install" (every clone needs this once).');
    }
  }

  const hooksPath = run('git', ['config', '--get', 'core.hooksPath'], { cwd: repoRoot });
  if (hooksPath.status === 0 && hooksPath.stdout.trim()) {
    ui.info(`core.hooksPath is set to ${hooksPath.stdout.trim()}; hooks are installed there, and existing hooks in it are preserved.`);
  }
  if (problems) {
    ui.warn(`${problems} problem(s) found.`);
    if (strict) process.exitCode = 1;
  } else {
    ui.success('Everything looks good.');
  }
}
