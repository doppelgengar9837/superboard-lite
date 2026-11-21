# State

_Last updated: 2026-11-21 (P0, in progress)_

## Where we are
- Phase: **P0 foundation**.
- Done: Vite + React + TS (strict) skeleton; ESLint with clock-injection rules; Vitest; Playwright config + smoke test (not yet run, see below); commitlint + husky; CI + PR-title workflows; AGENTS.md/CLAUDE.md; CODEOWNERS; Clock module with tests.
- Verified locally (Linux VM): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
- Not yet verified: Playwright e2e (browser could not be downloaded in the authoring VM), CI on GitHub, husky hook on a real commit.

## Next
1. Create the public repo under doppelgengar9837, invite ironlu, push, configure ruleset.
2. Run CI; fix anything that only fails on GitHub.
3. Rehearse the two-account PR flow with a harmless PR.
4. Install pstack, run `setup-pstack`, record which skills work in Claude Code.

## Open questions
- Can a free-plan public repo enforce rulesets, required checks and auto-merge as planned?
- Does Vercel preview protection block the verifier? (P4)
