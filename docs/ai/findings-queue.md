# Findings queue

The gardener appends smells here and does not fix them immediately. Every few days a human groups entries that share a cause, then fixes the cause once (design → check → rule). Format: `- YYYY-MM-DD [PR #n] smell — suspected cause`.

- 2026-11-21 [PR #17] No favicon: `public/` is empty and `index.html` has no icon link, so a normal browser logs a 404 console error for `/favicon.ico`; the `pnpm verify` journey does not see it (found by the first live run of the verify skill) — never added one; fix in a product PR, then drop the allowance in `features/home.md`.
