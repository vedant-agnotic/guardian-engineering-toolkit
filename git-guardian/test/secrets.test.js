import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createDefaultConfig } from '../dist/config/defaults.js';
import { writeConfig } from '../dist/config/load.js';
import { installHooks } from '../dist/hooks/install.js';
import { compileGlobs, parseAddedLines, scanLines, scanMessage } from '../dist/secrets/scan.js';
import { mask, secretFileName } from '../dist/secrets/rules.js';

// Built at runtime so this file never contains a literal that looks like a real secret.
const j = (...parts) => parts.join('');
const FAKE = {
  github: j('gh', 'p_', 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'),
  aws: j('AK', 'IA', 'Q3EXAMPLEQ3EXAMP'),
  stripe: j('sk', '_live_', '4eC39HqLyjWDarjtT1zdp7dc'),
  slack: j('xo', 'xb-', '123456789012-abcdefghijkl'),
  google: j('AI', 'za', 'SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q'),
  anthropic: j('sk', '-ant-', 'api03-A1b2C3d4E5f6G7h8I9j0K1l2'),
  key: j('-----BEGIN ', 'RSA PRIVATE KEY-----'),
};

const line = (text, path = 'src/app.js') => ({ path, line: 1, text });
const rules = (text) => scanLines([line(text)]).map((f) => f.rule);

test('detects common credentials', () => {
  assert.deepEqual(rules(`const token = "${FAKE.github}";`), ['GitHub token']);
  assert.deepEqual(rules(`aws_access_key_id = ${FAKE.aws}`), ['AWS access key ID']);
  assert.deepEqual(rules(`STRIPE=${FAKE.stripe}`), ['Stripe secret key']);
  assert.deepEqual(rules(`slack: ${FAKE.slack}`), ['Slack token']);
  assert.deepEqual(rules(`key=${FAKE.google}`), ['Google API key']);
  assert.deepEqual(rules(`ANTHROPIC_API_KEY=${FAKE.anthropic}`), ['Anthropic API key']);
  assert.deepEqual(rules(FAKE.key), ['Private key']);
  assert.deepEqual(rules('DATABASE_URL=postgres://admin:S3cr3t-Pa55@db.internal:5432/app'), ['Password in a URL']);
  assert.deepEqual(rules(`const password = "Tr0ub4dor&3xyz";`), ['Hard-coded password or secret']);
  assert.deepEqual(rules(`"client_secret": "a8f5f167f44f4964e6c998dee827110c"`), ['Hard-coded password or secret']);
});

test('ignores placeholders, env lookups and ordinary code', () => {
  for (const text of [
    'const password = process.env.DB_PASSWORD;',
    'password: "${DB_PASSWORD}"',
    'api_key = "your-api-key-here"',
    'password = "changeme123"',
    'secret: "<secret>"',
    'const passwordLabel = "Enter your password";',
    'postgres://user:password@localhost/db',
    'postgres://${USER}:${PASS}@host/db',
    'https://example.com/path:with:colons',
    'const token = getToken();',
  ]) {
    assert.deepEqual(rules(text), [], text);
  }
});

test('the allow marker skips a line', () => {
  assert.deepEqual(rules(`const t = "${FAKE.github}"; // git-guardian:allow-secret`), []);
});

test('masks values in findings', () => {
  const [finding] = scanLines([line(`t=${FAKE.github}`)]);
  assert.equal(finding.preview, mask(FAKE.github));
  assert.ok(!finding.preview.includes(FAKE.github.slice(8)));
  assert.equal(mask('short'), '****');
});

test('flags credential files but not templates', () => {
  for (const path of ['.env', 'app/.env.production', 'id_rsa', 'certs/server.pem', 'release.keystore', 'secrets/credentials.json']) {
    assert.ok(secretFileName(path), path);
  }
  for (const path of ['.env.example', '.env.sample', 'config/.env.template', 'id_rsa.pub', '.npmrc', 'src/environment.ts']) {
    assert.equal(secretFileName(path), null, path);
  }
});

test('scans commit messages', () => {
  assert.equal(scanMessage(`feat: add key ${FAKE.stripe}`).length, 1);
  assert.equal(scanMessage(`feat: rotate keys\n# ${FAKE.stripe}`).length, 0, 'Git comment lines are ignored');
});

test('parses added lines with line numbers, ignoring content that looks like headers', () => {
  const diff = [
    'diff --git a/a.js b/a.js',
    'index 1..2 100644',
    '--- a/a.js',
    '+++ b/a.js',
    '@@ -3,0 +4,2 @@',
    '+first',
    '+++i;',
    'diff --git a/new file.txt b/new file.txt',
    'new file mode 100644',
    '--- /dev/null',
    '+++ b/new file.txt',
    '@@ -0,0 +1 @@',
    '+hello',
  ].join('\n');
  const files = parseAddedLines(diff);
  assert.deepEqual(files.get('a.js'), [
    { path: 'a.js', line: 4, text: 'first' },
    { path: 'a.js', line: 5, text: '++i;' },
  ]);
  assert.deepEqual(files.get('new file.txt'), [{ path: 'new file.txt', line: 1, text: 'hello' }]);
});

test('allow globs', () => {
  const [fixtures, anyPem, exact] = compileGlobs(['test/fixtures/**', '**/*.pem', 'docs/example.env']);
  assert.ok(fixtures.test('test/fixtures/a.js') && fixtures.test('test/fixtures/deep/b.js'));
  assert.ok(!fixtures.test('src/test/fixtures/a.js'));
  assert.ok(anyPem.test('a.pem') && anyPem.test('x/y/a.pem'));
  assert.ok(exact.test('docs/example.env') && !exact.test('docs/exampleXenv'));
});

// --- real commits through the hook -------------------------------------------------

function git(cwd, args, env) {
  return spawnSync('git', args, { cwd, env, encoding: 'utf8' });
}

function repoWithHooks(mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'git-guardian-secrets-'));
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'guardian@example.com']);
  git(root, ['config', 'user.name', 'Guardian Test']);
  const config = createDefaultConfig();
  mutate(config);
  writeConfig(root, config);
  installHooks(root, config);
  const env = { ...process.env, GIT_GUARDIAN_BIN: join(process.cwd(), 'dist', 'cli.js'), NO_COLOR: '1' };
  git(root, ['add', '.'], env);
  assert.equal(git(root, ['commit', '-qm', 'chore: add config'], env).status, 0);
  return { root, env };
}

function commitFile(ctx, path, content, message = 'feat: add file') {
  const full = join(ctx.root, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
  git(ctx.root, ['add', '--', path], ctx.env);
  return git(ctx.root, ['commit', '-m', message], ctx.env);
}

test('commit hook blocks a staged secret and prints it masked', () => {
  const ctx = repoWithHooks();
  const result = commitFile(ctx, 'src/config.js', `export const token = "${FAKE.github}";\n`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /possible secrets found/);
  assert.match(result.stderr, /src\/config\.js:1 {2}GitHub token/);
  assert.ok(!result.stderr.includes(FAKE.github), 'full secret must not be printed');
  assert.equal(git(ctx.root, ['rev-list', '--count', 'HEAD'], ctx.env).stdout.trim(), '1');
});

test('commit hook blocks .env files, a secret in the message, and `commit -a`', () => {
  const ctx = repoWithHooks();
  assert.notEqual(commitFile(ctx, '.env', 'DEBUG=true\n').status, 0);
  git(ctx.root, ['reset', '-q'], ctx.env);
  assert.equal(commitFile(ctx, '.env.example', 'API_KEY=\n').status, 0);
  assert.notEqual(commitFile(ctx, 'notes.txt', 'hi\n', `feat: key ${FAKE.stripe}`).status, 0);
  assert.equal(commitFile(ctx, 'notes.txt', 'hi\n').status, 0);
  writeFileSync(join(ctx.root, 'notes.txt'), `hi\n${FAKE.aws}\n`);
  assert.notEqual(git(ctx.root, ['commit', '-am', 'feat: update notes'], ctx.env).status, 0);
});

test('allow marker, allow paths and disabling the scan let commits through', () => {
  const ctx = repoWithHooks((config) => {
    config.secrets.allow = 'test/fixtures/**';
  });
  assert.equal(commitFile(ctx, 'a.js', `const t = "${FAKE.github}"; // git-guardian:allow-secret\n`).status, 0);
  assert.equal(commitFile(ctx, 'test/fixtures/keys.txt', `${FAKE.key}\n`).status, 0);

  const off = repoWithHooks((config) => {
    config.secrets.enabled = false;
  });
  assert.equal(commitFile(off, 'b.js', `const t = "${FAKE.github}";\n`).status, 0);
});

test('commit message format is still checked after a clean scan', () => {
  const ctx = repoWithHooks();
  const result = commitFile(ctx, 'c.txt', 'fine\n', 'bad message');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /doesn't follow the format/);
});

test('the scan command reports staged secrets with exit 1', () => {
  const ctx = repoWithHooks();
  writeFileSync(join(ctx.root, 'k.txt'), `${FAKE.slack}\n`);
  git(ctx.root, ['add', 'k.txt'], ctx.env);
  const cli = join(process.cwd(), 'dist', 'cli.js');
  const result = spawnSync(process.execPath, [cli, 'scan'], { cwd: ctx.root, env: ctx.env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /k\.txt:1 {2}Slack token/);
});
