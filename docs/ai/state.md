# State

_Last updated: 2026-11-21 (P0, waiting on ironlu to approve PR #5)_

## Where we are
- Phase: **P0 foundation**, nearly done.
- Verified on Mac (Node 24, pnpm 12.21): `pnpm check`, `pnpm build`, `pnpm test:e2e` all pass.
- Repo: public `doppelgengar9837/superboard-lite` (HTTPS remote); `ironlu` is a collaborator with write access.
- CI on GitHub: `check (lint, typecheck, unit, build)`, `e2e (playwright)`, `conventional-title` all pass.
- Ruleset `main-protection` (active, no bypass): PR required, squash only, linear history, 3 required checks, code-owner review, no deletion or force-push.
- PR rehearsal done: direct push to main rejected; Tier 0 PRs (#1, #3) auto-merged on checks alone; Tier 2 PR (#2, touches `.github/`) stayed BLOCKED with all checks green until ironlu approved by hand, then auto-merged.
- Husky: not installed locally (`husky` writes `core.hooksPath`, which the shared rules forbid). commit-msg rule verified by pointing `-c core.hooksPath` at a wrapper that runs `.husky/commit-msg`; a bad message is rejected.
- pstack: source is upstream `cursor/plugins` (author's version; it supports Claude Code through a generated plugin). Reviewed `harness/pstack/claude-code` at `d42aff0` (0.15.46): no hooks, settings or MCP config; scripts run only when a skill calls them.
- pstack installed at project scope by a human; installed cache is identical to the reviewed copy. `setup-pstack` run at budget large (xhigh); its rule is `.claude/rules/pstack-models.md` in the project, and a new `claude -p` session in the project quoted it, so project-level rules load. Both files are in PR #5 (Tier 2, awaiting ironlu). User-level `~/.claude/settings.json` and `~/.claude/rules/` untouched; the plugin files and marketplace registry still live in the shared `~/.claude/plugins/`.

## Next
1. ironlu approves PR #5 (Tier 2); auto-merge then lands pstack on main.
2. Try pstack skills one at a time on a real task and record which work in Claude Code (only the install, `setup-pstack` and the rule loading are verified so far).
3. Decide which pstack playbooks stay enabled (see open questions), then start P1.

## Open questions
- pstack playbooks that conflict with our rules: `shipping` runs `gh pr merge`, `autopilot-full` pushes branches, `worktree-cleanup` uses `git worktree remove --force`. Decide which skills stay enabled and what AGENTS.md says about them.
- Security finding: the `gh` credentials of both accounts live on this machine, so an agent can technically approve as ironlu. Only the permission classifier stopped it in PR #2. The code-owner gate is not enforced against local agents; consider an agent environment that holds only the doppelgengar9837 credential.
- Husky vs the no-git-config rule: add `.pnpm-store` to `.gitignore`, and decide how contributors enable hooks.
- Does Vercel preview protection block the verifier? (P4)
