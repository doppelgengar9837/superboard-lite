import { expect, test } from '@playwright/test'

// Journey: a user opens the app and sees what it is, with nothing broken behind the scenes.
test('home: a user opens the app and sees the product and no errors', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'SuperBoard Lite' })).toBeVisible()
  await expect(page.getByText('Boards of snapshot widgets that refresh on a schedule.')).toBeVisible()
  expect(problems).toEqual([])
})

// rehearsal: harmless comment, only here to touch a code-owner path
