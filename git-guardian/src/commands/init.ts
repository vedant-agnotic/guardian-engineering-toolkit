import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { configExists, writeConfig } from '../config/load.js';
import { createDefaultConfig } from '../config/defaults.js';
import { getRepoRoot, gitVersion, supportsReferenceTransaction } from '../core/git.js';
import { ui } from '../core/log.js';
import { installHooks } from '../hooks/install.js';

export interface InitOptions {
  force?: boolean;
  yes?: boolean;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const repoRoot = getRepoRoot();
  if (configExists(repoRoot) && !options.force) {
    throw new Error('.git-guardian.yml already exists. Use --force to replace it.');
  }

  const config = createDefaultConfig();
  let install = true;

  if (!options.yes && process.stdin.isTTY) {
    const rl = createInterface({ input, output });
    try {
      const branchPattern = await rl.question(`Branch regex\n[${config.branch.pattern}]\n> `);
      if (branchPattern.trim()) config.branch.pattern = branchPattern.trim();

      const commitPattern = await rl.question(`\nCommit regex\n[${config.commit.pattern}]\n> `);
      if (commitPattern.trim()) config.commit.pattern = commitPattern.trim();

      const hookAnswer = await rl.question('\nInstall Git hooks now? [Y/n] ');
      install = !/^n(o)?$/i.test(hookAnswer.trim());
    } finally {
      rl.close();
    }
  }

  const path = writeConfig(repoRoot, config);
  ui.success(`Created ${path}`);

  const version = gitVersion();
  if (!supportsReferenceTransaction(version)) {
    ui.warn(`Git ${version} is older than 2.28; native branch-creation blocking may not work.`);
  }

  if (install) {
    const result = installHooks(repoRoot, config, options.force ?? false);
    ui.success(`Installed hooks: ${result.installed.join(', ') || 'none'}`);
    ui.info(`Hooks directory: ${result.hooksDir}`);
  } else {
    ui.info('Hooks not installed. Run git-guardian install when ready.');
  }

  console.log('\nTry:');
  console.log('  git switch -c feature/ABC-123-add-login');
  console.log('  git commit -m "feat(auth): add login"');
}
