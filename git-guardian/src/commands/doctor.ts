import { accessSync, constants } from 'node:fs';
import { configPath, loadConfig } from '../config/load.js';
import { getRepoRoot, gitVersion, hooksDirectory, supportsReferenceTransaction } from '../core/git.js';
import { ui } from '../core/log.js';
import { hooksStatus } from '../hooks/install.js';

export function doctorCommand(): void {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  ui.title('Git Guardian doctor');
  ui.success(`Repository: ${repoRoot}`);
  ui.success(`Config: ${configPath(repoRoot)}`);

  const version = gitVersion();
  if (supportsReferenceTransaction(version)) ui.success(`Git ${version} supports branch transaction guarding.`);
  else ui.warn(`Git ${version} is older than 2.28; upgrade Git for branch creation blocking.`);

  if (config.secrets.enabled) ui.success('Secret scanning is on for commits.');
  else ui.warn('Secret scanning is off (secrets.enabled: false).');

  const dir = hooksDirectory(repoRoot);
  ui.info(`Hooks directory: ${dir}`);
  for (const hook of hooksStatus(repoRoot)) {
    if (hook.installed && hook.managed) {
      try {
        accessSync(`${dir}/${hook.name}`, constants.X_OK);
        ui.success(`${hook.name} hook installed and executable.`);
      } catch {
        ui.warn(`${hook.name} hook exists but is not executable.`);
      }
    } else if (hook.installed) {
      ui.warn(`${hook.name} exists but is not managed by Git Guardian.`);
    } else {
      ui.warn(`${hook.name} hook is not installed.`);
    }
  }
}
