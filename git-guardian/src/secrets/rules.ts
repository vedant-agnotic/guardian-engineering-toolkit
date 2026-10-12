/**
 * Secret detection rules. Patterns favour precision over recall: a scanner
 * that cries wolf gets bypassed with --no-verify. Each rule matches one line.
 */

export interface SecretRule {
  id: string;
  /** Shown to the user, e.g. "GitHub token". */
  name: string;
  pattern: RegExp;
  /** Capture group holding the secret value; 0 means the whole match. */
  group?: number;
  /** Extra check on the captured value, e.g. to skip placeholders. */
  accept?: (value: string) => boolean;
}

export const SECRET_RULES: SecretRule[] = [
  { id: 'private-key', name: 'Private key', pattern: /-----BEGIN ((RSA|DSA|EC|OPENSSH|PGP|ENCRYPTED) )?PRIVATE KEY( BLOCK)?-----/ },
  { id: 'aws-access-key', name: 'AWS access key ID', pattern: /\b((AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16})\b/, group: 1 },
  {
    id: 'aws-secret-key',
    name: 'AWS secret access key',
    pattern: /aws.{0,20}(secret|private).{0,20}[:=]\s*["']?([A-Za-z0-9/+]{40})(?![A-Za-z0-9/+])/i,
    group: 2,
  },
  { id: 'github-token', name: 'GitHub token', pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,})\b/, group: 1 },
  { id: 'github-fine-grained-token', name: 'GitHub token', pattern: /\b(github_pat_[A-Za-z0-9_]{60,})\b/, group: 1 },
  { id: 'gitlab-token', name: 'GitLab token', pattern: /\b(glpat-[A-Za-z0-9_-]{20,})\b/, group: 1 },
  { id: 'slack-token', name: 'Slack token', pattern: /\b(xox[abposr]-[A-Za-z0-9-]{10,})\b/, group: 1 },
  {
    id: 'slack-webhook',
    name: 'Slack webhook URL',
    pattern: /(https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9]+\/B[A-Za-z0-9]+\/[A-Za-z0-9]{16,})/,
    group: 1,
  },
  { id: 'stripe-key', name: 'Stripe secret key', pattern: /\b((sk|rk)_live_[A-Za-z0-9]{20,})\b/, group: 1 },
  { id: 'google-api-key', name: 'Google API key', pattern: /\b(AIza[0-9A-Za-z_-]{35})(?![0-9A-Za-z_-])/, group: 1 },
  { id: 'openai-key', name: 'OpenAI API key', pattern: /\b(sk-(proj|svcacct|admin)-[A-Za-z0-9_-]{20,})/, group: 1 },
  { id: 'anthropic-key', name: 'Anthropic API key', pattern: /\b(sk-ant-[A-Za-z0-9_-]{20,})/, group: 1 },
  { id: 'npm-token', name: 'npm token', pattern: /\b(npm_[A-Za-z0-9]{36})\b/, group: 1 },
  { id: 'sendgrid-key', name: 'SendGrid API key', pattern: /\b(SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43})\b/, group: 1 },
  { id: 'twilio-key', name: 'Twilio API key', pattern: /\b(SK[0-9a-fA-F]{32})\b/, group: 1 },
  {
    id: 'url-credentials',
    name: 'Password in a URL',
    pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@'"]+:([^\s@/'"]{3,})@[^\s'"]+/i,
    group: 1,
    accept: (value) => !isPlaceholder(value),
  },
  {
    id: 'assigned-secret',
    name: 'Hard-coded password or secret',
    pattern:
      /\b[\w.-]*(password|passwd|pwd|secret|api[_-]?key|access[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)["']?\s*[:=]\s*["']([^"'\s]{8,})["']/i,
    group: 2,
    accept: (value) => !isPlaceholder(value) && looksRandom(value),
  },
];

/** Staged file names that almost always hold credentials. */
const SECRET_FILES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /(^|\/)\.env(\.[^/]*)?$/, name: 'Environment file' },
  { pattern: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/, name: 'SSH private key file' },
  { pattern: /\.(pem|key|p12|pfx|jks|keystore)$/i, name: 'Key or certificate store' },
  { pattern: /(^|\/)\.(npmrc|pypirc|netrc)$/, name: 'Credentials file' },
  { pattern: /(^|\/)credentials(\.json)?$/i, name: 'Credentials file' },
];

/** Templates people commit on purpose. */
const SAFE_FILE = /(\.|_|-)(example|sample|template|dist|defaults?)$|\.pub$/i;

export function secretFileName(path: string): string | null {
  if (SAFE_FILE.test(path)) return null;
  // .npmrc/.pypirc are fine without tokens; their content rules still apply.
  if (/(^|\/)\.(npmrc|pypirc)$/.test(path)) return null;
  return SECRET_FILES.find((rule) => rule.pattern.test(path))?.name ?? null;
}

const PLACEHOLDER =
  /^(\$|%|<|\{|\[)|\$\{|\{\{|process\.env|os\.environ|getenv|example|sample|dummy|changeme|change_me|placeholder|your[_-]|xxx|\*\*\*|test|fake|redacted|secret$|password$/i;

export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER.test(value) || /^(.)\1+$/.test(value);
}

/** At least three character classes, or two with length 16+: real keys, not words. */
export function looksRandom(value: string): boolean {
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  return classes >= 3 || (classes >= 2 && value.length >= 16);
}

/** Shows enough to find the value, never the whole secret. */
export function mask(value: string): string {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}${'*'.repeat(Math.min(12, value.length - 4))}`;
}
