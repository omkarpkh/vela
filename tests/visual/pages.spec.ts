import { test, expect, type Page } from '@playwright/test'
import { setTheme } from '../theme'

// Slices 2 and 3 of the playground uplift (s5-tabs): a component page's Playground, Rules, Tokens
// and Figma tabs, whole, in both themes, at the desktop width only. Button (10 rules), Tabs (17, a
// group of 12) and Toast (27, the longest). The Linux baselines are written by the "Visual baselines" workflow, never on a
// laptop. The titles never say "components ·", so the other widths' projects leave these alone.
const THEMES = ['light', 'dark'] as const
const PAGES = ['button', 'tabs', 'toast'] as const
const TABS = ['playground', 'rules', 'tokens', 'figma'] as const

async function open(page: Page, id: string, tab: string, theme: string) {
  // The Playground is the page's first tab, at the component's own address.
  await page.goto(tab === 'playground' ? `/#/components/${id}` : `/#/components/${id}/${tab}`)
  await setTheme(page, theme)
  await page.evaluate(() => document.fonts.ready)
  // The Rules tab waits for its proof links, so the picture is never of the loading state.
  if (tab === 'rules') await expect(page.locator('.pg-summary__pass')).toBeVisible()
  // The stage's width is measured once it is on the page; the picture waits for the stage.
  if (tab === 'playground') await expect(page.getByRole('region', { name: 'Live demo', exact: true })).toBeVisible()
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

// Slice 4 of the playground uplift (s5-proposal): Evidence Locker (a worked example, so steps), Verdict
// Card (no worked example, so its states lead) and the Copy pattern page, whole, in both themes, at
// 1440 only. The Linux baselines are written by the "Visual baselines" workflow, never on a laptop.
const SLICE_4 = [['proposal-evidence-locker', '/#/proposals/evidence-locker'], ['proposal-verdict-card', '/#/proposals/verdict-card'], ['pattern-copy', '/#/patterns/copy']] as const

for (const theme of THEMES) {
  test.describe(`proposal and pattern pages · ${theme}`, () => {
    for (const [name, path] of SLICE_4) {
      test(name, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'the proposal and pattern pages are screenshotted at 1440 only')
        await page.goto(path)
        await setTheme(page, theme)
        await page.evaluate(() => document.fonts.ready)
        // The page's sections load with its spec; the picture waits for them.
        await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible()
        await page.mouse.move(0, 0)
        await expect(page.locator('main')).toHaveScreenshot(`page-${name}-${theme}.png`)
      })
    }
  })
}
