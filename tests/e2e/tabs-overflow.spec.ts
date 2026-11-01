import { test, expect, type Locator, type Page } from '@playwright/test'
import { setTheme } from '../theme'

// Tabs overflow (guidelines/components/tabs.md, Overflow), on the playground's Tabs page with its ten
// security tabs, at 412px wide: the width the failures were measured at on 30 Oct 2026 (4 of 10 tabs
// showing, no cue, a Seed 1.6px of 24, the open tab scrolled away, a click leaving a tab 87% visible,
// the keyboard leaving the last tab 33% visible). The first five tests are the five decided that day.
// Alerts is the open tab; Audit log is disabled.

type Impl = 'core' | 'headless'
const IMPLS: Impl[] = ['core', 'headless']

async function open(page: Page, impl: Impl, width = 412) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/#/components/tabs')
  if (impl === 'headless') await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  const frame = page.locator('.pg-frame[data-theme="light"]')
  const list = frame.getByRole('tablist')
  await expect(list).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await list.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  return { frame, list }
}

const tabOf = (list: Locator, name: string) => list.getByRole('tab', { name: new RegExp(`^${name}`) })

interface Whole {
  /** Space between the scroller's visible box and the outside of the tab's focus ring, each side (px). */
  left: number; right: number; top: number; bottom: number
  masked: boolean; cut: boolean
  /** Overlaps the stuck open tab or the half gap past it. */
  underStuck: boolean
}

/** Where a tab and its ring lie in the scroller, and whether anything fades or covers it. */
const wholeness = (list: Locator, name: string) => list.evaluate((l: HTMLElement, name: string): Whole => {
  const tabs = [...l.querySelectorAll<HTMLElement>('[role="tab"]')]
  const t = tabs.find((x) => x.textContent!.startsWith(name))!
  const cs = getComputedStyle(t)
  const ring = parseFloat(cs.getPropertyValue('--vela-focus-ring-width')) + parseFloat(cs.getPropertyValue('--vela-focus-ring-offset'))
  const half = parseFloat(getComputedStyle(l).columnGap) / 2
  const box = l.getBoundingClientRect()
  const r = t.getBoundingClientRect()
  // The scroller's visible box: its padding box, which is where it clips.
  const inner = { left: box.left + l.clientLeft, right: box.left + l.clientLeft + l.clientWidth, top: box.top + l.clientTop, bottom: box.top + l.clientTop + l.clientHeight }
  const stuck = l.querySelector<HTMLElement>('[role="tab"][data-vela-stuck]')
  const s = stuck && stuck !== t ? stuck.getBoundingClientRect() : null
  return {
    left: r.left - ring - inner.left,
    right: inner.right - (r.right + ring),
    top: r.top - ring - inner.top,
    bottom: inner.bottom - (r.bottom + ring),
    masked: cs.maskImage !== 'none' && cs.maskImage !== '',
    cut: t.hasAttribute('data-vela-cut'),
    underStuck: s ? r.left < s.right + half && r.right > s.left - half : false,
  }
}, name)

/** The tab and its whole ring box inside the scroller's visible box, clear of the fades and the stuck tab. */
async function expectWhole(list: Locator, impl: Impl, name: string) {
  await expect.poll(async () => {
    const w = await wholeness(list, name)
    return { inside: [w.left, w.right, w.top, w.bottom].every((d) => d >= -0.5), masked: w.masked, cut: w.cut, underStuck: w.underStuck }
  }, { message: `${impl}: ${name} wholly in view, ring included` }).toEqual({ inside: true, masked: false, cut: false, underStuck: false })
}

/**
 * A tab after the open one that the scroller's end edge cuts through. When the row happens to end
 * between two tabs, it is scrolled until the next one is half cut.
 */
const partlyHidden = (list: Locator) => list.evaluate(async (l: HTMLElement) => {
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
  const box = l.getBoundingClientRect()
  const tabs = [...l.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)')].filter((x) => x.getAttribute('aria-selected') !== 'true')
  const straddles = (x: HTMLElement) => { const r = x.getBoundingClientRect(); return r.left < box.right - 4 && r.right > box.right + 0.5 }
  let t = tabs.find(straddles)
  if (!t) {
    const next = tabs.find((x) => x.getBoundingClientRect().left >= box.right - 4)!
    const r = next.getBoundingClientRect()
    l.scrollLeft += r.left + r.width / 2 - box.right
    await frame()
    t = next
  }
  const r = t.getBoundingClientRect()
  const from = Math.max(r.left, box.left), to = Math.min(r.right, box.right)
  return { name: t.textContent!.replace(/\d+$/, '').trim(), visible: (to - from) / r.width, x: (from + to) / 2, y: r.top + r.height / 2 }
})

test.describe('Tabs overflow, at 412px with ten tabs', () => {
  for (const impl of IMPLS) {
    test.describe(impl, () => {
      // Decided test 1.
      // [[rule: tabs-overflow-reveal-whole]]
      test('1. a tab clicked while partly hidden ends wholly in view, and the click lands', async ({ page }) => {
        const { list } = await open(page, impl)
        const p = await partlyHidden(list)
        expect(p.visible, `${p.name} starts partly hidden`).toBeLessThan(1)
        await page.mouse.click(p.x, p.y)
        await expect(tabOf(list, p.name)).toHaveAttribute('aria-selected', 'true')
        await expectWhole(list, impl, p.name)
      })

      // Decided test 2.
      // [[rule: tabs-overflow-reveal-whole]]
      test('2. a tab reached by the keyboard ends wholly in view, focus ring included', async ({ page }) => {
        const { list } = await open(page, impl)
        await tabOf(list, 'Alerts').focus()
        await page.keyboard.press('End')
        await expect(tabOf(list, 'Integrations')).toBeFocused()
        await expectWhole(list, impl, 'Integrations')
        await page.keyboard.press('Home')
        await expect(tabOf(list, 'Overview')).toBeFocused()
        await expectWhole(list, impl, 'Overview')
        // Every tab in turn, Audit log skipped.
        for (const name of ['Alerts', 'Assets', 'Identities', 'Policies', 'Devices', 'Reports', 'Sessions', 'Integrations']) {
          await page.keyboard.press('ArrowRight')
          await expect(tabOf(list, name)).toBeFocused()
          await expectWhole(list, impl, name)
        }
        // The ring is really drawn: a focus-visible outline, not none.
        await expect(tabOf(list, 'Integrations')).not.toHaveCSS('outline-style', 'none')
      })

      // Decided test 3.
      // [[rule: tabs-overflow-cue]]
      test('3. when tabs are hidden, a visible cue says so, at the edge where they are', async ({ page }) => {
        const { list, frame } = await open(page, impl)
        const cue = () => list.evaluate((l: HTMLElement) => ({
          start: l.hasAttribute('data-vela-more-start'),
          end: l.hasAttribute('data-vela-more-end'),
          // A fade is a mask on the tabs at that edge.
          faded: [...l.querySelectorAll<HTMLElement>('[role="tab"]')].filter((t) => getComputedStyle(t).maskImage.includes('linear-gradient')).length,
        }))
        await expect.poll(cue).toMatchObject({ start: false, end: true })
        expect((await cue()).faded).toBeGreaterThan(0)
        if (impl === 'headless') await expect(frame.locator('.vela-tabs__more')).toHaveText(/^\d+ more/)
        // Scrolled to the end, the cue moves to the start.
        await list.evaluate((l) => { l.scrollLeft = l.scrollWidth })
        await expect.poll(cue).toMatchObject({ start: true, end: false })
        expect((await cue()).faded).toBeGreaterThan(0)
        if (impl === 'headless') await expect(frame.locator('.vela-tabs__more')).toHaveText(/^\d+ more/)
      })

      // Decided test 5.
      // [[rule: tabs-overflow-seed-never-cut]]
      test.describe('with motion', () => {
        test.use({ reducedMotion: 'no-preference' })
        test('5. the Seed is never cut below 24px while the pointer is on any visible part of its tab', async ({ page }) => {
          const { list } = await open(page, impl)
          const seen = (name: string) => list.evaluate((l: HTMLElement, name: string) => {
            const t = [...l.querySelectorAll<HTMLElement>('[role="tab"]')].find((x) => x.textContent!.startsWith(name))!
            const seed = t.querySelector<HTMLElement>('.vela-tabs__seed')!
            const box = l.getBoundingClientRect(), s = seed.getBoundingClientRect()
            return { opacity: Number(getComputedStyle(seed).opacity), visible: Math.max(0, Math.min(s.right, box.right) - Math.max(s.left, box.left)) }
          }, name)
          const p = await partlyHidden(list)
          // Every visible part of the cut tab: near its visible edge, its middle, and inside the fade.
          const box = (await list.boundingBox())!
          for (const x of [p.x, Math.min(box.x + box.width - 2, p.x + 12), Math.max(box.x + 2, p.x - 12)]) {
            await page.mouse.move(0, 0)
            await page.mouse.move(x, p.y)
            await page.waitForTimeout(450)
            const s = await seen(p.name)
            // Half a pixel of slack, as the Seed's size test has: the scale is measured on whole pixels.
            expect(s.opacity === 0 || s.visible >= 23.5, `${p.name} at ${x}: ${JSON.stringify(s)}`).toBe(true)
          }
          // The control: on a whole tab the Seed does show, and whole.
          const whole = await list.evaluate((l: HTMLElement) => [...l.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled):not([aria-selected="true"]):not([data-vela-cut])')][0].textContent!.replace(/\d+$/, '').trim())
          await page.mouse.move(0, 0)
          await tabOf(list, whole).hover()
          await expect.poll(async () => (await seen(whole)).opacity).toBeGreaterThan(0.5)
          expect((await seen(whole)).visible).toBeGreaterThanOrEqual(23.5)
        })
      })

      // [[rule: tabs-overflow-scroll-instant]]
      for (const motion of ['reduce', 'no-preference'] as const) {
        test.describe(`reduced motion: ${motion}`, () => {
          test.use({ reducedMotion: motion })
          test('scrolling a tab into view is instant, with motion or without', async ({ page }) => {
            const { list } = await open(page, impl)
            expect(await list.evaluate((l) => getComputedStyle(l).scrollBehavior)).toBe('auto')
            await tabOf(list, 'Alerts').focus()
            // The scroll position one frame after the key, and again once anything could have animated.
            const after = await list.evaluate(async (l: HTMLElement) => {
              const tab = [...l.querySelectorAll<HTMLElement>('[role="tab"]')].pop()!
              tab.focus()
              await new Promise((r) => requestAnimationFrame(() => r(null)))
              const first = { at: l.scrollLeft, end: l.scrollWidth - l.clientWidth }
              await new Promise((r) => setTimeout(r, 400))
              return { first, later: { at: l.scrollLeft, end: l.scrollWidth - l.clientWidth } }
            })
            // At the end of the row on the first frame, and still there later. (On the headless row the
            // end itself can move once: Sessions comes into view, its news leaves the control, the
            // control narrows and the scroller widens.)
            expect(after.first.at).toBeGreaterThan(0)
            expect(Math.abs(after.first.at - after.first.end)).toBeLessThanOrEqual(1)
            expect(Math.abs(after.later.at - after.later.end)).toBeLessThanOrEqual(1)
          })
        })
      }

      // [[rule: tabs-overflow-forced-colours]]
      test('in forced colours the cue is a CanvasText line: no fade, a line at the edge where more tabs are', async ({ page }) => {
        await page.emulateMedia({ forcedColors: 'active' })
        const { list } = await open(page, impl)
        const sys = (c: string) => list.evaluate((l, c) => { const p = document.createElement('i'); p.style.cssText = `forced-color-adjust:none;color:${c}`; l.appendChild(p); const v = getComputedStyle(p).color; p.remove(); return v }, c)
        const canvasText = await sys('CanvasText')
        // Scrolled a little, so there are hidden tabs at both edges.
        await list.evaluate((l) => { l.scrollLeft = 30 })
        const probe = () => list.evaluate((l: HTMLElement) => ({
          masks: [...l.querySelectorAll<HTMLElement>('[role="tab"]')].map((t) => getComputedStyle(t).maskImage),
          shadow: getComputedStyle(l).boxShadow,
          stuck: l.getAttribute('data-vela-stuck'),
        }))
        await expect.poll(async () => (await probe()).shadow).toContain('inset')
        const p = await probe()
        expect(p.masks.every((m) => m === 'none')).toBe(true)
        expect(p.shadow).toContain(canvasText)
        // A line at each edge: the open tab is not stuck here, so the list draws both.
        expect(p.stuck).toBeNull()
        expect(p.shadow).toContain(`${canvasText} 1px 0px 0px 0px inset`)
        expect(p.shadow).toContain(`${canvasText} -1px 0px 0px 0px inset`)
      })
    })
  }

  // Decided test 4.
  // [[rule: tabs-overflow-open-tab-in-view]]
  test('4. the open tab is never out of view on the headless row: it sticks to the edge it would leave by', async ({ page }) => {
    const { list } = await open(page, 'headless')
    const openTab = () => list.evaluate((l: HTMLElement) => {
      const t = l.querySelector<HTMLElement>('[aria-selected="true"]')!
      const cs = getComputedStyle(t)
      const ring = parseFloat(cs.getPropertyValue('--vela-focus-ring-width')) + parseFloat(cs.getPropertyValue('--vela-focus-ring-offset'))
      const box = l.getBoundingClientRect(), r = t.getBoundingClientRect()
      return { left: r.left - ring - box.left, right: box.right - (r.right + ring), masked: cs.maskImage !== 'none', hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === t || t.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) }
    })
    const max = await list.evaluate((l) => l.scrollWidth - l.clientWidth)
    for (const at of [0, 40, 120, 250, max]) {
      await list.evaluate((l, at) => { l.scrollLeft = at }, at)
      await expect.poll(openTab, { message: `scrolled to ${at}` }).toMatchObject({ masked: false, hit: true })
      const o = await openTab()
      expect(o.left, `scrolled to ${at}`).toBeGreaterThanOrEqual(-0.5)
      expect(o.right, `scrolled to ${at}`).toBeGreaterThanOrEqual(-0.5)
    }
    // Open the last tab from the list, then scroll the row back to its start: it sticks to the end.
    await page.locator('.vela-tabs__more').click()
    await page.getByRole('menuitemradio', { name: 'Integrations' }).click()
    await expect(tabOf(list, 'Integrations')).toHaveAttribute('aria-selected', 'true')
    await list.evaluate((l) => { l.scrollLeft = 0 })
    await expect.poll(() => list.getAttribute('data-vela-stuck')).toBe('end')
    const o = await openTab()
    expect([o.masked, o.hit, o.left >= -0.5, o.right >= -0.5]).toEqual([false, true, true, true])
  })

  // [[rule: tabs-overflow-open-tab-in-view]]
  test('the core scrolls the open tab into view when it opens', async ({ page }) => {
    const { list } = await open(page, 'core')
    await tabOf(list, 'Alerts').focus()
    await page.keyboard.press('End')
    await expect(tabOf(list, 'Integrations')).toHaveAttribute('aria-selected', 'true')
    await expectWhole(list, 'core', 'Integrations')
  })

  // [[rule: tabs-overflow-control-outside]]
  test('the control sits outside the scroller: a count that changes never moves a tab, and its ring is never clipped', async ({ page }) => {
    const { list, frame } = await open(page, 'headless')
    const more = frame.locator('.vela-tabs__more')
    await expect(more).toBeVisible()
    expect(await more.evaluate((m) => m.closest('[role="tablist"]'))).toBeNull()
    const shape = () => list.evaluate((l: HTMLElement) => ({ width: l.clientWidth, offsets: [...l.querySelectorAll<HTMLElement>('[role="tab"]')].map((t) => t.offsetLeft) }))
    const before = await shape()
    const count = await more.textContent()
    // A little way along, one more tab passes out at the start than comes in at the end.
    await list.evaluate((l) => { l.scrollLeft = 40 })
    await expect(more).not.toHaveText(count!)
    expect(await shape()).toEqual(before)
    // Nothing between the control and the Tabs root clips: the ring shows whole.
    const clipped = await more.evaluate((m) => {
      const out: string[] = []
      for (let e = m.parentElement; e && !e.classList.contains('vela-tabs'); e = e.parentElement) {
        const cs = getComputedStyle(e)
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') out.push(e.className)
      }
      return out
    })
    expect(clipped).toEqual([])
    // From the keyboard: Tab leaves the tablist's one stop for the control, and its ring shows.
    await tabOf(list, 'Alerts').focus()
    await page.keyboard.press('Tab')
    await expect(more).toBeFocused()
    await expect(more).not.toHaveCSS('outline-style', 'none')
  })

  // [[rule: tabs-overflow-one-line]]
  test('the headless row is one line high, with nothing below it, and one unbroken rule under the tabs and the control', async ({ page }) => {
    const { frame } = await open(page, 'headless')
    const g = await frame.locator('.vela-tabs__row').evaluate((row: HTMLElement) => {
      const list = row.querySelector<HTMLElement>('[role="tablist"]')!
      const tab = list.querySelector<HTMLElement>('[role="tab"]')!
      const more = row.querySelector<HTMLElement>('.vela-tabs__more')!
      const r = row.getBoundingClientRect(), m = more.getBoundingClientRect()
      const ring = parseFloat(getComputedStyle(list).paddingTop) + parseFloat(getComputedStyle(list).paddingBottom)
      return {
        row: r.height, tab: tab.getBoundingClientRect().height, list: list.clientHeight - ring,
        scrollbar: list.offsetHeight - list.clientHeight,
        rowRule: getComputedStyle(row).boxShadow, listRule: getComputedStyle(list, '::before').display,
        controlInside: m.left >= r.left && m.right <= r.right + 0.5,
        shapes: [...row.querySelectorAll('*')].filter((e) => /pill|dot|divider|arrow/.test(String((e as HTMLElement).className))).length,
      }
    })
    expect(g.row).toBe(g.tab)
    expect(g.list).toBe(g.tab)
    expect(g.scrollbar).toBe(0)
    expect(g.rowRule).toMatch(/inset$|^.* 0px -1px 0px 0px inset/)
    // The list's own rule is off: the row draws the one rule.
    expect(g.listRule).toBe('none')
    expect(g.controlInside).toBe(true)
    expect(g.shapes).toBe(0)
  })
})

// When every tab fits the row is exactly today's: compared, in place, with the core. The Motion review
// page renders the same four tabs through each implementation, side by side, and both fit.
// [[rule: tabs-overflow-nothing-when-fits]]
test('when every tab fits, nothing appears, and the headless row lies exactly where the core row does', async ({ page }) => {
  await page.goto('/#/motion')
  await page.evaluate(() => document.fonts.ready)
  const shape = (impl: Impl) => page.locator(`.motion-frame[data-theme="light"] [data-implementation="${impl}"] .vela-tabs`).evaluate((root: HTMLElement) => {
    const l = root.querySelector<HTMLElement>('[role="tablist"]')!
    const o = root.getBoundingClientRect()
    const at = (r: DOMRect) => [Math.round((r.left - o.left) * 10) / 10, Math.round((r.top - o.top) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]
    const tabs = [...l.querySelectorAll<HTMLElement>('[role="tab"]')]
    // Where the one rule is drawn: the headless row's bottom edge (an inset shadow), or the core list's
    // ::before, a 1px border on the bottom of the list's content box, as wide as that box.
    const row = l.parentElement!.classList.contains('vela-tabs__row') ? l.parentElement! : null
    const lc = getComputedStyle(l), b = l.getBoundingClientRect()
    const content = new DOMRect(b.left + parseFloat(lc.paddingLeft), b.top + parseFloat(lc.paddingTop), l.clientWidth - parseFloat(lc.paddingLeft) - parseFloat(lc.paddingRight), l.clientHeight - parseFloat(lc.paddingTop) - parseFloat(lc.paddingBottom))
    // To the pixel: the core's box is read from whole-pixel client sizes.
    const ruleAt = (row ? at(row.getBoundingClientRect()) : at(content)).map(Math.round)
    const ruleColour = row ? getComputedStyle(row).boxShadow.replace(/ 0px -1px 0px 0px inset$/, '') : getComputedStyle(l, '::before').borderBottomColor
    return {
      fits: l.scrollWidth <= l.clientWidth,
      more: !!root.querySelector('.vela-tabs__more'),
      overflow: root.querySelector('[data-vela-overflow]') !== null,
      marks: [...l.attributes].map((a) => a.name).filter((n) => /more|stuck/.test(n)),
      masks: tabs.filter((t) => getComputedStyle(t).maskImage !== 'none').length,
      positions: tabs.map((t) => getComputedStyle(t).position),
      rects: tabs.map((t) => at(t.getBoundingClientRect())),
      rule: [...ruleAt, ruleColour],
    }
  })
  await expect(page.locator('.motion-frame[data-theme="light"] [data-implementation="headless"] [role="tablist"]')).toBeVisible()
  const core = await shape('core')
  const headless = await shape('headless')
  for (const s of [core, headless]) {
    expect(s.fits).toBe(true)
    expect(s.more).toBe(false)
    expect(s.overflow).toBe(false)
    expect(s.marks).toEqual([])
    expect(s.masks).toBe(0)
    expect(s.positions.every((p) => p === 'relative')).toBe(true)
  }
  expect(headless.rects).toEqual(core.rects)
  expect(headless.rule).toEqual(core.rule)
})

// The playground's stage width: narrowing the headless row loses more tabs into "N more", and
// Sessions' news shows once Sessions is hidden.
// [[rule: tabs-overflow-count-measured]]
test('the stage width handle shows the headless row losing tabs into "N more", and Sessions\' news', async ({ page }) => {
  const { frame } = await open(page, 'headless', 1440)
  const more = frame.locator('.vela-tabs__more')
  const count = async () => Number((await more.textContent())!.match(/^(\d+) more/)![1])
  await expect(more).toHaveText(/^\d+ more/)
  const wide = await count()
  const field = page.getByRole('spinbutton', { name: 'Container width' })
  await field.fill('412')
  await field.press('Enter')
  await expect.poll(count).toBeGreaterThan(wide)
  await expect(more).toHaveText(/^\d+ more · 1 new$/)
  await expect(more).toHaveAccessibleName(/^\d+ more, 1 new\. Show all tabs$/)
  const max = await field.getAttribute('max')
  await field.fill(max!)
  await field.press('Enter')
  await expect.poll(count).toBe(wide)
})

// The list: every tab that can be opened, in row order, and choosing one opens it and scrolls to it.
test('the headless list holds every tab in row order; choosing one opens it, scrolls to it and returns focus', async ({ page }) => {
  const { list, frame } = await open(page, 'headless')
  const more = frame.locator('.vela-tabs__more')
  await more.click()
  const menu = page.getByRole('menu', { name: 'All tabs' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitemradio')).toHaveText(['Overview', /^Alerts\s*open$/, 'Assets', 'Identities', 'Policies', 'Devices', 'Reports', /^Sessions\s*new$/, 'Integrations'])
  await menu.getByRole('menuitemradio', { name: 'Reports' }).click()
  await expect(menu).toBeHidden()
  await expect(tabOf(list, 'Reports')).toHaveAttribute('aria-selected', 'true')
  await expect(more).toBeFocused()
  await expectWhole(list, 'headless', 'Reports')
})

// The forced-colours detail of the headless row: the stuck tab's edge, the row's rule, the control.
// [[rule: tabs-overflow-forced-colours]]
test('in forced colours the stuck open tab\'s edge is a gap of Canvas and one CanvasText line; the control\'s clear border is Canvas', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  const { list, frame } = await open(page, 'headless')
  const sys = (c: string) => list.evaluate((l, c) => { const p = document.createElement('i'); p.style.cssText = `forced-color-adjust:none;color:${c}`; l.appendChild(p); const v = getComputedStyle(p).color; p.remove(); return v }, c)
  const [canvas, canvasText] = [await sys('Canvas'), await sys('CanvasText')]
  await list.evaluate((l) => { l.scrollLeft = l.scrollWidth })
  await expect.poll(() => list.getAttribute('data-vela-stuck')).toBe('start')
  const s = await frame.locator('.vela-tabs__row').evaluate((row: HTMLElement) => {
    const stuck = row.querySelector<HTMLElement>('[role="tab"][data-vela-stuck]')!
    const more = row.querySelector<HTMLElement>('.vela-tabs__more')!
    const list = row.querySelector<HTMLElement>('[role="tablist"]')!
    return {
      selected: stuck.getAttribute('aria-selected'),
      bg: getComputedStyle(stuck).backgroundColor, shadow: getComputedStyle(stuck).boxShadow,
      row: getComputedStyle(row).boxShadow,
      listRule: getComputedStyle(list, '::before').display,
      more: [getComputedStyle(more).color, getComputedStyle(more).borderBottomColor],
    }
  })
  expect(s.selected).toBe('true')
  expect(s.bg).toBe(canvas)
  // Canvas over the gap, then one pixel of CanvasText.
  expect(s.shadow.split(/,(?![^(]*\))/).map((x) => x.trim().startsWith(canvasText) || x.includes(canvasText))).toEqual([false, false, true])
  // The row's rule, one pixel below the tabs, outside the row so it is no taller; the list draws none.
  expect(s.row).toBe(`${canvasText} 0px 1px 0px 0px`)
  expect(s.listRule).toBe('none')
  expect(s.more).toEqual([canvasText, canvas])
})

// Label in Name (WCAG 2.5.3): the control's name starts with its visible words, in order. axe's
// label-content-name-mismatch rule (off by default, on here as on the site's axe run) checks it on
// the Tabs page with the control showing, news and all, in both themes.
// [[rule: tabs-overflow-news-words]]
for (const theme of ['Light', 'Dark'] as const) {
  test(`axe: the Tabs page with the "N more" control showing, in ${theme.toLowerCase()}, has no WCAG A or AA violation, label in name included`, async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright')
    await page.goto('/#/components/tabs?v=1&implementation=headless&w=412')
    await setTheme(page, theme)
    const more = page.locator('.vela-tabs__more').first()
    await expect(more).toHaveText(/^\d+ more · 1 new$/)
    await expect(more).toHaveAccessibleName(/^\d+ more, 1 new\. Show all tabs$/)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .options({ rules: { 'label-content-name-mismatch': { enabled: true } } })
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
    // The rule really ran on the control: it is among the passes, not left out.
    const ran = [...results.passes, ...results.incomplete].find((r) => r.id === 'label-content-name-mismatch')
    expect(ran?.nodes.some((n) => n.html.includes('vela-tabs__more')), 'axe checked the control').toBe(true)
  })
}

// The focus ring is never clipped: the list reaches the ring's width past the tabs on every side, as
// padding given back by a negative margin. The whole ring box of a focused first, middle and last tab
// lies inside the scroller's visible box, at the top, the bottom and both ends; and the row keeps its
// height and its place. Both implementations, at 412px (the row overflows) and at 1440 on the Motion
// page (it fits).
// [[rule: tabs-overflow-reveal-whole]]
test.describe('the focus ring is never clipped', () => {
  for (const impl of IMPLS) {
    test(`${impl}: the ring box of a focused first, middle and last tab lies inside the scroller`, async ({ page }) => {
      const { list } = await open(page, impl)
      await tabOf(list, 'Alerts').focus()
      for (const [key, name] of [['Home', 'Overview'], ['End', 'Integrations']] as const) {
        await page.keyboard.press(key)
        await expect(tabOf(list, name)).toBeFocused()
        await expectWhole(list, impl, name)
        await expect(tabOf(list, name)).not.toHaveCSS('outline-style', 'none')
      }
      // The middle: Policies, from the keyboard, so the ring shows.
      await page.keyboard.press('Home')
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
      await expect(tabOf(list, 'Policies')).toBeFocused()
      await expectWhole(list, impl, 'Policies')
      // The padding is the ring's reach, and the margin gives it back: the tabs' own box is unchanged.
      const g = await list.evaluate((l: HTMLElement) => {
        const cs = getComputedStyle(l)
        const ring = parseFloat(cs.getPropertyValue('--vela-focus-ring-width')) + parseFloat(cs.getPropertyValue('--vela-focus-ring-offset'))
        const tab = l.querySelector<HTMLElement>('[role="tab"]')!.getBoundingClientRect()
        const parent = (l.parentElement!.classList.contains('vela-tabs__row') ? l.parentElement! : l.parentElement!).getBoundingClientRect()
        return { ring, pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat), margin: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].map(parseFloat), tabTop: tab.top, parentTop: parent.top }
      })
      expect(g.pad).toEqual([g.ring, g.ring, g.ring, g.ring])
      expect(g.margin).toEqual([-g.ring, -g.ring, -g.ring, -g.ring])
      expect(g.tabTop).toBe(g.parentTop)
    })
  }

  test('when the row fits, a focused first and last tab\'s whole ring is inside the scroller too', async ({ page }) => {
    await page.goto('/#/motion')
    await page.evaluate(() => document.fonts.ready)
    for (const impl of IMPLS) {
      const list = page.locator(`.motion-frame[data-theme="light"] [data-implementation="${impl}"] [role="tablist"]`)
      await tabOf(list, 'Alerts').focus()
      for (const [key, name] of [['End', 'Audit log'], ['Home', 'Alerts']] as const) {
        await page.keyboard.press(key)
        await expect(tabOf(list, name)).toBeFocused()
        await expectWhole(list, impl, name)
      }
    }
  })
})
