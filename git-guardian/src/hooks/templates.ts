export const MANAGED_MARKER = '# git-guardian-managed-hook v1';

export function commitMsgHookScript(): string {
  return `#!/bin/sh
${MANAGED_MARKER}
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ORIGINAL="$0.git-guardian-original"

if [ -x "$ORIGINAL" ]; then
  "$ORIGINAL" "$@" || exit $?
fi

run_guardian() {
  if [ -n "\${GIT_GUARDIAN_BIN:-}" ]; then
    node "$GIT_GUARDIAN_BIN" "$@"
    return $?
  fi
  if [ -x "$ROOT/node_modules/.bin/git-guardian" ]; then
    "$ROOT/node_modules/.bin/git-guardian" "$@"
    return $?
  fi
  if command -v git-guardian >/dev/null 2>&1; then
    git-guardian "$@"
    return $?
  fi
  echo "git-guardian: executable not found. Run npm install or reinstall hooks." >&2
  return 1
}

run_guardian hook commit-msg "$1"
`;
}

export function referenceTransactionHookScript(): string {
  return `#!/bin/sh
${MANAGED_MARKER}
set -u
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ORIGINAL="$0.git-guardian-original"
TMP="$(mktemp "\${TMPDIR:-/tmp}/git-guardian.XXXXXX")" || exit 1
trap 'rm -f "$TMP"' EXIT HUP INT TERM
cat > "$TMP"

if [ -x "$ORIGINAL" ]; then
  "$ORIGINAL" "$@" < "$TMP" || exit $?
fi

run_guardian() {
  if [ -n "\${GIT_GUARDIAN_BIN:-}" ]; then
    node "$GIT_GUARDIAN_BIN" "$@" < "$TMP"
    return $?
  fi
  if [ -x "$ROOT/node_modules/.bin/git-guardian" ]; then
    "$ROOT/node_modules/.bin/git-guardian" "$@" < "$TMP"
    return $?
  fi
  if command -v git-guardian >/dev/null 2>&1; then
    git-guardian "$@" < "$TMP"
    return $?
  fi
  echo "git-guardian: executable not found. Run npm install or reinstall hooks." >&2
  return 1
}

run_guardian hook reference-transaction "$1"
`;
}
