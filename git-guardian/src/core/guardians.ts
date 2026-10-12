import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { out, ui } from './log.js';

/**
 * Optional hand-off to CI Guardian, a separate package. Only its CLI is
 * called; no code is shared, so each tool still works on its own.
 */
const CI_GUARDIAN = {
  label: 'CI Guardian',
  bin: 'ci-guardian',
  /** An npm install spec (name@version or .tgz path), e.g. for testing before publication. */
  envVar: 'CI_GUARDIAN_PACKAGE',
  /** Registry name once published; null until then so nothing unrelated is installed by name. */
  publishedName: null as string | null,
};

export const CI_CONFIG_FILE = '.ciguardian.yml';

/** Installs CI Guardian if needed and runs its setup with Git Guardian checks already chosen. */
export async function setUpCiGuardian(repoRoot: string): Promise<void> {
  console.log('');
  ui.title('Setting up CI Guardian');

  const ciConfig = join(repoRoot, CI_CONFIG_FILE);
  if (existsSync(ciConfig)) {
    if (/^gitGuardian:\s*\n\s+enabled:\s*true\b/m.test(readFileSync(ciConfig, 'utf8'))) {
      ui.success(`CI Guardian is already set up with Git Guardian checks (${CI_CONFIG_FILE}).`);
    } else {
      ui.warn(`CI Guardian is already set up. To add Git Guardian checks, add this to ${CI_CONFIG_FILE}:`);
      console.log(out.green('  gitGuardian:\n    enabled: true'));
      ui.info('Then delete .github/workflows/guardian-ci.yml and run "npx ci-guardian generate --write".');
    }
    return;
  }

  const bin = await ensureInstalled(repoRoot);
  if (!bin) {
    ui.warn('CI Guardian was not set up. Install it later and run "npx ci-guardian init".');
    return;
  }
  console.log('');
  const result = spawnSync(bin, ['init', '--with-git-guardian'], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) ui.warn('CI Guardian setup did not finish. Run "npx ci-guardian init" to try again.');
}

function localBin(repoRoot: string): string | null {
  const path = join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? `${CI_GUARDIAN.bin}.cmd` : CI_GUARDIAN.bin);
  return existsSync(path) ? path : null;
}

async function ensureInstalled(repoRoot: string): Promise<string | null> {
  const existing = localBin(repoRoot);
  if (existing) return existing;
  if (!existsSync(join(repoRoot, 'package.json'))) {
    ui.error('CI Guardian is installed with npm, but this repository has no package.json. Run "npm init -y" first.');
    return null;
  }

  let spec = process.env[CI_GUARDIAN.envVar] ?? CI_GUARDIAN.publishedName ?? '';
  if (!spec) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      spec = (await rl.question(`${out.bold(out.cyan('CI Guardian is not installed. Path to its .tgz file (or an npm package name)'))}\n${out.cyan('>')} `)).trim();
    } finally {
      rl.close();
    }
    if (!spec) return null;
  }

  if (/\.tgz$/i.test(spec)) {
    const source = resolve(process.cwd(), spec.replace(/^file:/, ''));
    if (!existsSync(source)) {
      ui.error(`File not found: ${source}`);
      return null;
    }
    const inside = relative(repoRoot, source);
    let target = source;
    if (inside.startsWith('..') || isAbsolute(inside)) {
      // Inside the repository, the path in package.json also works on CI runners.
      mkdirSync(join(repoRoot, 'tools'), { recursive: true });
      target = join(repoRoot, 'tools', basename(source));
      copyFileSync(source, target);
      ui.info(`Copied ${basename(source)} to tools/ (commit it so CI can install it).`);
    }
    spec = `file:${relative(repoRoot, target).split('\\').join('/')}`;
  }

  ui.info(`Installing CI Guardian: npm install --save-dev ${spec}`);
  const result = spawnSync('npm', ['install', '--save-dev', spec], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    ui.error('Could not install CI Guardian.');
    return null;
  }
  return localBin(repoRoot);
}
