# Usage measurement: recommendation (not implemented)

_Written 2026-11-22. A proposal for Luis to accept, change or reject. Nothing here is automated, installed or run._

## What we want to know
How many tokens, and roughly how much money, a unit of agent work used: a PR, a phase, a pstack playbook run. Today the only record is whatever a session reports about itself, which is not a measurement and is lost when the session ends.

## Recommendation: evaluate ccusage, pinned, run by hand first
Checked on 2026-11-22 from public sources, without installing or running it:

| Question | Finding | Source |
|---|---|---|
| Still maintained? | Yes. Last commit 2026-11-22 (same day); latest release v20.0.51 on 2026-11-14, then v20.0.50 on 11-11 and v20.0.49 on 11-10; not archived; about 19.5k stars; 9 open issues and pull requests; MIT. | GitHub API for `ccusage/ccusage`; npm registry |
| Where is it? | The repo moved from `ryoppippi/ccusage` to the `ccusage/ccusage` organisation; the npm package `ccusage` is the same one (`repository` points at the organisation). | npm registry metadata |
| Reads Claude Code usage? | Yes: `ccusage claude daily`, `weekly`, `monthly`, `session`, `blocks`, from local data. | README |
| JSON output? | Yes. `--json` (or `-j`) on every report type; `--no-cost` drops cost fields; the docs describe fields (`totals`, `modelBreakdowns`, `sessionId`, `totalCost`, `totalTokens`, per-request `entries` for a session) and `jq` examples. | `docs/guide/json-output.md` |
| Filters we need? | `--since` / `--until` (inclusive, `YYYYMMDD`), `session --project <name>`, `session --id <id>`. | `docs/guide/cli-options.md`, `session-reports.md` |
| Runs offline? | `--offline` exists, so pricing can come from the bundled table instead of a fetch. | `docs/guide/cost-modes.md` |

What I have **not** done: run it. `npx` / `bunx` downloads and executes code, which needs Luis's decision, and I do not have a record of what it prints on this machine. "Can output JSON" is therefore established from its documentation, not from a run.

### Cautions to settle in the trial
1. **Cost is an estimate.** With the default `auto` mode it uses a stored `costUSD` when an entry has one and otherwise multiplies tokens by a price table; it flags models it cannot price (`totals.unpricedModels`). It is not an invoice. For a flat-rate plan, tokens are the more honest number. Prefer `--mode calculate --offline` for a stable, reproducible figure, and always record the mode.
2. **Does it count everything?** Subagent and worktree sessions must be included, and each worktree has its own project folder (this session's is `-Users-luis-Dev-gengar-superboard-lite--claude-worktrees-governance-three-prs-b3d010`). In the trial, reconcile ccusage's total for one known session against the figure the Claude app shows for it. If they differ, find out why before trusting either.
3. **Privacy.** The raw JSON contains session IDs and project paths. Keep raw output out of the repository (it is a public repo); commit only aggregates.
4. **Supply chain.** Pin the exact version (e.g. `ccusage@20.0.51`), never `@latest`, and read the changelog when bumping.
5. **How `--project` matches** is not stated clearly enough in what I read; check it on real output before building a filter on it.

An alternative to evaluate in the same trial: the desktop app's own usage tool (`get_usage` in the session-management tools). I have not called it, so I cannot say what it returns.

## Proposed record format (when we decide to keep one)
Aggregates only, one row per unit of work, written by a command that stamps the time from the system clock, the same way `pnpm decision` does (ADR 0005). Tab-separated, `docs/ai/usage.tsv`:

| column | meaning |
|---|---|
| `time` | ISO 8601 with seconds and offset, from the system clock |
| `label` | what the work was, e.g. `PR #21` or `P2 feature-x`; free text, single line |
| `since`, `until` | the date window passed to the tool (`YYYY-MM-DD`) |
| `sessions` | number of sessions counted |
| `input_tokens`, `output_tokens`, `cache_creation_tokens`, `cache_read_tokens` | summed from the report's `totals` |
| `cost_usd` | summed `totalCost`, or empty with `--no-cost` |
| `cost_mode` | `auto`, `calculate` or `display` |
| `unpriced_models` | comma-separated, from `totals.unpricedModels`, or empty |
| `tool` | `ccusage@20.0.51` (exact version) |

Not recorded: raw JSON, session IDs, project paths, prompts.

## Proposed next steps (each needs a human yes)
1. Luis approves one manual trial run of a pinned version, on one finished session.
2. Compare that run with the app's own figure; write down any gap and its cause.
3. If it holds up, a small PR adds the recording command and its format check (same shape as PR C), with its tests first.
4. Only then consider recording at the end of a session. No scheduling and no unattended runs until the credential finding in `state.md` is settled.
