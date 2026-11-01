import { test, expect, type Page } from '@playwright/test'
import { setTheme } from '../theme'

// Slices 2 and 3 of the playground uplift (s5-tabs): a component page's Playground, Rules, Tokens
// and Figma tabs, whole, in both themes, at the desktop width only. Button (10 rules), Tabs (17, a
// group of 12) and Toast (27, the longest). The Linux baselines are written by the "Visual baselines" workflow, never on a
// laptop. The titles never say "components ·", so the other widths' projects leave these alone.
const THEMES = ['light', 'dark'] as const

/**
 * Slice 7: the Next cards and "Where it sits" show component stills, loaded lazily. A capture of a
 * whole page never scrolls to them, so each is loaded first, and the picture waits for every one.
 */
async function stillsLoaded(page: Page) {
  await page.evaluate(() => document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((i) => { i.loading = 'eager' }))
  await expect.poll(() => page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0))).toBe(true)
}
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
  await stillsLoaded(page)
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
        await stillsLoaded(page)
        await page.mouse.move(0, 0)
        // A whole page taller than the window scrolls while it is captured, and its section index marks
        // a new current section as it goes, so two captures never match. Make the window as tall as the
        // page first: nothing scrolls, and the index stays on its first section.
        const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight))
        await page.setViewportSize({ width: 1440, height })
        await expect(page.locator('main')).toHaveScreenshot(`page-${name}-${theme}.png`)
      })
    }
  })
}

// Slice 5 of the playground uplift: How it is made, Component status and Not found, whole, in both
// themes, at 1440 only. The suite runs with reduced motion, so How it is made is shown with every
// part already there. The Linux baselines are written by the "Visual baselines" workflow, never on a laptop.
const SLICE_5 = [['doc-how', '/#/how'], ['doc-status', '/#/status'], ['doc-not-found', '/#/components/firewall-rule']] as const

for (const theme of THEMES) {
  test.describe(`doc pages · ${theme}`, () => {
    for (const [name, path] of SLICE_5) {
      test(name, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'the doc pages are screenshotted at 1440 only')
        await page.goto(path)
        await setTheme(page, theme)
        await page.evaluate(() => document.fonts.ready)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.mouse.move(0, 0)
        // As for slice 4: a window as tall as the page, so nothing scrolls while it is captured.
        const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight))
        await page.setViewportSize({ width: 1440, height })
        await expect(page.locator('main')).toHaveScreenshot(`page-${name}-${theme}.png`)
      })
    }
  })
}

// Slice 6 of the playground uplift: the Overview, Colour and Typography, whole, in both themes, at 1440
// only. Each is taken in a window as tall as the page, so nothing scrolls while it is captured (a page
// that scrolls during a capture never gives two matching shots). The suite runs with reduced motion, so
// the hero's mark is at rest and nothing arrives. The commit stamp changes with every build, so it is
// masked. The Linux baselines are written by the "Visual baselines" workflow, never on a laptop.
const SLICE_6 = [['overview', '/#/', 'Vela Design System'], ['foundation-colour', '/#/foundations/color', 'Colour'], ['foundation-typography', '/#/foundations/typography', 'Typography']] as const

for (const theme of THEMES) {
  test.describe(`overview and foundations · ${theme}`, () => {
    for (const [name, path, h1] of SLICE_6) {
      test(name, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'the Overview and the foundations are screenshotted at 1440 only')
        await page.goto(path)
        await setTheme(page, theme)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1)
        await page.evaluate(() => document.fonts.ready)
        await page.mouse.move(0, 0)
        // As tall as the page; measured again once the window has grown, until it holds.
        for (let i = 0, last = 0; i < 3; i++) {
          const height = await page.evaluate(() => document.documentElement.scrollHeight)
          if (height === last) break
          await page.setViewportSize({ width: 1440, height })
          last = height
        }
        await expect(page).toHaveScreenshot(`page-${name}-${theme}.png`, { fullPage: true, mask: [page.locator('.ov-stamp').first()] })
      })
    }
  })
}

// Tabs overflow (guidelines/components/tabs.md, Overflow): the Tabs Playground's stage, headless, at
// a narrow stage (the stage width control at 412px), so the row has lost tabs into "N more · 1 new"
// and the edge fades. Both themes, at 1440 only. The Linux baselines are written by the "Visual
// baselines" workflow, never on a laptop.
for (const theme of THEMES) {
  test.describe(`tabs overflow · ${theme}`, () => {
    test('tabs playground, headless, narrow stage', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'the tabs overflow stage is screenshotted at 1440 only')
      await page.goto('/#/components/tabs?v=1&implementation=headless&w=412')
      await setTheme(page, theme)
      await page.evaluate(() => document.fonts.ready)
      const stage = page.getByRole('region', { name: 'Live demo', exact: true })
      await expect(stage).toBeVisible()
      await expect(stage.locator('.vela-tabs__more').first()).toHaveText(/^\d+ more · 1 new$/)
      await page.mouse.move(0, 0)
      await expect(stage).toHaveScreenshot(`page-tabs-playground-narrow-headless-${theme}.png`)
    })
  })
}
