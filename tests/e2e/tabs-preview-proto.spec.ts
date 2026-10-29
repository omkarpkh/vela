import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import { lintCss } from '../../scripts/check-css.mjs'

// PROTOTYPE, not shipped: the Tabs hover preview ("the Seed") on the Motion review page
// (demo/pages/motion/TabsPreviewProto.tsx). Behaviour only, no screenshots. What it pins: the
// section renders, a quick sweep shows nothing, a rest shows the Seed, keyboard focus never does,
// the bloom stays below the label, and the stylesheet keeps the motion rules.

const light = (page: Page) => page.locator('.tp-frame[data-theme="light"]')
const tabs = (page: Page) => light(page).getByRole('tablist', { name: 'Views (prototype, light)' }).getByRole('tab')
const seedOpacities = (page: Page) =>
  light(page).locator('.tp-seed').evaluateAll((els) => els.map((e) => Number(getComputedStyle(e).opacity)))
const glideShown = (page: Page) => light(page).locator('.tp-glide[data-shown]').count()
const choose = (page: Page, label: string, value: string) => page.locator('.tp-section').getByLabel(label).selectOption(value)

test.describe('Tabs hover preview prototype', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/motion')
    await expect(page.getByRole('heading', { level: 2, name: /Tabs hover preview — prototypes \(not shipped\)/ })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await page.mouse.move(0, 0)
  })

  test('the section renders the same row in light and dark, with its controls', async ({ page }) => {
    for (const m of ['light', 'dark']) {
      await expect(page.getByRole('tablist', { name: `Views (prototype, ${m})` }).getByRole('tab')).toHaveCount(10)
    }
    const section = page.locator('.tp-section')
    for (const label of ['Variant', 'Click', 'Seed between tabs', 'Strength']) await expect(section.getByLabel(label)).toBeVisible()
    await expect(section.getByRole('switch', { name: 'Dawn bloom' })).toBeVisible()
    // Glide is the default with A; B defaults to Fade.
    await expect(section.getByLabel('Seed between tabs')).toHaveValue('glide')
    await choose(page, 'Click', 'land')
    await expect(section.getByLabel('Seed between tabs')).toHaveValue('fade')
    // The decorative layers do not change a tab's name.
    await expect(tabs(page).nth(1)).toHaveAccessibleName('Alerts 12')
  })

  test('the prototype stylesheet only moves transform and opacity, and binds no raw colour', () => {
    const css = readFileSync(new URL('../../demo/pages/motion/tabs-preview-proto.css', import.meta.url), 'utf8')
    const { findings, waivers } = lintCss(css)
    expect(findings.filter((f: { waived: boolean }) => !f.waived)).toEqual([])
    expect(waivers.every((w: { reason: string }) => w.reason.length > 0)).toBe(true)
  })

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    for (const between of ['fade', 'glide'] as const) {
      test(`${between}: a quick sweep shows nothing; a rest shows the Seed`, async ({ page }) => {
        // B, so the selected tab's own Seed layer is not A's grown underline and every layer at
        // rest is 0. (Choosing Click resets the between-tabs default, so it goes first.)
        await choose(page, 'Click', 'land')
        await choose(page, 'Seed between tabs', between)
        const first = (await tabs(page).nth(1).boundingBox())!
        const last = (await tabs(page).nth(9).boundingBox())!
        const y = first.y + first.height / 2
        await page.mouse.move(first.x + 2, y)
        await page.mouse.move(last.x + last.width - 2, y, { steps: 10 })
        await page.mouse.move(last.x + last.width - 2, y + 200)
        await page.waitForTimeout(400)
        expect((await seedOpacities(page)).every((o) => o === 0)).toBe(true)
        expect(await glideShown(page)).toBe(0)

        await tabs(page).nth(4).hover()
        if (between === 'fade') {
          await expect.poll(async () => (await seedOpacities(page))[4]).toBeCloseTo(0.4, 2)
        } else {
          await expect.poll(() => glideShown(page)).toBe(1)
          await expect.poll(() => light(page).locator('.tp-glide[data-shown]').evaluate((e) => getComputedStyle(e).opacity)).toBe('0.4')
          // The per-tab Seeds stay out of it in this mode.
          expect((await seedOpacities(page)).every((o) => o === 0)).toBe(true)
        }
        // Never on the selected tab.
        await tabs(page).nth(0).hover()
        await page.waitForTimeout(500)
        expect((await seedOpacities(page))[0]).toBe(0)
        expect(await glideShown(page)).toBe(0)
      })
    }

    test('glide: a rest one tab over travels by transform; five tabs away it fades instead', async ({ page }) => {
      await page.getByRole('switch', { name: '×5 slow motion' }).click()
      const glides = light(page).locator('.tp-glide')
      await tabs(page).nth(2).hover()
      await expect.poll(() => glideShown(page)).toBe(1)
      const firstIndex = await glides.evaluateAll((els) => els.findIndex((e) => e.hasAttribute('data-shown')))
      await tabs(page).nth(3).hover()
      await expect.poll(() => glides.nth(firstIndex).getAttribute('data-move')).toBe('glide')
      await expect.poll(() => glides.nth(firstIndex).evaluate((e) =>
        e.getAnimations().map((a) => (a as CSSTransition).transitionProperty))).toContain('transform')
      await expect(glides.nth(firstIndex)).toHaveAttribute('data-shown', '')
      await tabs(page).nth(8).hover()
      // The other element appears there by a jump and a fade; the first fades out where it was.
      await expect.poll(() => glides.nth(1 - firstIndex).getAttribute('data-move')).toBe('jump')
      await expect(glides.nth(1 - firstIndex)).toHaveAttribute('data-shown', '')
      await expect(glides.nth(firstIndex)).toHaveAttribute('data-hide', 'leave')
    })

    test('keyboard focus never shows the Seed and nothing in the row animates', async ({ page }) => {
      for (const between of ['fade', 'glide']) {
        await choose(page, 'Seed between tabs', between)
        await tabs(page).nth(0).focus()
        for (let i = 0; i < 4; i++) {
          await page.keyboard.press('ArrowRight')
          const running = await light(page).locator('.vela-tabs').evaluate((root) => root.getAnimations({ subtree: true }).length)
          expect(running).toBe(0)
        }
        await page.waitForTimeout(300)
        expect((await seedOpacities(page)).filter((o, i) => i !== 4).every((o) => o === 0)).toBe(true)
        expect(await glideShown(page)).toBe(0)
        await page.keyboard.press('Home')
      }
    })
  })

  test('the dawn bloom stays below the label\'s text box', async ({ page }) => {
    await choose(page, 'Seed between tabs', 'fade')
    await page.locator('.tp-section').getByRole('switch', { name: 'Dawn bloom' }).click()
    const tab = tabs(page).nth(3)
    await tab.hover()
    await expect.poll(() => tab.locator('.tp-bloom').evaluate((e) => getComputedStyle(e).opacity)).toBe('0.15')
    const { bloomTop, textBottom } = await tab.evaluate((t) => {
      const cs = getComputedStyle(t)
      const r = t.getBoundingClientRect()
      return {
        bloomTop: t.querySelector('.tp-bloom')!.getBoundingClientRect().top,
        textBottom: r.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop) + parseFloat(cs.lineHeight),
      }
    })
    expect(bloomTop).toBeGreaterThanOrEqual(textBottom)
  })

  test('forced colours: the Seed is a solid line in Highlight, no mask, no bloom', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await choose(page, 'Seed between tabs', 'fade')
    await page.locator('.tp-section').getByRole('switch', { name: 'Dawn bloom' }).click()
    const tab = tabs(page).nth(3)
    await tab.hover()
    await expect.poll(async () => (await seedOpacities(page))[3]).toBe(1)
    const seed = await tab.locator('.tp-seed').evaluate((e) => {
      const probe = document.createElement('span')
      probe.style.cssText = 'forced-color-adjust:none;background:Highlight'
      document.body.append(probe)
      const highlight = getComputedStyle(probe).backgroundColor
      probe.remove()
      const cs = getComputedStyle(e)
      return { bg: cs.backgroundColor, highlight, mask: cs.maskImage, height: cs.height }
    })
    expect(seed.bg).toBe(seed.highlight)
    expect(seed.mask).toBe('none')
    expect(seed.height).toBe('1px')
    expect(await tab.locator('.tp-bloom').evaluate((e) => getComputedStyle(e).display)).toBe('none')
  })
})
