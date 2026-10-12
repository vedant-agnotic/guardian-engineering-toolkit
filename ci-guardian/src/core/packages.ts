import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { ui } from './log.js';

export interface GuardianPackage {
  label: string;
  bin: string;
  /** Environment variable that may hold an install spec: npm name@version or a .tgz path. */
  envVar: string;
  /** Registry name once published; null until then, so nothing unrelated is installed by name. */
  publishedName: string | null;
}

export const GIT_GUARDIAN: GuardianPackage = {
  label: 'Git Guardian',
  bin: 'git-guardian',
  envVar: 'GIT_GUARDIAN_PACKAGE',
  publishedName: null,
};

/** The project-local executable, if installed. */
export function localBin(repoRoot: string, bin: string): string | null {
  const path = join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? `${bin}.cmd` : bin);
  return existsSync(path) ? path : null;
}

/**
 * Installs a Guardian package as a devDependency if it is missing. A tarball
 * outside the repository is copied into tools/ first, so the path recorded in
 * package.json also works on CI runners (commit the tarball).
 */
export async function ensureInstalled(
  repoRoot: string,
  pkg: GuardianPackage,
  ask: (question: string) => Promise<string>,
): Promise<string | null> {
  const existing = localBin(repoRoot, pkg.bin);
  if (existing) return existing;
  if (!existsSync(join(repoRoot, 'package.json'))) {
    ui.error(`${pkg.label} is installed with npm, but this repository has no package.json. Run "npm init -y" first.`);
    return null;
  }

  let spec = process.env[pkg.envVar] ?? pkg.publishedName ?? '';
  if (!spec) {
    spec = (await ask(`${pkg.label} is not installed. Path to its .tgz file (or an npm package name)`)).trim();
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
      mkdirSync(join(repoRoot, 'tools'), { recursive: true });
      target = join(repoRoot, 'tools', basename(source));
      copyFileSync(source, target);
      ui.info(`Copied ${basename(source)} to tools/ (commit it so CI can install it).`);
    }
    spec = `file:${relative(repoRoot, target).split('\\').join('/')}`;
  }

  ui.info(`Installing ${pkg.label}: npm install --save-dev ${spec}`);
  const result = spawnSync('npm', ['install', '--save-dev', spec], { cwd: repoRoot, stdio: 'inherit' });
  if (result.status !== 0) {
    ui.error(`Could not install ${pkg.label}.`);
    return null;
  }
  return localBin(repoRoot, pkg.bin);
}
