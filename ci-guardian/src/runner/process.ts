import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

export const KILL_GRACE_MS = 3000;

export type ProcessOutcome =
  | { kind: 'exited'; exitCode: number | null; signal: string | null }
  | { kind: 'spawn-error'; code: string | undefined; message: string };

export interface RunningProcess {
  readonly done: Promise<ProcessOutcome>;
  /** Terminates the whole process tree: SIGTERM, then SIGKILL after a grace period. */
  terminate(): void;
}

/**
 * Starts one child with shell: false. On POSIX the child leads its own process
 * group so the entire tree can be signalled. Stdin is closed so an interactive
 * command fails instead of hanging; stdout/stderr stream straight to the
 * terminal, so no output is buffered in memory.
 */
export function startProcess(executable: string, args: readonly string[], cwd: string): RunningProcess {
  const posix = process.platform !== 'win32';
  let child: ChildProcess;
  let exited = false;
  let killTimer: NodeJS.Timeout | undefined;

  const done = new Promise<ProcessOutcome>((resolvePromise) => {
    child = spawn(executable, [...args], {
      cwd,
      shell: false,
      detached: posix,
      stdio: ['ignore', 'inherit', 'inherit'],
      windowsHide: true,
    });
    child.once('error', (error: NodeJS.ErrnoException) => {
      exited = true;
      resolvePromise({ kind: 'spawn-error', code: error.code, message: error.message });
    });
    child.once('exit', (exitCode, signal) => {
      exited = true;
      resolvePromise({ kind: 'exited', exitCode, signal });
    });
  }).finally(() => {
    if (killTimer) clearTimeout(killTimer);
  });

  const signalTree = (signal: NodeJS.Signals): void => {
    const pid = child.pid;
    if (pid === undefined) return;
    try {
      if (posix) process.kill(-pid, signal);
      else spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } catch {
      // The group is already gone.
    }
  };

  return {
    done,
    terminate(): void {
      if (exited || killTimer) return;
      signalTree('SIGTERM');
      killTimer = setTimeout(() => signalTree('SIGKILL'), KILL_GRACE_MS);
      killTimer.unref();
    },
  };
}
