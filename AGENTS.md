# AGENTS.md — SuperBoard Lite

Single source of truth for any coding agent (Claude Code, Codex, others). `CLAUDE.md` only imports this file.

## What this project is
SuperBoard Lite: boards of snapshot widgets that refresh on a schedule and keep history. It is a **practice project** for running a plan → design → build → test → deploy → maintain workflow with agents. Product quality matters less than a clean, verifiable process.
Stack: Vite + React + TypeScript (strict), Vitest, Playwright, ESLint, pnpm, Vercel.

## Commands
- `pnpm check` — lint + typecheck + unit tests (run before every commit)
- `pnpm test` / `pnpm test:e2e` / `pnpm build` / `pnpm dev`
- State your result from command output, never from memory.

## Start of every session
1. Read `docs/ai/state.md` (where we are, what is next).
2. Read the relevant file in `docs/ai/feature-map/` before touching a feature.
3. At the end, update `state.md` and append rows to `docs/ai/decisions.tsv`. A session that ends without this loses work, because nothing else carries over.

## Architecture rules (checked by tooling where possible)
- **Time comes from an injected `Clock`** (`src/lib/clock.ts`). Never call `Date.now()`, `new Date()` or `Math.random()` elsewhere; ESLint fails the build. Reason: verification must be reproducible.
- Widget sources are built-in fixtures whose content is a pure function of (source id, clock). No real websites.
- Data access goes through repository interfaces; UI code never touches IndexedDB directly.
- Prefer deleting code to adding it. Validate input at the edges. Make state-changing operations idempotent.

## Workflow rules
- Test first: write a failing test, then the fix. Tests assert behaviour, not implementation.
- One concern per PR. Branch `type/short-name`. Commits and PR titles follow Conventional Commits: `type(scope): description` (scope kebab-case, header ≤ 100 chars). The PR title becomes the squash commit.
- Fill in the PR template. Reviewers read the evidence section.
- **Never edit governance paths without a human**: `.github/`, `verify/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`, lint/ts/commit configs, `package.json`, lockfile, `vercel.json`. These are Tier 2 (see below) and listed in CODEOWNERS.
- The agent that wrote a change never declares it verified. A separate verifier does, on the exact head commit.
- When the same mistake happens twice, fix it in this order: make it impossible by design → add a lint rule or test → write a rule here. Do not just add prose.
- Irreversible actions (deleting data, force-push, changing repo settings) need a human. Reversible ones: proceed, do not stop to ask.
- pstack playbooks: follow only those marked enabled in `docs/ai/pstack-playbooks.md`, within the conditions listed there. A deferred playbook needs a human decision first. Before any autopilot or unattended run, raise the credential finding (open questions in `docs/ai/state.md`) with Luis and record the answer in `docs/ai/decisions.tsv`.

## Risk tiers (initial; tuned with data)
- Tier 0: docs, tests, styling, small edits (≤ 60 lines) to existing files; no deps/config/CI/schema.
- Tier 1: ordinary feature or fix under `src/`.
- Tier 2: dependencies, CI, verify tooling, skills, lint/ts config, data schema or migration, deploy config. Human merges.

## Definition of done
`pnpm check` and `pnpm build` pass, e2e passes where UI changed, acceptance criteria each have a proving test or verify output, state files updated.
