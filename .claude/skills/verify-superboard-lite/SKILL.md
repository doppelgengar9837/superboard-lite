---
name: verify-superboard-lite
description: "Drive SuperBoard Lite (a Vite + React web app) the way a user does: launch the built preview, check it is healthy, run the verify journeys or drive it in a browser, capture evidence, clean up. Use to see a change working locally, to reproduce a failing `verify` check, or before adding a journey."
---

# Verify SuperBoard Lite

The surface is a web UI served from the built app (`pnpm build`, then Vite preview on port 4173). There is no backend: data will live in the browser (ADR 0003) and widget sources are built-in fixtures, so no real websites are involved.

**Who decides.** This skill produces evidence. It never produces the verdict. The verdict is the CI job `verify` on the PR head SHA (`docs/ai/adr/0004-verifier.md`). An agent that wrote a change must not call it verified because a local run passed.

**Two ways to drive, one recipe.** `pnpm verify` is the canonical harness and is exactly what CI runs. Ad-hoc driving in a browser (Playwright MCP) is for exploring and for writing a new journey. Feature recipes are in [features/README.md](features/README.md); read it and the matching feature file before driving.

## Launch

Run from the repo root. Use a scratch dir for the pid file and log; never kill by process name.

```bash
RUN_DIR="$(mktemp -d)"
pnpm install --frozen-lockfile
pnpm exec playwright install chromium   # once per machine; needs network
pnpm build                              # rebuild after every code change: preview serves dist/
node_modules/.bin/vite preview --port 4173 --strictPort > "$RUN_DIR/preview.log" 2>&1 &
echo $! > "$RUN_DIR/preview.pid"
```

Ready means the app answers with its content, not only that the port is open:

```bash
curl -fsS --max-time 3 http://localhost:4173/ | grep -q "SuperBoard"
```

It starts from empty state: nothing to migrate or seed yet. `--strictPort` makes a second launch fail loudly instead of picking another port.

**Teardown.** Kill only the pid you started, then remove the scratch dir. Evidence is in `verify-report/` and `test-results/` and survives cleanup.

```bash
kill "$(cat "$RUN_DIR/preview.pid")" && rm -rf "$RUN_DIR"
```

## Doctor

Read-only. Run it first, and again after any failed drive.

```bash
.claude/skills/verify-superboard-lite/scripts/doctor.sh                       # before launch
.claude/skills/verify-superboard-lite/scripts/doctor.sh "$RUN_DIR/preview.pid" # after launch
```

It checks Node >= 22, pnpm, installed dependencies, the commit and whether the tree is clean, and what is on port 4173. With a pid file it also requires that exact process to be alive and the app to answer. Exit code 0 means worth driving; anything else prints the failing line. Without a pid file it refuses to call an occupied port "ours".

## Drive

**Canonical harness** (what CI runs):

```bash
pnpm verify
```

It runs the journeys in `verify/journeys/` in the `verify` Playwright project. Locally it reuses a preview already on port 4173, so rebuild first if you launched your own; with none running it builds and starts one itself. It sets `VERIFY_HEAD_SHA` from `git rev-parse HEAD` when unset.

**Ad hoc**, to explore or to prototype a journey: open `http://localhost:4173/` in the Playwright MCP browser, read the ARIA snapshot first, and prefer roles and accessible names (`getByRole('heading', { name: 'SuperBoard Lite' })`) over CSS selectors or position. Each feature file lists the exact handles.

New or changed journeys live in `verify/journeys/` and need ironlu's approval (Tier 2).

## Evidence

- `verify-report/verify-report.json`: `result` (`PASS` or `FAIL`), `headSha`, per-journey status and, on failure, the reason. Check `headSha` equals the commit you meant to verify.
- `test-results/<journey>-verify/`: a screenshot of every journey, and a trace for failures.
- Ad-hoc proof goes to `verify-report/manual/<feature-id>/` (an ARIA snapshot and a screenshot with the app name visible). Do not put it in `test-results/`: Playwright empties that folder at the start of each run.

Proof standards: exercise the real user path (open the page, read what a user reads), not internal setters or test-only endpoints; capture the action and the resulting state, not only the last screen; no mocks, only built-in fixtures; time must come from the injected `Clock` once a feature shows time.

## Cleanup

Run the teardown above after every drive, including failed ones, so a broken attempt does not leave a preview holding port 4173. Cleanup never deletes `verify-report/` or `test-results/`.

## Isolation

The port is fixed at 4173, so only one instance can run at a time; a second launch fails with `--strictPort`. Never drive an instance this run did not start. Playwright gives each test a fresh browser context, so browser storage does not leak between runs.

## Keeping this honest

When the app changes, update the feature map in the same PR (Tier 2). Audit it with `/pstack:maintain-verification-skill`.
