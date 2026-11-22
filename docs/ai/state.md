# State

_Last updated: 2026-11-22 (P1 closed 2026-11-21; governance hardening done and merged 2026-11-22; next is plan v5 P0.5, "restore step one")_

## Where we are
- Phase: **P0 foundation** and **P1 verifier** are closed (2026-11-21). P2 (first product feature) has not started.
- Verified on Mac (Node 24, pnpm 12.21): `pnpm check`, `pnpm build`, `pnpm test:e2e` all pass.
- Repo: public `doppelgengar9837/superboard-lite` (HTTPS remote); `ironlu` is a collaborator with write access.
- CI on GitHub: `check (lint, typecheck, unit, build)`, `e2e (playwright)`, `conventional-title` all pass.
- Ruleset `main-protection` (active, no bypass): PR required, squash only, linear history, 4 required checks (`verify` added 2026-11-21), **strict (branch must be up to date with main)**, code-owner review, no deletion or force-push. Strict was turned on 2026-11-21; first real test on 2026-11-22 (B merged, then C had to be updated and rerun): see "Governance hardening".
- Verify gate rehearsed 2026-11-21: regression PR red and refused; new commit reruns on the new SHA; Tier 1 PR touching `verify/` blocked by code-owner review; normal PR green and auto-merged (evidence in `decisions.tsv`).
- PR rehearsal done: direct push to main rejected; Tier 0 PRs auto-merged on checks alone; Tier 2 PRs (#2, #5) stayed BLOCKED with all checks green until ironlu approved by hand, then auto-merged.
- Git hooks: no husky. `.husky/` is a tracked native hooks dir (`core.hooksPath=.husky`, set by the `prepare` script on `pnpm install`), so every worktree has the commit-msg hook (merged in PR #10). Reason: husky's generated `.husky/_` is untracked, and a fresh worktree silently ran no hooks. This is an approved exception to the shared "do not modify git config" rule.
- pstack: upstream `cursor/plugins`, reviewed at `d42aff0` (0.15.46), installed at project scope, merged to main in PR #5. Model rule is `.claude/rules/pstack-models.md` (budget large, xhigh). User-level `~/.claude/settings.json` and `~/.claude/rules/` untouched; plugin files and the marketplace registry still live in the shared `~/.claude/plugins/`.
- pstack playbook policy decided (hybrid): see `docs/ai/pstack-playbooks.md`. Enabled: `shipping`, `worktree-cleanup` steps 1-5. Deferred: `autopilot-full`, `autopilot-stack`.

## Governance hardening: done, merged 2026-11-22
Three Tier 2 PRs, independent branches off `main`, approved by ironlu and merged in the order A, B, C. Luis asked for this scope only: no product work. CI on main after the last merge (run 44990813154, head `2bf4115`): `check`, `e2e` and `verify` all success.
- Merge commits on main (squash): **A** #21 `48c12d0` (13:37:59), **B** #22 `b745e01` (13:39:16), **C** #23 `2bf4115` (13:46:02), all +08:00.
- **A, [#21](https://github.com/doppelgengar9837/superboard-lite/pull/21) `chore(codeowners)`:** `vite.config.ts`, `src/test-setup.ts` and `/vitest.*` become code-owner paths (vitest premise checked: `include` and `setupFiles` are defined in those two files; `vitest.config.*` would override `vite.config.ts`). Test `verify/codeowners.test.ts`, red before.
- **B, [#22](https://github.com/doppelgengar9837/superboard-lite/pull/22) `ci(suppressions)`:** `pnpm check:suppressions` fails on new `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `.skip`, `.skipIf`, `.only`, `.fixme` in `src/`, `e2e/`, `verify/`. Baseline `verify/suppressions-baseline.json` (one entry: `src/lib/clock.ts`), counts may only go down. Runs as a step of the existing required job `check`, so no ruleset change.
- **C, [#23](https://github.com/doppelgengar9837/superboard-lite/pull/23) `ci(decision-log)`:** `pnpm decision -- --phase ... --decision ... --reason ... --evidence ... --result ...` writes `decisions.tsv` with the system time (no way to pass a time); `pnpm check:decisions` checks format, non-decreasing time, not later than now. **Rows 1 to 30 have estimated times**: untouched, frozen by hash in `verify/decisions-boundary.json`, exempt from the time rules; every later row is strict (ADR 0005). Also adds `docs/ai/usage-measurement.md` (proposal only) and this update.
- CI: all four required checks were green on A, B and C before the rehearsals. Rehearsal on B (a skipped test) failed `check` at the `check:suppressions` step with the expected message; on C (a hand-typed 2099 row) failed `check` at `pnpm test` (the test that runs the CLI on the real file). Each was fixed with a plain follow-up commit.
- **Strict, first real test (B then C):** B and C both edit the `check` script in `package.json` and `ci.yml`. After B merged (`b745e01`), C's base was stale, so C was updated from main by merge commit `3f615dc` ("chore(merge): resolve package.json conflict with main", 13:43:15). Only `package.json` is named as conflicting: both `check:suppressions` (B) and `check:decisions` / `decision` (C) were kept in the `check` script. `ci.yml` took both new steps with no recorded conflict. Source: the PR #23 commit list and that commit's diff; the conflict markers themselves are not in the history.
  - After the update, all four required checks ran again on the new head `3f615dc` (check, e2e, verify, conventional-title: success). ironlu's review on the earlier head `8488ab2` shows APPROVED (13:36) and DISMISSED (13:40); ironlu approved again on `3f615dc` (13:45) and merged at 13:46. I did not find why the first review was dismissed.
  - Not observed: the PR showing BLOCKED as behind-main (I only read commits and check runs afterwards).
- From now on, record decisions with `pnpm decision`, not by editing the file.
- Sandbox note for sessions like this one: `git push` and `gh` need `~/.config/gh`, which the sandbox denies, so those calls ran unsandboxed. PRs were opened with `GH_TOKEN` set to the doppelgengar9837 token for that one command; `gh auth switch` was not used.

## Next (handoff to the next session)
**Next step: plan v5, P0.5 "restore step one".** Before doing it, read the plan's "方針" (policy) section first. The plan is `claude/superboard-lite-pstack-plan-2026-11-21.md` in Luis's Claude Project; it is not in this repo, so what P0.5 contains is not recorded here.
New sessions read `docs/ai/plan.md` first (the condensed plan: policy, phases, gates); the next phase there is P0.5.

The items below were the handoff from the close of P1. They are still open; the plan decides their order relative to P0.5.
1. **Credentials first.** Before any autopilot or unattended run: raise the credential finding (open questions) with Luis, decide how an agent environment gets only the doppelgengar9837 credential, record it in `decisions.tsv`. There is a memory entry for this reminder.
2. **P2: first product feature.** Each feature needs its journey in `verify/journeys/` and its file in the skill's `features/` (Tier 2, ironlu approves). Test first.
3. **Agent verifier** like pstack's (fresh-context agent, `PASS` / `PASS+NOTES` / `FAIL`): needs the credential decision and a cost limit. Today the verdict is a deterministic CI job only (ADR 0004).
4. Decide whether `verify` should catch what only a headed browser sees (the favicon 404 was invisible to the headless journey): check that every declared resource loads, or accept the gap.
5. Strict mode with two PRs open at once: seen once (B then C, see above); the BLOCKED-as-behind state itself was not watched.
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
