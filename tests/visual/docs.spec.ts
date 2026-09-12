import { test } from '@playwright/test'

// Not a regression test: writes the README's screenshots. Runs only when asked.
//   npm run screenshots
test.skip(!process.env.DOCS, 'docs screenshots run on demand (DOCS=1)')

for (const theme of ['light', 'dark'] as const) {
  test(`adopt without rewrite · ${theme}`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: new RegExp(`^${theme}$`, 'i') }).click()
    await page.getByRole('group', { name: 'View' }).getByRole('button', { name: 'Adopt without rewrite' }).click()
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.adopt-grid').screenshot({ path: `docs/adopt-without-rewrite-${theme}.png`, animations: 'disabled' })
  })
}
