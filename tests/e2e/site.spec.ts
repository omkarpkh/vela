import { test, expect, type Page } from '@playwright/test'

// Slice 0 of the playground redesign: fixes to the live site, no new layout. Behavioural checks,
// no screenshots, so no baselines. The error boundaries are driven in jsdom
// (src/styles/site-errors.test.tsx), where a render error can be forced without shipping a hook.

const COMPONENTS = ['button', 'toggle', 'input', 'text-area', 'contextual-alert', 'status-indicator', 'risk-pill', 'tabs', 'icon', 'checkbox', 'radio-group', 'table', 'popover', 'tooltip', 'dialog', 'toast']

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

test.describe('Proposal pages', () => {
  test('the Evidence Locker page is a written spec: no stage, no Copy, no props panel, no install', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Evidence Locker', exact: true }).click()
    await expect(page).toHaveURL(/#\/proposals\/evidence-locker$/)
    const main = page.getByRole('main')
    // The first block is a heading.
    const first = main.locator('article > header > :first-child')
    await expect(first).toHaveText('Evidence Locker')
    expect(await first.evaluate((el) => el.tagName)).toBe('H1')
    await expect(main.getByText("Proposal. This component is a written spec. It isn't built and can't be installed yet.")).toBeVisible()
    await expect(main.getByRole('link', { name: 'Read the spec on GitHub' })).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/blob/main/guidelines/proposals/evidence-locker.md')
    await expect(main.getByText('There is no Figma set yet.')).toBeVisible()
    await expect(main.getByRole('link', { name: 'See the design in Figma' })).toHaveCount(0)

    // The spec, loaded when the page opens.
    await expect(main.getByRole('heading', { level: 2, name: 'Responsive behaviour' })).toBeVisible()
    await expect(main.getByRole('heading', { level: 2, name: 'Props' })).toBeVisible()
    await expect(main.getByText('These may change before the component is built.')).toBeVisible()
    await expect(main.getByRole('cell', { name: 'conclusion', exact: true })).toBeVisible()
    await expect(main.getByText('Waiting on: the Action Impact Card (Phase 2) and the Calibrated Confidence Gate (Phase 2).')).toBeVisible()

    // What a built component's page has, and a proposal's must not.
    await expect(page.locator('.pg-stage')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copy' })).toHaveCount(0)
    await expect(page.getByRole('complementary', { name: 'Props' })).toHaveCount(0)
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.locator('.pg-install-command')).toHaveCount(0)
    await expect(main).not.toContainText('npm i')
    await expect(main).not.toContainText('import {')
    await expect(page).toHaveTitle('Evidence Locker · Vela')
  })
})

test.describe('the install command', () => {
  test('a core component installs the package alone', async ({ page }) => {
    await page.goto('/#/components/button')
    const contract = page.getByRole('region', { name: 'Contract' })
    await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela')
    await expect(contract.locator('.pg-install-note')).toHaveCount(0)
    // Install appears once, and never in the code block the Copy button copies.
    await expect(page.locator('.pg-code')).not.toContainText('npm i')
  })

  test('a headless component installs Base UI too, and says why', async ({ page }) => {
    await page.goto('/#/components/popover')
    const contract = page.getByRole('region', { name: 'Contract' })
    await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela @base-ui/react')
    await expect(contract.locator('.pg-install-note')).toHaveText("Base UI is an optional peer, and npm doesn't install optional peers for you.")
    await expect(page.locator('.pg-code')).not.toContainText('npm i')
  })
})

test.describe('segments', () => {
  test('the theme, stage and implementation choices are segments: aria-current, Tab reaches each, arrows do nothing', async ({ page }) => {
    await page.goto('/#/components/tabs')
    for (const name of ['Theme', 'Stage', 'Implementation']) {
      const group = page.getByRole('group', { name })
      await expect(group.locator('[aria-current="true"]')).toHaveCount(1)
      // No primary filled Button stands for "selected".
      await expect(group.locator('.vela-btn')).toHaveCount(0)
    }
    const theme = page.getByRole('group', { name: 'Theme' })
    const light = theme.getByRole('button', { name: 'Light', exact: true })
    await light.focus()
    await page.keyboard.press('ArrowRight')
    await expect(light).toBeFocused()
    await expect(light).not.toHaveAttribute('aria-current')
    await page.keyboard.press('Enter')
    await expect(light).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.keyboard.press('Tab')
    const dark = theme.getByRole('button', { name: 'Dark', exact: true })
    await expect(dark).toBeFocused()
    await page.keyboard.press('Space')
    await expect(dark).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})

// Playground spec, section 13: under forced colours the selected segment, the change marks and the
// focus rings stay visible, on one page per kind.
test.describe('forced colours', () => {
  for (const id of ['button', 'table', 'popover', 'toast']) {
    test(`the ${id} page keeps its selected segment, change marks and focus rings`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' })
      await page.goto(`/#/components/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)

      // What the system colours resolve to in this emulation.
      const system = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.style.cssText = 'forced-color-adjust: none; background: Highlight; color: HighlightText'
        document.body.appendChild(probe)
        const cs = getComputedStyle(probe)
        const out = { highlight: cs.backgroundColor, highlightText: cs.color }
        probe.remove()
        return out
      })
      const selected = page.getByRole('group', { name: 'Stage' }).locator('[aria-current="true"]')
      const seg = await selected.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { adjust: cs.forcedColorAdjust, bg: cs.backgroundColor, fg: cs.color, width: cs.borderTopWidth, style: cs.borderTopStyle }
      })
      expect(seg).toEqual({ adjust: 'none', bg: system.highlight, fg: system.highlightText, width: '2px', style: 'solid' })
      // Only that element opts out of the forced palette.
      const other = page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'Light', exact: true })
      expect(await other.evaluate((el) => getComputedStyle(el).forcedColorAdjust)).toBe('auto')

      // Change marks: a bound row in the Tokens table is drawn with a border, not a tint.
      await page.getByRole('tab', { name: /^Tokens/ }).click()
      const marks = page.locator('.pg-table--tokens tr.is-bound td:first-child')
      const n = await marks.count()
      if (id !== 'popover') expect(n, 'a bound row').toBeGreaterThan(0)
      for (let i = 0; i < n; i++) {
        const b = await marks.nth(i).evaluate((el) => { const cs = getComputedStyle(el); return [cs.borderLeftWidth, cs.borderLeftStyle] })
        expect(b).toEqual(['2px', 'solid'])
      }

      // Focus rings: a keyboard focus still draws the 2px outline.
      await selected.focus()
      await page.keyboard.press('Tab')
      const ring = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const cs = getComputedStyle(el)
        return { visible: el.matches(':focus-visible'), style: cs.outlineStyle, width: cs.outlineWidth }
      })
      expect(ring).toEqual({ visible: true, style: 'solid', width: '2px' })
    })
  }
})

// The audit's 0px check (P1 request, item 7): a prop change never moves what is on the stage. The
// light frame's content is measured, every select in the props panel is cycled, and every switch
// flipped, and the content's top-left corner stays where it was, to the pixel.
test.describe('the stage never moves on a prop change', () => {
  for (const id of COMPONENTS) {
    test(id, async ({ page }) => {
      await page.goto(`/#/components/${id}`)
      const body = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
      await expect(body.locator(':scope > *').first()).toBeVisible()
      // Page coordinates, not viewport ones: flipping a switch low in the props panel scrolls the page.
      const corner = () => body.evaluate((host) => {
        const at = (el: Element) => { const r = el.getBoundingClientRect(); return [Math.round(r.left + window.scrollX), Math.round(r.top + window.scrollY)] }
        return [...at(host.firstElementChild!), ...at(host)]
      })
      const start = await corner()
      const props = page.getByRole('complementary', { name: 'Props' })
      const selects = props.locator('select')
      for (let i = 0; i < (await selects.count()); i++) {
        const select = selects.nth(i)
        const options = await select.locator('option:not([disabled])').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
        const original = await select.inputValue()
        for (const value of [...options.slice(0, 6), original]) {
          await select.selectOption(value)
          expect(await corner(), `${await select.getAttribute('class')} #${i} = ${value}`).toEqual(start)
        }
      }
      const switches = props.getByRole('switch')
      for (let i = 0; i < (await switches.count()); i++) {
        const sw = switches.nth(i)
        if (await sw.isDisabled()) continue
        await sw.click()
        expect(await corner(), `switch #${i}`).toEqual(start)
        await sw.click()
      }
      // Changing the stage view anchors the same way.
      await page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'Light', exact: true }).click()
      const single = await corner()
      expect(single[0]).toBe(start[0])
      expect(single[1]).toBe(start[1])
    })
  }
})

test.describe('scroll regions', () => {
  test('the code block is a named region in the tab order only while it scrolls', async ({ page }) => {
    await page.goto('/#/components/button')
    const code = page.locator('.pg-code').first()
    await expect(code).toBeVisible()
    await expect(code).not.toHaveAttribute('tabindex')
    await expect(code).not.toHaveAttribute('role')
    await page.getByRole('complementary', { name: 'Props' }).getByLabel('children').fill('Save the changes to every tenant in every region and every account, then notify the owners of each one by email and keep a record of who was told and when they were told')
    await expect(page.getByRole('region', { name: 'Code, scrollable' })).toHaveAttribute('tabindex', '0')
    await page.getByRole('region', { name: 'Code, scrollable' }).focus()
    await page.keyboard.press('End')
    await page.getByRole('complementary', { name: 'Props' }).getByLabel('children').fill('Save')
    await expect(code).not.toHaveAttribute('tabindex')
  })

  // Every component in the kit wraps or scrolls itself at phone width, so the overflow is made
  // here: content with a fixed width wider than the stage, added to the light frame.
  test('content wider than the stage scrolls inside the stage, never the page, and only then takes focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/components/radio-group')
    const stage = page.locator('.pg-stage')
    await expect(page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('radiogroup')).toBeVisible()
    await expect(stage).not.toHaveAttribute('tabindex')
    await expect(stage).not.toHaveAttribute('role')
    await page.locator('.pg-frame[data-theme="light"] .pg-frame-body').evaluate((body) => {
      const wide = document.createElement('div')
      wide.id = 'wide'
      wide.style.width = '900px'
      wide.style.height = '10px'
      body.appendChild(wide)
    })
    const region = page.getByRole('region', { name: 'Stage, scrollable' })
    await expect(region).toHaveAttribute('tabindex', '0')
    expect(await noSidewaysScroll(page)).toBe(true)
    // From the keyboard: focus the region and scroll it.
    await region.focus()
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
    await expect.poll(() => stage.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
    // No edge fade.
    expect(await stage.evaluate((el) => getComputedStyle(el).maskImage)).toBe('none')
    await page.locator('#wide').evaluate((el) => el.remove())
    await expect(stage).not.toHaveAttribute('tabindex')
  })
})

// Across every slice: one page per kind, at four widths, in both themes, never scrolls sideways.
test.describe('no sideways page scroll', () => {
  for (const width of [390, 820, 1280, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width} · ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        for (const id of ['button', 'table', 'popover', 'toast']) {
          await page.goto(`/#/components/${id}`)
          await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).click()
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
          expect(await noSidewaysScroll(page), id).toBe(true)
        }
      })
    }
  }
})
