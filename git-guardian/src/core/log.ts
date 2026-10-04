const useColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;

function color(code: number, text: string): string {
  return useColor ? `\u001b[${code}m${text}\u001b[0m` : text;
}

export const ui = {
  title(text: string): void {
    console.log(color(1, text));
  },
  success(text: string): void {
    console.log(`${color(32, '✓')} ${text}`);
  },
  warn(text: string): void {
    console.warn(`${color(33, '!')} ${text}`);
  },
  error(text: string): void {
    console.error(`${color(31, '✗')} ${text}`);
  },
  info(text: string): void {
    console.log(`${color(36, '→')} ${text}`);
  },
  dim(text: string): string {
    return color(2, text);
  },
};
