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

  test('forced colours: the Seed is a solid 1px line in CanvasText, never the selection\'s Highlight; no mask, no bloom', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await choose(page, 'Seed between tabs', 'fade')
    await page.locator('.tp-section').getByRole('switch', { name: 'Dawn bloom' }).click()
    const tab = tabs(page).nth(3)
    await tab.hover()
    await expect.poll(async () => (await seedOpacities(page))[3]).toBe(1)
    const seed = await tab.locator('.tp-seed').evaluate((e) => {
      const sys = (c: string) => {
        const probe = document.createElement('span')
        probe.style.cssText = `forced-color-adjust:none;background:${c}`
        document.body.append(probe)
        const v = getComputedStyle(probe).backgroundColor
        probe.remove()
        return v
      }
      const cs = getComputedStyle(e)
      return { bg: cs.backgroundColor, canvasText: sys('CanvasText'), highlight: sys('Highlight'), mask: cs.maskImage, height: cs.height }
    })
    // Neutral, so preview and selection never collapse into one mark.
    expect(seed.bg).toBe(seed.canvasText)
    expect(seed.bg).not.toBe(seed.highlight)
    expect(seed.mask).toBe('none')
    expect(seed.height).toBe('1px')
    expect(await tab.locator('.tp-bloom').evaluate((e) => getComputedStyle(e).display)).toBe('none')
  })

  // The sweep's short-label gap: a third of a 13px tab was 4px. The Seed is a third, floored at
  // 24px, never wider than the tab, in both modes.
  test('a short label still gets a Seed of at least 24px, or the tab\'s width', async ({ page }) => {
    for (const between of ['fade', 'glide'] as const) {
      await choose(page, 'Click', 'land')
      await choose(page, 'Seed between tabs', between)
      await tabs(page).nth(3).evaluate((t) => { t.firstChild!.textContent = 'IP' })
      await tabs(page).nth(5).evaluate((t) => { t.firstChild!.textContent = 'Device posture' })
      for (const i of [3, 5]) {
        await page.mouse.move(0, 0)
        await tabs(page).nth(i).hover()
        const sel = between === 'glide' ? '.tp-glide[data-shown] .tp-glide__seed' : `[role="tab"]:nth-child(${i + 1}) .tp-seed`
        await expect.poll(() => light(page).locator(sel).count()).toBe(1)
        await page.waitForTimeout(400)
        const { seed, tab } = await light(page).locator(sel).evaluate((e, i) => ({
          seed: e.getBoundingClientRect().width,
          tab: document.querySelectorAll('.tp-frame[data-theme="light"] [role="tab"]')[i].getBoundingClientRect().width,
        }), i)
        expect(seed, `${between} tab ${i}`).toBeGreaterThanOrEqual(Math.min(24, tab) - 0.5)
        expect(seed, `${between} tab ${i}`).toBeLessThanOrEqual(Math.max(24, tab / 3) + 0.5)
      }
      await page.reload()
      await page.locator('.tp-section').scrollIntoViewIfNeeded()
    }
  })

  test.describe('glide, the out-delay', () => {
    test.use({ reducedMotion: 'no-preference' })
    // The sweep's stale-position gap: the Seed stayed under a tab the pointer had left.
    test('a pointer that stops between tabs, or crosses tabs without resting, lets the Seed go', async ({ page }) => {
      await tabs(page).nth(9).hover()
      await expect.poll(() => glideShown(page)).toBe(1)
      const b9 = (await tabs(page).nth(9).boundingBox())!
      const b4 = (await tabs(page).nth(4).boundingBox())!
      const y = b9.y + b9.height / 2
      // Into the gap after tab 4, across tabs 8..5 without resting.
      await page.mouse.move(b4.x + b4.width + 6, y, { steps: 6 })
      await page.waitForTimeout(450)
      expect(await glideShown(page)).toBe(0)
      // Back onto a tab and resting there: it appears again.
      await page.mouse.move(b4.x + b4.width / 2, y, { steps: 2 })
      await expect.poll(() => glideShown(page)).toBe(1)
    })

    test('when the row scrolls under a still pointer, the Seed follows the tab now under it', async ({ page }) => {
      await page.setViewportSize({ width: 400, height: 900 })
      await page.reload()
      await tabs(page).nth(1).evaluate((t) => t.scrollIntoView({ block: 'center', inline: 'nearest' }))
      const b1 = (await tabs(page).nth(1).boundingBox())!
      await page.mouse.move(b1.x + b1.width / 2 - 2, b1.y + b1.height / 2)
      await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2)
      await expect.poll(() => glideShown(page)).toBe(1)
      await page.mouse.wheel(160, 0)
      await page.waitForTimeout(700)
      const r = await light(page).evaluate((f) => {
        const s = f.querySelector('.tp-glide[data-shown] .tp-glide__seed')
        if (!s) return 'hidden'
        const sb = s.getBoundingClientRect(); const cx = sb.left + sb.width / 2
        const under = [...f.querySelectorAll('[role="tab"]')].find((t) => t.matches(':hover'))
        if (!under) return 'no tab under the pointer'
        const tb = under.getBoundingClientRect()
        return Math.abs(cx - (tb.left + tb.width / 2)) < 1 ? 'under the hovered tab' : 'elsewhere'
      })
      expect(['under the hovered tab', 'hidden']).toContain(r)
    })
  })

  // Hybrid, the eye-tracking rule: a press at most two tabs from the selected one, both wholly in
  // view, travels (the shipped bar); anything else grows in place (A) and hands back to the border.
  test.describe('hybrid press', () => {
    test.use({ reducedMotion: 'no-preference' })
    const probe = (page: Page) => light(page).evaluate((f) => ({
      press: f.getAttribute('data-press'),
      moving: f.querySelector('[role="tablist"]')!.hasAttribute('data-vela-moving'),
      bar: getComputedStyle(f.querySelector('.vela-tabs__indicator')!).visibility,
    }))
    test('near travels, far grows in place, and out of view counts as far', async ({ page }) => {
      await choose(page, 'Click', 'hybrid')
      await expect(page.locator('.tp-section').getByLabel('Seed between tabs')).toHaveValue('glide')
      // Near: Overview → Assets, two tabs, both in view.
      await tabs(page).nth(2).click()
      expect(await probe(page)).toEqual({ press: null, moving: true, bar: 'visible' })
      await expect.poll(async () => (await probe(page)).moving).toBe(false)
      // Far: Assets → Sessions, six tabs.
      await tabs(page).nth(8).click()
      expect(await probe(page)).toEqual({ press: 'grow', moving: true, bar: 'hidden' })
      // …and back to the tab's own border once the switch ends.
      await expect.poll(async () => (await probe(page)).press).toBe(null)
      expect(await tabs(page).nth(8).evaluate((t) => getComputedStyle(t).borderBottomColor)).not.toBe('rgba(0, 0, 0, 0)')
      await expect(light(page).locator('.tp-caption')).toContainText('6 tabs from Assets → far → it grows in place (A)')
    })
    test('a neighbour whose selected tab has scrolled out of view grows in place', async ({ page }) => {
      await page.setViewportSize({ width: 412, height: 900 })
      await page.reload()
      await choose(page, 'Click', 'hybrid')
      await tabs(page).nth(1).click()   // Alerts selected, then scroll it out of view
      await expect.poll(async () => (await probe(page)).moving).toBe(false)
      // Scroll the row so Alerts is cut by its left edge; Identities stays in view.
      await light(page).getByRole('tablist').evaluate((l) => {
        const alerts = l.querySelectorAll<HTMLElement>('[role="tab"]')[1]
        l.scrollLeft = alerts.offsetLeft - l.offsetLeft + 10
      })
      // Identities is two tabs from Alerts, but Alerts is out of view.
      const alertsInView = await light(page).evaluate((f) => {
        const l = f.querySelector('[role="tablist"]')!.getBoundingClientRect(); const t = f.querySelectorAll('[role="tab"]')[1].getBoundingClientRect()
        return t.left >= l.left && t.right <= l.right
      })
      expect(alertsInView).toBe(false)
      await tabs(page).nth(3).click()
      expect((await probe(page)).press).toBe('grow')
    })
  })
})
