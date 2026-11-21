import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0, // flaky tests are bugs; do not hide them with retries
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    // Author-written tests. `pnpm test:e2e` runs only this project.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Independent journeys (docs/ai/adr/0004-verifier.md). `pnpm verify` runs only this project.
    {
      name: 'verify',
      testDir: './verify/journeys',
      use: { ...devices['Desktop Chrome'], screenshot: 'on', trace: 'retain-on-failure' },
    },
  ],
})
