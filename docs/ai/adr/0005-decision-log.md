# 0005 Decision log: system time, checks, and the estimated legacy rows

Date: 2026-11-22. Status: accepted, pending ironlu's approval of the PR that adds it.

## Problem
`docs/ai/decisions.tsv` is the project's memory of why things are the way they are. Its times were typed by hand, by an agent, from memory of the session. That is not a measurement: the log cannot be used to reason about how long things took or in what order they happened.

## What the existing rows are
Rows 1 to 30 (2026-11-21T10:30+08:00 through 2026-11-21T19:00+08:00, written in P0 and P1) **have estimated times**. Luis confirmed this on 2026-11-22. The file itself is consistent with it:
- every one of the 30 times is minute precision, with no seconds;
- line 22 (`16:07`) comes after line 21 (`16:40`), so the times are not even in order.

They are the best account we have of what was decided and why. The times are approximate. They are **not rewritten** in this change, not "corrected", and not given invented seconds.

## Decision
1. **New rows are written by a command, with the system time.** `pnpm decision -- --phase ... --decision ... --reason ... --evidence ... --result ...` (`verify/log-decision.ts`) appends one row. It has no time option: `--time` is refused. The time comes from the operating system's `date` (`/bin/date`, absolute path), in ISO 8601 with seconds and the machine's UTC offset, e.g. `2026-11-22T13:18:28+08:00`.
2. **A check runs in CI and in `pnpm check`.** `pnpm check:decisions` (`verify/check-decisions.ts`) validates the file. For every row after the boundary:
   - exactly 6 tab-separated fields, none empty, none padded with whitespace;
   - time is `YYYY-MM-DDTHH:MM:SS` plus a numeric offset (`+08:00`), and a real date;
   - times never go backwards, compared as instants (so `10:00+08:00` then `09:00+00:00` is fine, because the second is later); equal times are allowed;
   - no time is later than now (system time, no tolerance).
3. **The boundary is explicit and frozen.** `verify/decisions-boundary.json` records `legacyRows: 30` and the SHA-256 of the header plus those 30 rows. The check fails if any of them is edited, reordered or deleted, and exempts them from the time rules. Rows 31 onwards are always strict, whatever date they claim. The first strict row must also not be earlier than the last legacy row.
4. **The boundary lives in `verify/`, a code-owner path.** A Tier 1 change cannot move the boundary, change the rules, or touch the frozen rows without a human approving it.

## Why this shape
- **Freeze by hash, not by date.** A date cutoff ("rows after 2026-11-22 are strict") lets a hand-written row carry an older date and dodge the checks. A row count plus a hash cannot be dodged by choosing a timestamp.
- **Do not rewrite or annotate the legacy rows.** Rewriting would replace an honest estimate with a false precision; adding a column would change the format for all consumers. Recording the fact here, once, keeps the data as it was written.
- **`/bin/date`, not `new Date()` or `src/lib/clock.ts`.** ESLint bans `new Date()` outside `src/lib/clock.ts` (ADR 0002). Importing that file would make the log's timestamps depend on product code that a Tier 1 change can edit. Using `new Date()` with an `eslint-disable` would need an allowance in the suppression baseline, which couples this change to another PR for no benefit. `date` takes no input from the repository. GNU and BSD `date` both support `+%s` and `%z`.
- **No tolerance for clock skew.** "Not later than now" is checked against the clock of whoever runs the check. If a machine's clock is ahead by more than the time between writing the row and the check, the check fails and says why. That is a real signal: it means the clock is wrong.

## What this does not prove
- **A hand-typed time that happens to be valid passes.** The command cannot be forced to be the only writer: `decisions.tsv` is a documentation file that agents may edit. The check constrains a hand-typed row to be well-formed, not earlier than the last row, and not in the future, so it cannot be backdated or postdated, but a row typed with a plausible current time is indistinguishable from a generated one. Making the command the only writer would need a signature or a commit-time hook; not done.
- **Deleting new rows is not detected.** Only the legacy block is hashed. Removing the last strict rows leaves a valid log. Append-only for strict rows would need a comparison with the base branch in CI; not done.
- **The check reads the clock where it runs.** Rows are judged against the CI runner's time, not the author's.

## Changing the boundary later
Add a row only through the command. To rewrite or correct a legacy row, a code-owner edits the row and the hash in `verify/decisions-boundary.json` in the same change, and records why in a new row.
