import { test, expect, type Page } from '@playwright/test'
import { setTheme } from '../theme'

// Slice 2 of the playground uplift (s5-tabs): a component page's Rules, Tokens and Figma tabs, whole,
// in both themes, at the desktop width only. Button (10 rules), Tabs (17, a group of 12) and Toast
// (27, the longest). The Linux baselines are written by the "Visual baselines" workflow, never on a
// laptop. The titles never say "components ·", so the other widths' projects leave these alone.
const THEMES = ['light', 'dark'] as const
const PAGES = ['button', 'tabs', 'toast'] as const
const TABS = ['rules', 'tokens', 'figma'] as const

async function open(page: Page, id: string, tab: string, theme: string) {
  await page.goto(`/#/components/${id}/${tab}`)
  await setTheme(page, theme)
  await page.evaluate(() => document.fonts.ready)
  // The Rules tab waits for its proof links, so the picture is never of the loading state.
  if (tab === 'rules') await expect(page.locator('.pg-summary__pass')).toBeVisible()
  await page.mouse.move(0, 0)
}

for (const theme of THEMES) {
  test.describe(`component tabs · ${theme}`, () => {
    for (const id of PAGES) {
      for (const tab of TABS) {
        test(`${id} ${tab}`, async ({ page }, testInfo) => {
          test.skip(testInfo.project.name !== 'desktop', 'the component tabs are screenshotted at 1440 only')
          await open(page, id, tab, theme)
          await expect(page.locator('main')).toHaveScreenshot(`page-${id}-${tab}-${theme}.png`)
        })
      }
    }
  })
}
