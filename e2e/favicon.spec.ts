import { expect, test } from '@playwright/test'

test('the page declares a favicon and it loads', async ({ page, request }) => {
  await page.goto('/')

  const href = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(href, 'index.html must declare <link rel="icon">').not.toBeNull()

  const response = await request.get(href ?? '')
  expect(response.ok(), `favicon at ${href ?? '(none)'} must load`).toBe(true)
  expect(response.headers()['content-type']).toMatch(/image\//)
})
