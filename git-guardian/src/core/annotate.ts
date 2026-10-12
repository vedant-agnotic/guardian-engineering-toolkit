/**
 * GitHub Actions workflow commands, so failures show up as annotations on the
 * pull request. Printed only when running inside GitHub Actions.
 */
export function annotate(level: 'error' | 'warning', title: string, message: string): void {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  const escapeData = (value: string): string => value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const escapeProperty = (value: string): string => escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
  console.log(`::${level} title=${escapeProperty(title)}::${escapeData(message)}`);
}

/** Removes ANSI colour codes, for annotation text. */
export function plain(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}
