import { spawnSync } from 'node:child_process';

export interface RunOptions {
  cwd?: string;
  input?: string;
  env?: Record<string, string | undefined>;
  stdio?: 'inherit' | 'pipe';
}

export interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

export function run(command: string, args: string[] = [], options: RunOptions = {}): RunResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.stdio === 'inherit' ? 'inherit' : 'pipe',
  });

  if (result.error) throw result.error;

  return {
    status: result.status ?? 1,
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
  };
}

export function runChecked(command: string, args: string[] = [], options: RunOptions = {}): string {
  const result = run(command, args, options);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `${command} exited with ${result.status}`);
  }
  return result.stdout.trim();
}
