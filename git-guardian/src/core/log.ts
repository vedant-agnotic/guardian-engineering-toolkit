/**
 * Terminal output. Colour is decided per stream, so errors on a terminal are
 * coloured even when stdout is piped. NO_COLOR (any non-empty value) disables
 * colour, FORCE_COLOR (other than "0") enables it, TERM=dumb disables it.
 */

interface Stream {
  isTTY?: boolean;
}

export function colorEnabled(stream: Stream, env: Record<string, string | undefined> = process.env): boolean {
  if (env.NO_COLOR) return false;
  if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== '0';
  if (env.TERM === 'dumb') return false;
  return Boolean(stream.isTTY);
}

export interface Palette {
  bold(text: string): string;
  dim(text: string): string;
  red(text: string): string;
  green(text: string): string;
  yellow(text: string): string;
  cyan(text: string): string;
  /** Highlights <placeholders> in text, e.g. "feat/<number>-x". */
  placeholders(text: string): string;
}

export function createPalette(enabled: boolean): Palette {
  const wrap = (open: string, close: string) => (text: string) => (enabled ? `\u001b[${open}m${text}\u001b[${close}m` : text);
  const yellow = wrap('33', '39');
  return {
    bold: wrap('1', '22'),
    dim: wrap('2', '22'),
    red: wrap('31', '39'),
    green: wrap('32', '39'),
    yellow,
    cyan: wrap('36', '39'),
    placeholders: (text) => text.replace(/<[a-z]+>/g, (match) => yellow(match)),
  };
}

/** Colours for stdout (normal output) and stderr (errors, warnings, hook messages). */
export const out = createPalette(colorEnabled(process.stdout));
export const err = createPalette(colorEnabled(process.stderr));

/** Colours only the first line, so detail lines keep their own colours. */
function firstLine(text: string, paint: (value: string) => string): string {
  const index = text.indexOf('\n');
  return index === -1 ? paint(text) : paint(text.slice(0, index)) + text.slice(index);
}

export const ui = {
  title(text: string): void {
    console.log(out.bold(out.cyan(text)));
  },
  success(text: string): void {
    console.log(`${out.green(out.bold('✓'))} ${firstLine(text, out.green)}`);
  },
  warn(text: string): void {
    console.warn(`${err.yellow(err.bold('!'))} ${firstLine(text, err.yellow)}`);
  },
  error(text: string): void {
    console.error(`${err.red(err.bold('✗'))} ${firstLine(text, (line) => err.red(err.bold(line)))}`);
  },
  info(text: string): void {
    console.log(`${out.cyan('→')} ${text}`);
  },
  dim(text: string): string {
    return out.dim(text);
  },
};
