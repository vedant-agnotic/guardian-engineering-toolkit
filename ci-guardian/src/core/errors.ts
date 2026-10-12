export const EXIT = {
  ok: 0,
  checkFailed: 1,
  usage: 2,
  interrupted: 130,
} as const;

/** Invalid invocation, configuration, missing runtime or report-write error (exit 2). */
export class GuardianError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number = EXIT.usage) {
    super(message);
    this.name = 'GuardianError';
    this.exitCode = exitCode;
  }
}
