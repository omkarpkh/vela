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
    const contract = page.getByRole('region', { name: /^Use / })
    await expect(contract.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela')
    await expect(contract.locator('.pg-install-note')).toHaveCount(0)
    // Install appears once, and never in the code block the Copy button copies.
    await expect(page.locator('.pg-code')).not.toContainText('npm i')
  })

  test('a headless component installs Base UI too, and says why', async ({ page }) => {
    await page.goto('/#/components/popover')
    const contract = page.getByRole('region', { name: /^Use / })
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

      // Focus rings: a keyboard focus still draws the 2px outline.
      await selected.focus()
      await page.keyboard.press('Tab')
      const ring = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const cs = getComputedStyle(el)
        return { visible: el.matches(':focus-visible'), style: cs.outlineStyle, width: cs.outlineWidth }
      })
      expect(ring).toEqual({ visible: true, style: 'solid', width: '2px' })

      // Change marks: a bound row in the Tokens table is drawn with a border, not a tint. Tokens is
      // its own page tab, so this comes after the checks on the Playground tab.
      await page.getByRole('tab', { name: /^Tokens/ }).click()
      const marks = page.locator('.pg-table--tokens tr.is-bound td:first-child')
      const n = await marks.count()
      if (id !== 'popover') expect(n, 'a bound row').toBeGreaterThan(0)
      for (let i = 0; i < n; i++) {
        const b = await marks.nth(i).evaluate((el) => { const cs = getComputedStyle(el); return [cs.borderLeftWidth, cs.borderLeftStyle] })
        expect(b).toEqual(['2px', 'solid'])
      }
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

// Slice 1 of the playground redesign: the page header (playground spec, section 4). The Use panel,
// the contract facts grid, page tabs that appear only with data, and Copy that fails loudly (B3).
test.describe('the page header', () => {
  test('the Use panel holds install and import, each with its own Copy, and the links', async ({ page }) => {
    await page.goto('/#/components/button')
    const use = page.getByRole('region', { name: 'Use Button' })
    await expect(use.getByText('1 · Install')).toBeVisible()
    await expect(use.getByText('in your terminal, once per project')).toBeVisible()
    await expect(use.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela')
    await expect(use.getByText('2 · Import')).toBeVisible()
    await expect(use.getByText('at the top of each file that uses it')).toBeVisible()
    await expect(use.locator('.pg-import')).toHaveText("import { Button } from '@omkarux/vela'")
    await expect(use.getByRole('button', { name: 'Copy install command' })).toBeVisible()
    await expect(use.getByRole('button', { name: 'Copy import line' })).toBeVisible()
    await expect(use.getByRole('link', { name: 'Spec on GitHub' })).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/blob/main/guidelines/components/button.md')
    await expect(use.getByRole('link', { name: 'Source' })).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/blob/main/src/components/Button/Button.tsx')
    await expect(use.getByRole('link', { name: 'Figma' })).toHaveAttribute('href', /node-id=7-122$/)
    // Install is only here: the code bar copies the import and the JSX, never the install.
    const code = page.getByRole('region', { name: 'Import and usage' })
    await expect(code.locator('.pg-code')).toContainText("import { Button } from '@omkarux/vela'")
    await expect(code.locator('.pg-code')).not.toContainText('npm i')
    await expect(page.locator('.pg-install-command')).toHaveCount(1)
  })

  test('a component with no Figma set has no Figma link and no Figma tab', async ({ page }) => {
    await page.goto('/#/components/dropdown-list')
    const use = page.getByRole('region', { name: 'Use Dropdown List' })
    await expect(use.getByRole('link', { name: 'Spec on GitHub' })).toBeVisible()
    await expect(use.getByRole('link', { name: 'Figma' })).toHaveCount(0)
    const tabs = page.getByRole('tablist', { name: 'Dropdown List page' }).getByRole('tab')
    await expect(tabs).toHaveText(['Playground', 'Rules', /^Tokens\s*\d+$/])
  })

  test('the facts grid reads the spec, the package and the build', async ({ page }) => {
    await page.goto('/#/components/button')
    const facts = page.locator('dl[aria-label="Contract"]')
    const cell = (term: string) => facts.locator('.pg-fact', { has: page.locator('dt', { hasText: new RegExp(`^${term}$`) }) }).locator('dd')
    await expect(cell('Status')).toHaveText('Approved')
    await expect(cell('Entry')).toHaveText('@omkarux/vela')
    await expect(cell('Dependencies')).toHaveText('None at runtime')
    await expect(cell('Minimum width')).toHaveText('Not stated in the spec yet')
    await expect(cell('Built')).toHaveText(/^\d+\.\d+\.\d+ · ([0-9a-f]{7}|unknown) · \d{1,2} [A-Z][a-z]{2} \d{4}$/)
    // Rules: the total, then one tag per level, in the Rules tab's order.
    await expect(cell('Rules')).toHaveText(/^\d+\s*\d+ compiler/)
    await expect(cell('Rules').locator('.site-tag').first()).toHaveText(/^\d+ compiler$/)

    await page.goto('/#/components/dropdown-list')
    await expect(cell('Status')).toHaveText('Experimental')
    await expect(cell('Entry')).toHaveText('@omkarux/vela/headless')
    await expect(cell('Dependencies')).toHaveText('@base-ui/react, an optional peer')
  })

  test('the facts grid never scrolls the page sideways, from 320 to 1440', async ({ page }) => {
    for (const width of [320, 390, 820, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/#/components/tabs')
      await expect(page.locator('dl[aria-label="Contract"]')).toBeVisible()
      expect(await noSidewaysScroll(page), `${width}px`).toBe(true)
    }
  })

  test('page tabs have addresses: shareable, kept on reload, and no history entry per tab', async ({ page }) => {
    await page.goto('/#/components/button')
    const tabs = page.getByRole('tablist', { name: 'Button page' })
    await expect(tabs.getByRole('tab')).toHaveText(['Playground', 'Rules', /^Tokens\s*\d+$/, 'Figma'])
    await expect(tabs.getByRole('tab', { name: 'Playground' })).toHaveAttribute('aria-selected', 'true')
    const length = await page.evaluate(() => history.length)
    await tabs.getByRole('tab', { name: 'Rules' }).click()
    await expect(page).toHaveURL(/#\/components\/button\/rules$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Hard constraints' })).toBeVisible()
    expect(await page.evaluate(() => history.length)).toBe(length)
    // The nav link stays current on every tab of the page.
    await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Button', exact: true })).toHaveAttribute('aria-current', 'page')
    await page.reload()
    await expect(page.getByRole('tablist', { name: 'Button page' }).getByRole('tab', { name: 'Rules' })).toHaveAttribute('aria-selected', 'true')
    // Back to the page's own address: the Playground tab, and the props are where they were.
    await page.getByRole('tablist', { name: 'Button page' }).getByRole('tab', { name: 'Playground' }).click()
    await expect(page).toHaveURL(/#\/components\/button$/)
    await expect(page.getByRole('complementary', { name: 'Props' })).toBeVisible()
    // A link to a tab that has no data, or no such tab, opens the Playground tab.
    await page.goto('/#/components/dropdown-list/figma')
    await expect(page.getByRole('tablist', { name: 'Dropdown List page' }).getByRole('tab', { name: 'Playground' })).toHaveAttribute('aria-selected', 'true')
    await page.goto('/#/components/button/changelog')
    await expect(page.getByRole('tablist', { name: 'Button page' }).getByRole('tab', { name: 'Playground' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Changelog' })).toHaveCount(0)
  })

  test('Copy snippet copies the import line and the JSX, and says so', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/#/components/button')
    const code = page.getByRole('region', { name: 'Import and usage' })
    await code.getByRole('button', { name: 'Copy snippet' }).click()
    await expect(code.getByRole('status')).toHaveText('Copied.')
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(await code.locator('.pg-code').textContent())
    expect(copied.startsWith("import { Button } from '@omkarux/vela'\n\n<Button")).toBe(true)
    expect(copied).not.toContain('npm i')
  })

  // B3: when the clipboard is refused and the fallback fails too, the text is left selected and the
  // status line says how to copy it by hand. Before slice 1 a failure did nothing at all.
  test('when copying is refused, the text stays selected and the failure is said', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) } })
      document.execCommand = () => false
    })
    await page.goto('/#/components/popover')
    const use = page.getByRole('region', { name: 'Use Popover' })
    await use.getByRole('button', { name: 'Copy install command' }).click()
    await expect(use.getByRole('status').first()).toHaveText("Couldn't copy. The text is selected: press Ctrl+C (⌘C on a Mac) to copy it.")
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('npm i @omkarux/vela @base-ui/react')

    const code = page.getByRole('region', { name: 'Import and usage' })
    await code.getByRole('button', { name: 'Copy snippet' }).click()
    await expect(code.getByRole('status')).toHaveText(/^Couldn't copy\./)
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(await code.locator('.pg-code').textContent())
  })
})
