# 0001 Tooling

Date: 2026-11-21. Status: accepted.

- **ESLint (typescript-eslint, strict type-checked) instead of the template's oxlint.** The project's core idea is replacing prose rules with deterministic checks; that needs custom `no-restricted-syntax` and later import-boundary rules.
- **TypeScript pinned to ~6.** typescript-eslint 8.73 refuses TypeScript 7.0. Revisit when it supports 7.1+ (tracking: typescript-eslint issue 10940).
- **Vitest + Testing Library (jsdom)** for unit/component tests; **Playwright** (Chromium only) for e2e and later the verify CLI.
- **pnpm**, Node 22.
- **Conventional Commits** via commitlint (husky `commit-msg` locally, PR-title check in CI).
- Retries are disabled in Playwright: a flaky test is a bug.
