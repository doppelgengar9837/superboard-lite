#!/usr/bin/env bash
# Read-only health check for driving SuperBoard Lite. Changes nothing.
# Usage: doctor.sh [pid-file]   (pid-file = the preview instance this run started)
# Exit 0 = worth driving. Non-zero = at least one FAIL line printed.
set -u

URL="http://localhost:4173/"
PID_FILE="${1:-}"
fail=0

ok() { printf 'ok    %s\n' "$1"; }
bad() { printf 'FAIL  %s\n' "$1"; fail=1; }
info() { printf 'info  %s\n' "$1"; }

# Node >= 22 (package.json engines)
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$major" -ge 22 ]; then ok "node $(node -v)"; else bad "node $(node -v), need >= 22"; fi
else
  bad "node not found"
fi

if command -v pnpm >/dev/null 2>&1; then ok "pnpm $(pnpm -v)"; else bad "pnpm not found"; fi

if [ -x node_modules/.bin/vite ] && [ -x node_modules/.bin/playwright ]; then
  ok "dependencies installed"
else
  bad "dependencies missing: run pnpm install --frozen-lockfile"
fi

if [ -f dist/index.html ]; then ok "dist/ exists (preview serves it; rebuild after code changes)"; else info "no dist/ yet: run pnpm build before launching"; fi

if git rev-parse HEAD >/dev/null 2>&1; then
  info "commit $(git rev-parse HEAD)"
  if [ -z "$(git status --porcelain)" ]; then ok "working tree clean"; else info "working tree has uncommitted changes: evidence will not match HEAD"; fi
else
  bad "not inside a git repository"
fi

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$URL" || true)"
if [ -n "$PID_FILE" ]; then
  if [ ! -f "$PID_FILE" ]; then
    bad "pid file $PID_FILE not found"
  else
    pid="$(cat "$PID_FILE")"
    if kill -0 "$pid" 2>/dev/null; then ok "our preview process $pid is alive"; else bad "our preview process $pid is not running"; fi
    if curl -fsS --max-time 3 "$URL" 2>/dev/null | grep -q "SuperBoard"; then ok "app answers at $URL"; else bad "app does not answer at $URL"; fi
  fi
else
  if [ "$code" = "000" ] || [ -z "$code" ]; then
    ok "port 4173 is free"
  else
    bad "port 4173 is already serving (HTTP $code) and this run did not start it: do not drive it"
  fi
fi

exit "$fail"
