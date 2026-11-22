# State

_Last updated: 2026-11-22 (P1 closed 2026-11-21; governance hardening in three PRs awaiting ironlu; P2, credentials and the agent verifier still next)_

## Where we are
- Phase: **P0 foundation** and **P1 verifier** are closed (2026-11-21). P2 (first product feature) has not started.
- Verified on Mac (Node 24, pnpm 12.21): `pnpm check`, `pnpm build`, `pnpm test:e2e` all pass.
- Repo: public `doppelgengar9837/superboard-lite` (HTTPS remote); `ironlu` is a collaborator with write access.
- CI on GitHub: `check (lint, typecheck, unit, build)`, `e2e (playwright)`, `conventional-title` all pass.
- Ruleset `main-protection` (active, no bypass): PR required, squash only, linear history, 4 required checks (`verify` added 2026-11-21), **strict (branch must be up to date with main)**, code-owner review, no deletion or force-push. Strict was turned on 2026-11-21; its effect on two PRs open at once is not yet observed.
- Verify gate rehearsed 2026-11-21: regression PR red and refused; new commit reruns on the new SHA; Tier 1 PR touching `verify/` blocked by code-owner review; normal PR green and auto-merged (evidence in `decisions.tsv`).
- PR rehearsal done: direct push to main rejected; Tier 0 PRs auto-merged on checks alone; Tier 2 PRs (#2, #5) stayed BLOCKED with all checks green until ironlu approved by hand, then auto-merged.
- Git hooks: no husky. `.husky/` is a tracked native hooks dir (`core.hooksPath=.husky`, set by the `prepare` script on `pnpm install`), so every worktree has the commit-msg hook (merged in PR #10). Reason: husky's generated `.husky/_` is untracked, and a fresh worktree silently ran no hooks. This is an approved exception to the shared "do not modify git config" rule.
- pstack: upstream `cursor/plugins`, reviewed at `d42aff0` (0.15.46), installed at project scope, merged to main in PR #5. Model rule is `.claude/rules/pstack-models.md` (budget large, xhigh). User-level `~/.claude/settings.json` and `~/.claude/rules/` untouched; plugin files and the marketplace registry still live in the shared `~/.claude/plugins/`.
- pstack playbook policy decided (hybrid): see `docs/ai/pstack-playbooks.md`. Enabled: `shipping`, `worktree-cleanup` steps 1-5. Deferred: `autopilot-full`, `autopilot-stack`.

## Governance hardening, opened 2026-11-22 (waiting for ironlu)
Three Tier 2 PRs, independent branches off `main`, none approved, none auto-merged. Luis asked for this scope only: no product work.
- **A, [#21](https://github.com/doppelgengar9837/superboard-lite/pull/21) `chore(codeowners)`:** `vite.config.ts`, `src/test-setup.ts` and `/vitest.*` become code-owner paths (vitest premise checked: `include` and `setupFiles` are defined in those two files; `vitest.config.*` would override `vite.config.ts`). Test `verify/codeowners.test.ts`, red before.
- **B, [#22](https://github.com/doppelgengar9837/superboard-lite/pull/22) `ci(suppressions)`:** `pnpm check:suppressions` fails on new `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `.skip`, `.skipIf`, `.only`, `.fixme` in `src/`, `e2e/`, `verify/`. Baseline `verify/suppressions-baseline.json` (one entry: `src/lib/clock.ts`), counts may only go down. Runs as a step of the existing required job `check`, so no ruleset change.
- **C, [#23](https://github.com/doppelgengar9837/superboard-lite/pull/23) `ci(decision-log)`:** `pnpm decision -- --phase ... --decision ... --reason ... --evidence ... --result ...` writes `decisions.tsv` with the system time (no way to pass a time); `pnpm check:decisions` checks format, non-decreasing time, not later than now. **Rows 1 to 30 have estimated times**: untouched, frozen by hash in `verify/decisions-boundary.json`, exempt from the time rules; every later row is strict (ADR 0005). Also adds `docs/ai/usage-measurement.md` (proposal only) and this update.
- CI: all four required checks were green on A, B and C before the rehearsals. Rehearsal on B (a skipped test) failed `check` at the `check:suppressions` step with the expected message; on C (a hand-typed 2099 row) failed `check` at `pnpm test` (the test that runs the CLI on the real file). Each was fixed with a plain follow-up commit.
- **Merge note:** B and C both edit the `check` script in `package.json` and `ci.yml`. Merge A first (no overlap), then B, then update C from `main` (strict requires it) and resolve the small conflict. Ask a session to do the update.
- From now on, record decisions with `pnpm decision`, not by editing the file.
- Sandbox note for sessions like this one: `git push` and `gh` need `~/.config/gh`, which the sandbox denies, so those calls ran unsandboxed. PRs were opened with `GH_TOKEN` set to the doppelgengar9837 token for that one command; `gh auth switch` was not used.

## Next (handoff to the next session)
Scope of the session that closed P1: P0 and P1 only. The next session picks up the items below, in this order of dependency.
1. **Credentials first.** Before any autopilot or unattended run: raise the credential finding (open questions) with Luis, decide how an agent environment gets only the doppelgengar9837 credential, record it in `decisions.tsv`. There is a memory entry for this reminder.
2. **P2: first product feature.** Each feature needs its journey in `verify/journeys/` and its file in the skill's `features/` (Tier 2, ironlu approves). Test first.
3. **Agent verifier** like pstack's (fresh-context agent, `PASS` / `PASS+NOTES` / `FAIL`): needs the credential decision and a cost limit. Today the verdict is a deterministic CI job only (ADR 0004).
4. Decide whether `verify` should catch what only a headed browser sees (the favicon 404 was invisible to the headless journey): check that every declared resource loads, or accept the gap.
5. Observe strict mode with two PRs open at once (not yet observed).
6. Try pstack skills one at a time on a real task and record which work in Claude Code. Read `autopilot-stack`, `babysit`, `autonomous-run`, `opening-a-pr` before first use and add rows to `pstack-playbooks.md`.
7. P4: does Vercel preview protection block the verifier?
8. Usage measurement: Luis decides whether to run one pinned ccusage trial (`docs/ai/usage-measurement.md`).

Unverified at the close of P1: the verification skill has not been run by a fresh agent session that never saw this conversation; `create-verification-skill` was followed by hand, not run as a skill; the full plan lives in Luis's Claude project, outside the repo, so P2 onward is mapped only from what the repo records.

## Open questions
- **Before any autopilot run, remind Luis about the credential finding and record the answer in `decisions.tsv`.**
- Security finding: the `gh` credentials of both accounts live on this machine, so an agent can technically approve as ironlu. Only the permission classifier stopped it in PR #2. The code-owner gate is not enforced against local agents; consider an agent environment that holds only the doppelgengar9837 credential.
- Tier 1 now needs the `verify` check, but it has one journey (home page); real coverage grows with features.
- CODEOWNERS stays on ironlu for now (see `decisions.tsv`); revisit together with the credential finding.
- Does Vercel preview protection block the verifier? (P4)
