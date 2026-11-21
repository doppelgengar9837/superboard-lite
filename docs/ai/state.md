# State

_Last updated: 2026-11-21 (P0 closing: pstack merged, native git hooks PR open, strict checks on)_

## Where we are
- Phase: **P0 foundation**, closing.
- Verified on Mac (Node 24, pnpm 12.21): `pnpm check`, `pnpm build`, `pnpm test:e2e` all pass.
- Repo: public `doppelgengar9837/superboard-lite` (HTTPS remote); `ironlu` is a collaborator with write access.
- CI on GitHub: `check (lint, typecheck, unit, build)`, `e2e (playwright)`, `conventional-title` all pass.
- Ruleset `main-protection` (active, no bypass): PR required, squash only, linear history, 3 required checks, **strict (branch must be up to date with main)**, code-owner review, no deletion or force-push. Strict was turned on 2026-11-21; its effect on two PRs open at once is not yet observed.
- PR rehearsal done: direct push to main rejected; Tier 0 PRs auto-merged on checks alone; Tier 2 PRs (#2, #5) stayed BLOCKED with all checks green until ironlu approved by hand, then auto-merged.
- Git hooks: no husky. `.husky/` is a tracked native hooks dir (`core.hooksPath=.husky`, set by the `prepare` script on `pnpm install`), so every worktree has the commit-msg hook (PR pending ironlu). Reason: husky's generated `.husky/_` is untracked, and a fresh worktree silently ran no hooks. This is an approved exception to the shared "do not modify git config" rule.
- pstack: upstream `cursor/plugins`, reviewed at `d42aff0` (0.15.46), installed at project scope, merged to main in PR #5. Model rule is `.claude/rules/pstack-models.md` (budget large, xhigh). User-level `~/.claude/settings.json` and `~/.claude/rules/` untouched; plugin files and the marketplace registry still live in the shared `~/.claude/plugins/`.
- pstack playbook policy decided (hybrid): see `docs/ai/pstack-playbooks.md`. Enabled: `shipping`, `worktree-cleanup` steps 1-5. Deferred: `autopilot-full`, `autopilot-stack`.

## Next
1. Observe strict mode: open two Tier 0 PRs at once and record what happens when the second one is behind main.
2. Try pstack skills one at a time on a real task and record which work in Claude Code (only the install, `setup-pstack` and the rule loading are verified so far).
3. Read `autopilot-stack`, `babysit`, `autonomous-run`, `opening-a-pr` before first use and add rows to `pstack-playbooks.md`.
4. Tier 2 PR (ironlu approves): add a pointer to `pstack-playbooks.md` in AGENTS.md, and a note that `pnpm install` enables the husky hooks.
5. Close P0, then P1: build the verifier so `shipping` can rely on a required check.

## Open questions
- **Before any autopilot run, remind Luis about the credential finding and record the answer in `decisions.tsv`.**
- Security finding: the `gh` credentials of both accounts live on this machine, so an agent can technically approve as ironlu. Only the permission classifier stopped it in PR #2. The code-owner gate is not enforced against local agents; consider an agent environment that holds only the doppelgengar9837 credential.
- Tier 1 currently lands on CI alone until the verifier exists.
- Does Vercel preview protection block the verifier? (P4)
