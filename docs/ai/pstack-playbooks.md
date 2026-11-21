# pstack playbooks: adoption policy

_Decided 2026-11-21 by Luis. Source of each row: `docs/ai/decisions.tsv` (search for the playbook name)._

## Stance: hybrid
pstack drives the process. Our GitHub ruleset stays the hard boundary, because GitHub enforces it and an agent cannot argue its way past it. pstack's own gates are prose that relies on agent discipline. Where it is cheap, make GitHub enforce what pstack only states.

| | pstack | Ours |
|---|---|---|
| Who enforces the gate | the agent, following playbook text | the forge: ruleset, required checks, code-owner review |
| Verdict | `PASS` / `PASS+NOTES` / `FAIL` comment from a separate agent | required status check on the exact head SHA (verifier not built yet) |
| Branch freshness | test on the trunk it lands on | `strict_required_status_checks_policy: true` (since 2026-11-21) |

## Per playbook

| Playbook | Status | Conditions | Revisit when |
|---|---|---|---|
| `shipping` | **enabled** | The verifier is the required check `verify` (since 2026-11-21, rehearsed in PRs #13 to #15), so the old gap is closed. Arm `gh pr merge --auto` only after `verify` has passed on the current head, and read the report's `headSha` to confirm. Differences from pstack that remain: the verifier is deterministic and checks the head only (no parent-vs-head comparison, no `patch-id` carry-over, no agent verdict). | An agent verifier is added after P1, or journeys grow past the home page |
| `worktree-cleanup` | **enabled, steps 1-5 only** | Do not run step 6 (simulators, Xcode, app and package caches): it touches the machine outside this project. Known blind spots: the audit script reads `~/.cursor/...agent-transcripts`, so `LAST_CHAT` is empty under Claude Code; `gh pr list --author "@me"` uses the active gh account (ironlu), so PRs opened as doppelgengar9837 are missed. Treat every `safe` bucket as a suggestion and confirm with Luis before `--force`. | The audit script is adapted for Claude Code and the two-account setup |
| `autopilot-full` | **deferred** | Before any use: remind Luis about the credential finding (both gh accounts are logged in here, so an agent can approve Tier 2 as ironlu) and record how it was handled. Do not use the "grant covers approvals" mode. The Claude Code version replaces cloud owner agents with worktree subagents, and `git worktree add` needs an unsandboxed run. | Credential handling is decided and the verifier exists |
| `autopilot-stack` | **deferred, not yet read** | The ruleset covers only the default branch, so merges into a stacked base branch skip required checks and code-owner review until the base moves to `main`. | Read the playbook; decide whether the ruleset should cover stack branches |
| `babysit`, `autonomous-run`, `opening-a-pr` | not yet reviewed | Read before first use; add a row here. | First use |

## What "enabled" means
Nothing is switched off in the plugin: the playbooks exist on disk either way. "Enabled" means an agent may follow that playbook; "deferred" means it must not until the revisit condition holds. AGENTS.md does not mention this yet, because AGENTS.md is Tier 2 and needs ironlu's approval. Until a Tier 2 PR adds a pointer there, `docs/ai/state.md` links to this file and every session reads `state.md` first.
