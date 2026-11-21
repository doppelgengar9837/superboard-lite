# Home

Home is what a user sees when they open SuperBoard Lite: the product name and a one-line description, with nothing failing in the background.

## Sub-features

- `home-identity` shows a level-1 heading named `SuperBoard Lite`.
- `home-tagline` shows the text `Boards of snapshot widgets that refresh on a schedule.`
- `home-no-errors` loads without page errors or console errors.

## How to get to it (user POV)

- Open `http://localhost:4173/` in a browser. It is the only page.

## Driving it with Playwright

Preconditions:

- The app is built from the commit under test and served at `http://localhost:4173` by an instance this run started.
- `scripts/doctor.sh` with the run's pid file exits 0.

- **Canonical run.** Run `pnpm verify`. The journey `home: a user opens the app and sees the product and no errors` passes, `verify-report/verify-report.json` has `"result": "PASS"` and a `headSha` equal to `git rev-parse HEAD`.
- **Open the page.** In the Playwright MCP browser, navigate to `http://localhost:4173/`. The page loads without a navigation error.
- **Read the page.** Take an ARIA snapshot. It contains a heading, level 1, named `SuperBoard Lite`, and a paragraph with the tagline text.
- **Check the console.** List console messages and page errors. The only `error` entry allowed today is the 404 for `/favicon.ico` (see Gotchas). Any other error fails `home-no-errors`.
- **Proof.** Save the ARIA snapshot and a screenshot to `verify-report/manual/home/` (for example `home.aria.txt` and `home.png`). The screenshot shows the heading.

## Gotchas

- `pnpm preview` serves `dist/`. After any code change, run `pnpm build` again or the run verifies the old build.
- `pnpm verify` reuses whatever is already on port 4173 when run locally. Verify the doctor passed for the instance you mean to test.
- Playwright empties `test-results/` at the start of each run, so keep ad-hoc proof under `verify-report/manual/`.
- This is the only built feature. Do not report the planned ones (boards, widgets, refresh, history) as verified or failed; they are not built.
- Product gap found by the first live run: the app ships no favicon (`public/` is empty and `index.html` has no icon link), so a browser driven through the Playwright MCP logs `Failed to load resource: 404` for `/favicon.ico`. `pnpm verify` did not report it, so its journey does not see it. Do not hide it by weakening the journey; record it for the user and add a favicon in a product PR.
- The Playwright MCP writes scratch files to `.playwright-mcp/` in the repo root (gitignored). Proof you want to keep goes to `verify-report/manual/home/`.
