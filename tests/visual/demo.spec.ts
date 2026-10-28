import { test, expect, type Page } from '@playwright/test'

// One screenshot per component section per theme, plus both columns of the "adopt without
// rewrite" view. The unit tests prove behaviour and the contrast audit proves the numbers;
// this is the only check that can see a stray padding change break the table.
const THEMES = ['light', 'dark'] as const
const SECTIONS = ['Button', 'Toggle', 'Input', 'Contextual Alert', 'Status Indicator', 'Risk Pill', 'Tabs', 'Tokens']
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
// The 1440 baselines predate the width projects and keep their names; every other width
// carries its viewport width in the file name (see playwright.config.ts).
const widthSuffix = (width: number | undefined) => (width === undefined || width === 1440 ? '' : `-${width}`)

async function open(page: Page, theme: (typeof THEMES)[number]) {
  await page.goto('/')
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: new RegExp(`^${theme}$`, 'i') }).click()
  // Open Sans loads from Google Fonts; a screenshot taken before it arrives is a fallback font.
  await page.evaluate(() => document.fonts.ready)
}

for (const theme of THEMES) {
  test.describe(`components · ${theme}`, () => {
    test.beforeEach(async ({ page }) => open(page, theme))

    for (const title of SECTIONS) {
      test(title, async ({ page }, testInfo) => {
        const section = page.locator('section.demo-section', { has: page.getByRole('heading', { name: title, exact: true }) })
        await expect(section).toBeVisible()
        await expect(section).toHaveScreenshot(`${slug(title)}-${theme}${widthSuffix(testInfo.project.use.viewport?.width)}.png`)
      })
    }
  })

  test.describe(`adopt without rewrite · ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page, theme)
      await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Adopt without rewrite' }).click()
      await expect(page.getByRole('heading', { name: 'Adopt without rewrite' })).toBeVisible()
    })

    test('before — stock Material UI', async ({ page }) => {
      await expect(page.locator('.adopt-col').nth(0)).toHaveScreenshot(`adopt-before-${theme}.png`)
    })
    test('after — Vela theme, same code', async ({ page }) => {
      await expect(page.locator('.adopt-col').nth(1)).toHaveScreenshot(`adopt-after-${theme}.png`)
    })
  })
}
