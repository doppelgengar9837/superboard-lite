# 0004 Verifier

Date: 2026-11-21. Status: accepted (Luis confirmed the draft and all four choices below).

## Decision
The verifier is two parts: an **engine** that drives the built app the way a user would and records evidence, and a **gate** that makes its result a required status check on the exact head SHA. P1 builds a deterministic verifier that runs in CI. No LLM verdict yet.

- **Engine:** `pnpm verify` builds the app, serves the preview, runs journeys with fixtures and the injected `Clock` (ADR 0002, 0003), and writes `verify-report.json` (head SHA, result per journey) plus screenshots and traces as an uploaded artifact.
- **Gate:** a workflow job named `verify`, added to the ruleset's required checks. No path filter: a skipped required check stays pending forever, and docs-only PRs must run it too. No retries: a flaky journey is a bug (same rule as `playwright.config.ts`).
- **Not the author:** `verify/` and `.github/` are code-owner paths (ironlu), so a Tier 1 change by the author agent cannot alter the verifier. The job posts as `GITHUB_TOKEN` (`github-actions[bot]`), not as either human account, so it does not touch the open credential finding.

## When it runs
After the PR exists, on every push to it, against that exact head SHA, in a clean CI environment. Auto-merge waits for it. Because `strict` is on, a new push or a moved `main` invalidates the earlier result and it reruns.

The implementor may run `pnpm verify` locally before pushing as a self-check. A local result is the author's own claim and never counts as the verdict.

This matches pstack `shipping`: verify after the PR exists, land only what the verdict covers. Where pstack says "green CI is not a verdict", our verdict is itself a CI check, because GitHub can enforce a check and cannot enforce a comment.

## Choices
1. **Journeys live in `verify/journeys/` (Tier 2).** A new feature's acceptance journey needs ironlu's approval, so a human holds the acceptance criteria and the author cannot grade its own work. Cost: one human merge per feature. Alternative rejected: journeys next to `src/`, written by the author.
2. **Deterministic only in P1.** LLM verdicts (pstack swarm) need a credential and cost decision; revisit after P1.
3. **Runs on every PR, including docs-only.**
4. **Reuse `playwright.config.ts`** with a second project, not a separate config.

## Differences from pstack's verifier
pstack's verifier compares parent against head, carries a verdict across rebases with `git patch-id`, and is an agent. Ours verifies head only and never carries a result across commits; `strict` makes every new SHA rerun. Parent-vs-head comparison is later work.

## Definition of done for P1 (each needs evidence)
1. A PR with a deliberate regression turns `verify` red and cannot merge.
2. A normal PR turns it green and auto-merges.
3. A new commit reruns it, and the SHA in `verify-report.json` equals the PR head SHA.
4. A Tier 1 PR that touches `verify/` is blocked by code-owner review.
5. Journeys cover only what exists (home page visible; time comes from the `Clock`). Nothing implies coverage of unbuilt features.

## Order
1. This ADR (Tier 0).
2. Failing test first, then `verify/` engine and workflow (Tier 2).
3. After the job has run once, Luis adds `verify` to the ruleset's required checks (a repo setting, so a human does it; the name must already exist).
4. Rehearsal PRs for items 1 to 4 above.
5. Generate the project verification skill with pstack `create-verification-skill` (output `.claude/skills/verify-superboard-lite/`, Tier 2), so agents and CI share one recipe.
6. Update `docs/ai/pstack-playbooks.md`: the `shipping` gap (Tier 1 lands on CI alone) closes.

## Unknown until built
CI time added; whether `create-verification-skill` completes cleanly under Claude Code; the shape of journeys beyond the smoke case.
