# State

_Last updated: 2026-11-21 (P0, waiting on pstack source + one human approval)_

## Where we are
- Phase: **P0 foundation**, nearly done.
- Verified on Mac (Node 24, pnpm 12.21): `pnpm check`, `pnpm build`, `pnpm test:e2e` all pass.
- Repo: public `doppelgengar9837/superboard-lite` (HTTPS remote); `ironlu` is a collaborator with write access.
- CI on GitHub: `check (lint, typecheck, unit, build)`, `e2e (playwright)`, `conventional-title` all pass.
- Ruleset `main-protection` (active, no bypass): PR required, squash only, linear history, 3 required checks, code-owner review, no deletion or force-push.
- Observed: direct push to main is rejected. Tier 0 PR (#1) auto-merged on checks alone, no review. Tier 2 PR (#2, touches `.github/`) stays BLOCKED after checks pass until the code owner approves.
- Husky: not installed locally (`husky` writes `core.hooksPath`, which the shared rules forbid). commit-msg rule verified by pointing `-c core.hooksPath` at a wrapper that runs `.husky/commit-msg`; a bad message is rejected.

## Next
1. Human: approve PR #2 as ironlu to finish the Tier 2 rehearsal (agent approval was refused on purpose).
2. Confirm the pstack source, review its hooks and setup script, install into `.claude/skills/`, run `setup-pstack`.
3. Report P0 gate.

## Open questions
- Which pstack repo is the intended source (upstream, `michael-denyer/pstack-claude`, or another)?
- Husky vs the no-git-config rule: add `.pnpm-store` to `.gitignore`, and decide how contributors enable hooks.
- Does Vercel preview protection block the verifier? (P4)
