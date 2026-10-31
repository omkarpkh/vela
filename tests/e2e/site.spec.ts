import { test, expect, type Locator, type Page } from '@playwright/test'

/** Chooses a control's value: a segment (up to six values, D4) or, above six, the native select (A24). */
async function choose(scope: Locator, prop: string, value: string) {
  const group = scope.getByRole('group', { name: prop, exact: true })
  // From the keyboard, as D4 intends: Tab reaches the value, Enter chooses it. (At a phone width the
  // site's navigation can overlay the controls; a key press doesn't care.)
  if (await group.count()) { await group.getByRole('button', { name: value, exact: true }).focus(); await scope.page().keyboard.press('Enter') }
  else await scope.getByLabel(prop, { exact: true }).selectOption(value)
}

/** Compare: Themes, so the stage shows the light and the dark frame side by side. */
async function compareThemes(page: import('@playwright/test').Page) {
  await page.getByRole('group', { name: 'Compare' }).getByRole('button', { name: 'Themes' }).click()
}

// Slice 0 of the playground redesign: fixes to the live site, no new layout. Behavioural checks,
// no screenshots, so no baselines. The error boundaries are driven in jsdom
// (src/styles/site-errors.test.tsx), where a render error can be forced without shipping a hook.

const COMPONENTS = ['button', 'toggle', 'input', 'text-area', 'contextual-alert', 'status-indicator', 'risk-pill', 'tabs', 'icon', 'checkbox', 'radio-group', 'table', 'popover', 'tooltip', 'dialog', 'toast']

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

test.describe('Proposal pages', () => {
  test('the Evidence Locker page is a written spec: no stage, no Copy, no props panel, no install', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Evidence Locker Proposal', exact: true }).click()
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
    await expect(page.getByRole('complementary', { name: 'Controls' })).toHaveCount(0)
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
      const other = page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'Full width', exact: true })
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
      const props = page.getByRole('complementary', { name: 'Controls' })
      const selects = props.locator('select')
      for (let i = 0; i < (await selects.count()); i++) {
        const select = selects.nth(i)
        const options = await select.locator('option:not([disabled])').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
        const original = await select.inputValue()
        for (const value of [...options.slice(0, 6), original]) {
          await select.selectOption(value)
          expect(await corner(), `select #${i} = ${value}`).toEqual(start)
        }
      }
      // Segments (up to six values): every value that isn't locked, then back to where it was.
      const groups = props.getByRole('group')
      for (let i = 0; i < (await groups.count()); i++) {
        const group = groups.nth(i)
        const original = group.locator('[aria-current="true"]')
        const name = (await original.count()) ? await original.textContent() : null
        const buttons = group.locator('button:not([aria-disabled="true"])')
        for (let j = 0; j < (await buttons.count()); j++) {
          await buttons.nth(j).click()
          expect(await corner(), `${await group.getAttribute('aria-label')} = ${await buttons.nth(j).textContent()}`).toEqual(start)
        }
        if (name) await group.getByRole('button', { name, exact: true }).click()
      }
      const switches = props.getByRole('switch')
      for (let i = 0; i < (await switches.count()); i++) {
        const sw = switches.nth(i)
        if (await sw.isDisabled()) continue
        await sw.click()
        expect(await corner(), `switch #${i}`).toEqual(start)
        await sw.click()
      }
      // Comparing themes adds the dark frame beside it; the light one stays anchored where it was.
      await compareThemes(page)
      const split = await corner()
      expect(split[0]).toBe(start[0])
      expect(split[1]).toBe(start[1])
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
    await page.getByRole('complementary', { name: 'Controls' }).getByLabel('children').fill('Save the changes to every tenant in every region and every account, then notify the owners of each one by email and keep a record of who was told and when they were told')
    await expect(page.getByRole('region', { name: 'Code, scrollable' })).toHaveAttribute('tabindex', '0')
    await page.getByRole('region', { name: 'Code, scrollable' }).focus()
    await page.keyboard.press('End')
    await page.getByRole('complementary', { name: 'Controls' }).getByLabel('children').fill('Save')
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
    await expect(page.getByRole('complementary', { name: 'Controls' })).toBeVisible()
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
    await expect(code.getByRole('status')).toHaveText('Copied snippet')
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
    // The Copy Button spec's words; this desktop Chromium is neither Apple nor touch, so Ctrl+C.
    await expect(use.getByRole('status').first()).toHaveText("Couldn't copy: your browser blocked the clipboard. The text is selected, so press Ctrl+C.")
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('npm i @omkarux/vela @base-ui/react')

    const code = page.getByRole('region', { name: 'Import and usage' })
    await code.getByRole('button', { name: 'Copy snippet' }).click()
    await expect(code.getByRole('status')).toHaveText(/^Couldn't copy: your browser blocked the clipboard\. The text is selected/)
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(await code.locator('.pg-code').textContent())
  })
})

// Slice 3 of the playground redesign: Find (playground spec, sections 2, 3 and 10).
test.describe('find', () => {
  test('the nav is grouped by job, components carry their lifecycle in words, and Demos sit under Project', async ({ page }) => {
    await page.goto('/#/components/popover')
    const nav = page.getByRole('navigation', { name: 'Site' })
    const groups = nav.getByRole('heading', { level: 4 })
    await expect(groups).toHaveText(['Actions', 'Inputs', 'Feedback', 'Overlays', 'Data', 'Agent review'])
    await expect(nav.getByRole('link', { name: 'Popover Experimental' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Dropdown List Experimental' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Button', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Evidence Locker Proposal' })).toBeVisible()
    // Dropdown List is an Overlay (decided by the playground thread, 30 Oct), not an Input.
    const overlays = nav.locator('.sitenav__group--sub', { has: page.getByRole('heading', { name: 'Overlays' }) })
    await expect(overlays.getByRole('link')).toHaveText(['Popover Experimental', 'Tooltip Experimental', 'Dialog Experimental', 'Dropdown List Experimental'])
    const project = nav.locator('.sitenav__group', { has: page.getByRole('heading', { level: 3, name: 'Project' }) })
    await expect(project.getByRole('link', { name: 'Adopt without rewrite' })).toBeVisible()
    await expect(nav.getByRole('heading', { name: 'Demos' })).toHaveCount(0)
    // The breadcrumb names the group.
    await expect(page.getByText('Components / Overlays')).toBeVisible()
  })

  test('a group collapses, but never the one that holds the current page', async ({ page }) => {
    await page.goto('/#/components/popover')
    const nav = page.getByRole('navigation', { name: 'Site' })
    const inputs = nav.getByRole('button', { name: 'Inputs' })
    await expect(inputs).toHaveAttribute('aria-expanded', 'true')
    await inputs.click()
    await expect(inputs).toHaveAttribute('aria-expanded', 'false')
    await expect(nav.getByRole('link', { name: 'Toggle', exact: true })).toBeHidden()
    await inputs.click()
    await expect(nav.getByRole('link', { name: 'Toggle', exact: true })).toBeVisible()
    // Overlays holds the current page: a heading, with nothing to collapse.
    await expect(nav.getByRole('button', { name: 'Overlays' })).toHaveCount(0)
    await expect(nav.getByRole('heading', { name: 'Overlays' })).toBeVisible()
  })

  test('search opens from the button, from Ctrl K and from /, and Escape returns focus to the button', async ({ page }) => {
    await page.goto('/#/components/button')
    const button = page.getByRole('button', { name: 'Search components, foundations and rules' })
    await expect(button).toContainText('Search, or type a name you know')
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await button.click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('combobox', { name: 'Search' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(button).toBeFocused()
    await page.keyboard.press('Control+k')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await page.locator('h1').click()
    await page.keyboard.press('/')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    // `/` in a text field types a slash.
    const field = page.getByRole('complementary', { name: 'Controls' }).getByRole('textbox').first()
    await field.click()
    await page.keyboard.press('/')
    await expect(dialog).toBeHidden()
  })

  test('"modal" finds Dialog by its alias, and Enter opens it', async ({ page }) => {
    await page.goto('/#/components/button')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await dialog.getByRole('combobox').fill('modal')
    const first = dialog.getByRole('option').first()
    await expect(first).toHaveAttribute('aria-selected', 'true')
    await expect(first).toContainText('Dialog')
    await expect(first).toContainText('Experimental')
    await expect(first).toContainText('also called: modal')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/components\/dialog$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Dialog' })).toBeVisible()
  })

  // A2: an alias two things share is ranked, and each result's line tells them apart.
  test('"dropdown" lists Dropdown List first, then says Select List is not in Vela yet', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await dialog.getByRole('combobox').fill('dropdown')
    const options = dialog.getByRole('option')
    await expect(options.nth(0)).toContainText('Dropdown List')
    await expect(options.nth(0)).toContainText('acts at once')
    await expect(options.nth(1)).toContainText('Select List')
    await expect(options.nth(1)).toContainText("Select List isn't in Vela yet. It's planned for Phase 1.")
    await expect(options.nth(1)).toContainText('A form value')
    // Arrow keys move; the input keeps focus and names the active option.
    await page.keyboard.press('ArrowDown')
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(dialog.getByRole('combobox')).toHaveAttribute('aria-activedescendant', (await options.nth(1).getAttribute('id'))!)
  })

  test('no result says so, names what search covers, and never returns Project or Demos pages', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await dialog.getByRole('combobox').fill('zzzz')
    await expect(dialog).toContainText('Nothing matches “zzzz”.')
    await expect(dialog).toContainText('Search covers component names, aliases and rule ids.')
    await expect(dialog.getByRole('link', { name: 'Browse all components' })).toBeVisible()
    for (const q of ['changelog', 'roadmap', 'adopt', 'motion review']) {
      await dialog.getByRole('combobox').fill(q)
      await expect(dialog.getByRole('option').filter({ hasText: /^(Changelog|Roadmap|Adopt without rewrite|Motion review)/ })).toHaveCount(0)
    }
  })

  test('a rule id finds its component\'s Rules tab', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await dialog.getByRole('combobox').fill('toggle-label-required')
    await expect(dialog.getByRole('option').first()).toContainText('toggle-label-required')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/components\/toggle\/rules$/)
  })

  test('a link to a component that does not exist suggests the closest names', async ({ page }) => {
    await page.goto('/#/components/modal-window')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('There\'s no component called “modal-window”.')
    await expect(page.getByRole('link', { name: 'Dialog', exact: true }).last()).toHaveAttribute('href', '#/components/dialog')
    await expect(page.getByRole('main').getByRole('link', { name: 'Browse all components' })).toBeVisible()
  })

  test('on a phone the search button is the icon alone, named "Search"', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const button = page.getByRole('button', { name: 'Search', exact: true })
    await expect(button).toBeVisible()
    await expect(button).not.toContainText('type a name')
    expect(await noSidewaysScroll(page)).toBe(true)
  })
})

// Slice 2 of the playground redesign: the workbench (playground spec, section 5 and 11).
test.describe('the workbench', () => {
  test('Stage: Beside by default; Full width puts the controls below the stage, kept for the component and in the link', async ({ page }) => {
    await page.goto('/#/components/button')
    const stage = page.getByRole('group', { name: 'Stage' })
    await expect(stage.getByRole('button', { name: 'Beside' })).toHaveAttribute('aria-current', 'true')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    const frame = page.locator('.pg-frame').first()
    expect((await controls.boundingBox())!.x).toBeGreaterThan((await frame.boundingBox())!.x + (await frame.boundingBox())!.width - 1)
    await stage.getByRole('button', { name: 'Full width' }).click()
    await expect(page).toHaveURL(/#\/components\/button\?v=1&stage=full$/)
    expect((await controls.boundingBox())!.y).toBeGreaterThan((await frame.boundingBox())!.y + (await frame.boundingBox())!.height - 1)
    await expect(page.locator('.pg-frame-label').first()).toContainText('Full width')
    // Kept for this component: a fresh visit without the link still opens Full width.
    await page.goto('/#/components/toggle')
    await page.goto('/#/components/button')
    await expect(page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'Full width' })).toHaveAttribute('aria-current', 'true')
    // And only for that one.
    await page.goto('/#/components/toggle')
    await expect(page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'Beside' })).toHaveAttribute('aria-current', 'true')
  })

  test('Compare: Off shows the page theme alone; Themes shows light and dark', async ({ page }) => {
    await page.goto('/#/components/toggle')
    await expect(page.locator('.pg-frame')).toHaveCount(1)
    await expect(page.locator('.pg-frame-label')).toHaveText('light · follows the page theme')
    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('.pg-frame')).toHaveAttribute('data-theme', 'dark')
    await compareThemes(page)
    await expect(page.locator('.pg-frame-label')).toHaveText(['light', 'dark'])
    await expect(page).toHaveURL(/compare=themes/)
  })

  test('a shared link sets closed props, never free text, and says what it could not show', async ({ page }) => {
    await page.goto('/#/components/button?v=1&variant=destructive&appearance=hollow&size=xl&children=Your%20account%20is%20suspended')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    await expect(controls.getByRole('group', { name: 'variant' }).getByRole('button', { name: 'destructive' })).toHaveAttribute('aria-current', 'true')
    await expect(controls.getByRole('group', { name: 'appearance' }).getByRole('button', { name: 'hollow' })).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('.pg-frame-body')).toContainText('Save Changes')
    await expect(page.getByRole('main')).not.toContainText('Your account is suspended')
    await expect(controls.locator('.pg-notice')).toHaveText("This link asked for size `xl`, which Button doesn't have. Showing `regular`.")
    // The notice is read in order with the controls, not announced as an alert.
    await expect(page.getByRole('alert')).toHaveCount(0)
    // A combination the types forbid: the stage keeps to the defaults, and says so.
    await page.goto('/#/components/toggle')
    await page.goto('/#/components/button?v=1&variant=destructive&appearance=text-link')
    await expect(page.getByRole('complementary', { name: 'Controls' }).locator('.pg-notice')).toContainText("doesn't allow, so the stage shows the defaults")
    await expect(page.getByRole('complementary', { name: 'Controls' }).getByRole('group', { name: 'appearance' }).getByRole('button', { name: 'filled' })).toHaveAttribute('aria-current', 'true')
  })

  test('a change goes into the address without a history entry, is marked on its control and its code line, and Reset clears it', async ({ page }) => {
    await page.goto('/#/components/button')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    const reset = page.getByRole('button', { name: 'Reset', exact: true })
    await expect(reset).toBeDisabled()
    await expect(page.getByText('Nothing to reset')).toBeVisible()
    const length = await page.evaluate(() => history.length)
    await choose(controls, 'variant', 'destructive')
    await expect(page).toHaveURL(/#\/components\/button\?v=1&variant=destructive$/)
    expect(await page.evaluate(() => history.length)).toBe(length)
    await expect(controls.locator('.pg-field[data-prop="variant"]')).toHaveClass(/is-changed/)
    await expect(page.locator('.pg-code__line.is-changed')).toHaveText(['<Button variant="destructive" icon={<PlusIcon />}>'])
    // Said once, politely (section 13).
    await expect(page.getByRole('status').filter({ hasText: 'Stage updated' })).toHaveText('Stage updated: variant destructive')
    await reset.click()
    await expect(page).toHaveURL(/#\/components\/button$/)
    await expect(page.locator('.pg-code__line.is-changed')).toHaveCount(0)
    await expect(controls.locator('.pg-field.is-changed')).toHaveCount(0)
  })

  test('"Skip to code" is the controls\' first stop and moves focus to the code', async ({ page }) => {
    await page.goto('/#/components/button')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    const first = await controls.evaluate((el) => (el.querySelector('a, button, input, select, [tabindex]:not([tabindex="-1"])') as HTMLElement).textContent)
    expect(first).toBe('Skip to code')
    const skip = controls.getByRole('link', { name: 'Skip to code' })
    await skip.focus()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('region', { name: 'Import and usage' })).toBeFocused()
    await expect(page).toHaveURL(/#\/components\/button$/)
  })

  test('above six values the control is a select of the legal values, with the count', async ({ page }) => {
    await page.goto('/#/components/icon')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    await expect(controls.getByRole('combobox', { name: 'name' })).toBeVisible()
    await expect(controls.locator('.pg-field[data-prop="name"] .pg-field__note')).toHaveText(/^\d+ values$/)
    // Up to six values: segments.
    await expect(controls.getByRole('group', { name: 'size' })).toBeVisible()
  })

  test('"Also in the API" explains a prop with no control in plain words', async ({ page }) => {
    await page.goto('/#/components/button')
    const api = page.getByRole('complementary', { name: 'Controls' }).locator('.pg-uncontrolled')
    await expect(api).toContainText('type')
    await expect(api).toContainText('With "submit", clicking it sends the form.')
  })

  test('in forced colours a locked value keeps a dashed GrayText edge', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/#/components/button')
    const textLink = page.getByRole('complementary', { name: 'Controls' }).getByRole('group', { name: 'appearance' }).getByRole('button', { name: 'text-link' })
    const s = await textLink.evaluate((el) => {
      const p = document.createElement('i'); p.style.cssText = 'forced-color-adjust: none; color: GrayText'; document.body.appendChild(p)
      const gray = getComputedStyle(p).color; p.remove()
      const cs = getComputedStyle(el)
      return { style: cs.borderTopStyle, color: cs.borderTopColor, gray }
    })
    expect(s.style).toBe('dashed')
    expect(s.color).toBe(s.gray)
  })
})
