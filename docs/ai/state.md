# State

_Last updated: 2026-11-21 (P0, waiting on a human to install pstack at project scope)_

## Where we are
- Phase: **P0 foundation**, nearly done.
- Verified on Mac (Node 24, pnpm 12.21): `pnpm check`, `pnpm build`, `pnpm test:e2e` all pass.
- Repo: public `doppelgengar9837/superboard-lite` (HTTPS remote); `ironlu` is a collaborator with write access.
- CI on GitHub: `check (lint, typecheck, unit, build)`, `e2e (playwright)`, `conventional-title` all pass.
- Ruleset `main-protection` (active, no bypass): PR required, squash only, linear history, 3 required checks, code-owner review, no deletion or force-push.
- PR rehearsal done: direct push to main rejected; Tier 0 PRs (#1, #3) auto-merged on checks alone; Tier 2 PR (#2, touches `.github/`) stayed BLOCKED with all checks green until ironlu approved by hand, then auto-merged.
- Husky: not installed locally (`husky` writes `core.hooksPath`, which the shared rules forbid). commit-msg rule verified by pointing `-c core.hooksPath` at a wrapper that runs `.husky/commit-msg`; a bad message is rejected.
- pstack: source is upstream `cursor/plugins` (author's version; it supports Claude Code through a generated plugin). Reviewed `harness/pstack/claude-code` at `d42aff0` (0.15.46): no hooks, settings or MCP config; scripts run only when a skill calls them. Not installed yet.

## Next
1. Human installs pstack at **project scope only** (see decisions.tsv); the resulting `.claude/settings.json` goes through a Tier 2 PR approved by ironlu.
2. Run setup-pstack with its output redirected to the project (`.claude/rules/pstack-models.md`, not `~/.claude/rules/`); record which skills work in Claude Code.
3. Report P0 gate.

## Open questions
- Does a project-level `.claude/rules/pstack-models.md` load into new sessions the way the user-level one does? (An experiment; the adapter doc only describes the user-level path.)
- pstack playbooks that conflict with our rules: `shipping` runs `gh pr merge`, `autopilot-full` pushes branches, `worktree-cleanup` uses `git worktree remove --force`. Decide which skills stay enabled and what AGENTS.md says about them.
- Security finding: the `gh` credentials of both accounts live on this machine, so an agent can technically approve as ironlu. Only the permission classifier stopped it in PR #2. The code-owner gate is not enforced against local agents; consider an agent environment that holds only the doppelgengar9837 credential.
- Husky vs the no-git-config rule: add `.pnpm-store` to `.gitignore`, and decide how contributors enable hooks.
- Does Vercel preview protection block the verifier? (P4)
