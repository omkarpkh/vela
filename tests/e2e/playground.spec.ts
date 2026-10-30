import { test, expect } from '@playwright/test'

// Behavioural checks on the playground — no screenshots, so no baselines to maintain.
test('the Button page constrains text-link the way the type does, and the code follows', async ({ page }) => {
  await page.goto('/#/components/button')
  await expect(page.getByRole('heading', { level: 1, name: 'Button' })).toBeVisible()
  const props = page.getByRole('complementary', { name: 'Props' })
  await props.getByLabel('appearance').selectOption('text-link')
  // <option disabled> is not a "disableable" element in Playwright's model; assert the attribute.
  await expect(props.getByLabel('variant').locator('option[value=destructive]')).toHaveAttribute('disabled', '')
  await expect(props.getByLabel('size').locator('option[value=huge]')).toHaveAttribute('disabled', '')
  await expect(page.locator('.pg-code')).toContainText('appearance="text-link"')
  await expect(page.locator('.pg-code')).not.toContainText('icon=')
})

test('navigation reaches every component and each page lists its tokens', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Site' })
  for (const name of ['Button', 'Toggle', 'Input', 'Text Area', 'Contextual Alert', 'Status Indicator', 'Risk Pill', 'Tabs', 'Icon', 'Checkbox', 'Radio Group', 'Table', 'Popover', 'Tooltip', 'Dialog', 'Toast', 'Dropdown List']) {
    // A lifecycle tag is part of the link's name ("Popover Experimental"); Approved has none.
    await nav.getByRole('link', { name: new RegExp(`^${name}( (Experimental|Known bugs|Retired))?$`) }).click()
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(page.getByRole('tab', { name: /^Tokens/ })).not.toHaveText(/Tokens\s*0$/)
  }
})

// [[rule: text-area-never-resizes-horizontally]]
// The UA default for a <textarea> is `resize: both`, and a host stylesheet can say the same; the
// component's class must win either way. A drag on the handle is the proof: it may move the
// bottom edge, never the right one, and never above `rows` lines (3 x the 21px body line here).
test('the Text Area page counts as you type and the field only ever resizes vertically', async ({ page }) => {
  await page.goto('/#/components/text-area')
  await expect(page.getByRole('heading', { level: 1, name: 'Text Area' })).toBeVisible()
  await page.addStyleTag({ content: 'textarea { resize: both; }' })
  const field = page.locator('.pg-frame-body textarea').first()
  const count = page.locator('.pg-frame-body .vela-text-area__count').first()
  await field.fill('Public bucket 🔒')
  await expect(count).toHaveText('15 / 140')
  expect(await field.evaluate((el) => getComputedStyle(el).resize)).toBe('vertical')
  expect(await field.evaluate((el) => getComputedStyle(el).minHeight)).toBe('63px')

  const before = (await field.boundingBox())!
  await page.mouse.move(before.x + before.width - 3, before.y + before.height - 3)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width + 120, before.y + before.height + 60, { steps: 6 })
  await page.mouse.up()
  const grown = (await field.boundingBox())!
  expect(grown.width).toBeCloseTo(before.width, 0)
  expect(grown.height).toBeGreaterThan(before.height + 40)

  await page.mouse.move(grown.x + grown.width - 3, grown.y + grown.height - 3)
  await page.mouse.down()
  await page.mouse.move(grown.x + grown.width - 3, grown.y + 4, { steps: 6 })
  await page.mouse.up()
  const shrunk = (await field.boundingBox())!
  expect(shrunk.height).toBeCloseTo(before.height, 0)

  await page.getByRole('complementary', { name: 'Props' }).getByLabel('resize').selectOption('none')
  await expect(page.locator('.pg-code')).toContainText('resize="none"')
  expect(await page.locator('.pg-frame-body textarea').first().evaluate((el) => getComputedStyle(el).resize)).toBe('none')
})

// Two entry points, one playground (decisions/002): the Tabs page renders the same props through
// the core or the headless (Base UI) implementation, and the Code tab's import line and install
// command follow the choice. Both implementations must behave the same on the stage.
test('the Tabs page switches implementation, and the import line and install command follow', async ({ page }) => {
  await page.goto('/#/components/tabs')
  await expect(page.getByRole('heading', { level: 1, name: 'Tabs' })).toBeVisible()
  const contract = page.getByRole('region', { name: /^Use / })
  await expect(contract.locator('.pg-import')).toContainText("import { Tabs } from '@omkarux/vela'")
  await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela')
  await expect(contract.locator('.pg-install-note')).toHaveCount(0)

  await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
  await expect(contract.locator('.pg-import')).toContainText("import { Tabs } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela @base-ui/react')

  // The light frame's tabs, now rendered by Base UI, still honour the spec: arrow keys select,
  // the disabled tab is skipped, only the active panel is mounted, the stylesheet applies.
  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const alerts = frame.getByRole('tab', { name: /^Alerts/ })
  await expect(alerts).toHaveAttribute('aria-selected', 'true')
  await expect(frame.getByRole('tab', { name: 'Audit' })).toBeDisabled()
  await alerts.focus()
  await page.keyboard.press('ArrowRight')
  await expect(frame.getByRole('tab', { name: /^Assets/ })).toHaveAttribute('aria-selected', 'true')
  await expect(frame.getByRole('tabpanel')).toHaveText('Only the active panel is mounted.')
  await page.keyboard.press('ArrowRight')   // Audit is disabled: wraps to Alerts
  await expect(alerts).toBeFocused()
  await expect(alerts).toHaveAttribute('aria-selected', 'true')
  // Tabs.css keys on `[aria-selected='true']` and `:disabled`; Base UI's markup must hit both.
  const underline = (name: RegExp | string) => frame.getByRole('tab', { name }).evaluate((el) => getComputedStyle(el).borderBottomColor)
  expect(await underline(/^Alerts/)).not.toBe('rgba(0, 0, 0, 0)')
  expect(await underline(/^Assets/)).toBe('rgba(0, 0, 0, 0)')
  await expect(frame.getByRole('tab', { name: 'Audit' })).toHaveCSS('cursor', 'not-allowed')
})

// Checkbox and Radio Group are headless-born: one implementation, so no Implementation control,
// the import line names `/headless` and the install command names Base UI. On the stage the
// Base UI markup must hit the stylesheet: the fill keys on aria-checked, disabled on :disabled.
test('the Checkbox page renders the headless Checkbox: Space toggles, the fill follows aria-checked', async ({ page }) => {
  await page.goto('/#/components/checkbox')
  await expect(page.getByRole('heading', { level: 1, name: 'Checkbox' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Implementation' })).toHaveCount(0)
  const contract = page.getByRole('region', { name: /^Use / })
  await expect(contract.locator('.pg-import')).toContainText("import { Checkbox } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela @base-ui/react')

  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const box = frame.getByRole('checkbox', { name: 'Accept the data-processing terms' })
  await expect(box).toHaveAttribute('aria-checked', 'true')
  // The fill transitions (control fill at --vela-duration-fast), so the assertions retry.
  const checkedFill = await box.evaluate((el) => getComputedStyle(el).backgroundColor)
  await box.focus()
  await page.keyboard.press('Space')
  await expect(box).toHaveAttribute('aria-checked', 'false')
  await expect(box).not.toHaveCSS('background-color', checkedFill)
  await page.keyboard.press('Enter')   // Enter submits a form; it never toggles
  await expect(box).toHaveAttribute('aria-checked', 'false')
  await frame.getByText('Accept the data-processing terms').click()
  await expect(box).toHaveAttribute('aria-checked', 'true')
  await expect(box).toHaveCSS('background-color', checkedFill)

  const props = page.getByRole('complementary', { name: 'Props' })
  await props.getByRole('switch', { name: 'indeterminate' }).click()
  await expect(frame.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
  await props.getByRole('switch', { name: 'disabled' }).click()
  await expect(frame.getByRole('checkbox')).toBeDisabled()
  await expect(frame.getByRole('checkbox')).toHaveCSS('cursor', 'not-allowed')
})

test('the Radio Group page renders the headless group: arrows move the selection and skip the disabled radio', async ({ page }) => {
  await page.goto('/#/components/radio-group')
  await expect(page.getByRole('heading', { level: 1, name: 'Radio Group' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Implementation' })).toHaveCount(0)
  const contract = page.getByRole('region', { name: /^Use / })
  await expect(contract.locator('.pg-import')).toContainText("import { RadioGroup } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela @base-ui/react')

  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  await expect(frame.getByRole('radiogroup', { name: 'Enforcement' })).toBeVisible()
  const block = frame.getByRole('radio', { name: 'Block' })
  const quarantine = frame.getByRole('radio', { name: 'Quarantine' })
  await expect(block).toHaveAttribute('aria-checked', 'true')
  await expect(frame.getByRole('radio', { name: 'Isolate' })).toBeDisabled()
  await block.focus()
  await page.keyboard.press('ArrowDown')   // Isolate is disabled: skipped
  await expect(quarantine).toBeFocused()
  await expect(quarantine).toHaveAttribute('aria-checked', 'true')
  await expect(block).toHaveAttribute('aria-checked', 'false')
  // RadioGroup.css keys the fill on aria-checked: the selected circle is filled, the others are not.
  const bg = (name: string) => frame.getByRole('radio', { name }).evaluate((el) => getComputedStyle(el).backgroundColor)
  await expect.poll(async () => (await bg('Quarantine')) !== (await bg('Block'))).toBe(true)
  await expect(frame.getByRole('radio', { name: 'Isolate' })).toHaveCSS('cursor', 'not-allowed')
  // The circle is a circle: border-radius 50%, not the radius scale.
  await expect(block).toHaveCSS('border-radius', '50%')
})

// Table (Phase 1, core). The stage is a host that owns the rows, the sort and the selection; the
// table renders aria-sort and a real button, and the host re-sorts. The button's name is asserted
// exactly, in a real browser: "Open findings, sort ascending", label first, no stray space.
// The Tabs stage at phone width: the frame used to centre a body that hugs its content, so a
// panel with shorter text moved the whole tab list. And the list scrolls sideways only: no
// vertical scroll range, which a touch browser shows as a stray scrollbar at the list's end.
test('on the Tabs page the tab list stays put when the panel changes, and never scrolls vertically', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 900 })
  for (const impl of ['core', 'headless'] as const) {
    await page.goto('/#/components/tabs')
    if (impl === 'headless') await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
    const frame = page.locator('.pg-frame[data-theme="light"]')
    const list = frame.getByRole('tablist')
    await expect(list).toBeVisible()
    // In view first: the click would scroll it there, and a scroll is not the list moving.
    await list.scrollIntoViewIfNeeded()
    const before = (await list.boundingBox())!
    await frame.getByRole('tab', { name: /Assets/ }).click()
    await expect(frame.getByRole('tab', { name: /Assets/ })).toHaveAttribute('aria-selected', 'true')
    const after = (await list.boundingBox())!
    expect([after.x, after.y, after.width], impl).toEqual([before.x, before.y, before.width])
    // Hidden, not auto: no vertical scroll range a person can reach, so no scrollbar to draw.
    await expect(list).toHaveCSS('overflow-y', 'hidden')
    await expect(list).toHaveCSS('overflow-x', 'auto')
  }
})

// The list clips at its padding box (it scrolls), so anything below that edge is cut. The rule
// used to be a border outside the box with the underline overlapping it, and the underline's lower
// pixel was cut: a 2px underline rendered 1px. The selected tab's border, the line that lies on it
// and every tab's Seed must lie wholly inside the padding box, at every width.
// [[rule: tabs-underline-not-clipped]]
test('the selected underline, its line and every Seed lie inside the tab list\'s padding box, so they render 2px', async ({ page }) => {
  for (const width of [412, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const impl of ['core', 'headless'] as const) {
      await page.goto('/#/components/tabs')
      if (impl === 'headless') await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
      const list = page.locator('.pg-frame[data-theme="light"]').getByRole('tablist')
      await expect(list).toBeVisible()
      const g = await list.evaluate((l: HTMLElement) => {
        const box = l.getBoundingClientRect()
        const paddingBottom = box.top + l.clientTop + l.clientHeight
        const tab = l.querySelector<HTMLElement>('[aria-selected="true"]')!
        const line = tab.querySelector<HTMLElement>('.vela-tabs__line')!
        const below = (el: Element) => el.getBoundingClientRect().bottom - paddingBottom
        return {
          tab: below(tab),
          line: below(line),
          lineHeight: line.getBoundingClientRect().height,
          seeds: [...l.querySelectorAll('.vela-tabs__seed')].map(below),
          border: getComputedStyle(tab).borderBottomWidth,
        }
      })
      expect(g.border, `${impl} ${width}`).toBe('2px')
      expect(g.lineHeight, `${impl} ${width}`).toBe(2)
      expect(g.tab, `${impl} ${width}: tab below the clip`).toBeLessThanOrEqual(0.01)
      expect(g.line, `${impl} ${width}: line below the clip`).toBeLessThanOrEqual(0.01)
      expect(g.seeds.length, `${impl} ${width}`).toBeGreaterThan(0)
      for (const s of g.seeds) expect(s, `${impl} ${width}: a Seed below the clip`).toBeLessThanOrEqual(0.01)
    }
  }
})

// Windows contrast themes replace author colours and turn transparent borders visible; without
// its own rules every tab drew an underline and the selected one could not be found.
// [[rule: tabs-forced-colours-selected]]
test('in forced colours only the selected tab is marked: Highlight label and underline; disabled is GrayText', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  for (const impl of ['core', 'headless'] as const) {
    await page.goto('/#/components/tabs')
    if (impl === 'headless') await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
    const list = page.locator('.pg-frame[data-theme="light"]').getByRole('tablist')
    await expect(list).toBeVisible()
    const s = await list.evaluate((l: HTMLElement) => {
      const sys = (c: string) => { const p = document.createElement('i'); p.style.color = c; l.appendChild(p); const v = getComputedStyle(p).color; p.remove(); return v }
      return {
        highlight: sys('Highlight'), grayText: sys('GrayText'),
        tabs: [...l.querySelectorAll<HTMLElement>('[role="tab"]')].map((t) => {
          const cs = getComputedStyle(t)
          return { selected: t.getAttribute('aria-selected') === 'true', disabled: (t as HTMLButtonElement).disabled || t.hasAttribute('data-disabled'), color: cs.color, underline: cs.borderBottomColor }
        }),
      }
    })
    expect(s.tabs.filter((t) => t.selected)).toHaveLength(1)
    for (const t of s.tabs) {
      if (t.selected) expect([t.color, t.underline], impl).toEqual([s.highlight, s.highlight])
      else expect(t.underline, impl).toBe('rgba(0, 0, 0, 0)')
      if (t.disabled) expect(t.color, impl).toBe(s.grayText)
    }
    expect(s.tabs.some((t) => t.disabled), `${impl}: the stage has a disabled tab to check`).toBe(true)
  }
})

// The Tabs hover preview, the Seed (tabs.md, Hard constraints and Motion), on the playground's Tabs
// page in both implementations: Alerts is selected, Assets is the one enabled unselected tab, Audit
// is disabled. Ported from the prototype's checks (demo/pages/motion/TabsPreviewProto.tsx, on the
// prototype branch) to the real component.
test.describe('the Tabs hover preview', () => {
  const frame = (page: import('@playwright/test').Page) => page.locator('.pg-frame[data-theme="light"]')
  const tabOf = (page: import('@playwright/test').Page, name: string) => frame(page).getByRole('tab', { name: new RegExp(`^${name}`) })
  const seedOf = (page: import('@playwright/test').Page, name: string) => tabOf(page, name).locator('.vela-tabs__seed')
  const opacity = (page: import('@playwright/test').Page, name: string) => seedOf(page, name).evaluate((e) => Number(getComputedStyle(e).opacity))
  const open = async (page: import('@playwright/test').Page, impl: 'core' | 'headless') => {
    await page.goto('/#/components/tabs')
    if (impl === 'headless') await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
    await expect(frame(page).getByRole('tablist')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await page.mouse.move(0, 0)
  }
  // A token's value, as the stylesheet resolves it on the Seed itself.
  const token = (page: import('@playwright/test').Page, name: string) => seedOf(page, 'Assets').evaluate((e, n) => getComputedStyle(e).getPropertyValue(n).trim(), name)

  for (const impl of ['core', 'headless'] as const) {
    test.describe(impl, () => {
      test.describe('with motion', () => {
        test.use({ reducedMotion: 'no-preference' })

        // [[rule: tabs-preview-rest-delay]]
        test('a sweep across the row shows nothing; a rest shows the Seed after the delay, and it leaves faster than it came', async ({ page }) => {
          await open(page, impl)
          // Sample every Seed's opacity on every frame, and how long the pointer stayed on Assets.
          await frame(page).evaluate((f) => {
            const w = window as unknown as { __max: number; __raf: number; __on: number; __dwell: number }
            w.__max = 0; w.__dwell = 0
            const seeds = f.querySelectorAll('.vela-tabs__seed')
            const tick = () => { for (const e of seeds) w.__max = Math.max(w.__max, Number(getComputedStyle(e).opacity)); w.__raf = requestAnimationFrame(tick) }
            tick()
            const assets = [...f.querySelectorAll('[role="tab"]')].find((t) => t.textContent!.startsWith('Assets'))!
            assets.addEventListener('pointerenter', () => { w.__on = performance.now() })
            assets.addEventListener('pointerleave', () => { w.__dwell += performance.now() - w.__on })
          })
          const first = (await tabOf(page, 'Alerts').boundingBox())!
          const last = (await tabOf(page, 'Audit').boundingBox())!
          const y = first.y + first.height / 2
          await page.mouse.move(first.x + 2, y)
          await page.mouse.move(last.x + last.width - 2, y, { steps: 8 })
          await page.mouse.move(last.x + last.width - 2, y + 200)
          await page.waitForTimeout(400)
          const sweep = await page.evaluate(() => {
            const w = window as unknown as { __max: number; __raf: number; __dwell: number }
            cancelAnimationFrame(w.__raf)
            return { max: w.__max, dwell: w.__dwell }
          })
          // The sweep crossed Assets in less than the rest, so its Seed never started.
          expect(sweep.dwell, 'the runner crossed Assets faster than the rest delay').toBeGreaterThan(0)
          expect(sweep.dwell, 'the runner crossed Assets faster than the rest delay').toBeLessThan(80)
          expect(sweep.max).toBe(0)

          // A rest: one opacity transition that waits --vela-delay-preview, then fades in over
          // --vela-duration-travel on --vela-ease-out, to --vela-opacity-preview.
          await tabOf(page, 'Assets').hover()
          const ms = (v: string) => parseFloat(v) * (v.endsWith('ms') ? 1 : 1000)
          const [delay, travel, base, strength] = await Promise.all(['--vela-delay-preview', '--vela-duration-travel', '--vela-duration-base', '--vela-opacity-preview'].map((n) => token(page, n)))
          const timing = () => seedOf(page, 'Assets').evaluate((e) => e.getAnimations().map((a) => {
            const t = (a.effect as KeyframeEffect).getTiming()
            return { property: (a as CSSTransition).transitionProperty, delay: t.delay, duration: t.duration }
          }))
          expect(await timing()).toEqual([{ property: 'opacity', delay: ms(delay), duration: ms(travel) }])
          expect(ms(delay)).toBe(80)
          // The curve, compared as the browser computes both: the Seed's, and the token's on a probe.
          expect(await seedOf(page, 'Assets').evaluate((e) => {
            const probe = document.createElement('i')
            probe.style.transitionTimingFunction = 'var(--vela-ease-out)'
            e.parentElement!.appendChild(probe)
            const want = getComputedStyle(probe).transitionTimingFunction
            probe.remove()
            return getComputedStyle(e).transitionTimingFunction === want
          })).toBe(true)
          await expect.poll(() => opacity(page, 'Assets')).toBeCloseTo(Number(strength), 3)
          expect(Number(strength)).toBe(0.55)

          // Leaving: no delay, and --vela-duration-base, shorter than the way in.
          await page.mouse.move(0, 0)
          expect(await timing()).toEqual([{ property: 'opacity', delay: 0, duration: ms(base) }])
          expect(ms(base)).toBeLessThan(ms(travel))
          await expect.poll(() => opacity(page, 'Assets')).toBe(0)
        })
      })

      // The project default: reducedMotion 'reduce'. The collapse in base.css shortens durations,
      // not delays, so the rest is still a rest: a sweep still shows nothing.
      // [[rule: tabs-preview-rest-delay]]
      test('under reduced motion the Seed still waits for the rest, then appears at its strength at once', async ({ page }) => {
        await open(page, impl)
        expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
        // From the pointer arriving on Assets to the first frame its Seed shows.
        await frame(page).evaluate((f) => {
          const w = window as unknown as { __on: number; __shown: number }
          w.__on = 0; w.__shown = 0
          const assets = [...f.querySelectorAll('[role="tab"]')].find((t) => t.textContent!.startsWith('Assets'))!
          const seed = assets.querySelector('.vela-tabs__seed')!
          assets.addEventListener('pointerenter', () => { w.__on = performance.now() }, { once: true })
          const tick = () => {
            if (w.__on && Number(getComputedStyle(seed).opacity) > 0) { w.__shown = performance.now(); return }
            requestAnimationFrame(tick)
          }
          tick()
        })
        await tabOf(page, 'Assets').hover()
        await expect.poll(() => opacity(page, 'Assets')).toBeCloseTo(0.55, 3)
        const cs = await seedOf(page, 'Assets').evaluate((e) => ({ delay: getComputedStyle(e).transitionDelay, duration: getComputedStyle(e).transitionDuration }))
        expect(cs.delay).toBe('0.08s')
        expect(parseFloat(cs.duration)).toBeLessThan(0.001)
        const waited = await page.evaluate(() => {
          const w = window as unknown as { __on: number; __shown: number }
          return w.__shown - w.__on
        })
        // A frame of slack under the 80ms: the first frame after the delay is the first that can show it.
        expect(waited).toBeGreaterThanOrEqual(64)
      })

      // [[rule: tabs-preview-never-selected-or-disabled]]
      test('the Seed never shows on the selected tab or on a disabled one', async ({ page }) => {
        await open(page, impl)
        for (const name of ['Alerts', 'Audit']) {
          await tabOf(page, name).hover()
          await page.waitForTimeout(400)
          expect(await opacity(page, name), name).toBe(0)
        }
        // The control: the same rest on Assets shows it.
        await tabOf(page, 'Assets').hover()
        await expect.poll(() => opacity(page, 'Assets')).toBeCloseTo(0.55, 3)
      })

      // [[rule: tabs-preview-size]]
      test('the Seed is a third of its tab, never under the floor token, never wider than the tab, and centred', async ({ page }) => {
        await open(page, impl)
        const min = parseFloat(await token(page, '--vela-tab-preview-width-min'))
        expect(min).toBe(24)
        // The second tab, by position: its label is rewritten below.
        const assets = frame(page).getByRole('tab').nth(1)
        await expect(assets).toHaveAccessibleName(/^Assets/)
        const measure = async (label: string, count: boolean) => {
          await assets.evaluate((t, [label, count]) => {
            t.firstChild!.textContent = label as string
            const c = t.querySelector<HTMLElement>('.vela-tabs__count')
            if (c) c.style.display = count ? '' : 'none'
          }, [label, count] as const)
          await page.mouse.move(0, 0)
          await assets.hover()
          await expect.poll(() => assets.locator('.vela-tabs__seed').evaluate((e) => Number(getComputedStyle(e).opacity))).toBeCloseTo(0.55, 3)
          return assets.locator('.vela-tabs__seed').evaluate((e) => {
            const s = e.getBoundingClientRect(), t = e.parentElement!.getBoundingClientRect()
            return { seed: s.width, tab: t.width, offCentre: Math.abs(s.left + s.width / 2 - (t.left + t.width / 2)) }
          })
        }
        // A long label: a third. "IP 340": a third would be under the floor, so the floor. "IP" alone
        // (13px or so): narrower than the floor, so the tab's own width.
        for (const [label, count] of [['Device posture inventory', true], ['IP', true], ['IP', false]] as const) {
          const m = await measure(label, count)
          const expected = Math.min(m.tab, Math.max(min, m.tab / 3))
          expect(Math.abs(m.seed - expected), `${label}${count ? ' 340' : ''}: ${JSON.stringify(m)}`).toBeLessThan(0.5)
          expect(m.seed).toBeLessThanOrEqual(m.tab + 0.01)
          expect(m.offCentre).toBeLessThan(0.5)
          if (label === 'IP' && !count) expect(m.tab).toBeLessThan(min)
          if (label === 'IP' && count) expect(m.tab / 3).toBeLessThan(min)
        }
      })

      // [[rule: tabs-preview-forced-colours]]
      test('in forced colours the Seed is a solid 1px CanvasText line, never the selection\'s Highlight', async ({ page }) => {
        await page.emulateMedia({ forcedColors: 'active' })
        await open(page, impl)
        await tabOf(page, 'Assets').hover()
        await expect.poll(() => opacity(page, 'Assets')).toBe(1)
        const s = await frame(page).getByRole('tablist').evaluate((l) => {
          const sys = (c: string) => { const p = document.createElement('i'); p.style.cssText = `forced-color-adjust:none;background:${c}`; l.appendChild(p); const v = getComputedStyle(p).backgroundColor; p.remove(); return v }
          const seed = [...l.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.startsWith('Assets'))!.querySelector<HTMLElement>('.vela-tabs__seed')!
          const line = l.querySelector<HTMLElement>('[aria-selected="true"] .vela-tabs__line')!
          const cs = getComputedStyle(seed)
          return { canvasText: sys('CanvasText'), highlight: sys('Highlight'), bg: cs.backgroundColor, mask: cs.maskImage, height: cs.height, line: getComputedStyle(line).backgroundColor }
        })
        expect(s.canvasText).not.toBe(s.highlight)
        expect(s.bg).toBe(s.canvasText)
        expect(s.mask).toBe('none')
        expect(s.height).toBe('1px')
        // The selected tab's line is the selection, so it is Highlight like its border.
        expect(s.line).toBe(s.highlight)
      })
    })
  }

  // [[rule: tabs-preview-pointer-only]]
  test('every rule that shows the Seed sits under @media (hover: hover)', async ({ page }) => {
    await open(page, 'core')
    const found = await page.evaluate(() => {
      const out: { selector: string; media: string[] }[] = []
      const walk = (rules: CSSRuleList, media: string[]) => {
        for (const r of rules) {
          if (r instanceof CSSMediaRule) walk(r.cssRules, [...media, r.conditionText])
          else if (r instanceof CSSStyleRule && r.selectorText.includes(':hover') && r.selectorText.includes('vela-tabs__seed')) out.push({ selector: r.selectorText, media })
        }
      }
      for (const sheet of document.styleSheets) { try { walk(sheet.cssRules, []) } catch { /* a cross-origin sheet: not ours */ } }
      return out
    })
    expect(found.length).toBeGreaterThan(0)
    for (const r of found) expect(r.media.some((m) => m.includes('hover: hover')), r.selector).toBe(true)
  })

  test.describe('on a touch screen', () => {
    test.use({ hasTouch: true, isMobile: true })
    // [[rule: tabs-preview-pointer-only]]
    test('a device without hover never shows the Seed, even under a pointer', async ({ page }) => {
      for (const impl of ['core', 'headless'] as const) {
        await open(page, impl)
        expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
        await tabOf(page, 'Assets').hover()
        await page.waitForTimeout(400)
        expect(await opacity(page, 'Assets'), impl).toBe(0)
        // A tap still selects, and the underline lands under the tapped tab.
        await tabOf(page, 'Assets').tap()
        await expect(tabOf(page, 'Assets')).toHaveAttribute('aria-selected', 'true')
        await expect.poll(() => tabOf(page, 'Assets').locator('.vela-tabs__line').evaluate((e) => getComputedStyle(e).opacity)).toBe('1')
      }
    })
  })
})

test('the Table page sorts through the host: the button names the next direction, aria-sort follows', async ({ page }) => {
  await page.goto('/#/components/table')
  await expect(page.getByRole('heading', { level: 1, name: 'Table' })).toBeVisible()
  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const region = frame.getByRole('region', { name: 'Assets' })
  await expect(region).toHaveAttribute('tabindex', '0')
  const table = region.getByRole('table', { name: 'Assets' })
  const asset = table.getByRole('columnheader', { name: /^Asset/ })
  await expect(asset).toHaveAttribute('aria-sort', 'ascending')
  await expect(table.getByRole('columnheader', { name: /^Status/ })).not.toHaveAttribute('aria-sort')
  const findings = table.getByRole('button', { name: 'Open findings, sort ascending', exact: true })
  await expect(findings).toBeVisible()
  await expect(table.getByRole('columnheader', { name: /^Open findings/ })).not.toHaveAttribute('aria-sort')
  await findings.click()
  await expect(table.getByRole('columnheader', { name: /^Open findings/ })).toHaveAttribute('aria-sort', 'ascending')
  await expect(asset).not.toHaveAttribute('aria-sort')
  await expect(table.getByRole('button', { name: 'Open findings, sort descending', exact: true })).toBeVisible()
  // The host re-sorted: the first body row is now the asset with no findings.
  await expect(table.getByRole('rowheader').first()).toHaveText('laptop-omk-7f3a9c2e')
  // Selection: the host's Checkbox drives `selected`, which is aria-selected plus the marker.
  const row = table.getByRole('row', { name: /k8s-node-pool-b-3/ })
  await expect(row).not.toHaveAttribute('aria-selected')
  await row.getByRole('checkbox', { name: 'Select k8s-node-pool-b-3' }).click()
  await expect(row).toHaveAttribute('aria-selected', 'true')
  const marker = await row.locator('td').first().evaluate((el) => getComputedStyle(el).boxShadow)
  expect(marker).toMatch(/inset/)
  // Numeric cells: tabular numerals, end-aligned.
  const count = table.getByRole('cell', { name: '1,204' })
  await expect(count).toHaveCSS('font-variant-numeric', 'tabular-nums')
  await expect(count).toHaveCSS('text-align', 'end')
})

// [[rule: table-scroll-stays-in-region]]
// The blow-out case: a wide table dropped into a 1fr grid track (or a flex row) inside a 360px host.
// Without inline-size containment the track's minimum is the table's min-content width, and the
// host, then the page, scrolls sideways. With it, the host keeps its width and the region scrolls —
// from the keyboard too, because the region is focusable.
test('a wide table scrolls inside its region and never widens a narrow grid host', async ({ page }) => {
  await page.goto('/#/components/table')
  const body = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  await expect(body.getByRole('table', { name: 'Assets' })).toBeVisible()
  await body.evaluate((el: HTMLElement) => {
    el.style.display = 'grid'
    el.style.gridTemplateColumns = '1fr'
    el.style.width = '360px'
    el.style.maxWidth = '360px'
  })
  const sizes = await body.evaluate((el: HTMLElement) => {
    const region = el.querySelector('[role="region"]') as HTMLElement
    return { host: el.scrollWidth, hostClient: el.clientWidth, region: region.scrollWidth, regionClient: region.clientWidth }
  })
  expect(sizes.host).toBeLessThanOrEqual(sizes.hostClient + 1)
  expect(sizes.regionClient).toBeLessThanOrEqual(360)
  expect(sizes.region).toBeGreaterThan(sizes.regionClient)
  const region = body.getByRole('region', { name: 'Assets' })
  await region.focus()
  await expect(region).toBeFocused()
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
})

// [[rule: table-sticky-header-pins]]
// The host bounds the height (the playground's .pg-table-bounded); the region fills it and scrolls,
// and the header row stays at the region's top while the body passes under it.
test('a sticky header stays at the top of the region while the body scrolls', async ({ page }) => {
  await page.goto('/#/components/table')
  await page.getByRole('complementary', { name: 'Props' }).getByRole('switch', { name: 'stickyHeader' }).click()
  const body = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const region = body.getByRole('region', { name: 'Assets' })
  await expect(body.locator('.vela-table')).toHaveClass(/vela-table--sticky-header/)
  const scrollable = await region.evaluate((el) => el.scrollHeight > el.clientHeight)
  expect(scrollable).toBe(true)
  const header = region.getByRole('columnheader', { name: /^Status/ })
  await region.evaluate((el) => { el.scrollTop = 120 })
  await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
  const [r, h] = [(await region.boundingBox())!, (await header.boundingBox())!]
  expect(Math.abs(h.y - r.y)).toBeLessThan(1.5)
  // and a body row has scrolled up under it
  const first = (await region.getByRole('row').nth(1).boundingBox())!
  expect(first.y).toBeLessThan(h.y + h.height)
})

// The overlays are headless-born and portalled to <body>. On the stage each frame renders its own
// trigger; what opens must carry that frame's theme, sit above the page, take focus and give it back.
test('the Popover page opens a themed, non-modal popover: focus moves in, Escape returns it, a press outside closes it', async ({ page }) => {
  await page.goto('/#/components/popover')
  await expect(page.getByRole('heading', { level: 1, name: 'Popover' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Implementation' })).toHaveCount(0)
  const contract = page.getByRole('region', { name: /^Use / })
  await expect(contract.locator('.pg-import')).toContainText("import { Popover } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela @base-ui/react')

  for (const theme of ['light', 'dark'] as const) {
    const trigger = page.locator(`.pg-frame[data-theme="${theme}"] .pg-frame-body`).getByRole('button', { name: 'Filters' })
    await trigger.click()
    const popover = page.getByRole('dialog', { name: 'Filter alerts' })
    await expect(popover).toBeVisible()
    // Portalled out of the frame, it still carries the frame's theme, and the kit's root styles.
    await expect(popover.locator('xpath=ancestor::*[contains(@class,"vela-overlay-portal")]')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeFocused()
    // Anchored: it opens below its trigger, a step away (--vela-space-5 of positioner padding).
    const t = (await trigger.boundingBox())!, p = (await popover.boundingBox())!
    expect(p.y).toBeGreaterThanOrEqual(t.y + t.height)
    expect(p.y - (t.y + t.height)).toBeLessThan(12)
    // Non-modal: the page behind keeps its accessibility tree.
    await expect(page.getByRole('heading', { level: 1, name: 'Popover' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }
  const trigger = page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('button', { name: 'Filters' })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Filter alerts' })).toBeVisible()
  await page.getByRole('heading', { level: 1, name: 'Popover' }).click()
  await expect(page.getByRole('dialog', { name: 'Filter alerts' })).toHaveCount(0)
  // The light popover sits on the raised surface with the border edge, not a shadow.
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Filter alerts' })).toHaveCSS('box-shadow', 'none')
})

test('the Tooltip page describes its trigger on hover and on keyboard focus, and Escape dismisses it', async ({ page }) => {
  await page.goto('/#/components/tooltip')
  await expect(page.getByRole('heading', { level: 1, name: 'Tooltip' })).toBeVisible()
  const contract = page.getByRole('region', { name: /^Use / })
  await expect(contract.locator('.pg-import')).toContainText("import { Tooltip } from '@omkarux/vela/headless'")

  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const trigger = frame.getByRole('button', { name: 'Export' })
  await trigger.hover()
  const tip = page.getByRole('tooltip')
  await expect(tip).toHaveText('Download the last 24 hours as CSV')
  // A description, not the name: the trigger is still called Export.
  await expect(trigger).toHaveAttribute('aria-describedby', (await tip.getAttribute('id'))!)
  await expect(trigger).toHaveAccessibleName('Export')
  await page.keyboard.press('Escape')
  await expect(tip).toHaveCount(0)
  await expect(trigger).not.toHaveAttribute('aria-describedby')
  // From the keyboard: start focus at the frame, Tab onto the trigger, and it opens at once.
  await page.mouse.move(0, 0)
  await page.locator('.pg-frame[data-theme="light"]').evaluate((el: HTMLElement) => { el.tabIndex = -1; el.focus() })
  await page.keyboard.press('Tab')
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('the Dialog page opens a modal: focus moves in and is trapped, the page is inert, Escape closes it and focus returns', async ({ page }) => {
  await page.goto('/#/components/dialog')
  await expect(page.getByRole('heading', { level: 1, name: 'Dialog' })).toBeVisible()
  const contract = page.getByRole('region', { name: /^Use / })
  await expect(contract.locator('.pg-import')).toContainText("import { Dialog } from '@omkarux/vela/headless'")

  const trigger = page.locator('.pg-frame[data-theme="dark"] .pg-frame-body').getByRole('button', { name: 'Edit Policy' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Edit policy' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('xpath=ancestor::*[contains(@class,"vela-overlay-portal")]')).toHaveAttribute('data-theme', 'dark')
  // Focus lands on the first control in the body, not on the header's close button.
  await expect(dialog.getByRole('textbox', { name: 'Policy name' })).toBeFocused()
  // The page behind is out of the accessibility tree and does not scroll.
  await expect(page.getByRole('heading', { level: 1, name: 'Dialog' })).toHaveCount(0)
  // Base UI locks whichever of <html> and <body> scrolls the viewport.
  const locked = () => page.evaluate(() => [document.documentElement, document.body].some((el) => getComputedStyle(el).overflowY === 'hidden'))
  expect(await locked()).toBe(true)
  // Trapped: Tab past the last action wraps inside the dialog. Base UI's focus guards hand focus on
  // a task after the key lands, so each step is polled rather than read once.
  const inDialog = () => page.evaluate(() => !!document.activeElement?.closest('.vela-dialog'))
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    await expect.poll(inDialog).toBe(true)
  }
  await expect(dialog.getByRole('textbox', { name: 'Policy name' })).toBeFocused()
  // The backdrop covers the sticky top bar: the dialog layer is above the page's own layers.
  const covering = await page.evaluate(() => document.elementFromPoint(window.innerWidth / 2, 10)?.className ?? '')
  expect(covering).toMatch(/vela-dialog__(backdrop|viewport)/)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('heading', { level: 1, name: 'Dialog' })).toBeVisible()
  expect(await locked()).toBe(false)

  // variant="alert": role alertdialog, the cancel takes focus, the confirm is the destructive Button.
  await page.getByRole('complementary', { name: 'Props' }).getByLabel('variant').selectOption('alert')
  const del = page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('button', { name: 'Delete Policy' })
  await del.click()
  const alert = page.getByRole('alertdialog')
  await expect(alert).toBeVisible()
  await expect(alert.getByRole('button', { name: 'Keep Policy' })).toBeFocused()
  await expect(alert.getByRole('button', { name: 'Delete Policy' })).toHaveClass(/vela-btn--destructive/)
  await page.mouse.click(5, 5)   // the backdrop: an alert ignores it
  await expect(alert).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(alert).toHaveCount(0)
  await expect(del).toBeFocused()
})

// [[rule: dialog-body-scrolls]]
// Only a real layout shows this: a dialog never grows past the viewport less its gutters; past that
// its body scrolls inside it, and the title and the actions stay where they are.
test('a tall dialog scrolls its body and keeps its header and footer on screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 520 })
  await page.goto('/#/components/dialog')
  await page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('button', { name: 'Edit Policy' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit policy' })
  await expect(dialog).toBeVisible()
  await dialog.locator('.vela-dialog__body').evaluate((body) => {
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('p')
      p.textContent = `Rule ${i + 1}: block TLS 1.0 and 1.1 on every listener in the tenant.`
      body.appendChild(p)
    }
  })
  const box = (await dialog.boundingBox())!
  const vh = page.viewportSize()!.height
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(vh)
  const body = dialog.locator('.vela-dialog__body')
  const metrics = await body.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }))
  expect(metrics.scroll).toBeGreaterThan(metrics.client)
  const title = dialog.getByRole('heading', { name: 'Edit policy' })
  const save = dialog.getByRole('button', { name: 'Save Changes' })
  const before = { title: (await title.boundingBox())!.y, save: (await save.boundingBox())!.y }
  await body.evaluate((el) => { el.scrollTop = el.scrollHeight })
  expect((await title.boundingBox())!.y).toBe(before.title)
  expect((await save.boundingBox())!.y).toBe(before.save)
  await expect(title).toBeInViewport()
  await expect(save).toBeInViewport()
})

// Toast is headless-born. Each frame of the stage renders its own ToastProvider, so each frame has
// its own region, portalled to <body> with that frame's theme; the tests scope to the light one.
// The dwell is 6000ms; the tests shorten it for every subtree (the light block redeclares it on each
// [data-theme] frame), which also proves the component reads the token rather than a constant.
const lightRegion = (page: import('@playwright/test').Page) =>
  page.locator('.vela-overlay-portal[data-theme="light"]').getByRole('region', { name: 'Notifications' })
const shortDwell = (page: import('@playwright/test').Page, ms: number) =>
  page.addStyleTag({ content: `* { --vela-duration-toast: ${ms}ms !important; }` })

test('the Toast page raises a polite, themed toast without moving focus, and its close button dismisses it', async ({ page }) => {
  await page.goto('/#/components/toast')
  await expect(page.getByRole('heading', { level: 1, name: 'Toast' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Implementation' })).toHaveCount(0)
  const contract = page.getByRole('region', { name: /^Use / })
  await expect(contract.locator('.pg-import')).toContainText("import { ToastProvider, useToast } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela @base-ui/react')

  for (const theme of ['light', 'dark'] as const) {
    const frame = page.locator(`.pg-frame[data-theme="${theme}"] .pg-frame-body`)
    const save = frame.getByRole('button', { name: 'Save Changes' })
    await save.click()
    const region = page.locator(`.vela-overlay-portal[data-theme="${theme}"]`).getByRole('region', { name: 'Notifications' })
    const toast = region.getByRole('dialog', { name: 'Policy saved' })
    await expect(toast).toBeVisible()
    await expect(region).toHaveAttribute('aria-live', 'polite')
    await expect(toast).toHaveAccessibleDescription('Block legacy TLS now applies to 14 tenants.')
    // The toast never takes focus, and the page keeps its own record of the save.
    await expect(save).toBeFocused()
    await expect(frame).toContainText('Saved 1 time')
    await expect(toast).toHaveCSS('box-shadow', 'none')
    await toast.getByRole('button', { name: 'Dismiss' }).click()
    await expect(toast).toHaveCount(0)
  }
})

test('a toast pauses while hovered and while focus is in its region (F6), then leaves with the time it had left', async ({ page }) => {
  await page.goto('/#/components/toast')
  await shortDwell(page, 1500)
  const save = page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('button', { name: 'Save Changes' })
  const toast = lightRegion(page).getByRole('dialog', { name: 'Policy saved' })

  // Hover: well past the dwell, it is still there; off it, it leaves.
  await save.click()
  await expect(toast).toBeVisible()
  await toast.hover()
  await page.waitForTimeout(2500)
  await expect(toast).toBeVisible()
  await page.mouse.move(5, 5)
  await expect(toast).toHaveCount(0, { timeout: 3000 })

  // Focus: F6 moves focus to the region from anywhere and pauses it; Shift+Tab gives focus back.
  await save.focus()
  await page.keyboard.press('Enter')
  await expect(toast).toBeVisible()
  await expect(save).toBeFocused()
  await page.keyboard.press('F6')
  await expect(lightRegion(page)).toBeFocused()
  await page.waitForTimeout(2500)
  await expect(toast).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  await expect(save).toBeFocused()
  await expect(toast).toHaveCount(0, { timeout: 3000 })
})

test('a toast with an action never times out; the action runs the page\'s own Undo and dismisses it; Escape dismisses the focused toast', async ({ page }) => {
  await page.goto('/#/components/toast')
  await shortDwell(page, 800)
  await page.getByRole('complementary', { name: 'Props' }).getByRole('switch', { name: 'action' }).click()
  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const save = frame.getByRole('button', { name: 'Save Changes' })
  await save.click()
  const toast = lightRegion(page).getByRole('dialog', { name: 'Policy saved' })
  await expect(toast).toBeVisible()
  await page.mouse.move(5, 5)
  await page.waitForTimeout(1800)   // more than twice the dwell
  await expect(toast).toBeVisible()
  // The same Undo the page shows ("Undo Last Save"); the toast's is a shortcut to it.
  await expect(frame.getByRole('button', { name: 'Undo Last Save' })).toBeVisible()
  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(toast).toHaveCount(0)
  await expect(frame).toContainText('Nothing saved yet.')

  // Escape: reach the toast from the keyboard, and Escape dismisses it; focus goes back.
  await save.focus()
  await page.keyboard.press('Enter')
  await expect(toast).toBeVisible()
  await page.keyboard.press('F6')
  await page.keyboard.press('Tab')
  await expect.poll(() => toast.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(toast).toHaveCount(0)
  await expect(save).toBeFocused()
})

// [[rule: toast-stays-in-viewport]]
// Only a real layout shows this: the region sits --vela-space-20 from the viewport's edges at its
// placement, and a toast is --vela-toast-width wide, never wider than the viewport less the gutters.
test('the toast region sits at its placement, a gutter from the edges, and narrows with the viewport', async ({ page }) => {
  // Measured once it has settled: while it enters it is a --vela-space-5 step short of its place.
  const box = async () => {
    const toast = lightRegion(page).getByRole('dialog', { name: 'Policy saved' })
    await expect(toast).toBeVisible()
    await expect(toast).not.toHaveAttribute('data-starting-style')
    await expect.poll(() => toast.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
    return (await toast.boundingBox())!
  }
  // From the keyboard: at a phone width the site navigation overlays the stage.
  const raise = async () => {
    await page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('button', { name: 'Save Changes' }).focus()
    await page.keyboard.press('Enter')
  }
  const props = () => page.getByRole('complementary', { name: 'Props' })

  await page.goto('/#/components/toast')
  let vp = page.viewportSize()!
  await raise()
  let b = await box()
  expect(b.width).toBeCloseTo(360, 0)
  expect(vp.width - (b.x + b.width)).toBeCloseTo(20, 0)    // bottom-end: the end edge
  expect(vp.height - (b.y + b.height)).toBeCloseTo(20, 0)  // and the bottom edge

  await props().getByLabel('placement').selectOption('top-end')
  await raise()
  b = await box()
  expect(b.y).toBeCloseTo(20, 0)
  expect(vp.width - (b.x + b.width)).toBeCloseTo(20, 0)

  await props().getByLabel('placement').selectOption('bottom-center')
  await raise()
  b = await box()
  expect(b.x + b.width / 2).toBeCloseTo(vp.width / 2, 0)
  expect(vp.height - (b.y + b.height)).toBeCloseTo(20, 0)

  // A phone-width viewport: the toast is the viewport less 20 a side, and nothing leaves the screen.
  await page.setViewportSize({ width: 360, height: 800 })
  vp = page.viewportSize()!
  await props().getByLabel('placement').selectOption('bottom-end')
  await raise()
  b = await box()
  expect(b.width).toBeCloseTo(320, 0)
  expect(b.x).toBeCloseTo(20, 0)
  expect(b.x + b.width).toBeLessThanOrEqual(vp.width - 20 + 0.5)
})

// Dropdown List is headless-born on Base UI's Menu and portalled like the overlays. On the stage
// each frame renders its own trigger; the list carries that frame's theme, lands on the current
// item, and a choice updates the page that owns the value.
test('the Dropdown List page opens a themed menu on the current item, and a choice closes it and updates the page', async ({ page }) => {
  await page.goto('/#/components/dropdown-list')
  await expect(page.getByRole('heading', { level: 1, name: 'Dropdown List' })).toBeVisible()
  const contract = page.getByRole('region', { name: /^Use / })
  await expect(contract.locator('.pg-import')).toContainText("import { DropdownList } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela @base-ui/react')

  for (const theme of ['light', 'dark'] as const) {
    const frame = page.locator(`.pg-frame[data-theme="${theme}"] .pg-frame-body`)
    const trigger = frame.getByRole('button', { name: 'Switch View' })
    // Mid-viewport, so there is room for the menu below it: with less, it flips above, as it should.
    await trigger.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await trigger.click()
    const menu = page.getByRole('menu', { name: 'Views' })
    await expect(menu).toBeVisible()
    await expect(menu.locator('xpath=ancestor::*[contains(@class,"vela-overlay-portal")]')).toHaveAttribute('data-theme', theme)
    // Lands on the current item, which carries the check; the page's scroll is not locked.
    await expect(page.getByRole('menuitemradio', { name: 'Firewall, 1 new' })).toBeFocused()
    await expect(page.getByRole('menuitemradio', { name: 'Firewall, 1 new' })).toHaveAttribute('aria-checked', 'true')
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow + getComputedStyle(document.body).overflow)).not.toContain('hidden')
    // Anchored below its trigger, a step away, lined up with its start edge; Popover's surface, no shadow.
    const t = (await trigger.boundingBox())!, m = (await menu.boundingBox())!
    expect(m.y).toBeGreaterThanOrEqual(t.y + t.height)
    expect(m.y - (t.y + t.height)).toBeLessThan(12)
    expect(Math.abs(m.x - t.x)).toBeLessThan(2)
    await expect(menu).toHaveCSS('box-shadow', 'none')
    // The highlight follows the keys.
    await page.keyboard.press('ArrowDown')
    const dlp = page.getByRole('menuitemradio', { name: /^Data loss prevention/ })
    await expect(dlp).toBeFocused()
    await expect(dlp).toHaveAttribute('data-highlighted', '')
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }

  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  await frame.getByRole('button', { name: 'Switch View' }).click()
  await page.getByRole('menuitemradio', { name: 'Reports, 3 open' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(frame.getByText('Showing Reports')).toBeVisible()
  await expect(frame.getByRole('button', { name: 'Switch View' })).toBeFocused()
  // A disabled item is not chosen. (Playwright waits for an aria-disabled element to become
  // enabled; a person can still press it, so the press is forced.)
  await frame.getByRole('button', { name: 'Switch View' }).click()
  await page.getByRole('menuitemradio', { name: 'Archive, No access' }).click({ force: true })
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(frame.getByText('Showing Reports')).toBeVisible()
  // A press outside closes it.
  await page.getByRole('heading', { level: 1, name: 'Dropdown List' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
})

// [[rule: dropdown-list-names-wrap]]
// The list is where a long name is read in full: it wraps inside the popup's width, never clips,
// never ends in an ellipsis — a sentence and a single unbroken string alike — at the console width
// and in a host narrower than the popup, where it is capped at the room it has and the name wraps
// further. When a name and its meta don't fit side by side, the meta drops under the name.
test('a Dropdown List name wraps in full inside the list, at desktop width and in a narrow host', async ({ page }) => {
  await page.goto('/#/components/dropdown-list')
  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const names = ['Data loss prevention — policy violations across every connected SaaS tenant', 'customer-ingest-pipeline-eu-west-2']
  const check = async () => {
    const trigger = frame.getByRole('button', { name: 'Switch View' })
    // Mid-viewport, so there is room for the menu below it: with less, it flips above, as it should.
    await trigger.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await trigger.click()
    const menu = page.getByRole('menu', { name: 'Views' })
    await expect(menu).toBeVisible()
    const boxes = []
    for (const name of names) {
      const label = page.getByRole('menuitemradio', { name: new RegExp(`^${name}`) }).locator('.vela-dropdown-list__label')
      await expect(label).toHaveText(name)
      const box = await label.evaluate((el) => {
        const s = getComputedStyle(el)
        const r = el.getBoundingClientRect(), p = el.closest('[role="menu"]')!.getBoundingClientRect()
        const meta = el.parentElement!.querySelector('.vela-dropdown-list__meta')?.getBoundingClientRect()
        return {
          lines: Math.round(r.height / parseFloat(s.lineHeight)),
          clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
          overflow: s.textOverflow, whiteSpace: s.whiteSpace,
          inside: r.left >= p.left && r.right <= p.right,
          metaUnder: meta ? meta.top >= r.bottom - 0.5 && meta.left <= r.left + 0.5 && meta.right <= p.right : null,
          menuWidth: p.width, viewport: window.innerWidth,
        }
      })
      expect(box.lines, name).toBeGreaterThan(1)
      expect(box.clipped, name).toBe(false)
      expect(box.overflow, name).not.toBe('ellipsis')
      expect(box.whiteSpace, name).not.toBe('nowrap')
      expect(box.inside, name).toBe(true)
      boxes.push(box)
    }
    // The unbroken name fills its line, so its meta drops under it, at the start, inside the list.
    expect(boxes[1].metaUnder).toBe(true)
    // A short name and its meta share the line, the meta at the end.
    const fw = await page.getByRole('menuitemradio', { name: 'Firewall, 1 new' }).evaluate((el) => {
      const l = el.querySelector('.vela-dropdown-list__label')!.getBoundingClientRect(), m = el.querySelector('.vela-dropdown-list__meta')!.getBoundingClientRect()
      return { sameLine: Math.abs(l.top - m.top) < 1, atEnd: m.left > l.right }
    })
    expect(fw).toEqual({ sameLine: true, atEnd: true })
    // At most --vela-popover-width (280), at least 200px and the trigger; never wider than the room it has.
    const t = (await trigger.boundingBox())!
    const width = boxes[0].menuWidth
    expect(width).toBeLessThanOrEqual(280)
    expect(width).toBeLessThanOrEqual(boxes[0].viewport)
    if (boxes[0].viewport >= 280) expect(width).toBeGreaterThanOrEqual(Math.max(200, t.width))
    // Every item is at least 31px tall: a 21px line and 10px of padding, over WCAG 2.5.8's 24px.
    for (const h of await page.getByRole('menuitemradio').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(31)
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    return boxes[0]
  }
  const wide = await check()
  expect(wide.menuWidth).toBe(280)
  // The minimum is 200px while the trigger is narrower; it is a bound, not the width.
  await frame.getByRole('button', { name: 'Switch View' }).click()
  expect(await page.getByRole('menu').evaluate((el) => getComputedStyle(el).minWidth)).toBe('200px')
  await page.keyboard.press('Escape')
  // A host narrower than the popup: the navigation is put away so the stage has the viewport.
  await page.setViewportSize({ width: 260, height: 860 })
  const hide = page.getByRole('button', { name: 'Hide navigation' })
  if (await hide.isVisible()) await hide.click()
  const narrow = await check()
  expect(narrow.menuWidth).toBeLessThan(280)
  expect(narrow.lines).toBeGreaterThanOrEqual(wide.lines)
})

// dropdown-list-focus-current is proved in the unit tests; this is the same promise in a real
// browser, where Base UI's first highlight is deferred by a frame: every way of opening lands on
// the current item, and the next arrow key moves on from it.
test('the Dropdown List lands on the current item however it opens, in a real browser', async ({ page }) => {
  await page.goto('/#/components/dropdown-list')
  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const trigger = frame.getByRole('button', { name: 'Switch View' })
  const current = page.getByRole('menuitemradio', { name: 'Firewall, 1 new' })
  const next = page.getByRole('menuitemradio', { name: /^Data loss prevention/ })
  const opens: [string, () => Promise<void>][] = [
    ['click', () => trigger.click()],
    ['Enter', async () => { await trigger.focus(); await page.keyboard.press('Enter') }],
    ['Space', async () => { await trigger.focus(); await page.keyboard.press(' ') }],
    ['ArrowDown', async () => { await trigger.focus(); await page.keyboard.press('ArrowDown') }],
    ['ArrowUp', async () => { await trigger.focus(); await page.keyboard.press('ArrowUp') }],
  ]
  for (const [how, open] of opens) {
    await open()
    await expect(current, how).toBeFocused()
    await page.waitForTimeout(100)
    await expect(current, how).toBeFocused()
    await expect(page.locator('[role="menuitemradio"][data-highlighted]'), how).toHaveCount(1)
    await page.keyboard.press('ArrowDown')
    await expect(next, how).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)
  }
})

// The global focus ring is an outline outside the item; the popup scrolls, so its padding is what
// keeps the ring from being clipped — at the sides, and at the bottom with the last item focused
// in a list that has scrolled. A disabled item shows the highlight under keyboard focus only.
test('the Dropdown List never clips the focus ring, and a disabled item highlights from the keyboard only', async ({ page }) => {
  // Short enough that the list can't fit above or below its trigger, so it scrolls. At 420 the
  // playground's stage (anchored top-left since slice 0) leaves room for the whole list above.
  await page.setViewportSize({ width: 1440, height: 320 })
  await page.goto('/#/components/dropdown-list')
  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  const trigger = frame.getByRole('button', { name: 'Switch View' })
  await trigger.scrollIntoViewIfNeeded()
  await trigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Views' })
  await expect(menu).toBeVisible()
  const ringInside = () => page.evaluate(() => {
    const el = document.activeElement as HTMLElement, popup = el.closest('[role="menu"]') as HTMLElement
    const s = getComputedStyle(el), reach = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset)
    const r = el.getBoundingClientRect(), p = popup.getBoundingClientRect()
    const port = { left: p.left + popup.clientLeft, top: p.top + popup.clientTop, right: p.left + popup.clientLeft + popup.clientWidth, bottom: p.top + popup.clientTop + popup.clientHeight }
    return {
      ring: s.outlineStyle !== 'none' && reach > 0,
      inside: r.left - reach >= port.left - 0.5 && r.right + reach <= port.right + 0.5 && r.top - reach >= port.top - 0.5 && r.bottom + reach <= port.bottom + 0.5,
      scrolls: popup.scrollHeight > popup.clientHeight,
    }
  })
  for (const key of ['Home', 'End']) {
    await page.keyboard.press(key)
    await page.waitForTimeout(50)
    expect(await ringInside(), key).toMatchObject({ ring: true, inside: true })
  }
  // The list is capped by the short viewport, so the End case above was a scrolled list.
  expect((await ringInside()).scrolls).toBe(true)

  // Keyboard focus on the disabled item shows the highlight surface; its name stays inactive and
  // its meta stays readable.
  const archive = page.getByRole('menuitemradio', { name: 'Archive, No access' })
  await page.keyboard.press('ArrowUp')
  await expect(archive).toBeFocused()
  const look = () => archive.evaluate((el) => ({
    bg: getComputedStyle(el).backgroundColor,
    name: getComputedStyle(el.querySelector('.vela-dropdown-list__label')!).color,
    meta: getComputedStyle(el.querySelector('.vela-dropdown-list__meta')!).color,
  }))
  const tokens = await archive.evaluate((el) => {
    const read = (v: string) => {
      const probe = document.createElement('span'); probe.style.color = `var(${v})`
      el.closest('.vela-dropdown-list')!.appendChild(probe)
      const c = getComputedStyle(probe).color; probe.remove(); return c
    }
    return { hover: read('--vela-bg-raised-hover'), inactive: read('--vela-text-inactive'), text: read('--vela-text-default') }
  })
  await expect(menu).not.toHaveAttribute('data-vela-pointer')
  await expect(archive).toHaveAttribute('data-highlighted', '')
  await expect(archive).toHaveCSS('background-color', tokens.hover)
  expect(await look()).toEqual({ bg: tokens.hover, name: tokens.inactive, meta: tokens.text })
  // Under the pointer it changes nothing.
  await archive.hover()
  await page.mouse.move((await archive.boundingBox())!.x + 40, (await archive.boundingBox())!.y + 10)
  const hovered = await look()
  expect(hovered.bg).not.toBe(tokens.hover)
  expect(hovered.name).toBe(tokens.inactive)
  await page.keyboard.press('Escape')
})

// [[rule: dropdown-list-forced-colours]]
// In forced colours the page's backgrounds are replaced, so the highlighted item is the system's
// own Highlight / HighlightText pair, opted out of the forcing on that row alone, and the check is
// drawn in currentColor so it follows the row's text.
test('the Dropdown List highlights with the system pair in forced colours, and the check follows the text', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/#/components/dropdown-list')
  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  await frame.getByRole('button', { name: 'Switch View' }).focus()
  await page.keyboard.press('Enter')
  const current = page.getByRole('menuitemradio', { name: 'Firewall, 1 new' })
  await expect(current).toBeFocused()
  await expect(current).toHaveAttribute('data-highlighted', '')
  const read = await current.evaluate((el) => {
    const probe = document.createElement('span'); probe.style.cssText = 'background: Highlight; color: HighlightText; forced-color-adjust: none'
    document.body.appendChild(probe)
    const sys = { bg: getComputedStyle(probe).backgroundColor, fg: getComputedStyle(probe).color }
    probe.remove()
    const other = el.parentElement!.querySelector('[role="menuitemradio"]:not([data-highlighted])') as HTMLElement
    const check = el.querySelector('.vela-dropdown-list__check svg')!
    return {
      sys,
      bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color,
      adjust: getComputedStyle(el).forcedColorAdjust,
      otherAdjust: getComputedStyle(other).forcedColorAdjust,
      popupAdjust: getComputedStyle(el.closest('[role="menu"]')!).forcedColorAdjust,
      checkColour: getComputedStyle(el.querySelector('.vela-dropdown-list__check')!).color,
      checkStroke: getComputedStyle(check).stroke,
    }
  })
  expect(read.bg).toBe(read.sys.bg)
  expect(read.fg).toBe(read.sys.fg)
  expect(read.adjust).toBe('none')
  expect(read.otherAdjust).toBe('auto')
  expect(read.popupAdjust).toBe('auto')
  expect(read.checkColour).toBe(read.fg)
  expect(read.checkStroke).toBe(read.fg)
  // The highlight moves with the keys, and the row it leaves goes back to the forced colours.
  await page.keyboard.press('ArrowDown')
  expect(await current.evaluate((el) => getComputedStyle(el).forcedColorAdjust)).toBe('auto')
  await page.keyboard.press('Escape')
})

test('the nav filter narrows the list and the menu button collapses it', async ({ page }) => {
  await page.goto('/#/foundations/motion')
  await expect(page.getByRole('heading', { level: 1, name: 'Motion' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Site' })
  await nav.getByLabel('Filter').fill('tog')
  await expect(nav.getByRole('link', { name: 'Toggle' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Button' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Hide navigation' }).click()
  await expect(nav).toBeHidden()
})

test('"How it is made" lists the token file, five generated targets and a generated check count', async ({ page }) => {
  await page.goto('/#/how')
  await expect(page.getByRole('heading', { level: 1, name: 'One file, five targets' })).toBeVisible()
  const table = page.getByRole('table', { name: 'Generated targets' })
  await expect(table.getByRole('row')).toHaveCount(7)
  await expect(table.getByRole('link', { name: 'open the library' })).toHaveAttribute('href', /figma\.com\/design/)
  await expect(page.getByRole('heading', { level: 2, name: /^\d{2,} automated checks on every change$/ })).toBeVisible()
})

// The selector matters: `.vela-btn` alone first matches a theme toggle in the playground's
// own chrome, which is a plain <button> and not the component under test. Scoping to the
// preview frame targets the real Button, the only one carrying the component's behaviour.
// [[rule: button-press-keeps-hit-target]]
// A pressed button scales to 0.97 about its centre, so its edges travel inward while the
// pointer is down. If the pointerup lands where the button no longer is, the click retargets
// to the parent and is lost. Displacement is width-proportional (1.5px at 102px, 4.8px at
// 320px), so the width is set explicitly — a button that hugs its content is too narrow to
// fail. Measured on the rule as it shipped in 0.10.0, pressing 2px inside the edge of a 320px
// button: every one of 160 lost in Chromium, about 9 in 10 in WebKit, none once the guard is in. The
// suite never made this assertion, because .click() dispatches down and up in one tick — the
// press never advances, so the defect is invisible to it.
//
// The box is re-measured before each press on purpose: the first press shifts this page's
// layout by several pixels, and a run that measures once ends up pressing where the button is
// not, which looks exactly like the defect and is not.
test('a press at the inner edge of a wide button still fires its click', async ({ page }) => {
  await page.goto('/#/components/button')
  const btn = page.locator('.pg-frame-body .vela-btn').first()
  await expect(btn).toBeVisible()
  await btn.evaluate((el: HTMLElement) => {
    el.style.width = '320px'
    ;(window as Window & { __hits?: number }).__hits = 0
    el.addEventListener('click', () => { (window as Window & { __hits?: number }).__hits!++ })
  })
  for (const side of ['left', 'right'] as const) {
    const box = (await btn.boundingBox())!
    const x = side === 'left' ? box.x + 2 : box.x + box.width - 2
    await page.mouse.move(x, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(150)   // longer than the press transition; .click() cannot fail
    await page.mouse.up()
  }
  expect(await page.evaluate(() => (window as Window & { __hits?: number }).__hits)).toBe(2)
})

// The guard is the contract; anchoring is the enhancement on top of it. This forces the centre
// origin a page gets without the JS layer, and asserts the guard alone still holds the hit
// target — so a framework port that translates only the CSS is not quietly broken.
// [[rule: button-press-keeps-hit-target]]
// [[rule: button-enhancement-not-load-bearing]]
test('the hit target holds even with no JS to anchor the press', async ({ page }) => {
  await page.goto('/#/components/button')
  const btn = page.locator('.pg-frame-body .vela-btn').first()
  await expect(btn).toBeVisible()
  await btn.evaluate((el: HTMLElement) => {
    el.style.width = '320px'
    el.classList.remove('vela-btn--js')
    el.style.removeProperty('--vela-btn-press-x')
    el.style.removeProperty('--vela-btn-press-y')
    ;(window as Window & { __hits?: number }).__hits = 0
    el.addEventListener('click', () => { (window as Window & { __hits?: number }).__hits!++ })
  })
  for (const side of ['left', 'right'] as const) {
    const box = (await btn.boundingBox())!
    const x = side === 'left' ? box.x + 2 : box.x + box.width - 2
    await page.mouse.move(x, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(150)
    await page.mouse.up()
  }
  expect(await page.evaluate(() => (window as Window & { __hits?: number }).__hits)).toBe(2)
})

// What anchoring buys that the guard cannot: the pressed pixel does not move at all, so the
// press reads as the button yielding under the finger rather than retreating from it.
test('an anchored press does not move the point it was pressed on', async ({ page }) => {
  await page.goto('/#/components/button')
  const btn = page.locator('.pg-frame-body .vela-btn').first()
  await expect(btn).toBeVisible()
  await btn.evaluate((el: HTMLElement) => { el.style.width = '320px' })
  const box = (await btn.boundingBox())!
  await page.mouse.move(box.x + 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(120)
  const pressed = await btn.evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right }
  })
  await page.mouse.up()

  // Anchored at the left edge: that edge stays, and the far edge is the one that travels.
  expect(Math.abs(pressed.left - box.x)).toBeLessThan(0.75)
  expect(box.x + box.width - pressed.right).toBeGreaterThan(8)
})

// The Icon stylesheet is the only source of a glyph's box and stroke (icon.md, "Size and stroke
// come from the tokens"); jsdom cannot resolve either, so the real layout is checked here once.
test('the Icon page sizes every glyph from the tokens and draws the stroke on the 24 grid', async ({ page }) => {
  await page.goto('/#/components/icon')
  await expect(page.getByRole('heading', { level: 1, name: 'Icon' })).toBeVisible()
  const frame = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  await expect(frame.locator('.pg-icon__grid svg.vela-icon')).toHaveCount(50)
  const lead = frame.locator('.pg-icon__lead svg')
  const box = async () => { const b = (await lead.boundingBox())!; return [Math.round(b.width), Math.round(b.height)] }
  expect(await box()).toEqual([16, 16])
  await expect(lead).toHaveCSS('stroke-width', '2px')
  const props = page.getByRole('complementary', { name: 'Props' })
  await props.getByLabel('size').selectOption('large')
  expect(await box()).toEqual([20, 20])
  await props.getByLabel('size').selectOption('small')
  expect(await box()).toEqual([12, 12])
  await expect(page.locator('.pg-code')).toContainText('<Icon name="shield-x" size="small" />')
})

// The Tabs underline on a press (tabs.md, Motion), on the Motion review page, in both
// implementations: a pointer press grows the pressed tab's Seed into the underline where it is and
// the old underline shrinks away under the old tab; nothing travels across the row. jsdom has no
// layout and no Web Animations, so these proofs live here. The page's own "×5 slow motion" switch
// widens the window in which a flight can be inspected; it changes only the playback rate of
// running animations, never the CSS under test.
test.describe('the Tabs press', () => {
  type Layer = { opacity: number; scale: number; left: string; width: number; tabWidth: number; centre: number; tabCentre: number; colour: string; animations: string[] }
  type TabProbe = { name: string; selected: boolean; border: string; seed: Layer; line: Layer }
  type Probe = { moving: boolean; instant: boolean; tabs: TabProbe[]; animations: { target: string; property: string }[]; bars: number }
  // What every tab's two layers are doing right now: computed opacity and scale, their box against
  // the tab's, and every animation on them and anywhere else in the Tabs subtree.
  const probe = (impl: string) => async (page: import('@playwright/test').Page) =>
    page.locator(`.motion-frame[data-theme="light"] [data-implementation="${impl}"] .vela-tabs`).evaluate((root): Probe => {
      const list = root.querySelector<HTMLElement>('.vela-tabs__list')!
      const prop = (a: Animation) => (a as CSSTransition).transitionProperty ?? (a as CSSAnimation).animationName ?? '?'
      const layer = (el: HTMLElement, tab: HTMLElement): Layer => {
        const cs = getComputedStyle(el)
        const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform)
        const r = el.getBoundingClientRect(), t = tab.getBoundingClientRect()
        return {
          opacity: Number(cs.opacity), scale: m.a, left: cs.left, width: parseFloat(cs.width), tabWidth: tab.clientWidth,
          centre: r.left + r.width / 2, tabCentre: t.left + t.width / 2, colour: cs.backgroundColor,
          animations: el.getAnimations().map(prop).sort(),
        }
      }
      const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')].map((t) => ({
        name: t.firstChild!.textContent!.trim(),
        selected: t.getAttribute('aria-selected') === 'true',
        border: getComputedStyle(t).borderBottomColor,
        seed: layer(t.querySelector<HTMLElement>('.vela-tabs__seed')!, t),
        line: layer(t.querySelector<HTMLElement>('.vela-tabs__line')!, t),
      }))
      return {
        moving: list.hasAttribute('data-vela-moving'),
        instant: root.hasAttribute('data-vela-instant'),
        tabs,
        animations: root.getAnimations({ subtree: true }).map((a) => ({ target: String(((a.effect as KeyframeEffect).target as Element).className), property: prop(a) })),
        bars: root.querySelectorAll('.vela-tabs__indicator').length,
      }
    })
  const of = (p: Probe, name: string) => p.tabs.find((t) => t.name === name)!
  const tab = (page: import('@playwright/test').Page, impl: string, name: string) =>
    page.locator('.motion-frame[data-theme="light"]').getByRole('tablist', { name: `Views (${impl})` }).getByRole('tab', { name: new RegExp(`^${name}`) })
  const slowMotion = (page: import('@playwright/test').Page) => page.getByRole('switch', { name: '×5 slow motion' }).click()
  const NONE = 'rgba(0, 0, 0, 0)'

  for (const impl of ['core', 'headless'] as const) {
    test.describe(impl, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/#/motion')
        await expect(page.getByRole('heading', { level: 1, name: 'Motion review' })).toBeVisible()
        // On CI Open Sans arrives from Google Fonts and changes every tab's width; measure after it.
        await page.evaluate(() => document.fonts.ready)
      })

      test.describe('with motion', () => {
        test.use({ reducedMotion: 'no-preference' })

        // [[rule: tabs-press-grows-in-place]]
        test('a pointer press grows the Seed into the underline where it is, and the old underline shrinks away under its tab', async ({ page }) => {
          await slowMotion(page)
          const before = await probe(impl)(page)
          expect(before.moving).toBe(false)
          // No bar crosses the row any more: there is no row-level indicator at all.
          expect(before.bars).toBe(0)
          expect(of(before, 'Alerts').line.opacity).toBe(1)
          expect(of(before, 'Audit log').line.opacity).toBe(0)
          const start = of(before, 'Audit log').line.scale
          expect(start).toBeLessThan(0.5)

          await tab(page, impl, 'Audit log').click()
          const a = await probe(impl)(page)
          expect(a.moving).toBe(true)
          // The pressed tab's border is set aside while its layers grow; the old tab's line shrinks.
          expect(of(a, 'Audit log').border).toBe(NONE)
          expect(of(a, 'Audit log').seed.animations).toEqual(['opacity', 'transform'])
          expect(of(a, 'Audit log').line.animations).toEqual(['opacity', 'transform'])
          expect(of(a, 'Alerts').line.animations).toEqual(['opacity', 'transform'])
          // Nothing else moves: only transform and opacity on the layers, and the labels' colour.
          for (const x of a.animations) {
            if (x.target.includes('vela-tabs__trigger')) {
              expect(x.property).toBe('color')
            } else {
              expect(['vela-tabs__seed', 'vela-tabs__line']).toContain(x.target)
              expect(['opacity', 'transform']).toContain(x.property)
            }
          }

          await page.waitForTimeout(150)
          const b = await probe(impl)(page)
          expect(b.moving).toBe(true)
          // Growing under Audit log, shrinking under Alerts…
          expect(of(b, 'Audit log').line.scale).toBeGreaterThan(start + 0.02)
          expect(of(b, 'Audit log').line.scale).toBeLessThan(0.999)
          expect(of(b, 'Alerts').line.scale).toBeLessThan(0.999)
          expect(of(b, 'Alerts').line.opacity).toBeLessThan(1)
          // …each in its own place: every layer stays centred under its own tab, and its layout box
          // is the tab's width throughout, so only transform ever changes.
          for (const p of [before, a, b]) {
            for (const t of p.tabs) {
              for (const l of [t.seed, t.line]) {
                expect(Math.abs(l.centre - l.tabCentre), t.name).toBeLessThan(1)
                expect(l.left).toBe('0px')
                expect(Math.abs(l.width - l.tabWidth), t.name).toBeLessThan(1)
              }
            }
          }
          await expect.poll(async () => (await probe(impl)(page)).moving, { timeout: 5000 }).toBe(false)
          const end = await probe(impl)(page)
          expect(of(end, 'Audit log').border).not.toBe(NONE)
          expect(of(end, 'Audit log').line.opacity).toBe(1)
          expect(of(end, 'Audit log').line.scale).toBeCloseTo(1, 3)
          expect(of(end, 'Alerts').line.opacity).toBe(0)
        })

        // [[rule: tabs-press-retargets]]
        test('a second press mid-flight turns every layer from where it is, and the underline ends under the second tab', async ({ page }) => {
          await slowMotion(page)
          await tab(page, impl, 'Audit log').click()
          await page.waitForTimeout(250)
          // Press Assets in the page itself, reading Audit log's growing line just before the press,
          // and then the transition the press gave it: where it starts is where the line was.
          const r = await page.locator('.motion-frame[data-theme="light"]').getByRole('tablist', { name: `Views (${impl})` }).evaluate(async (list) => {
            const find = (n: string) => [...list.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.startsWith(n))!
            const lineOf = (t: HTMLElement) => t.querySelector<HTMLElement>('.vela-tabs__line')!
            const scaleOf = (t: string) => new DOMMatrix(t === 'none' ? undefined : t).a
            const line = (t: HTMLElement) => {
              const cs = getComputedStyle(lineOf(t))
              return { scale: scaleOf(cs.transform), opacity: Number(cs.opacity) }
            }
            const audit = find('Audit log'), assets = find('Assets')
            const before = line(audit)
            const init = { bubbles: true, cancelable: true, button: 0, pointerType: 'mouse', isPrimary: true }
            assets.dispatchEvent(new PointerEvent('pointerdown', init))
            assets.dispatchEvent(new PointerEvent('pointerup', init))
            assets.click()
            await new Promise((done) => setTimeout(done, 0))
            const startOf = (property: 'transform' | 'opacity') => {
              const a = lineOf(audit).getAnimations().find((x) => (x as CSSTransition).transitionProperty === property)
              const v = a ? String((a.effect as KeyframeEffect).getKeyframes()[0][property]) : ''
              return a ? (property === 'transform' ? scaleOf(v) : Number(v)) : NaN
            }
            return {
              before, from: { scale: startOf('transform'), opacity: startOf('opacity') }, assets: line(assets),
              assetsSelected: assets.getAttribute('aria-selected'), moving: list.hasAttribute('data-vela-moving'),
            }
          })
          expect(r.assetsSelected).toBe('true')
          expect(r.moving).toBe(true)
          // Retargeted, not restarted or snapped: Audit log's line was mid-growth, and its new
          // transitions, towards its Seed's size and out, start from where it was.
          expect(r.before.scale).toBeGreaterThan(0.4)
          expect(r.before.scale).toBeLessThan(0.999)
          // The new transition starts where the line was (a frame of the slowed growth apart at most),
          // never from the full underline or from nothing.
          expect(Math.abs(r.from.scale - r.before.scale), JSON.stringify(r)).toBeLessThan(0.03)
          expect(Math.abs(r.from.opacity - r.before.opacity), JSON.stringify(r)).toBeLessThan(0.03)
          // Assets grows from its own place, not from Audit log's.
          expect(r.assets.scale).toBeLessThan(0.6)
          await expect.poll(async () => (await probe(impl)(page)).moving, { timeout: 5000 }).toBe(false)
          const rest = await probe(impl)(page)
          await expect(tab(page, impl, 'Assets')).toHaveAttribute('aria-selected', 'true')
          for (const t of rest.tabs) {
            expect(t.line.opacity, t.name).toBe(t.name === 'Assets' ? 1 : 0)
            expect(t.border === NONE, t.name).toBe(t.name !== 'Assets')
          }
          expect(of(rest, 'Assets').line.scale).toBeCloseTo(1, 3)
        })

        // [[rule: tabs-keyboard-switch-is-instant]]
        // [[rule: tabs-preview-pointer-only]]
        test('a keyboard switch moves the underline at once: nothing in the Tabs animates and no Seed shows', async ({ page }) => {
          // A pointer resting on Identities shows its Seed…
          await tab(page, impl, 'Identities').hover()
          await expect.poll(async () => of(await probe(impl)(page), 'Identities').seed.opacity).toBeCloseTo(0.55, 2)
          await tab(page, impl, 'Alerts').focus()
          await page.keyboard.press('ArrowRight')
          const p = await probe(impl)(page)
          expect(p.moving).toBe(false)
          expect(p.instant).toBe(true)
          expect(p.animations).toEqual([])
          await expect(tab(page, impl, 'Assets')).toHaveAttribute('aria-selected', 'true')
          expect(of(p, 'Assets').border).not.toBe(NONE)
          expect(of(p, 'Assets').line.opacity).toBe(1)
          expect(of(p, 'Alerts').border).toBe(NONE)
          expect(of(p, 'Alerts').line.opacity).toBe(0)
          // …and the keyboard puts it away at once: no Seed anywhere while the keyboard is in use.
          for (const t of p.tabs) expect(t.seed.opacity, t.name).toBe(0)
          // A pointer moving over the list again brings it back, after the rest.
          const box = (await tab(page, impl, 'Identities').boundingBox())!
          await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2)
          await expect.poll(async () => of(await probe(impl)(page), 'Identities').seed.opacity).toBeCloseTo(0.55, 2)
        })
      })

      // The project default: reducedMotion 'reduce'.
      // [[rule: tabs-press-reduced-motion-end-state]]
      // [[rule: tabs-underline-rest-is-the-border]]
      test('under reduced motion a pointer press lands at its end state, and at rest the underline is the tab\'s own border', async ({ page }) => {
        await tab(page, impl, 'Audit log').click()
        // The reduced-motion collapse gives every property change a 0.01ms transition, the hand-back
        // to the border included, so "at rest" is polled for rather than read once.
        await expect.poll(async () => (await probe(impl)(page)).moving, { timeout: 2000 }).toBe(false)
        const rest = await probe(impl)(page)
        expect(rest.animations).toEqual([])
        for (const t of rest.tabs) {
          if (t.selected) {
            // The selected tab's border is the underline, in --vela-border-active; the line on it is
            // the same colour at full strength and full width…
            expect(t.name).toBe('Audit log')
            expect(t.border).not.toBe(NONE)
            expect(t.line.colour).toBe(t.border)
            expect([t.line.opacity, Math.round(t.line.scale * 1000) / 1000]).toEqual([1, 1])
          } else {
            expect(t.border, t.name).toBe(NONE)
            expect(t.line.opacity, t.name).toBe(0)
          }
          expect(t.seed.opacity, t.name).toBe(0)
        }
        // …on exactly the border's pixels, so the still list renders as the border alone did.
        const g = await tab(page, impl, 'Audit log').evaluate((t) => {
          const r = t.getBoundingClientRect(), l = t.querySelector('.vela-tabs__line')!.getBoundingClientRect()
          return { tab: [r.left, r.right, r.bottom], line: [l.left, l.right, l.bottom], height: l.height, border: parseFloat(getComputedStyle(t).borderBottomWidth) }
        })
        g.line.forEach((v, i) => expect(Math.abs(v - g.tab[i])).toBeLessThan(0.01))
        expect(g.height).toBe(g.border)
      })
    })
  }

  test('the Motion review page lists every motion token with its value and reason, in light and dark', async ({ page }) => {
    await page.goto('/#/motion')
    const rows = page.locator('.motion-tokens tbody tr')
    await expect(rows).toHaveCount(11)
    await expect(page.locator('.motion-tokens tr[data-token="ease-spring"] td').first()).toContainText('stiffness 1200, damping 56, mass 1')
    await expect(page.locator('.motion-tokens tr[data-token="ease-out"] td').first()).toHaveText('cubic-bezier(0.25, 1, 0.5, 1)')
    await expect(page.locator('.motion-frame[data-theme="dark"] .vela-tabs__list')).toHaveCount(2)
    // The dark frame re-points the underline colour: the two frames' active borders differ.
    const active = (m: string) => page.locator(`.motion-frame[data-theme="${m}"] [data-implementation="core"] [role="tab"][aria-selected="true"]`).evaluate((el) => getComputedStyle(el).borderBottomColor)
    expect(await active('light')).not.toBe(await active('dark'))
    await expect(page.getByText('review aid', { exact: false })).toBeVisible()
  })
})

// Windows contrast themes replace every background: before its own rules the Toggle's track and
// knob drew nothing, and the Tooltip's inverted fill went with them, leaving its text edgeless.
// [[rule: toggle-forced-colours]]
test('in forced colours the Toggle keeps its track edge and knob; on is the Highlight pair, disabled is GrayText', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/#/components/toggle')
  const sw = page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('switch')
  await expect(sw).toBeVisible()
  const read = () => sw.evaluate((t: HTMLElement) => {
    const sys = (c: string) => { const p = document.createElement('i'); p.style.cssText = `forced-color-adjust: none; color: ${c}`; t.parentElement!.appendChild(p); const v = getComputedStyle(p).color; p.remove(); return v }
    const cs = getComputedStyle(t), knob = getComputedStyle(t.querySelector('.vela-toggle__knob')!)
    return {
      sys: { canvasText: sys('CanvasText'), highlight: sys('Highlight'), highlightText: sys('HighlightText'), grayText: sys('GrayText') },
      checked: t.getAttribute('aria-checked') === 'true', edge: `${cs.borderTopWidth} ${cs.borderTopStyle}`, border: cs.borderTopColor, track: cs.backgroundColor, knob: knob.backgroundColor,
    }
  })
  let s = await read()
  if (s.checked) { await sw.click(); s = await read() }
  expect(s.edge).toBe('1px solid')
  expect([s.border, s.knob]).toEqual([s.sys.canvasText, s.sys.canvasText])
  await sw.click()
  // The track's fill transitions, so wait for it to settle rather than read the first frame.
  await expect.poll(async () => { const r = await read(); return [r.checked, r.border, r.track, r.knob] })
    .toEqual([true, s.sys.highlight, s.sys.highlight, s.sys.highlightText])
  // Disabled, through the page's own control for the prop.
  await page.getByRole('switch', { name: 'disabled' }).click()
  await expect(sw).toBeDisabled()
  await expect.poll(async () => { const r = await read(); return [r.border, r.knob] }).toEqual([s.sys.grayText, s.sys.grayText])
})

// [[rule: tooltip-forced-colours]]
test('in forced colours the Tooltip keeps a 1px CanvasText edge', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/#/components/tooltip')
  await page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('button', { name: 'Export' }).hover()
  const tip = page.getByRole('tooltip')
  await expect(tip).toBeVisible()
  const s = await tip.evaluate((el: HTMLElement) => {
    const p = document.createElement('i'); p.style.cssText = 'forced-color-adjust: none; color: CanvasText'; document.body.appendChild(p)
    const canvasText = getComputedStyle(p).color; p.remove()
    const cs = getComputedStyle(el)
    return { edge: `${cs.borderTopWidth} ${cs.borderTopStyle}`, color: cs.borderTopColor, canvasText }
  })
  expect(s.edge).toBe('1px solid')
  expect(s.color).toBe(s.canvasText)
})
