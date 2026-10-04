import { loadConfig } from '../config/load.js';
import { getRepoRoot } from '../core/git.js';
import { ui } from '../core/log.js';
import { installHooks, uninstallHooks } from '../hooks/install.js';

export function installCommand(force = false): void {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const result = installHooks(repoRoot, config, force);
  ui.success(`Installed hooks: ${result.installed.join(', ') || 'none'}`);
  ui.info(`Hooks directory: ${result.hooksDir}`);
}

export function uninstallCommand(): void {
  const repoRoot = getRepoRoot();
  const restored = uninstallHooks(repoRoot);
  ui.success('Removed Git Guardian hooks.');
  if (restored.length) ui.info(`Restored previous hooks: ${restored.join(', ')}`);
}
