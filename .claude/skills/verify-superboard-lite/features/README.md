# SuperBoard Lite verification map

This directory is the maintained source for verifying the user-facing behavior of SuperBoard Lite. Read the index before driving the app, then use the matching feature file as the recipe. Changes to it are Tier 2 (`.claude/` is a code-owner path), so a human approves what counts as verified.

## Baseline preconditions

- The app is built (`pnpm build`) from the commit under test and served at `http://localhost:4173` by an instance this run started (see the Launch section of `../SKILL.md`).
- `scripts/doctor.sh` with the run's pid file exits 0.
- No data directory or seed is needed yet. Browser storage starts empty in every Playwright context.
- Never drive an instance that was not started by this verification run.

## Driving conventions

- Start every recipe from a fresh browser context at `/`.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names unchanged.
- Canonical run: `pnpm verify`. Ad hoc: the Playwright MCP browser at `http://localhost:4173/`.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- UI proof is an ARIA snapshot and a screenshot with the app name visible, plus the console messages for the page.
- Record the feature ID and entry point with every artifact; ad-hoc artifacts go in `verify-report/manual/<feature-id>/`.
- Report an unreachable path with the attempted step and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.
- A planned feature that is not built is reported as "not built", never as passed and never as failed.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with <harness>` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact step and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Home](./home.md) covers what a user sees when the app opens.

Planned and not built yet (see `docs/ai/feature-map/README.md`): board management, widgets from fixture sources, refresh and scheduling, version history, sticky notes, tags, search and filter. Add a feature file here in the same PR that builds the feature.
