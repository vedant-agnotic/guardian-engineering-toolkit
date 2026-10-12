import { accessSync, constants, statSync } from 'node:fs';
import { delimiter, isAbsolute, join, resolve } from 'node:path';

/**
 * Finds the file an argv[0] would run, without running it. Names containing a
 * path separator resolve against cwd; bare names search PATH (and PATHEXT on Windows).
 */
export function resolveExecutable(executable: string, cwd: string, env = process.env): string | null {
  const windows = process.platform === 'win32';
  const extensions = windows ? ['', ...(env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)] : [''];
  const hasSeparator = executable.includes('/') || (windows && executable.includes('\\'));

  const candidates = hasSeparator || isAbsolute(executable)
    ? [resolve(cwd, executable)]
    : (env.PATH ?? '').split(delimiter).filter(Boolean).map((directory) => join(directory, executable));

  for (const candidate of candidates) {
    for (const extension of extensions) {
      const file = candidate + extension;
      try {
        if (!statSync(file).isFile()) continue;
        accessSync(file, windows ? constants.F_OK : constants.X_OK);
        return file;
      } catch {
        // Try the next candidate.
      }
    }
  }
  return null;
}
