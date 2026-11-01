import { test, expect, type Locator, type Page } from '@playwright/test'
import { setTheme } from '../theme'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
  test('the Evidence Locker page is a written spec: no stage, no install, and it says so first', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Evidence Locker Proposal', exact: true }).click()
    await expect(page).toHaveURL(/#\/proposals\/evidence-locker$/)
    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Evidence Locker')
    await expect(main.locator('.pg-head .site-tag')).toHaveText('Proposal')
    await expect(main.getByText('Experimental, not in the kit · no Figma set yet · nothing to install')).toBeVisible()
    await expect(main.getByRole('note').first()).toHaveText('This is a proposal, not a component. A written spec with no code yet, so there is nothing to install. Every picture on this page is a sketch.')
    await expect(main.getByRole('link', { name: 'Read the spec' })).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/blob/main/guidelines/proposals/evidence-locker.md')
    await expect(main.getByRole('link', { name: 'Discuss on GitHub' }).first()).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/pull/21')
    await expect(main.getByRole('link', { name: 'See the design in Figma' })).toHaveCount(0)

    // What a built component's page has, and a proposal's must not.
    await expect(page.getByRole('region', { name: 'Live demo' })).toHaveCount(0)
    await expect(page.getByRole('complementary', { name: 'Controls' })).toHaveCount(0)
    await expect(page.locator('.pg-install-command')).toHaveCount(0)
    await expect(main).not.toContainText('npm i')
    await expect(main).not.toContainText('import {')
    await expect(page).toHaveTitle('Evidence Locker · Vela Design System')
  })
})

test.describe('the install command', () => {
  // Slice 2 of the playground uplift: one header band. A core component needs the package alone, so
  // its header names only the import line; a headless one says it needs Base UI and gives the command.
  test('a core component shows the import line only', async ({ page }) => {
    await page.goto('/#/components/button')
    const head = page.locator('.pg-head')
    await expect(head.locator('.pg-import')).toHaveText("import { Button } from '@omkarux/vela'")
    await expect(head.locator('.pg-install-command')).toHaveCount(0)
    // Install is never in the code block the Copy button copies.
    await expect(page.locator('.pg-code')).not.toContainText('npm i')
  })

  test('a headless component installs Base UI too, and says why', async ({ page }) => {
    await page.goto('/#/components/popover')
    const head = page.locator('.pg-head')
    await expect(head.locator('.pg-install-command')).toHaveText('npm i @omkarux/vela @base-ui/react')
    await expect(head.locator('.pg-head__peer')).toContainText('Base UI is an optional peer. Install it too:')
    await expect(page.locator('.pg-code')).not.toContainText('npm i')
  })
})

test.describe('segments', () => {
  test('the theme, layout and implementation choices are segments: aria-current, Tab reaches each, arrows do nothing', async ({ page }) => {
    await page.goto('/#/components/tabs')
    // The theme's segments live in the Appearance panel (section 9), the only control that sets it.
    await page.getByRole('button', { name: /^Appearance/ }).click()
    for (const name of ['Mode', 'Layout', 'Implementation']) {
      const group = page.getByRole('group', { name, exact: true })
      await expect(group.locator('[aria-current="true"]')).toHaveCount(1)
      // No primary filled Button stands for "selected".
      await expect(group.locator('.vela-btn')).toHaveCount(0)
    }
    const theme = page.getByRole('group', { name: 'Mode' })
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
      const selected = page.getByRole('group', { name: 'Layout', exact: true }).locator('[aria-current="true"]')
      const seg = await selected.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { adjust: cs.forcedColorAdjust, bg: cs.backgroundColor, fg: cs.color, width: cs.borderTopWidth, style: cs.borderTopStyle }
      })
      expect(seg).toEqual({ adjust: 'none', bg: system.highlight, fg: system.highlightText, width: '2px', style: 'solid' })
      // Only that element opts out of the forced palette.
      const other = page.getByRole('group', { name: 'Layout', exact: true }).getByRole('button', { name: 'Full width', exact: true })
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
      await page.getByRole('button', { name: /^See all \d+ as one table/ }).click()
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
    // A phone too short for the pinned strip (slice 5), whose height cap would make the stage
    // scroll down as well; this test is about sideways overflow alone.
    await page.setViewportSize({ width: 390, height: 600 })
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
          await setTheme(page, theme)
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
  test('one header band: the title, its status, one line, the import line with its copy mark, and the links', async ({ page }) => {
    await page.goto('/#/components/button')
    const head = page.locator('.pg-head')
    await expect(head.getByRole('heading', { level: 1 })).toHaveText('Button')
    await expect(head.locator('.site-tag')).toHaveText('Approved')
    await expect(head.locator('.pg-head__line')).toHaveText('Triggers an action: save, submit, delete, apply, cancel.')
    await expect(head.locator('.pg-import')).toHaveText("import { Button } from '@omkarux/vela'")
    await expect(head.getByRole('button', { name: 'Copy import line' })).toBeVisible()
    await expect(head.getByRole('link', { name: 'Spec' })).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/blob/main/guidelines/components/button.md')
    await expect(head.getByRole('link', { name: 'Source' })).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/blob/main/src/components/Button/Button.tsx')
    await expect(head.getByRole('link', { name: 'Figma' })).toHaveAttribute('href', /node-id=7-122$/)
    // The install panel and the facts strip are gone.
    await expect(page.getByRole('region', { name: 'Use Button' })).toHaveCount(0)
    await expect(page.locator('dl[aria-label="Contract"]')).toHaveCount(0)
    const code = page.getByRole('region', { name: 'Use it', exact: true })
    await expect(code.locator('.pg-code')).toContainText("import { Button } from '@omkarux/vela'")
    await expect(code.locator('.pg-code')).not.toContainText('npm i')
  })

  test('Dropdown List links to its set in the library, published with 0.14.0', async ({ page }) => {
    await page.goto('/#/components/dropdown-list')
    await expect(page.locator('.pg-head').getByRole('link', { name: 'Figma' })).toHaveAttribute('href', /node-id=164-85$/)
    const tabs = page.getByRole('tablist', { name: 'Dropdown List page' }).getByRole('tab')
    await expect(tabs).toHaveText(['Playground', /^Rules\s*\d+$/, /^Tokens\s*\d+$/, 'Figma'])
  })

  test('the header band never scrolls the page sideways, from 320 to 1440', async ({ page }) => {
    for (const width of [320, 390, 820, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/#/components/toast')
      await expect(page.locator('.pg-head .pg-install-command')).toBeVisible()
      expect(await noSidewaysScroll(page), `${width}px`).toBe(true)
    }
  })

  test('page tabs have addresses: shareable, kept on reload, and no history entry per tab', async ({ page }) => {
    await page.goto('/#/components/button')
    const tabs = page.getByRole('tablist', { name: 'Button page' })
    await expect(tabs.getByRole('tab')).toHaveText(['Playground', /^Rules\s*\d+$/, /^Tokens\s*\d+$/, 'Figma'])
    await expect(tabs.getByRole('tab', { name: 'Playground' })).toHaveAttribute('aria-selected', 'true')
    const length = await page.evaluate(() => history.length)
    await tabs.getByRole('tab', { name: /^Rules/ }).click()
    await expect(page).toHaveURL(/#\/components\/button\/rules$/)
    await expect(page.getByRole('heading', { level: 2, name: 'States' })).toBeVisible()
    expect(await page.evaluate(() => history.length)).toBe(length)
    // The nav link stays current on every tab of the page.
    await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Button', exact: true })).toHaveAttribute('aria-current', 'page')
    await page.reload()
    await expect(page.getByRole('tablist', { name: 'Button page' }).getByRole('tab', { name: /^Rules/ })).toHaveAttribute('aria-selected', 'true')
    // Back to the page's own address: the Playground tab, and the props are where they were.
    await page.getByRole('tablist', { name: 'Button page' }).getByRole('tab', { name: 'Playground' }).click()
    await expect(page).toHaveURL(/#\/components\/button$/)
    await expect(page.getByRole('complementary', { name: 'Controls' })).toBeVisible()
    // A link to a tab that has no data, or no such tab, opens the Playground tab.
    await page.goto('/#/components/dropdown-list/changelog')
    await expect(page.getByRole('tablist', { name: 'Dropdown List page' }).getByRole('tab', { name: 'Playground' })).toHaveAttribute('aria-selected', 'true')
    await page.goto('/#/components/button/changelog')
    await expect(page.getByRole('tablist', { name: 'Button page' }).getByRole('tab', { name: 'Playground' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Changelog' })).toHaveCount(0)
  })

  test('Copy snippet copies the import line and the JSX, and says so', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/#/components/button')
    const code = page.getByRole('region', { name: 'Use it', exact: true })
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
    const head = page.locator('.pg-head')
    await head.getByRole('button', { name: 'Copy install command' }).click()
    // The Copy Button spec's words; this desktop Chromium is neither Apple nor touch, so Ctrl+C.
    await expect(head.locator('.shell-copymark__fail')).toHaveText("Couldn't copy: your browser blocked the clipboard. The text is selected, so press Ctrl+C.")
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('npm i @omkarux/vela @base-ui/react')

    const code = page.getByRole('region', { name: 'Use it', exact: true })
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
    // Label in Name (WCAG 2.5.3): the name is exactly the visible words; the shortcut is separate.
    const button = page.getByRole('button', { name: 'Search, or type a name you know', exact: true })
    await expect(button).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K /')
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
    await expect(page).toHaveURL(/#\/components\/toggle\/rules\?rule=toggle-label-required$/)
  })

  test('a link to a component that does not exist suggests the closest names', async ({ page }) => {
    await page.goto('/#/components/modal-window')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('There is no component called “modal-window”')
    await expect(page.getByRole('heading', { level: 2, name: 'Closest by meaning' })).toBeVisible()
    await expect(page.getByRole('main').locator('.nf-card').first()).toHaveAttribute('href', '#/components/dialog')
    await expect(page.getByRole('main').locator('.nf-card').first()).toContainText('Also called modal')
    await expect(page.getByRole('main').getByRole('link', { name: /Component status/ })).toHaveAttribute('href', '#/status')
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
  test('Layout: Beside by default; Full width puts the controls below the stage, kept for the component and in the link', async ({ page }) => {
    await page.goto('/#/components/button')
    const stage = page.getByRole('group', { name: 'Layout', exact: true })
    await expect(stage.getByRole('button', { name: 'Beside' })).toHaveAttribute('aria-current', 'true')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    const frame = page.locator('.pg-frame').first()
    expect((await controls.boundingBox())!.x).toBeGreaterThan((await frame.boundingBox())!.x + (await frame.boundingBox())!.width - 1)
    await stage.getByRole('button', { name: 'Full width' }).click()
    await expect(page).toHaveURL(/#\/components\/button\?v=1&stage=full$/)
    expect((await controls.boundingBox())!.y).toBeGreaterThan((await frame.boundingBox())!.y + (await frame.boundingBox())!.height - 1)
    await expect(page.locator('.pg')).toHaveClass(/pg--full/)
    // Kept for this component: a fresh visit without the link still opens Full width.
    await page.goto('about:blank')
    await page.goto('/#/components/button')
    await expect(page.getByRole('group', { name: 'Layout', exact: true }).getByRole('button', { name: 'Full width' })).toHaveAttribute('aria-current', 'true')
    // And only for that one. A fresh page first: a hash-only move can race the page's own replaceState.
    await page.goto('about:blank')
    await page.goto('/#/components/toggle')
    await expect(page.getByRole('group', { name: 'Layout', exact: true }).getByRole('button', { name: 'Beside' })).toHaveAttribute('aria-current', 'true')
  })

  test('Compare: Off shows the page theme alone; Themes shows light and dark', async ({ page }) => {
    await page.goto('/#/components/toggle')
    await expect(page.locator('.pg-frame')).toHaveCount(1)
    // Alone, the frame is the page's theme and the slab is the frame: no label of its own.
    await expect(page.locator('.pg-frame-label')).toHaveCount(0)
    await expect(page.locator('.pg-frame')).toHaveAttribute('data-theme', 'light')
    await setTheme(page, 'Dark')
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
    // A combination the types forbid: the stage keeps to the defaults, and says so. Opened afresh,
    // so the open page can't rewrite the address before the new link is read.
    await page.goto('about:blank')
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
    await expect(page.getByRole('region', { name: 'Use it', exact: true })).toBeFocused()
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

// The playground thread's review of slices 1 to 3 (requests/playground-thread-review-slices-1-2-3.md),
// and the lock glyph Omkar chose on 31 Oct (requests/icon-thread-to-repo-lock-meaning.md).
test.describe('review of slices 1 to 3', () => {
  test('in forced colours only a changed control carries a mark', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/#/components/button')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    const edge = (prop: string) => controls.locator(`.pg-field[data-prop="${prop}"]`).evaluate((el) => getComputedStyle(el).borderInlineStartStyle)
    expect(await edge('variant')).toBe('none')
    expect(await edge('size')).toBe('none')
    await choose(controls, 'variant', 'destructive')
    expect(await edge('variant')).toBe('solid')
    expect(await edge('size')).toBe('none')
  })

  test('an unavailable value shows the padlock, its reason is in view, and the way out names what stays', async ({ page }) => {
    await page.goto('/#/components/button')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    const appearance = controls.locator('.pg-field[data-prop="appearance"]')
    const textLink = appearance.getByRole('button', { name: 'text-link', exact: true })
    await expect(textLink.locator('svg.vela-icon')).toHaveAttribute('aria-hidden', 'true')
    await expect(appearance.locator('.pg-field__note')).toHaveText('text-link never carries an icon.')
    await textLink.focus()
    await page.keyboard.press('Enter')
    await expect(controls.getByRole('button', { name: 'Keep the icon' })).toBeVisible()
    await expect(page.getByRole('main')).not.toContainText(/locked/i)
  })

  test('"Open proof" opens the Rules tab with focus on that rule', async ({ page }) => {
    await page.goto('/#/components/button')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    await controls.getByRole('group', { name: 'appearance' }).getByRole('button', { name: 'text-link', exact: true }).focus()
    await page.keyboard.press('Enter')
    await controls.getByRole('link', { name: 'Open proof' }).click()
    await expect(page).toHaveURL(/#\/components\/button\/rules$/)
    const focused = page.locator(':focus')
    await expect(focused).toContainText('never carries an icon')
    await expect(focused).toBeInViewport()
  })

  test('Compare is remembered across components', async ({ page }) => {
    await page.goto('/#/components/button')
    await compareThemes(page)
    await page.goto('/#/components/toggle')
    await expect(page.getByRole('group', { name: 'Compare' }).getByRole('button', { name: 'Themes' })).toHaveAttribute('aria-current', 'true')
    await expect(page.locator('.pg-frame')).toHaveCount(2)
  })

  test('the stage is a named landmark beside Controls and the code', async ({ page }) => {
    await page.goto('/#/components/button')
    await expect(page.getByRole('region', { name: 'Live demo' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Controls' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Use it', exact: true })).toBeVisible()
  })

  test('the Proposal page counts its promises from the spec, as the spec states them', async ({ page }) => {
    await page.goto('/#/proposals/evidence-locker')
    // Counted from the proposal's own Hard constraints, never a zero it can't read (B9). The spec
    // states its own total ("20 rules, 17 with proofs"), so the page must agree with it.
    const stated = readFileSync(resolve(process.cwd(), 'guidelines/proposals/evidence-locker.md'), 'utf8').match(/(\d+) rules, (\d+) with proofs/)
    expect(stated?.slice(1)).toEqual(['20', '17'])
    await expect(page.getByRole('heading', { level: 2, name: `${stated![1]} promises, planned` })).toBeVisible()
    await expect(page.getByText(`${stated![2]} will have a proof. None is checked yet: nothing is built.`)).toBeVisible()
  })
})

// Accessibility (playground spec, section 13; B10): axe on representative pages in both themes,
// with the experimental Label in Name rule switched on, since it is the one the review found.
test.describe('slice 5 · phone and Appearance', () => {
  test('Appearance names its state, sets the theme, and Escape closes it back onto its button', async ({ page }) => {
    await page.goto('/#/components/button')
    const button = page.getByRole('button', { name: 'Appearance: theme System, brand Default' })
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    // Only the panel sets the theme: there is no theme control in the header itself.
    await expect(page.getByRole('banner').getByRole('group', { name: 'Theme' })).toHaveCount(0)
    await button.click()
    const panel = page.getByRole('region', { name: 'Appearance' })
    await expect(panel).toBeVisible()
    await panel.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Appearance: theme Dark, brand Default' })).toBeVisible()
    // Custom is unavailable, its reason in view and read with it; the word "locked" is never shown.
    const custom = panel.getByRole('group', { name: 'Brand' }).getByRole('button', { name: 'Custom' })
    await expect(custom).toHaveAttribute('aria-disabled', 'true')
    await expect(custom).toHaveAccessibleDescription('Custom is coming with createBrand.')
    // Said once: the button's description is the visible note, with no hidden copy beside it.
    await expect(panel.getByText('Custom is coming with createBrand.', { exact: true })).toHaveCount(1)
    await expect(panel.getByText('Custom is coming with createBrand.', { exact: true })).toBeVisible()
    await expect(panel).not.toContainText(/locked/i)
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(page.getByRole('button', { name: /^Appearance/ })).toBeFocused()
  })

  // The header's three links are Icon Button links on a wide screen (icon-button.md), and written
  // links in the menu on a phone.
  const MARKS = [
    { name: 'Vela on GitHub, opens in a new tab', href: 'https://github.com/omkarpkh/vela', glyph: '.vela-brand-mark' },
    { name: 'Vela on npm, opens in a new tab', href: 'https://www.npmjs.com/package/@omkarux/vela', glyph: '.vela-icon-button__word' },
    { name: 'Vela in Figma, opens in a new tab', href: /^https:\/\/www\.figma\.com\/design\/XO2rmeCcgOjyKe4oipgF4j\/Vela-Design-System\?node-id=0-1$/, glyph: '.vela-brand-mark' },
  ]
  test('the header links are GitHub\'s and Figma\'s marks and npm\'s word, named in words, opening a new tab; on a phone they are written links in the menu', async ({ page }) => {
    await page.goto('/#/components/button')
    const banner = page.getByRole('banner')
    for (const m of MARKS) {
      const link = banner.getByRole('link', { name: m.name, exact: true })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', m.href)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link).toHaveClass(/vela-icon-button--regular/)
      await expect(link.locator(m.glyph)).toHaveAttribute('aria-hidden', 'true')
    }
    // The written words are gone from the wide header.
    for (const name of ['GitHub', 'npm', 'Figma']) await expect(banner.getByRole('link', { name, exact: true })).toHaveCount(0)
    // The full name, once per page (the naming rule, 1 Nov 2026): in the header, and in the title.
    await expect(banner.locator('.brand__name')).toHaveText('Vela Design System')
    await expect(page).toHaveTitle('Button · Vela Design System')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    for (const m of MARKS) await expect(banner.getByRole('link', { name: m.name })).toHaveCount(0)
    await expect(banner.getByRole('button', { name: 'Search' })).toBeVisible()
    await expect(banner.getByRole('button', { name: 'Appearance', exact: true })).toBeVisible()
    await banner.getByRole('button', { name: 'Show navigation' }).click()
    const nav = page.getByRole('navigation', { name: 'Site' })
    for (const name of ['GitHub', 'npm', 'Figma']) await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(1)
    await expect(nav.getByRole('link', { name: 'Figma', exact: true })).toBeVisible()
  })

  test('the header marks show their name in a tooltip on hover and on keyboard focus, heard once', async ({ page }) => {
    await page.goto('/#/components/button')
    const banner = page.getByRole('banner')
    for (const m of MARKS) {
      const link = banner.getByRole('link', { name: m.name, exact: true })
      await link.hover()
      const tip = page.locator('.vela-tooltip', { hasText: m.name })
      await expect(tip).toBeVisible()
      await expect(tip).toHaveText(m.name)
      await expect(tip).toHaveAttribute('aria-hidden', 'true')
      await expect(link).not.toHaveAttribute('aria-describedby')
      // No fill under a mark on hover: nothing enters Figma's clear space.
      await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await page.mouse.move(700, 600)
      await expect(tip).toHaveCount(0)
    }
    // From the keyboard: each in turn, the tooltip at once.
    await banner.getByRole('button', { name: /^Appearance/ }).focus()
    for (const m of MARKS) {
      await page.keyboard.press('Tab')
      await expect(banner.getByRole('link', { name: m.name, exact: true })).toBeFocused()
      await expect(page.locator('.vela-tooltip', { hasText: m.name })).toBeVisible()
    }
  })

  test('the header marks are the interface\'s icon grey in both themes; in forced colours they follow the link colour', async ({ page }) => {
    await page.goto('/#/components/button')
    const banner = page.getByRole('banner')
    const colours = () => Promise.all(MARKS.map((m) => banner.getByRole('link', { name: m.name, exact: true }).locator(m.glyph).evaluate((el) => getComputedStyle(el).color)))
    await setTheme(page, 'light')
    expect(await colours()).toEqual(['rgb(73, 85, 90)', 'rgb(73, 85, 90)', 'rgb(73, 85, 90)'])
    await setTheme(page, 'dark')
    expect(await colours()).toEqual(['rgb(200, 208, 210)', 'rgb(200, 208, 210)', 'rgb(200, 208, 210)'])
    await page.emulateMedia({ forcedColors: 'active' })
    const linkText = await banner.evaluate((host) => { const p = document.createElement('i'); p.style.cssText = 'forced-color-adjust: none; color: LinkText'; host.appendChild(p); const v = getComputedStyle(p).color; p.remove(); return v })
    expect(await colours()).toEqual([linkText, linkText, linkText])
  })

  test('Figma\'s mark keeps 20px of clear space from every other visible element in the header', async ({ page }) => {
    for (const width of [1440, 1280, 901, 601]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/#/components/button')
      await page.evaluate(() => document.fonts.ready)
      const banner = page.getByRole('banner')
      const figma = banner.getByRole('link', { name: 'Vela in Figma, opens in a new tab', exact: true })
      await expect(figma).toBeVisible()
      const found = await figma.evaluate((link) => {
        const mark = link.querySelector('.vela-brand-mark')!.getBoundingClientRect()
        const header = link.closest('header')!
        // Every visible thing in the header that is not the Figma link or inside it: the leaves (a
        // mark, a word, a text node's box), and any element that paints a fill or a border.
        const boxes: { what: string; r: DOMRect }[] = []
        const paints = (el: Element) => { const cs = getComputedStyle(el); return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && cs.borderTopColor !== 'rgba(0, 0, 0, 0)') }
        for (const el of header.querySelectorAll('*')) {
          if (el === link || link.contains(el)) continue
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue
          const r = el.getBoundingClientRect()
          // Nothing to see: an empty box, or the 1px clipped box of visually hidden text.
          if (r.width <= 1 || r.height <= 1) continue
          const leaf = el instanceof SVGSVGElement || (el.children.length === 0 && (el.textContent ?? '').trim() !== '')
          if (leaf || paints(el)) boxes.push({ what: `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '')}`, r })
        }
        // The distance between the two boxes' nearest edges (negative if they overlap).
        const gap = (r: DOMRect) => Math.max(r.left - mark.right, mark.left - r.right, r.top - mark.bottom, mark.top - r.bottom)
        return boxes.map((b) => ({ what: b.what, gap: Math.round(gap(b.r) * 10) / 10 }))
      })
      expect(found.length, `${width}px`).toBeGreaterThan(3)
      for (const f of found) expect(f.gap, `${width}px: ${f.what} is ${f.gap}px from Figma's mark`).toBeGreaterThanOrEqual(20)
    }
  })

  test('on a phone the stage pins as a strip, and no focused control sits under it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/components/button')
    const region = page.getByRole('region', { name: 'Live demo', exact: true })
    const header = await page.getByRole('banner').boundingBox()
    // Tab through every control; each focused one is in view below the strip, never under it.
    await page.getByRole('complementary', { name: 'Controls' }).getByRole('link', { name: 'Skip to code' }).focus()
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const focused = page.locator(':focus')
      if (!(await focused.evaluate((el) => !!el.closest('[aria-label="Controls"]')))) break
      if (await focused.evaluate((el) => el instanceof HTMLInputElement && el.type === 'text')) continue
      const strip = await region.boundingBox()
      const box = await focused.boundingBox()
      expect(box!.y, await focused.evaluate((el) => el.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(strip!.y + strip!.height - 1)
    }
    // By the last controls the page has scrolled, and the strip is held under the header.
    expect((await region.boundingBox())!.y).toBeCloseTo(header!.y + header!.height, 0)
  })

  test('the strip lets go while a text control has focus, and Expand stage opens it at full height', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/components/button')
    const region = page.getByRole('region', { name: 'Live demo', exact: true })
    await expect(region).toHaveCSS('position', 'sticky')
    await page.getByRole('textbox', { name: 'children' }).focus()
    await expect(region).toHaveCSS('position', 'static')
    await page.getByRole('textbox', { name: 'children' }).blur()
    await expect(region).toHaveCSS('position', 'sticky')
    const expand = region.getByRole('button', { name: 'Expand stage' })
    await expand.click()
    await expect(expand).toHaveAttribute('aria-expanded', 'true')
    await expect(region).toHaveCSS('position', 'static')
    // Not on a wide screen, and not on a phone too short to hold a strip and some controls.
    await page.setViewportSize({ width: 390, height: 600 })
    await expect(expand).toBeHidden()
  })
})

test.describe('slice 2b · stage width', () => {
  test('the field, the slider and its keys set the same width; only the frame moves', async ({ page }) => {
    await page.goto('/#/components/tabs')
    const field = page.getByRole('spinbutton', { name: 'Container width' })
    const slider = page.getByRole('slider', { name: 'Container width' })
    const stage = page.locator('.pg-stage')
    const body = page.locator('.pg-frame-body').first()
    const before = await stage.boundingBox()
    const full = Number(await field.inputValue())
    await field.fill('480')
    await expect(slider).toHaveValue('480')
    await expect(slider).toHaveAttribute('aria-valuetext', '480 pixels')
    await expect.poll(async () => Math.round((await body.boundingBox())!.width)).toBe(480)
    await slider.focus()
    await page.keyboard.press('ArrowRight')
    await expect(field).toHaveValue('490')
    await page.keyboard.press('PageDown')
    await expect(field).toHaveValue('440')
    await page.keyboard.press('Home')
    await expect(field).toHaveValue('320')
    await page.keyboard.press('End')
    await expect(field).toHaveValue(String(full))
    // The stage keeps its size and place.
    expect(await stage.boundingBox()).toEqual(before)
  })

  test('dragging is never the only way: the handle is hidden from assistive tech, and the field and slider stay', async ({ page }) => {
    await page.goto('/#/components/tabs')
    await expect(page.locator('.pg-width__handle')).toHaveAttribute('aria-hidden', 'true')
    const handle = (await page.locator('.pg-width__handle').boundingBox())!
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 20)
    await page.mouse.down()
    await page.mouse.move(handle.x - 200, handle.y + 20, { steps: 5 })
    await page.mouse.up()
    const w = Number(await page.getByRole('spinbutton', { name: 'Container width' }).inputValue())
    await expect(page.getByRole('slider', { name: 'Container width' })).toHaveValue(String(w))
    await expect(page.locator('.pg-width__mark')).toHaveText(`${w}px`)
  })

  test('the width is in the link, a number clamped to the range, and Reset returns the full width', async ({ page }) => {
    await page.goto('/#/components/tabs?v=1&w=480')
    const field = page.getByRole('spinbutton', { name: 'Container width' })
    await expect(field).toHaveValue('480')
    await expect(page).toHaveURL(/w=480/)
    // A link is read when the page opens, so each one is opened afresh. A hash change alone would
    // let the open page rewrite the address before a reload could read it.
    await page.goto('about:blank')
    await page.goto('/#/components/tabs?v=1&w=10')
    await expect(field).toHaveValue('320')
    await page.goto('about:blank')
    await page.goto('/#/components/tabs?v=1&w=wide')
    await expect(page.getByText("This link asked for a container width of `wide`, which isn't a number of pixels. Showing the full width.")).toBeVisible()
    await field.fill('400')
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page).not.toHaveURL(/w=/)
    await expect(page.locator('.pg-width__mark')).toHaveCount(0)
  })

  test('Tabs says where overflow lives, and that the "more" control is not built; a component that does not respond to width has no control', async ({ page }) => {
    await page.goto('/#/components/tabs')
    await expect(page.getByText('Core Tabs scrolls the row sideways when it is full. The "more" control will be in the headless Tabs; it is designed but not built yet.')).toBeVisible()
    await page.goto('about:blank')
    await page.goto('/#/components/tabs?v=1&implementation=headless')
    await expect(page.getByText('Tabs scrolls the row sideways when it is full. The "more" control for the headless Tabs is designed but not built yet.')).toBeVisible()
    await page.goto('/#/components/button')
    await expect(page.getByRole('spinbutton', { name: 'Container width' })).toHaveCount(0)
  })

  test('on a phone, the field alone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/components/tabs')
    await expect(page.getByRole('spinbutton', { name: 'Container width' })).toBeVisible()
    await expect(page.getByRole('slider', { name: 'Container width' })).toHaveCount(0)
    await expect(page.locator('.pg-width__handle')).toHaveCount(0)
  })
})

test.describe('slice 4 · proof', () => {
  // Rebuilt in slice 2 of the playground uplift (s5-tabs): a ledger by checker with plain headings.
  test('the Rules tab is a ledger by checker, with plain headings, a summary in words and an index', async ({ page }) => {
    await page.goto('/#/components/button/rules')
    await expect(page.locator('.pg-summary__count')).toHaveText('10 rules')
    await expect(page.locator('.pg-summary__words')).toHaveText('Filled: a machine checks it on every build, 5. Outlined: a reviewer checks it, 5.')
    await expect(page.locator('.pg-summary__pass')).toHaveText(/^All 5 machine checks pass in \d+\.\d+\.\d+$/)
    for (const h of ['The compiler refuses these', 'A real browser proves these', 'A reviewer checks these', 'States', 'Motion', "Don't, and what to do instead"])
      await expect(page.getByRole('heading', { name: new RegExp(`^${h}`), level: 2 })).toBeVisible()
    // A checker with no rules has no group and no index item (Button has no unit-test rule).
    await expect(page.getByRole('heading', { name: /^A unit test/ })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'On this tab' }).getByRole('link')).toHaveText(['Compiler 3', 'Browser 2', 'Review 5', 'States', 'Motion', "Don'ts 12"])
    // No filter row: the index and Find replace it.
    await expect(page.getByRole('group', { name: 'Show' })).toHaveCount(0)
  })

  test('"Try to break it" shows the fixture and the compiler\'s own words, in a neutral block', async ({ page }) => {
    await page.goto('/#/components/button/rules')
    const rule = page.locator('.pg-rule[data-rule="button-text-link-requires-primary"]')
    const tryIt = rule.getByRole('button', { name: 'Try to break it' })
    await expect(tryIt).toHaveAttribute('aria-expanded', 'false')
    await tryIt.click()
    await expect(rule.getByRole('button', { name: 'Hide the attempt' })).toHaveAttribute('aria-expanded', 'true')
    await expect(rule.getByText('We tried this')).toBeVisible()
    await expect(rule.getByText('The compiler says')).toBeVisible()
    await expect(rule.locator('.pg-rule__code').first()).toContainText('appearance="text-link"')
    await expect(rule.locator('.pg-rule__code').last()).toContainText('is not assignable')
    // A neutral block, never in error colours (A14).
    const colour = await rule.locator('.pg-rule__code').last().evaluate((el) => getComputedStyle(el).color)
    const body = await page.locator('.pg-rule__lead').first().evaluate((el) => getComputedStyle(el).color)
    expect(colour).toBe(body)
  })

  test('each proof is one link to its file and line at the built commit, with no path in its words', async ({ page }) => {
    await page.goto('/#/components/tabs/rules')
    const links = page.locator('.pg-rule__test')
    // The map is fetched when the page opens (B8); wait for it. A compiler rule's link is in its opened row.
    await expect(page.locator('.pg-rule__act .pg-rule__test').first()).toBeVisible()
    for (const a of await links.evaluateAll((as) => as.map((x) => ({ href: x.getAttribute('href'), text: (x as HTMLElement).innerText }))))
      expect(a.href).toMatch(/^https:\/\/github\.com\/omkarpkh\/vela\/blob\/([0-9a-f]{7,40}|main)\/(src|tests|scripts)\/[\w./-]+#L\d+$/)
    // The visible words; the rule's own line follows for a screen reader only, so a list of links tells them apart.
    for (const t of await links.evaluateAll((as) => as.map((x) => x.firstChild?.textContent))) expect(t).toBe('See the test on GitHub')
    const open = page.locator('.pg-rule[data-rule="tabs-only-active-panel-renders"]').getByRole('link', { name: /^See the test on GitHub/ })
    await expect(open).toHaveAttribute('href', /src\/components\/Tabs\/Tabs\.test\.tsx#L\d+$/)
  })
})

// Slice 6a: the Patterns section and the Copy page, opening and sections 1 to 4 (playground spec,
// section 12). The live examples are the icon thread's lab build as a shell part; the switches
// simulate a browser's refusals and say so.
test.describe('slice 6a · Copy page', () => {
  test('opens from the nav, in Patterns after Components, and from its own address', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Site' })
    const groups = await nav.locator(':scope > .sitenav__group > :is(h3)').allTextContents()
    expect(groups.map((g) => g.trim()).filter((g) => g !== 'Elsewhere')).toEqual(['Start', 'Foundations', 'Components', 'Patterns', 'Project'])
    await nav.getByRole('link', { name: 'Copy', exact: true }).click()
    await expect(page).toHaveURL(/#\/patterns\/copy$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Copy' })).toBeVisible()
    await expect(page).toHaveTitle('Copy · Vela Design System')
    await page.goto('/#/patterns/copy')
    await page.reload()
    await expect(page.getByRole('heading', { level: 2, name: '1 · When to offer copy, and when not' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Copy', exact: true })).toHaveAttribute('aria-current', 'page')
  })

  test('each switch says what it simulates while it is on', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const example = page.getByRole('group', { name: /Turn a switch on, then copy/ })
    await expect(example).not.toContainText('Simulated')
    await example.getByRole('switch', { name: 'Clipboard blocked' }).click()
    await expect(example).toContainText('Simulated: The clipboard is blocked')
    await example.getByRole('switch', { name: 'Clipboard blocked' }).click()
    await expect(example).not.toContainText('Simulated')
    await example.getByRole('switch', { name: 'Embedded app' }).click()
    await expect(example).toContainText('Simulated: An embedded app')
    await example.getByRole('switch', { name: 'Embedded app' }).click()
    const platform = example.getByRole('group', { name: 'Platform' })
    const current = await platform.locator('[aria-current="true"]').textContent()
    await platform.getByRole('button', { name: current === 'Touch' ? 'Ctrl+C' : 'Touch', exact: true }).click()
    await expect(example).toContainText('Simulated: The platform is')
  })

  test('no "don\'t" drawing takes focus', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const section = page.getByRole('heading', { level: 2, name: /^1 · / }).locator('..')
    await section.getByRole('button', { name: 'Copy IP address', exact: true }).focus()
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() => {
        const el = document.activeElement
        return { drawing: !!el?.closest('.copy-drawing'), section: !!el?.closest('section[aria-labelledby="copy-s1"]') }
      })
      expect(inside.drawing).toBe(false)
      if (!inside.section) break
    }
    for (const d of await section.getByRole('img', { name: /^Don't: / }).all()) await expect(d).not.toHaveAttribute('tabindex')
  })

  test('a blocked copy fails for real: the text is selected and the platform\'s words say so', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const example = page.getByRole('group', { name: /Turn a switch on, then copy/ })
    await example.getByRole('switch', { name: 'Clipboard blocked' }).click()
    await example.getByRole('group', { name: 'Platform' }).getByRole('button', { name: 'Ctrl+C', exact: true }).click()
    const copy = example.getByRole('button', { name: 'Copy session id' })
    await copy.click()
    const words = "Couldn't copy: your browser blocked the clipboard. The text is selected, so press Ctrl+C."
    await expect(example.getByText(words)).toBeVisible()
    await expect(copy).toHaveAccessibleDescription(words)
    await expect(copy).toHaveAttribute('data-state', 'failed')
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('sess_41c9e07a2b')
    // The way out: when the person copies the selection, the page sees it and the tick arrives.
    await page.keyboard.press('Control+C')
    await expect(copy).toHaveAttribute('data-state', 'copied')
  })

  test('a success is announced once, politely, and focus stays on the control', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    await expect(page.locator('.copy-page__announcer')).toHaveCount(1)
    await page.evaluate(() => {
      const region = document.querySelector('.copy-page__announcer')!
      ;(window as unknown as { said: string[] }).said = []
      new MutationObserver(() => { const t = region.textContent ?? ''; if (t) (window as unknown as { said: string[] }).said.push(t) })
        .observe(region, { childList: true, characterData: true, subtree: true })
    })
    const copy = page.getByRole('button', { name: 'Copy db-primary IP address' })
    await copy.focus()
    await page.keyboard.press('Enter')
    await expect(copy).toHaveAttribute('data-state', 'copied')
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => (window as unknown as { said: string[] }).said)).toEqual(['Copied db-primary IP address'])
    await expect(page.locator('.copy-page__announcer')).toHaveAttribute('role', 'status')
    await expect(copy).toBeFocused()
    // After the hold the tick hands back, and the word Copied marks the one taken.
    await expect(copy).toHaveAttribute('data-state', /idle|hover/, { timeout: 3000 })
    await expect(page.getByRole('row', { name: /db-primary/ }).getByText('Copied', { exact: true })).toBeVisible()
  })

  test('nothing jumps when the word Copied arrives: its place is kept while it is hidden', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    // Positions on the page, not in the viewport, so a press that scrolls the page is not a jump.
    const at = (l: Locator) => l.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left + window.scrollX, y: r.top + window.scrollY } })
    // The Hosts table: the IP address column keeps its left edge through the copy and the mark.
    const row = page.getByRole('row', { name: /db-primary/ })
    const cell = row.getByRole('cell')
    const copy = row.getByRole('button', { name: 'Copy db-primary IP address' })
    const before = await at(cell)
    await copy.click()
    await expect(copy).toHaveAttribute('data-state', 'copied')
    await page.mouse.move(0, 0)
    await expect(row.getByText('Copied', { exact: true })).toBeVisible({ timeout: 3000 })
    expect(Math.abs((await at(cell)).x - before.x)).toBeLessThanOrEqual(1)
    for (const other of ['cache-02', 'edge-11']) {
      const c = page.getByRole('row', { name: new RegExp(other) }).getByRole('cell')
      expect(Math.abs((await at(c)).x - before.x)).toBeLessThanOrEqual(1)
    }

    // Section 2, at real size: the value and its control stay put when the mark arrives.
    const s2 = page.locator('section[aria-labelledby="copy-s2"]')
    const tryCopy = s2.getByRole('button', { name: 'Copy request id', exact: true })
    const tryBefore = await at(tryCopy)
    await tryCopy.click()
    await page.mouse.move(0, 0)
    await expect(s2.locator('.copy-try').getByText('Copied', { exact: true })).toBeVisible({ timeout: 3000 })
    const tryAfter = await at(tryCopy)
    expect(Math.abs(tryAfter.x - tryBefore.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(tryAfter.y - tryBefore.y)).toBeLessThanOrEqual(1)

    // Section 3: Show me puts the mark beside the value; the value and the control don't move.
    const s3 = page.locator('section[aria-labelledby="copy-s3"]')
    const specimen = s3.locator('.copy-specimen .shell-cm')
    const value = s3.locator('.copy-specimen__value')
    const start = { control: await at(specimen), value: await at(value) }
    await s3.getByRole('button', { name: 'Show me: Marked, in a group, Copied', exact: true }).click()
    await expect(s3.locator('.copy-specimen').getByText('Copied', { exact: true })).toBeVisible()
    for (const [name, el] of [['control', specimen], ['value', value]] as const) {
      const box = await at(el)
      expect(Math.abs(box.x - start[name].x), name).toBeLessThanOrEqual(1)
      expect(Math.abs(box.y - start[name].y), name).toBeLessThanOrEqual(1)
    }
  })

  test('the page is its own chunk: it is not loaded on a component page', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (r) => requested.push(new URL(r.url()).pathname))
    await page.goto('/#/components/button')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(requested.filter((u) => /CopyPattern/.test(u))).toEqual([])
    await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Copy', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Copy' })).toBeVisible()
    expect(requested.filter((u) => /CopyPattern/.test(u)).length).toBeGreaterThan(0)
  })
})

// Slice 6b: the Copy page's second half, sections 5 to 13 (playground spec, section 12).
test.describe('slice 6b · Copy page', () => {
  const sectionOf = (page: Page, n: number) => page.locator(`section[aria-labelledby="copy-s${n}"]`)

  test('§5: the secret is not in the page before the press, and its receipt gives the length', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const s5 = sectionOf(page, 5)
    await expect(s5.getByText('Not fetched yet: the key is not in the page.')).toBeVisible()
    expect(await page.content()).not.toContain('vela_sample_')
    await s5.getByRole('button', { name: 'Copy API key', exact: true }).click()
    await expect(s5.getByText('Copied API key · 22 characters')).toBeVisible()
    await expect(s5.getByText(/Fetched from the sample server at the press: 1 read/)).toBeVisible()
    // Fetched, written, and gone: the page never kept it.
    expect(await page.content()).not.toContain('vela_sample_')
  })

  test('§5: "Show key to copy" only when the person may reveal; the shown key hides on blur', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const s5 = sectionOf(page, 5)
    await s5.getByRole('switch', { name: 'Clipboard blocked' }).click()
    await expect(s5).toContainText('Simulated: The clipboard is blocked')
    const copy = s5.getByRole('button', { name: 'Copy API key', exact: true })
    await copy.click()
    await expect(s5.getByText("Couldn't copy: your browser blocked the clipboard. Try again, or use another browser.")).toBeVisible()
    await expect(s5.getByRole('button', { name: 'Show key to copy' })).toHaveCount(0)
    await s5.getByRole('switch', { name: 'May reveal' }).click()
    await expect(s5).toContainText('This person may reveal the key.')
    await copy.click()
    const show = s5.getByRole('button', { name: 'Show key to copy' })
    await expect(show).toBeVisible()
    await show.click()
    const field = s5.getByRole('textbox', { name: 'API key [sample]' })
    await expect(field).toBeFocused()
    await expect(field).toHaveValue(/^vela_sample_\w{10}$/)
    expect(await field.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(22)
    await field.blur()
    await expect(field).toHaveCount(0)
    expect(await page.content()).not.toContain('vela_sample_')
  })

  test('§6: the hidden character shows as an escape, with both warnings, and the page holds no literal one', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const s6 = sectionOf(page, 6)
    await expect(s6.locator('.copy-escape')).toHaveText('\\u200F')
    await expect(s6.getByText('Contains hidden characters', { exact: true })).toBeVisible()
    await expect(s6.getByText("Contains curly quotes, which shells don't accept", { exact: true })).toBeVisible()
    await expect(s6.getByRole('button', { name: 'Copy command' })).toHaveAccessibleDescription(/Contains hidden characters/)
    expect(await page.content()).not.toContain(String.fromCharCode(0x200f))
  })

  test('§7: the mark follows its value through a sort, and a rotated key says it changed', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const s7 = sectionOf(page, 7)
    const table = s7.getByRole('table')
    await expect(table.locator('tbody tr')).toHaveCount(200)
    const row = table.getByRole('row', { name: /svc-ingest-001/ })
    // The key id column keeps its place through the mark and its change (page positions).
    const keyCell = row.getByRole('cell').first()
    const xOf = () => keyCell.evaluate((el) => el.getBoundingClientRect().left + window.scrollX)
    const x0 = await xOf()
    await row.getByRole('button', { name: 'Copy key id for svc-ingest-001' }).click()
    await page.mouse.move(0, 0)
    await expect(row.getByText('Copied', { exact: true })).toBeVisible({ timeout: 3000 })
    await s7.getByRole('button', { name: /^Service account/ }).click()
    await expect(table.locator('tbody tr').first()).not.toContainText('svc-ingest-001')
    await expect(row.getByText('Copied', { exact: true })).toBeVisible()
    await expect(table.locator('.copy-value__mark.is-on')).toHaveCount(1)
    await s7.getByRole('button', { name: 'Rotate key' }).click()
    await expect(row.getByText('Changed since you copied', { exact: true })).toBeVisible()
    await expect(row.getByText('Copied', { exact: true })).toBeHidden()
    expect(Math.abs((await xOf()) - x0)).toBeLessThanOrEqual(1)
  })

  test('§8: the screen-reader panel says what was announced', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const s8 = sectionOf(page, 8)
    await s8.getByRole('switch', { name: 'Keyboard' }).click()
    await expect(s8).toContainText('Simulated: Every press counts as one from the keyboard')
    const copy = s8.getByRole('button', { name: 'Copy request id' })
    await copy.click()
    await expect(copy).toHaveAttribute('data-instant', '')
    const said = page.locator('.copy-page__announcer')
    await expect(said).toHaveText('Copied request id')
    await expect(s8.locator('.copy-sr__line').last()).toHaveText((await said.textContent())!)
    await expect(s8.getByRole('img', { name: /^Forced colours, at rest/ })).toBeVisible()
    await expect(s8.getByText(/Captured in Chromium's forced-colours emulation/)).toBeVisible()
  })

  test('§9: scrubbing to 120ms stops the real CSS mid-way', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/#/patterns/copy')
    const s9 = sectionOf(page, 9)
    const time = s9.getByRole('slider', { name: 'Time' })
    await time.fill('240')
    await time.fill('120')
    await expect(time).toHaveAttribute('aria-valuetext', '120 milliseconds')
    const move = s9.locator('.copy-stage .move')
    const x = await move.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e)
    // The corner travels from 0 to -13 units of the glyph's grid; at 120ms it is on its way.
    expect(x).toBeLessThan(-0.5)
    expect(x).toBeGreaterThan(-12.9)
    await time.fill('0')
    expect(await move.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e)).toBeCloseTo(0, 1)
  })

  test('§11 and §12: the width control has the 160 and 280 marks; unbuilt rules say so', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const s11 = sectionOf(page, 11)
    const field = s11.getByRole('spinbutton', { name: 'Container width' })
    await s11.getByRole('button', { name: '160px, the minimum' }).click()
    await expect(field).toHaveValue('160')
    // The frame's width can still be settling after the click, so poll until it lands.
    await expect.poll(async () => Math.round(await s11.locator('.copy-width__frame').evaluate((el) => el.clientWidth - 2 * parseFloat(getComputedStyle(el).paddingLeft)))).toBe(160)
    await expect(s11.locator('datalist option')).toHaveCount(2)
    const s12 = sectionOf(page, 12)
    await expect(s12.getByRole('row', { name: /copy-button-confirms-after-write/ })).toContainText('not built yet')
    // The page no longer sends readers to GitHub for the rest.
    await expect(page.getByText(/sections 5 to 13 are in the/)).toHaveCount(0)
  })
})

test.describe('the Filter Grammar page', () => {
  test('is listed under Foundations, says it is a contract, and renders the guideline without its rule tags', async ({ page }) => {
    await page.goto('/#/foundations/filter-grammar')
    await expect(page.getByRole('heading', { level: 1, name: 'Filter Grammar' })).toBeVisible()
    await expect(page.locator('.page-head__eyebrow')).toHaveText('Contract')
    await expect(page.getByRole('heading', { name: 'Hard constraints' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Too deep', exact: true })).toBeVisible()
    await expect(page.getByText('[[rule:')).toHaveCount(0)
    await expect(page.locator('a[href="#/foundations/filter-grammar"]').first()).toHaveAttribute('aria-current', 'page')
    expect(await noSidewaysScroll(page)).toBe(true)
  })
})

// The Overview, redesigned (1 Nov 2026), and All states, the gallery that was the Overview. The
// numbers themselves are held to their sources in src/styles/site-overview.test.tsx; these check the
// page in a browser: its outline, where each link goes, the Copy button and the layout.
test.describe('the Overview', () => {
  test('one h1, then the sections as h2, then the cards as h3', async ({ page }) => {
    await page.goto('/')
    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(['Vela Design System'])
    await expect(page).toHaveTitle('Overview · Vela Design System')
    await expect(main.getByRole('heading', { level: 2 })).toHaveText(['Check it yourself', 'Built for security products', 'Ways in', 'Specified, not built yet', /^New in \d+\.\d+\.\d+$/])
    // All states left the Ways in on 1 Nov 2026 (slice 1 of the playground uplift); it keeps its address.
    // Slice 6: the three scales are one card, every way in has a picture, and every proposal is a card.
    await expect(main.getByRole('heading', { level: 3 })).toHaveText([
      'Severity 6, status 5, risk 3', 'Components', 'Foundations', 'Patterns', 'Rules', 'How it is made', 'Figma library',
      'Verdict Card', 'Action Impact Card', 'Autonomy Ladder', 'Approval Queue', 'Calibrated Confidence Gate', 'Evidence Locker', 'Agent Provenance Badge', 'Awareness Clock', 'Override & Teach Panel',
    ])
    await expect(main.locator('a[href="#/states"]')).toHaveCount(0)
    await expect(main.locator('h4, h5, h6')).toHaveCount(0)
    // Each taxonomy is shown with its own words, never another's, in the card's picture.
    const scales = main.locator('.ov-thumb--scales')
    await expect(scales.locator('[data-severity]')).toHaveText(['Success', 'Info', 'Warning', 'Minor', 'Major', 'Critical'])
    await expect(scales.locator('.vela-status')).toHaveText(['Status unknown', 'Healthy', 'Warning', 'Degraded', 'Unhealthy'])
    await expect(scales.locator('.vela-risk')).toHaveText(['Low', 'Medium', 'High'])
    // Every card's picture is a picture: inert, hidden from assistive technology, never a tab stop.
    for (const thumb of await main.locator('.shell-card__thumb').all()) {
      await expect(thumb).toHaveAttribute('aria-hidden', 'true')
      await expect(thumb).toHaveAttribute('inert', '')
    }
    // The hero's console is a picture too, named by its caption.
    await expect(main.locator('.ov-console__screen')).toHaveAttribute('inert', '')
    await expect(main.getByRole('figure', { name: /^A console screen made of Vela/ })).toBeVisible()
  })

  test('every link opens what it names', async ({ page }) => {
    await page.goto('/')
    const main = page.getByRole('main')
    const link = (name: string | RegExp) => main.getByRole('link', { name, exact: typeof name === 'string' })
    const sha = /\/blob\/([0-9a-f]{7,40}|main)\//
    // Off the site: the repository at the built commit, the Figma library the header links to.
    await expect(link('See package.json')).toHaveAttribute('href', new RegExp(`^https://github\\.com/omkarpkh/vela${sha.source}package\\.json$`))
    await expect(link('See the pairs')).toHaveAttribute('href', new RegExp(`^https://github\\.com/omkarpkh/vela${sha.source}scripts/contrast-core\\.mjs#L\\d+$`))
    const figma = await page.getByRole('banner').getByRole('link', { name: 'Vela in Figma, opens in a new tab', exact: true }).getAttribute('href')
    // One primary action in the hero (slice 6): the Figma library is a way in, not a second button.
    await expect(link('Open the Figma library')).toHaveCount(0)
    await expect(link(/^Figma library/)).toHaveAttribute('href', figma!)
    await expect(link('Governance')).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/blob/main/GOVERNANCE.md')
    await expect(link('MIT licence')).toHaveAttribute('href', 'https://github.com/omkarpkh/vela/blob/main/LICENSE')
    // On the site: each opens the page it names.
    const opens: [string | RegExp, string, string | RegExp][] = [
      ['Browse components', '#/status', 'Component status'],
      ['See the rules', '#/components/button/rules', 'Button'],
      ['How they run', '#/how', 'How it is made'],
      ['See the status', '#/status', 'Component status'],
      [/^Components \d+ built/, '#/status', 'Component status'],
      [/^Patterns/, '#/patterns/copy', 'Copy'],
      [/^Foundations/, '#/foundations/color', 'Colour'],
      [/^Rules Every rule/, '#/components/button/rules', 'Button'],
      [/^How it is made One token file/, '#/how', 'How it is made'],
      [/^Severity 6, status 5, risk 3/, '#/foundations/color?section=taxonomies', 'Colour'],
      ['All changes', '#/changelog', 'Changelog'],
      ['Roadmap', '#/roadmap', 'Roadmap'],
      ['Changelog', '#/changelog', 'Changelog'],
      [/^Evidence Locker Everything an agent used/, '#/proposals/evidence-locker', 'Evidence Locker'],
    ]
    for (const [name, to, h1] of opens) {
      await page.goto('/')
      await expect(link(name), String(name)).toHaveAttribute('href', to)
      await link(name).click()
      await expect(page.getByRole('main').getByRole('heading', { level: 1 }), String(name)).toHaveText(h1)
    }
    await page.goto('/#/components/button/rules')
    await expect(page.getByRole('tab', { name: /^Rules/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('Copy copies the install command, and says so', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    const main = page.getByRole('main')
    await expect(main.locator('.ov-install__code')).toHaveText('npm install @omkarux/vela')
    await main.getByRole('button', { name: 'Copy install command' }).click()
    await expect(main.getByRole('status').filter({ hasText: 'Copied' })).toHaveText('Copied install command')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm install @omkarux/vela')
  })

  test('the layout follows its own width: five facts, then two, and never sideways at 320', async ({ page }) => {
    const across = (selector: string) => page.locator(selector).evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size)
    const columns = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const heroAreas = () => page.locator('.ov-hero').evaluate((el) => getComputedStyle(el).gridTemplateAreas)
    expect(await across('.ov-fact'), 'facts: one row').toBe(1)
    expect(await columns('.ov-ways'), 'ways in').toBe(3)
    expect(await columns('.ov-proposals'), 'proposals').toBe(3)
    expect(await heroAreas(), 'the console beside the panel').toBe('"mark panel console"')
    // 1100px: the content column is under 1000, and the console goes under the panel.
    await page.setViewportSize({ width: 1100, height: 900 })
    expect(await heroAreas()).toBe('"mark panel" "console console"')
    // 700px: the content column is under 760.
    await page.setViewportSize({ width: 700, height: 900 })
    expect(await across('.ov-fact'), 'facts: three rows of two, then one').toBe(3)
    expect(await page.locator('.ov-fact').last().evaluate((el) => getComputedStyle(el).gridColumnStart)).toBe('1')
    expect(await columns('.ov-ways')).toBe(2)
    expect(await columns('.ov-proposals')).toBe(2)
    // 500px: under 520.
    await page.setViewportSize({ width: 500, height: 900 })
    expect(await columns('.ov-ways')).toBe(1)
    expect(await heroAreas()).toBe('"mark" "panel" "console"')
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await noSidewaysScroll(page), `${width}px`).toBe(true)
    }
  })
})

// The Overview's brand parts (1 Nov 2026): the hero mark, the stand-in for Product Mark
// (demo/shell/ProductMark.tsx), and the mood stills behind the hero. The props, the masters and the
// names are unit tests (src/styles/site-product-mark.test.tsx); these are the spec's browser rules.
// The suite runs with reduced motion by default (playwright.config.ts), so the pulse tests ask for
// motion first. No screenshots are compared here: the Overview has no visual baseline.
test.describe('Product Mark: the Overview hero and its pulse', () => {
  /** Counts each ring animation that starts, by name, from before the page's first script runs. */
  const countPulses = (page: Page) => page.addInitScript(() => {
    const w = window as unknown as { __pm: Record<string, number> }
    w.__pm = {}
    document.addEventListener('animationstart', (e) => {
      if ((e.target as Element).classList?.contains('pm-ring--inner')) w.__pm[e.animationName] = (w.__pm[e.animationName] ?? 0) + 1
    }, true)
  })
  const plays = (page: Page, name = 'pm-pulse') => page.evaluate((n) => (window as unknown as { __pm: Record<string, number> }).__pm[n] ?? 0, name)
  const replay = (page: Page) => page.getByRole('main').getByRole('button', { name: 'Play the pulse' })

  test('one pulse on load, none after navigating away and back, one more per press, and a press during play is ignored', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await countPulses(page)
    await page.goto('/')
    const button = replay(page)
    await expect(button).toBeVisible()
    await expect.poll(() => plays(page)).toBe(1)
    // Each ring scales about its own centre, in the master's user space.
    const origins = await page.locator('.ov-hero .pm-ring').evaluateAll((els) => els.map((e) => getComputedStyle(e).transformOrigin))
    expect(origins).toEqual(['16px 16px', '16.8px 16.8px'])
    // Timed by the two pulse tokens: 900ms, the outer ring 120ms later (read during a replay, below).
    await expect(button).not.toHaveAttribute('data-playing')

    // A route change back to the Overview does not replay it.
    const nav = page.getByRole('navigation', { name: 'Site' })
    await nav.getByRole('link', { name: 'How it is made' }).click()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('How it is made')
    await nav.getByRole('link', { name: 'Overview' }).click()
    await expect(replay(page)).toBeVisible()
    await page.waitForTimeout(300)
    expect(await plays(page), 'back on the Overview').toBe(1)
    await expect(replay(page)).not.toHaveAttribute('data-playing')

    // A press plays it once; a second press while it plays is ignored.
    await replay(page).click()
    await expect(replay(page)).toHaveAttribute('data-playing', 'pulse')
    const timing = await page.locator('.ov-hero .pm-ring').evaluateAll((els) => els.map((e) => {
      const cs = getComputedStyle(e)
      return [cs.animationName, cs.animationDuration, cs.animationDelay]
    }))
    expect(timing).toEqual([['pm-pulse', '0.9s', '0s'], ['pm-pulse', '0.9s', '0.12s']])
    await replay(page).click()
    await expect(replay(page)).not.toHaveAttribute('data-playing')
    expect(await plays(page), 'one press, one pulse; the press during play did nothing').toBe(2)
    await replay(page).click()
    await expect.poll(() => plays(page)).toBe(3)

    // A full reload is a new visit.
    await page.reload()
    await expect(replay(page)).toBeVisible()
    await expect.poll(() => plays(page)).toBe(1)
  })

  test('under reduced motion nothing plays on arrival, and a press fades the rings in, with no scale', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await countPulses(page)
    await page.goto('/')
    await expect(replay(page)).toBeVisible()
    await page.waitForTimeout(1200)
    expect(await plays(page)).toBe(0)
    await expect(replay(page)).not.toHaveAttribute('data-playing')
    await replay(page).click()
    const during = await page.locator('.ov-hero .pm-ring--inner').evaluate((el) => {
      const cs = getComputedStyle(el)
      return { name: cs.animationName, duration: cs.animationDuration, transform: cs.transform }
    })
    expect(during).toEqual({ name: 'pm-fade', duration: '0.18s', transform: 'none' })
    await expect(replay(page)).not.toHaveAttribute('data-playing')
    expect(await plays(page, 'pm-fade')).toBe(1)
    expect(await plays(page, 'pm-pulse')).toBe(0)
  })

  test('replay: the outer ring at 75%, 100% on focus with the tooltip, and held colour on press', async ({ page }) => {
    await page.goto('/')
    const button = replay(page)
    const ring = page.locator('.ov-hero .pm-ring--outer > g')
    await expect(ring).toHaveCSS('opacity', '0.75')
    await button.focus()
    await expect(ring).toHaveCSS('opacity', '1')
    await expect(page.getByRole('tooltip')).toHaveText('Play the pulse')
    // Held: primary-500 turns primary-600 on light, at once.
    const ink = page.locator('.ov-hero .pm-dot .pm-ink')
    await expect(ink).toHaveCSS('fill', 'rgb(10, 108, 125)')
    const box = (await button.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await expect(ink).toHaveCSS('fill', 'rgb(7, 84, 98)')
    await page.mouse.up()
  })

  test('the hero mark is 128px beside the panel, 96px above it when stacked, and never smaller, at 320', async ({ page }) => {
    const measure = () => page.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      const [mark, panel, hero] = [r('.ov-hero .pm'), r('.ov-hero__panel'), r('.ov-hero')]
      return {
        width: Math.round(mark.width), above: mark.bottom <= panel.top, beside: mark.right <= panel.left,
        // Clear space round the mark: to the hero's edges, and to the panel.
        clear: Math.round(Math.min(mark.top - hero.top, mark.left - hero.left, hero.bottom - mark.bottom, Math.max(panel.left - mark.right, panel.top - mark.bottom))),
      }
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(replay(page)).toBeVisible()
    const wide = await measure()
    expect({ ...wide, clear: wide.clear >= 32 }).toEqual({ width: 128, above: false, beside: true, clear: true })
    for (const width of [500, 320]) {
      await page.setViewportSize({ width, height: 900 })
      // Polled: the site's layout settles over a frame or two after a resize (the nav answers it).
      await expect.poll(async () => { const m = await measure(); return { ...m, clear: m.clear >= 24 } }, `${width}px`)
        .toEqual({ width: 96, above: true, beside: false, clear: true })
      expect((await measure()).width, `${width}px`).toBeGreaterThanOrEqual(96)
      expect(await noSidewaysScroll(page), `${width}px`).toBe(true)
    }
  })

  test('the stills are the background, by width and theme, and never hold up the text', async ({ page }) => {
    // Hold every still back: the panel's text must render without them.
    let release!: () => void
    const held = new Promise<void>((r) => { release = r })
    const asked: string[] = []
    await page.route('**/brand/mood-*', async (route) => { asked.push(route.request().url()); await held; await route.continue() })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Vela Design System' })).toBeVisible()
    await expect(page.getByRole('main').getByText('For data-heavy products, built first for security consoles.')).toBeVisible()
    await expect.poll(() => asked.length, 'the still was asked for, and is still on its way').toBeGreaterThan(0)
    release()
    const image = () => page.locator('.ov-hero').evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(await image()).toMatch(/mood-desktop-light-\d+\.\d\d@1x\.avif/)
    await setTheme(page, 'Dark')
    expect(await image()).toMatch(/mood-desktop-dark-\d+\.\d\d@1x\.avif/)
    await page.setViewportSize({ width: 500, height: 900 })
    expect(await image()).toMatch(/mood-phone-dark-\d+\.\d\d@1x\.avif/)
    // Text stays on the solid panel.
    expect(await page.locator('.ov-hero__panel').evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`in forced colours (${scheme}) the stills go, the panel keeps its background, and the mark is visible`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const hero = await page.evaluate(() => {
        const cs = (s: string) => getComputedStyle(document.querySelector(s)!)
        const mark = document.querySelector('.ov-hero .pm')!.getBoundingClientRect()
        return {
          image: cs('.ov-hero').backgroundImage,
          panel: cs('.ov-hero__panel').backgroundColor,
          ink: cs('.ov-hero .pm-dot .pm-ink').fill,
          canvas: cs('body').backgroundColor,
          finish: [...document.querySelectorAll('.ov-hero .pm-finish')].every((e) => getComputedStyle(e).display === 'none'),
          markWidth: Math.round(mark.width),
        }
      })
      expect(hero.image).toBe('none')
      expect(hero.panel).not.toBe('rgba(0, 0, 0, 0)')
      expect(hero.ink).not.toBe(hero.canvas)
      expect(hero.finish).toBe(true)
      expect(hero.markWidth).toBeGreaterThanOrEqual(96)
      await expect(page.locator('.ov-hero .pm')).toBeVisible()
      // For the pull request (the playground thread asked for them): FORCED_SHOTS=<dir>.
      const dir = process.env.FORCED_SHOTS
      if (dir) {
        await page.evaluate(() => document.fonts.ready)
        await page.getByRole('banner').screenshot({ path: `${dir}/header-${scheme}.png` })
        await page.locator('.ov-hero').screenshot({ path: `${dir}/overview-hero-${scheme}.png` })
        await page.goto('/#/components/button')
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: `${dir}/component-button-${scheme}.png` })
      }
    })
  }
})

// The header logo (the logo states Omkar approved on 1 Nov 2026): the 24px mark, the name and the
// version, one link to the Overview (demo/App.tsx). Its props and the colour rule are unit tests
// (src/styles/site-product-mark.test.tsx); these are the states, read in a browser. The header has
// no visual baseline: every baseline is a section, a column or <main>.
test.describe('the header logo', () => {
  const logo = (page: Page) => page.getByRole('banner').getByRole('link', { name: 'Vela Design System', exact: true })

  test('one link named "Vela Design System", the mark and the version hidden from it, current on the Overview only', async ({ page }) => {
    await page.goto('/#/components/button')
    const link = logo(page)
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '#/')
    await expect(link).not.toHaveAttribute('aria-current')
    await expect(link.locator('svg.pm')).toHaveAttribute('aria-hidden', 'true')
    await expect(link.locator('svg.pm')).toHaveClass(/pm--regular/)
    await expect(link.locator('.brand__meta')).toHaveAttribute('aria-hidden', 'true')
    await expect(link.locator('.brand__meta')).toBeVisible()
    await expect(link.getByRole('img')).toHaveCount(0)
    // A press goes home.
    await link.click()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Vela Design System')
    await expect(link).toHaveAttribute('aria-current', 'page')
    // On the Overview a press goes back to the top, and stays there.
    await page.setViewportSize({ width: 1440, height: 500 })
    await page.mouse.wheel(0, 2000)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await link.click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(link).toHaveAttribute('aria-current', 'page')
    expect(new URL(page.url()).hash).toMatch(/^(#\/?)?$/)
    // The name is the same on a phone, where only "Vela" shows.
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(logo(page)).toBeVisible()
    await expect(logo(page).locator('.brand__rest')).toHaveCSS('clip-path', 'inset(50%)')
  })

  test('the mark is primary-500 in light and primary-300 in dark, 24px, five pixels from the name', async ({ page }) => {
    await page.goto('/#/components/button')
    const mark = logo(page).locator('svg.pm')
    await setTheme(page, 'light')
    await expect(mark).toHaveCSS('color', 'rgb(10, 108, 125)')
    await setTheme(page, 'dark')
    await expect(mark).toHaveCSS('color', 'rgb(95, 184, 201)')
    const [m, n] = await Promise.all([mark.boundingBox(), logo(page).locator('.brand__name').boundingBox()])
    expect([m!.width, m!.height]).toEqual([24, 24])
    expect(Math.round(n!.x - (m!.x + m!.width))).toBe(5)
  })

  test('hover underlines the name only; the mark and the version do not change', async ({ page }) => {
    await page.goto('/#/components/button')
    const link = logo(page)
    const look = () => link.evaluate((a) => {
      const cs = (s: string) => getComputedStyle(a.querySelector(s)!)
      return {
        link: getComputedStyle(a).textDecorationLine, name: cs('.brand__name').textDecorationLine, meta: cs('.brand__meta').textDecorationLine,
        mark: [cs('.pm').color, cs('.pm').transform, cs('.pm').opacity], metaColour: cs('.brand__meta').color,
      }
    })
    await page.mouse.move(700, 600)
    const rest = await look()
    expect([rest.link, rest.name, rest.meta]).toEqual(['none', 'none', 'none'])
    await link.locator('.pm').hover()
    await expect.poll(async () => (await look()).name).toBe('underline')
    const hover = await look()
    expect([hover.link, hover.meta]).toEqual(['none', 'none'])
    expect(hover.mark).toEqual(rest.mark)
    expect(hover.metaColour).toBe(rest.metaColour)
  })

  test('the focus ring wraps the whole lockup: 2px, offset 2px, the focus ring colour', async ({ page }) => {
    await page.goto('/#/components/button')
    await page.getByRole('banner').getByRole('button', { name: /navigation$/ }).focus()
    await page.keyboard.press('Tab')
    const link = logo(page)
    await expect(link).toBeFocused()
    const ring = await link.evaluate((a) => {
      const cs = getComputedStyle(a)
      const probe = document.createElement('i')
      probe.style.color = 'var(--vela-focus-ring-color)'
      a.appendChild(probe)
      const token = getComputedStyle(probe).color
      probe.remove()
      const r = a.getBoundingClientRect()
      const inside = [...a.querySelectorAll('.pm, .brand__name, .brand__meta')].every((el) => {
        const b = el.getBoundingClientRect()
        return b.left >= r.left && b.right <= r.right && b.top >= r.top && b.bottom <= r.bottom
      })
      return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, colour: cs.outlineColor === token, inside }
    })
    expect(ring).toEqual({ style: 'solid', width: '2px', offset: '2px', colour: true, inside: true })
  })

  test('the header mark never animates, while the Overview hero pulses once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addInitScript(() => {
      const w = window as unknown as { __anim: { header: number; hero: number } }
      w.__anim = { header: 0, hero: 0 }
      document.addEventListener('animationstart', (e) => {
        const el = e.target as Element
        if (el.closest?.('.topbar .brand')) w.__anim.header += 1
        if (el.closest?.('.ov-hero')) w.__anim.hero += 1
      }, true)
    })
    await page.goto('/')
    await expect.poll(() => page.evaluate(() => (window as unknown as { __anim: { hero: number } }).__anim.hero)).toBeGreaterThan(0)
    await logo(page).hover()
    await logo(page).click()
    await page.waitForTimeout(1200)
    expect(await page.evaluate(() => (window as unknown as { __anim: { header: number } }).__anim.header)).toBe(0)
    const names = await logo(page).locator('svg.pm, svg.pm *').evaluateAll((els) => [...new Set(els.map((e) => getComputedStyle(e).animationName))])
    expect(names).toEqual(['none'])
    await expect(logo(page).locator('[data-playing], .pm-ring, button')).toHaveCount(0)
  })

  test('forced colours: the name and the mark are LinkText, and the focus ring is still an outline', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/#/components/button')
    const banner = page.getByRole('banner')
    const linkText = await banner.evaluate((host) => { const p = document.createElement('i'); p.style.cssText = 'forced-color-adjust: none; color: LinkText'; host.appendChild(p); const v = getComputedStyle(p).color; p.remove(); return v })
    const link = logo(page)
    await expect(link.locator('.brand__name')).toHaveCSS('color', linkText)
    await expect(link.locator('svg.pm')).toHaveCSS('color', linkText)
    // The mark is drawn in currentColor, so its strokes follow.
    await expect(link.locator('svg.pm circle')).toHaveCSS('fill', linkText)
    await banner.getByRole('button', { name: /navigation$/ }).focus()
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    await expect(link).toHaveCSS('outline-style', 'solid')
    await expect(link).toHaveCSS('outline-width', '2px')
  })

  test('at 390 the menu button, the mark with "Vela", Search and Appearance all fit, with no overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/components/button')
    await page.evaluate(() => document.fonts.ready)
    const banner = page.getByRole('banner')
    const parts = [
      banner.getByRole('button', { name: 'Show navigation' }),
      logo(page),
      banner.getByRole('button', { name: 'Search', exact: true }),
      banner.getByRole('button', { name: 'Appearance', exact: true }),
    ]
    const boxes = []
    for (const p of parts) { await expect(p).toBeVisible(); boxes.push((await p.boundingBox())!) }
    // Left to right, apart, inside the window, and inside the bar's height.
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].x, `part ${i}`).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width)
    for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(390); expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(56) }
    // The quarter-width clear space (6px) round the mark, to the menu button.
    const mark = (await logo(page).locator('svg.pm').boundingBox())!
    expect(mark.x - (boxes[0].x + boxes[0].width)).toBeGreaterThanOrEqual(6)
    await expect(logo(page).locator('.brand__name')).toHaveText('Vela Design System')
    await expect(logo(page).locator('.brand__meta')).toBeHidden()
    expect(Math.round((await logo(page).locator('.brand__name').boundingBox())!.width)).toBeLessThan(40)
    expect(await noSidewaysScroll(page)).toBe(true)
  })
})

test.describe('All states', () => {
  // It left the menu on 1 Nov 2026 (slice 1 of the playground uplift), and stays at its address as the
  // visual baselines' page.
  test('the gallery that was the Overview is at #/states, and not in the menu', async ({ page }) => {
    await page.goto('/#/states')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Every component, every state')
    await expect(page).toHaveTitle('All states · Vela Design System')
    for (const name of ['Button', 'Toggle', 'Input', 'Contextual Alert', 'Status Indicator', 'Risk Pill', 'Tabs', 'Tokens'])
      await expect(page.locator('section.demo-section', { has: page.getByRole('heading', { name, exact: true }) }), name).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'Site' })
    const start = nav.locator('.sitenav__group', { has: page.getByRole('heading', { level: 3, name: 'Start' }) })
    await expect(start.getByRole('link')).toHaveText(['Overview', 'How it is made'])
    await expect(nav.locator('a[href="#/states"]')).toHaveCount(0)
    expect(await noSidewaysScroll(page)).toBe(true)
  })
})

// Fix 0 of the site evaluation: a plain link is the link token in both themes, never the browser's
// blue or purple (demo.css, "links"), and it keeps its underline because it sits in running text or
// a table. The value is read from the token on the page, so a re-pointed token moves the test with it.
test.describe('plain links', () => {
  const PAGES = [
    { name: 'Status', path: '/#/status', link: '.status-table a' },
    { name: 'All states', path: '/#/states', link: '.page-head a' },
    { name: 'Not found', path: '/#/components/firewall-rule', link: '.nf-gap a' },
  ]
  for (const p of PAGES)
    for (const theme of ['Light', 'Dark'] as const)
      test(`${p.name} in ${theme.toLowerCase()}: a plain link is the link token`, async ({ page }) => {
        await page.goto(p.path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await setTheme(page, theme)
        const token = await page.evaluate(() => {
          const probe = document.createElement('span')
          probe.style.color = 'var(--vela-text-link)'
          document.querySelector('.vela-root')!.appendChild(probe)
          const c = getComputedStyle(probe).color
          probe.remove()
          return c
        })
        // The browser's own link colours, light and dark, unvisited and visited: never these.
        expect(['rgb(0, 0, 238)', 'rgb(85, 26, 139)', 'rgb(158, 158, 255)', 'rgb(208, 173, 240)']).not.toContain(token)
        const link = page.getByRole('main').locator(p.link).first()
        await expect(link).toBeVisible()
        expect(await link.getAttribute('class')).toBeNull()
        await expect(link).toHaveCSS('color', token)
        await expect(link).toHaveCSS('text-decoration-line', 'underline')
        await link.hover()
        await expect(link).toHaveCSS('color', token)
      })
})

test.describe('the Motion review curves', () => {
  test('each curve is named on the chart, not told apart by colour alone', async ({ page }) => {
    await page.goto('/#/motion')
    const plot = page.locator('.motion-curves__plot')
    await expect(plot.getByRole('img', { name: /ease-standard, ease-out and the spring/ })).toBeVisible()
    const box = (await plot.boundingBox())!
    const labels = plot.locator('.motion-curve__label')
    await expect(labels).toHaveText(['ease-standard', 'ease-out', 'ease-spring'])
    const boxes = []
    for (const l of await labels.all()) {
      await expect(l).toBeVisible()
      const b = (await l.boundingBox())!
      // Inside the chart, and clear of each other.
      expect(b.x).toBeGreaterThanOrEqual(box.x)
      expect(b.y).toBeGreaterThanOrEqual(box.y)
      expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width)
      expect(b.y + b.height).toBeLessThanOrEqual(box.y + box.height)
      for (const o of boxes) expect(b.x >= o.x + o.width || o.x >= b.x + b.width || b.y >= o.y + o.height || o.y >= b.y + b.height).toBe(true)
      boxes.push(b)
    }
    // The two greys differ by pattern too.
    await expect(page.locator('path.motion-curve--standard')).toHaveCSS('stroke-dasharray', /\d/)
    await expect(page.locator('path.motion-curve--out')).toHaveCSS('stroke-dasharray', 'none')
  })
})

test.describe('axe', () => {
  for (const path of ['/#/', '/#/states', '/#/components/button', '/#/components/tabs', '/#/components/dropdown-list', '/#/proposals/evidence-locker', '/#/patterns/copy', '/#/foundations/filter-grammar', '/#/foundations/color', '/#/foundations/typography', '/#/foundations/sizing', '/#/foundations/motion', '/#/components/brand-mark', '/#/components/icon-button'])
    for (const theme of ['Light', 'Dark'] as const)
      test(`${path} in ${theme.toLowerCase()} has no WCAG A or AA violation`, async ({ page }) => {
        const { default: AxeBuilder } = await import('@axe-core/playwright')
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await setTheme(page, theme)
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .options({ rules: { 'label-content-name-mismatch': { enabled: true } } })
          .analyze()
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
      })
})

// Slice 1 of the playground uplift, the shell (1 Nov 2026): the section index, what sticks, and the
// marks that must survive forced colours. The parts themselves are unit-tested in
// src/styles/site-shell-parts.test.tsx; the pressed states are linted by scripts/check-css.mjs.
test.describe('slice 1 · the shell', () => {
  /** The bottom edge of what sticks above the content, in CSS px. */
  const stuckBottom = (page: Page) => page.evaluate(() => {
    const bottoms = [...document.querySelectorAll<HTMLElement>('.topbar, .pg-tabs .vela-tabs__list, .shell-index--strip')]
      .filter((el) => getComputedStyle(el).position === 'sticky' || getComputedStyle(el).position === 'fixed')
      .map((el) => el.getBoundingClientRect().bottom)
    return Math.max(0, ...bottoms)
  })

  test('index links write ?section= in place: Back leaves the page, and a reload keeps the place', async ({ page }) => {
    await page.goto('/#/status')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => { window.location.hash = '#/components/button/rules' })
    const index = page.getByRole('navigation', { name: 'On this tab' })
    await expect(index).toBeVisible()
    const entries = await page.evaluate(() => history.length)

    await index.getByRole('link', { name: 'Browser 2' }).click()
    await expect(page).toHaveURL(/#\/components\/button\/rules\?section=browser$/)
    const heading = page.getByRole('heading', { level: 2, name: /^A real browser proves these/ })
    await expect(heading).toBeFocused()
    await expect(index.getByRole('link', { name: 'Browser 2' })).toHaveAttribute('aria-current', 'location')
    await expect(index.locator('[aria-current]')).toHaveCount(1)
    // The heading lands below what sticks, not under it.
    expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(await stuckBottom(page))

    await index.getByRole('link', { name: 'States' }).click()
    await expect(page).toHaveURL(/\?section=states$/)
    await expect(page.getByRole('heading', { level: 2, name: 'States' })).toBeFocused()
    // Replaced, never pushed: no history entry per section.
    expect(await page.evaluate(() => history.length)).toBe(entries)

    await page.reload()
    const states = page.getByRole('heading', { level: 2, name: 'States' })
    await expect(states).toBeFocused()
    await expect(states).toBeInViewport()
    await expect(page.getByRole('navigation', { name: 'On this tab' }).getByRole('link', { name: 'States' })).toHaveAttribute('aria-current', 'location')
    // A section in the address is not a setting: the shared-link notice stays away.
    await expect(page.locator('.pg-notice')).toHaveCount(0)

    await page.goBack()
    await expect(page).toHaveURL(/#\/status$/)
  })

  test('at 720 by 450 CSS px only the header sticks, and a focused row is below it', async ({ page }) => {
    for (const size of [{ width: 1440, height: 900 }, { width: 720, height: 450 }]) {
      await page.setViewportSize(size)
      await page.goto('/#/components/button/rules')
      await page.reload()
      const strip = page.getByRole('navigation', { name: 'On this tab' })
      await expect(strip).toBeVisible()
      const tall = size.height > 560
      const tabs = page.locator('.pg-tabs .vela-tabs__list')
      if (tall) { await expect(strip).toHaveCSS('position', 'sticky'); await expect(tabs).toHaveCSS('position', 'sticky') }
      else { await expect(strip).not.toHaveCSS('position', 'sticky'); await expect(tabs).not.toHaveCSS('position', 'sticky') }
      // scroll-padding-top is what sticks, so focus never lands under it (WCAG 2.4.11).
      const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))
      if (!tall) expect(padding).toBe(56)
      // A row scrolled up under the top of the window, then focused, as Shift+Tab would land on it:
      // the browser brings it out from under what sticks.
      const row = page.locator('.pg-rule[data-rule="button-icons-left-only"]')
      await row.evaluate((el) => { window.scrollBy(0, el.getBoundingClientRect().top - 10) })
      await row.evaluate((el) => { (el as HTMLElement).tabIndex = -1; (el as HTMLElement).focus() })
      await expect(row).toBeFocused()
      const box = (await row.boundingBox())!
      const bottom = await stuckBottom(page)
      expect(padding).toBeGreaterThanOrEqual(bottom)
      expect(box.y, `${size.width} by ${size.height}`).toBeGreaterThanOrEqual(bottom)
    }
  })

  test('forced colours keep a mark that is not a shadow on the index place and the chosen segment', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/#/components/button/rules')
    const index = page.getByRole('navigation', { name: 'On this tab' })
    await expect(index.locator('[aria-current="location"]')).toHaveCount(1)
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.cssText = 'forced-color-adjust: none; color: CanvasText'
      document.body.appendChild(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    })
    const place = await index.locator('[aria-current="location"]').evaluate((el) => {
      const cs = getComputedStyle(el)
      return { style: cs.borderBottomStyle, width: cs.borderBottomWidth, colour: cs.borderBottomColor, shadow: cs.boxShadow }
    })
    expect(place).toEqual({ style: 'solid', width: '2px', colour: canvasText, shadow: 'none' })
    // Every other link's line is the page's own colour, so only the place shows one.
    const other = await index.locator('a:not([aria-current])').first().evaluate((el) => getComputedStyle(el).borderBottomColor)
    expect(other).not.toBe(canvasText)
    // The strip keeps its edge when its fill goes.
    await expect(index).toHaveCSS('border-top-style', 'solid')

    // The chosen segment (State, on the Tokens tab): a 2px border, never only a shadow.
    await page.goto('/#/components/button/tokens')
    const chosen = page.getByRole('group', { name: 'State' }).locator('[aria-current="true"]')
    const seg = await chosen.evaluate((el) => { const cs = getComputedStyle(el); return { style: cs.borderTopStyle, width: cs.borderTopWidth, shadow: cs.boxShadow } })
    expect(seg).toEqual({ style: 'solid', width: '2px', shadow: 'none' })
  })

  test('every copy mark is at least 24 by 24', async ({ page }) => {
    for (const path of ['/#/', '/#/components/button', '/#/components/popover', '/#/patterns/copy']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const marks = page.locator('.shell-copy:visible, .shell-cm:visible')
      expect(await marks.count(), path).toBeGreaterThan(0)
      for (const box of await marks.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height } })))
        expect(Math.min(box.w, box.h), path).toBeGreaterThanOrEqual(24)
    }
  })
})

// Slice 3 of the playground uplift (s5-tabs, level 4; s5-site-map, "Component page: Playground"): the
// component stage on all 19 Playground tabs. The caption, the range and their words are unit-tested in
// src/styles/site-stage.test.tsx; here, the page in a real browser.
test.describe('slice 3 · the stage', () => {
  const ALL = [...COMPONENTS, 'dropdown-list', 'icon-button', 'brand-mark']
  const SRC: Record<string, string> = { 'button': 'Button', 'toggle': 'Toggle', 'input': 'Input', 'text-area': 'TextArea', 'contextual-alert': 'ContextualAlert', 'status-indicator': 'StatusIndicator', 'risk-pill': 'RiskPill', 'tabs': 'Tabs', 'icon': 'Icon', 'checkbox': 'Checkbox', 'radio-group': 'RadioGroup', 'table': 'Table', 'popover': 'Popover', 'tooltip': 'Tooltip', 'dialog': 'Dialog', 'dropdown-list': 'DropdownList', 'icon-button': 'IconButton', 'brand-mark': 'BrandMark' }

  test('on every Playground tab the component sits in a stage named Live demo, its caption says Live and its props, and the stage leads', async ({ page }) => {
    expect(ALL).toHaveLength(19)
    for (const id of ALL) {
      await page.goto(`/#/components/${id}`)
      const stage = page.getByRole('region', { name: 'Live demo', exact: true })
      await expect(stage, id).toBeVisible()
      await expect(stage.locator('.shell-stage__live')).toHaveText('Live')
      const props = await stage.locator('code.shell-stage__props').textContent()
      if (id === 'toast') expect(props).toBe("toast.add({ severity: 'success' })")
      else expect(props, id).toMatch(new RegExp(`^<${SRC[id]}( [^>]*)?>$`))
      // The real component is inside the slab, and only there.
      await expect(stage.locator('.shell-stage__slab .pg-frame-body > *').first(), id).toBeVisible()
      // The stage is the arrival's lead; the controls follow it.
      await expect(stage).toHaveAttribute('data-arrive', '1')
      await expect(page.getByRole('complementary', { name: 'Controls' })).toHaveAttribute('data-arrive', '2')
      await expect(page.getByRole('complementary', { name: 'Controls' }).getByRole('heading', { name: 'Set it' })).toBeVisible()
      // Reduced motion is the stage's own switch, in its caption.
      await expect(stage.locator('.shell-stage__caption').getByRole('switch', { name: 'Reduced motion' }), id).toBeVisible()
    }
  })

  test('the Playground tab has no em or en dash in its visible words, on every component', async ({ page }) => {
    for (const id of ALL) {
      await page.goto(`/#/components/${id}`)
      await expect(page.getByRole('region', { name: 'Live demo', exact: true })).toBeVisible()
      const lines = (await page.locator('main').innerText()).split('\n').filter((l) => /[—–]/.test(l))
      expect(lines, id).toEqual([])
    }
  })

  test('the controls drive the props: the caption, the component and the code follow a segment', async ({ page }) => {
    await page.goto('/#/components/button')
    const stage = page.getByRole('region', { name: 'Live demo', exact: true })
    const caption = stage.locator('code.shell-stage__props')
    await expect(caption).toHaveText('<Button variant="primary" appearance="filled" size="regular" icon={…}>')
    const controls = page.getByRole('complementary', { name: 'Controls' })
    const live = stage.locator('.pg-frame-body .vela-btn')
    const before = (await live.boundingBox())!.height
    await choose(controls, 'size', 'large')
    await choose(controls, 'variant', 'destructive')
    await expect(caption).toHaveText('<Button variant="destructive" appearance="filled" size="large" icon={…}>')
    expect((await live.boundingBox())!.height).toBeGreaterThan(before)
    await expect(page.getByRole('region', { name: 'Use it', exact: true }).locator('.pg-code')).toContainText('<Button variant="destructive" size="large" icon={<PlusIcon />}>')
    // A switch shows in the caption only while it is on.
    await controls.getByRole('switch', { name: 'disabled' }).click()
    await expect(caption).toContainText(' disabled')
    await controls.getByRole('switch', { name: 'disabled' }).click()
    await expect(caption).not.toContainText('disabled')
  })

  test('the resting stage shows the range at the page settings, inert, and says what the settings leave out', async ({ page }) => {
    await page.goto('/#/components/button')
    const range = page.getByRole('region', { name: 'The range', exact: true })
    await expect(range.locator('.shell-stage__live')).toHaveText('The range')
    await expect(range.locator('code.shell-stage__props')).toHaveText('<Button size="regular" icon={…}>')
    const list = range.getByRole('list', { name: 'Button, every variant and appearance' })
    // The icon is on, and text-link never carries one: six forms, and the rule's words under the plate.
    await expect(list.getByRole('listitem')).toHaveCount(6)
    await expect(page.getByText('Not in the range with these settings: text-link never carries an icon.')).toBeVisible()
    // Each form is a picture: nothing in it is a control a reader can reach.
    await expect(range.getByRole('button')).toHaveCount(0)
    expect(await range.locator('.pg-range__pic').evaluateAll((els) => els.every((e) => e.hasAttribute('inert')))).toBe(true)
    // The icon off: all seven forms, and nothing left out.
    const controls = page.getByRole('complementary', { name: 'Controls' })
    await controls.getByRole('switch', { name: 'icon' }).click()
    await expect(list.getByRole('listitem')).toHaveCount(7)
    await expect(page.getByText(/Not in the range/)).toHaveCount(0)
    // The range follows the page's other settings, true to size: tiny here is tiny on the stage.
    await choose(controls, 'size', 'tiny')
    await expect(range.locator('code.shell-stage__props')).toHaveText('<Button size="tiny">')
    const liveH = (await page.getByRole('region', { name: 'Live demo', exact: true }).locator('.pg-frame-body .vela-btn').boundingBox())!.height
    // (text-link has no box, so it is measured by its own rule, not here.)
    for (const h of await range.locator('.pg-range__pic .vela-btn:not(.vela-btn--text-link)').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBe(liveH)
    // Compare on Themes: one row per theme.
    await compareThemes(page)
    await expect(range.getByRole('list')).toHaveCount(2)
  })

  test('the range is only where the live stage shows one instance; Tabs keeps its own demo as its range', async ({ page }) => {
    for (const [id, has] of [['risk-pill', true], ['status-indicator', true], ['tabs', false], ['table', false], ['toast', false]] as const) {
      await page.goto(`/#/components/${id}`)
      await expect(page.getByRole('region', { name: 'Live demo', exact: true })).toBeVisible()
      await expect(page.getByRole('region', { name: 'The range', exact: true }), id).toHaveCount(has ? 1 : 0)
    }
  })

  test('the hardest page: the Tabs page tabs and the demo tabs are told apart by the stage, set to Large or not', async ({ page }) => {
    await page.goto('/#/components/tabs')
    const pageTabs = page.getByRole('tablist', { name: 'Tabs page' })
    const stage = page.getByRole('region', { name: 'Live demo', exact: true })
    await expect(pageTabs).toBeVisible()
    // The demo's own list keeps its name, inside the stage, never outside it.
    await expect(stage.getByRole('tablist', { name: 'Views' })).toBeVisible()
    await expect(page.getByRole('tablist', { name: 'Views' })).toHaveCount(1)
    // The width control is the stage's own, in its caption, with the handle on the frame.
    await expect(stage.locator('.shell-stage__caption').getByRole('spinbutton', { name: 'Container width' })).toBeVisible()
    await expect(stage.locator('.pg-width__handle')).toHaveCount(1)
    await choose(page.getByRole('complementary', { name: 'Controls' }), 'size', 'large')
    await expect(stage.locator('code.shell-stage__props')).toHaveText('<Tabs size="large">')
    await expect(stage.getByRole('tablist', { name: 'Views' })).toHaveClass(/vela-tabs__list/)
    // Built with sits last in Set it, and is not a prop, so the caption never says it.
    const fields = page.getByRole('complementary', { name: 'Controls' }).locator('.pg-field')
    await expect(fields.last()).toHaveAttribute('data-prop', 'implementation')
    await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
    await expect(stage.locator('code.shell-stage__props')).toHaveText('<Tabs size="large">')
  })

  test('in forced colours the stage keeps its edge, and each frame side by side keeps an outline', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/#/components/tabs')
    const stage = page.getByRole('region', { name: 'Live demo', exact: true })
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.cssText = 'forced-color-adjust: none; color: CanvasText'
      document.body.appendChild(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    })
    const edge = await stage.evaluate((el) => { const cs = getComputedStyle(el); return { style: cs.borderTopStyle, colour: cs.borderTopColor, shadow: cs.boxShadow } })
    expect(edge).toEqual({ style: 'solid', colour: canvasText, shadow: 'none' })
    await compareThemes(page)
    for (const outline of await stage.locator('.pg-frame').evaluateAll((els) => els.map((e) => getComputedStyle(e).outlineStyle))) expect(outline).toBe('solid')
  })

  test('on a phone, a tab inside the pinned stage takes focus and the page stays where it is', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/components/tabs')
    const stage = page.getByRole('region', { name: 'Live demo', exact: true })
    await expect(stage).toHaveCSS('position', 'sticky')
    await page.evaluate(() => window.scrollTo(0, 900))
    const header = (await page.getByRole('banner').boundingBox())!
    await expect.poll(async () => Math.round((await stage.boundingBox())!.y)).toBe(Math.round(header.y + header.height))
    const at = await page.evaluate(() => window.scrollY)
    const views = stage.getByRole('tablist', { name: 'Views' })
    await views.getByRole('tab', { selected: true }).focus()
    expect(await page.evaluate(() => window.scrollY)).toBe(at)
    // A move along the row: the panel under it changes height, and that is all that moves.
    await page.keyboard.press('ArrowRight')
    await expect(views.getByRole('tab', { name: /^Assets/ })).toBeFocused()
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - at)).toBeLessThan(60)
    expect(Math.round((await stage.boundingBox())!.y)).toBe(Math.round(header.y + header.height))
  })
})

// Slice 4 of the playground uplift (s5-proposal): the nine proposal pages and the Copy pattern page.
// What the pages read from the specs is unit-tested in src/styles/site-proposals.test.ts; here, the
// pages in a real browser.
test.describe('slice 4 · proposals and Copy', () => {
  const main = (page: Page) => page.getByRole('main')
  /** Every word the page shows, without the parts that are code. */
  const visibleWords = (page: Page) => page.locator('main').evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement
    clone.querySelectorAll('code, pre, [hidden]').forEach((c) => c.remove())
    return clone.innerText
  })

  test('Evidence Locker: the job in three steps from its worked example, then all 21 states, six first', async ({ page }) => {
    await page.goto('/#/proposals/evidence-locker')
    await expect(main(page).getByRole('heading', { level: 2, name: 'The job, in three steps' })).toBeVisible()
    const steps = page.getByRole('tablist', { name: 'Steps' })
    await expect(steps.getByRole('tab')).toHaveCount(3)
    await expect(steps.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true')
    // The sketch is one picture with a name; its words are not read as a product.
    await expect(page.getByRole('tabpanel').getByRole('img', { name: /^Sketch: Evidence Locker, step 1/ })).toBeVisible()
    await expect(page.getByText('From the spec\'s worked example, Case CS-4133')).toBeVisible()

    await expect(main(page).getByRole('heading', { level: 2, name: 'Every state, drawn' })).toBeVisible()
    await expect(page.getByText('21 in the spec')).toBeVisible()
    const states = page.locator('.prop-state')
    await expect(states.filter({ visible: true })).toHaveCount(6)
    await page.getByRole('button', { name: 'Show 15 more' }).click()
    await expect(states.filter({ visible: true })).toHaveCount(21)
    // A card grows downwards only: its neighbour does not move.
    const neighbour = states.nth(1)
    const before = await neighbour.boundingBox()
    await states.first().getByRole('button', { name: 'What it shows' }).click()
    await expect(states.first().getByText(/Heading with conclusion and version/)).toBeVisible()
    expect((await neighbour.boundingBox())!.y).toBe(before!.y)
  })

  test('steps: arrows move along the tab list; Previous says why it can\'t act at step 1; the last step starts again', async ({ page }) => {
    await page.goto('/#/proposals/evidence-locker')
    const steps = page.getByRole('tablist', { name: 'Steps' })
    const previous = page.getByRole('button', { name: 'Previous: this is the first step' })
    await expect(previous).toHaveAttribute('aria-disabled', 'true')
    await steps.getByRole('tab').first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(steps.getByRole('tab').nth(1)).toBeFocused()
    await expect(steps.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Step 2 of 3')).toBeVisible()
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText('Step 3 of 3')).toBeVisible()
    await expect(page.getByRole('tabpanel')).toContainText('This claim about the world cites only untrusted content (1 item). Check it against a system record before acting.')
    await page.getByRole('button', { name: 'Start again' }).click()
    await expect(steps.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true')
  })

  test('a spec with no worked example: no steps, the states lead, and the page says why', async ({ page }) => {
    for (const id of ['verdict-card', 'action-impact-card', 'autonomy-ladder', 'calibrated-confidence-gate', 'agent-provenance-badge', 'approval-queue']) {
      await page.goto(`/#/proposals/${id}`)
      await expect(main(page).getByRole('heading', { level: 2, name: 'Every state, drawn' }), id).toBeVisible()
      await expect(page.getByRole('tablist', { name: 'Steps' }), id).toHaveCount(0)
      await expect(page.getByText('Steps are drawn from the spec\'s worked example. This spec has none yet, so its states lead.'), id).toBeVisible()
      // The states come straight after the job, before where it sits.
      const order = await main(page).locator('h2').allTextContents()
      expect(order.slice(0, 3), id).toEqual(['The job', 'Every state, drawn', 'Where it sits'])
    }
  })

  test('where it sits and until it is built: statuses from the kit, a missing part flagged with the closest one', async ({ page }) => {
    await page.goto('/#/proposals/evidence-locker')
    const map = page.locator('.prop-map')
    await expect(map.getByRole('link', { name: 'Popover In the kit · Experimental' })).toHaveAttribute('href', '#/components/popover')
    await expect(map.getByRole('link', { name: 'Calibrated Confidence Gate Proposal' })).toHaveAttribute('href', '#/proposals/calibrated-confidence-gate')
    await expect(map.getByText('Agent Action Ledger')).toBeVisible()
    await expect(page.getByText('Waiting on two proposals: Calibrated Confidence Gate and Action Impact Card.')).toBeVisible()

    await page.goto('/#/proposals/override-and-teach-panel')
    const combobox = page.locator('.prop-until__item--missing', { hasText: 'Combobox' })
    await expect(combobox).toContainText('Not in the kit')
    await expect(combobox).toContainText('Planned, not built yet.')
    await expect(combobox.getByRole('link', { name: 'Input' })).toHaveAttribute('href', '#/components/input')
    await expect(page.locator('main')).not.toContainText('Phase 1')
  })

  test('sources: all seven of Evidence Locker\'s, none drawn as a link the spec does not give', async ({ page }) => {
    await page.goto('/#/proposals/evidence-locker')
    await expect(page.getByText('7 sources, each from the spec')).toBeVisible()
    await expect(page.locator('.prop-source')).toHaveCount(7)
    await expect(page.locator('.prop-source a')).toHaveCount(0)
    await expect(page.locator('.prop-source').last()).toContainText('The verdict-card study')
  })

  test('no dash reaches a reader, though the spec\'s own strings carry them', async ({ page }) => {
    for (const id of ['evidence-locker', 'override-and-teach-panel', 'awareness-clock', 'verdict-card']) {
      await page.goto(`/#/proposals/${id}`)
      await expect(main(page).getByRole('heading', { level: 2, name: 'Where it sits' })).toBeVisible()
      const more = page.getByRole('button', { name: /^Show \d+ more$/ })
      while (await more.count()) await more.first().click()
      const closed = page.getByRole('button', { name: 'What it shows' })
      while (await closed.count()) await closed.first().click()
      const words = await visibleWords(page)
      expect(words.match(/.{0,30}[—–].{0,30}/g), id).toBeNull()
    }
  })

  test('Props: a side panel; focus goes to Close, Esc puts it away and focus goes back', async ({ page }) => {
    await page.goto('/#/proposals/evidence-locker')
    const open = page.getByRole('button', { name: 'Show props 8' })
    await open.click()
    const panel = page.getByRole('region', { name: 'Props 8' })
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Close the props of Evidence Locker' })).toBeFocused()
    await expect(panel.getByText('These may change before the component is built.')).toBeVisible()
    await expect(panel.locator('.prop-panel__name')).toHaveText(['conclusion', 'items', 'claims', 'notSeen', 'confidence', 'rationale', 'groupBy', 'timeZone'])
    // Not a dialog: the page stays readable beside it.
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Back to the page' })).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(open).toBeFocused()
  })

  test('Props under 960 CSS px: a full sheet that says how to get back', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 900 })
    await page.goto('/#/proposals/evidence-locker')
    await page.getByRole('button', { name: 'Show props 8' }).click()
    const panel = page.getByRole('region', { name: 'Props 8' })
    const box = (await panel.boundingBox())!
    expect(box.x).toBe(0)
    expect(Math.round(box.width)).toBe(720)
    await page.getByRole('button', { name: 'Back to the page' }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('button', { name: 'Show props 8' })).toBeFocused()
  })

  test('section links: the rail writes ?section= in place, so Back leaves the page and a reload keeps the place', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    await page.goto('/#/proposals/evidence-locker')
    const rail = page.getByRole('navigation', { name: 'On this page' })
    await expect(rail.getByRole('link')).toHaveText(['The job', 'Every state 21', 'Where it sits', 'Until it is built', 'Promises 20', 'Why it exists 7', 'Word sets 2'])
    await rail.getByRole('link', { name: 'Where it sits' }).click()
    await expect(page).toHaveURL(/#\/proposals\/evidence-locker\?section=where$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Where it sits' })).toBeFocused()
    await expect(rail.getByRole('link', { name: 'Where it sits' })).toHaveAttribute('aria-current', 'location')
    await page.reload()
    await expect(page.getByRole('heading', { level: 2, name: 'Where it sits' })).toBeInViewport()
    await page.goBack()
    await expect(page).toHaveURL(/#\/patterns\/copy$/)
  })

  test('a link to one state reveals it past Show more, opens it and moves to it', async ({ page }) => {
    await page.goto('/#/proposals/evidence-locker?state=hidden-characters')
    const card = page.locator('#state-hidden-characters')
    await expect(card).toBeFocused()
    await expect(card).toBeInViewport()
    await expect(card.getByRole('button', { name: 'Less' })).toHaveAttribute('aria-expanded', 'true')
    await expect(card).toContainText('3 hidden characters shown · 1 look-alike domain')
  })

  test('the ninth proposal never dead-ends: it goes back to every proposal', async ({ page }) => {
    await page.goto('/#/proposals/override-and-teach-panel')
    const more = page.getByRole('navigation', { name: 'More proposals' })
    await expect(more.getByRole('link', { name: /Previous proposal Awareness Clock/ })).toBeVisible()
    await more.getByRole('link', { name: /That is all nine Back to every proposal/ }).click()
    await expect(page).toHaveURL(/#\/$/)
  })

  test('Copy: the live demo on a stage that says what it is made with, and the rail of every section', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const stage = page.getByRole('region', { name: 'Live demo' })
    await expect(stage).toContainText("Made with the site's own copy control, not a kit part.")
    await expect(stage.getByRole('button', { name: 'Copy db-primary IP address' })).toBeVisible()
    const rail = page.getByRole('navigation', { name: 'On this page' })
    await expect(rail.getByRole('link')).toHaveCount(14)
    await expect(rail.getByRole('link').first()).toHaveText('Opening')
    await rail.getByRole('link', { name: '9 Motion' }).click()
    await expect(page).toHaveURL(/#\/patterns\/copy\?section=s9$/)
    await expect(page.getByRole('heading', { level: 2, name: /^9 · / })).toBeFocused()
  })

  test('Copy, section 1: the answer follows the choice and is announced; every case as one table', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const picker = page.getByRole('group', { name: 'You have' })
    const answer = page.locator('.copy-cases__answer')
    await expect(answer).toHaveAttribute('aria-live', 'polite')
    await expect(answer).toContainText('Copyable Value, inside a CopyGroup when there are several')
    await picker.getByRole('radio', { name: 'Many rows, or a whole table' }).check()
    await expect(answer).toContainText('An export, not a copy')
    const all = page.getByRole('button', { name: 'See all 6 cases as one table' })
    await expect(all).toHaveAttribute('aria-expanded', 'false')
    await all.click()
    const table = page.getByRole('table', { name: 'When to offer copy: all 6 cases' })
    await expect(table.getByRole('row')).toHaveCount(7)
    await expect(table.getByRole('row', { name: /Many rows/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('Copy, section 2: the frame strip is a picker, and the chosen frame\'s words are announced', async ({ page }) => {
    await page.goto('/#/patterns/copy')
    const strip = page.locator('section[aria-labelledby="copy-s2"]').getByRole('group', { name: 'State', exact: true })
    await expect(strip.getByRole('button')).toHaveText(['Rest', 'Hover', 'Press', 'Copied', 'Away', 'Return', 'Marked', 'Failed'])
    await strip.getByRole('button', { name: 'Copied' }).click()
    await expect(strip.getByRole('button', { name: 'Copied' })).toHaveAttribute('aria-current', 'true')
    const now = page.locator('.copy-strip__now')
    await expect(now).toHaveAttribute('aria-live', 'polite')
    await expect(now).toContainText('Copied, only once the write has resolved.')
  })

  test('no word under 12px on a proposal or the Copy page', async ({ page }) => {
    for (const path of ['/#/proposals/evidence-locker', '/#/proposals/verdict-card', '/#/patterns/copy']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const small = await page.locator('main').evaluate((root) => {
        const out: string[] = []
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const el = n.parentElement
          if (!el || !n.textContent?.trim() || !el.checkVisibility()) continue
          if (parseFloat(getComputedStyle(el).fontSize) < 12) out.push(n.textContent.trim().slice(0, 40))
        }
        return out
      })
      expect(small, path).toEqual([])
    }
  })

  test('at 390 the rail is one button that says where you are', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of ['/#/proposals/evidence-locker', '/#/patterns/copy']) {
      await page.goto(path)
      const rail = page.getByRole('navigation', { name: 'On this page' })
      const toggle = rail.getByRole('button')
      await expect(toggle, path).toBeVisible()
      await expect(rail.getByRole('link').first(), path).toBeHidden()
      await toggle.click()
      await expect(rail.getByRole('link').first(), path).toBeVisible()
      expect(await noSidewaysScroll(page), path).toBe(true)
    }
  })
})

// Slice 5 of the playground uplift (1 Nov 2026): the doc pages. How it is made, told as four ideas
// that land as you reach them; Component status as one table with pictures and a key written once;
// Not found, which says what was asked for and names the closest parts by meaning; the project
// documents with no markdown leaks and a rail; and the footer in a reader's words.
test.describe('uplift slice 5 · doc pages', () => {
  const checks = JSON.parse(readFileSync(resolve(process.cwd(), 'demo/checks.json'), 'utf8'))
  /** Every word the main region shows outside code. */
  const words = (page: Page) => page.locator('main').evaluate((root) => {
    const out: string[] = []
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (!n.parentElement?.closest('code, pre')) out.push(n.textContent ?? '')
    return out.join('\n')
  })

  test('How it is made: four ideas in order, the numbers from the build, a rail, and the detail folded', async ({ page }) => {
    await page.goto('/#/how')
    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('How it is made')
    expect((await main.locator('.how-step h2').allTextContents())).toEqual(['A change is written once', 'It becomes five outputs', 'Each output is checked', 'Only then does it ship'])
    await expect(page.locator('.how-checks__number')).toHaveText(String(checks.total))
    await expect(main.getByText(`${checks.unit} unit tests`, { exact: false })).toBeVisible()
    await expect(main.getByText(`All ${checks.total} checks pass.`)).toBeVisible()
    // The five outputs, as a list a screen reader counts, inside a named figure.
    await expect(page.getByRole('figure', { name: 'The token file makes five outputs' }).getByRole('listitem')).toHaveCount(5)
    const rail = page.getByRole('navigation', { name: 'On this page' })
    await expect(rail.getByRole('link')).toHaveText(['1 Written once', '2 Five outputs', '3 Each one checked', '4 Then it ships', 'In detail'])
    await expect(page.getByRole('table', { name: 'Generated targets' })).toBeHidden()
    // With reduced motion (the suite's setting) nothing waits: every part is simply there.
    await expect(page.locator('[data-how]')).toHaveCount(0)
    expect(await words(page)).not.toMatch(/[—–]|\bCI\b|ESM/)
  })

  test('How it is made: each idea lands as you reach it, part by part, on the motion tokens, once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/#/how')
    const steps = page.locator('.how-step')
    await expect(steps.first()).toHaveAttribute('data-how', 'play')
    // The last idea is below the window: it waits, and its parts are not shown yet.
    await expect(steps.last()).toHaveAttribute('data-how', 'wait')
    await expect(steps.last().locator('.how-gate__card').first()).toHaveCSS('opacity', '0')
    await steps.nth(1).scrollIntoViewIfNeeded()
    await expect(steps.nth(1)).toHaveAttribute('data-how', 'play')
    const timing = await steps.nth(1).evaluate((el) => el.getAnimations({ subtree: true }).map((a) => {
      const t = a.effect!.getComputedTiming()
      return { duration: Number(t.duration), delay: Number(t.delay), iterations: t.iterations }
    }))
    // The file, the trunk, the spine, and a branch and a card for each of the five outputs.
    expect(timing.length).toBe(3 + 2 * 5)
    for (const t of timing) {
      // 120ms (a branch, a fast step) to 240ms (travel): never a loop, never longer than 300ms a part.
      expect(t.iterations).toBe(1)
      expect(t.duration).toBeGreaterThanOrEqual(120)
      expect(t.duration).toBeLessThanOrEqual(300)
    }
    const done = Math.max(...timing.map((t) => t.delay + t.duration))
    expect(done).toBeLessThanOrEqual(1100)
    // Played once: a step that has played never waits again.
    await page.mouse.wheel(0, -3000)
    await expect(steps.nth(1)).toHaveAttribute('data-how', 'play')
  })

  test('Component status: one table of every component, with pictures, and each promise written once', async ({ page }) => {
    await page.goto('/#/status')
    const table = page.getByRole('table', { name: /Every component, its label/ })
    // As many rows as the site's navigation lists components (a thumbnail's own table is not counted).
    const listed = await page.getByRole('navigation', { name: 'Site' }).locator('a[href^="#/components/"]').count()
    await expect(table.locator(':scope > tbody > tr')).toHaveCount(listed)
    await expect(page.locator('.status__lede')).toContainText(`${listed} components`)
    // Pictures are the real components, inert and hidden from assistive technology.
    const thumbs = table.locator('.status-table__thumb')
    await expect(thumbs.first()).toHaveAttribute('aria-hidden', 'true')
    expect(await thumbs.first().evaluate((el) => (el as HTMLElement).inert)).toBe(true)
    await expect(thumbs.first().locator('.vela-btn')).toHaveCount(1)
    // The promise is the column's key, once, never repeated per row.
    for (const promise of ['Semver applies in full: a breaking change waits for a major release.', 'May change in a minor release, without a deprecation window.'])
      await expect(page.getByText(promise)).toHaveCount(1)
    const text = await words(page)
    expect(text).not.toMatch(/GOVERNANCE\.md|scripts\/|\.figma\.js|[—–]/)
    await expect(table.getByRole('row', { name: /Text Area/ })).toContainText('Approved once the API has been reviewed.')
  })

  test('Not found: "firewall-rule" names no part by a word of a spec, flags the gap, and searches the words typed', async ({ page }) => {
    await page.goto('/#/components/firewall-rule')
    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('There is no component called “firewall-rule”')
    await expect(main.getByText('#/components/firewall-rule')).toBeVisible()
    await expect(main.getByText('Text Area')).toHaveCount(0)
    await expect(main.getByText('Toggle')).toHaveCount(0)
    await expect(main.getByRole('heading', { level: 2, name: 'Not in Vela' })).toBeVisible()
    await expect(main.getByText('Vela has no Firewall Rule')).toBeVisible()
    await expect(main.getByRole('link', { name: 'Ask for it on GitHub' })).toHaveAttribute('href', /issues\/new\?template=component-request\.yml/)
    await main.getByRole('button', { name: 'Search Vela for “firewall rule”' }).click()
    await expect(page.getByRole('dialog', { name: 'Search' }).getByRole('combobox')).toHaveValue('firewall rule')
    await page.keyboard.press('Escape')
    // Every proposal is listed on the Overview (slice 6): the card opens that section.
    await expect(main.getByRole('link', { name: /proposals/ })).toHaveAttribute('href', '#/?section=proposals')
    await expect(page).toHaveTitle('Not found · Vela Design System')
  })

  test('Not found: an address that names no page says so, a slip of spelling finds the part, and the skip link stays on the page', async ({ page }) => {
    await page.goto('/#/settings/billing')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('There is no page at “settings/billing”')
    await page.goto('/#/components/buton')
    await expect(page.getByRole('heading', { level: 2, name: 'Did you mean' })).toBeVisible()
    await expect(page.locator('.nf-card').first()).toHaveAttribute('href', '#/components/button')
    await page.goto('/#/how')
    await page.keyboard.press('Tab')
    await page.getByRole('link', { name: 'Skip to content' }).press('Enter')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How it is made')
  })

  test('project documents: no markdown mark reaches the page, long ones have a rail, the Roadmap leads with its phases', async ({ page }) => {
    for (const path of ['/#/changelog', '/#/roadmap', '/#/contributing', '/#/accessibility', '/#/foundations/filter-grammar']) {
      await page.goto(path)
      await expect(page.locator('.doc__body .pg-p').first(), path).toBeVisible()
      expect(await words(page), path).not.toMatch(/\*\*|\]\(|[—–]|\[\[|`|^\s*- /m)
      expect(await noSidewaysScroll(page), path).toBe(true)
    }
    await page.goto('/#/roadmap')
    const phases = page.getByRole('list', { name: 'The phases, in order' })
    await expect(phases.getByRole('link')).toHaveCount(7)
    await expect(phases.getByRole('listitem').first()).toContainText('In progress')
    await phases.getByRole('link', { name: /^Phase 2b/ }).click()
    await expect(page).toHaveURL(/#\/roadmap\?section=phase-2b/)
    await expect(page.getByRole('heading', { level: 2, name: /^Phase 2b/ })).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Phase 2b' })).toHaveAttribute('aria-current', 'location')
    await page.goto('/#/changelog')
    await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link').first()).toHaveText('Unreleased')
  })

  test('the footer is in a reader\'s words', async ({ page }) => {
    await page.goto('/#/status')
    await expect(page.locator('.demo-footer')).toHaveText('No runtime dependencies · Light and dark · Contrast checked to WCAG 2.1 AA on every change')
  })

  test('at 390 the doc pages fit, and How it is made reads top to bottom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of ['/#/how', '/#/status', '/#/components/firewall-rule', '/#/roadmap']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 }), path).toBeVisible()
      expect(await noSidewaysScroll(page), path).toBe(true)
    }
  })

  for (const path of ['/#/how', '/#/status', '/#/components/firewall-rule', '/#/roadmap', '/#/changelog'])
    for (const theme of ['Light', 'Dark'] as const)
      test(`axe: ${path} in ${theme.toLowerCase()}`, async ({ page }) => {
        const { default: AxeBuilder } = await import('@axe-core/playwright')
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await setTheme(page, theme)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
      })
})

// Slice 6 of the playground uplift (1 Nov 2026), the last: the Foundations pages as specimens, the
// Overview's cards and console, and the overlays. What the pages read from the token file and the
// specs is unit-tested in src/styles/site-foundations.test.tsx; here, what only a browser shows.
test.describe('uplift slice 6 · foundations, the Overview and the overlays', () => {
  /** A colour as the browser computes it, from a hex in the token file. */
  const rgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
  }

  test('Colour: each swatch is painted by its token in both themes, whatever the page theme is', async ({ page }) => {
    await page.goto('/#/foundations/color')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Colour')
    const swatch = page.locator('.fd-swatch', { has: page.locator('code', { hasText: /^--vela-bg-global$/ }) })
    const halves = () => swatch.locator('.fd-pair__half').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))
    const values = (await swatch.locator('.fd-values').innerText()).match(/#[0-9a-f]{6}/g)!
    expect(await halves()).toEqual(values.map(rgb))
    // The page's theme moves nothing in the specimen: each half is its own theme.
    await setTheme(page, 'Dark')
    expect(await halves()).toEqual(values.map(rgb))
    // The Status row says Degraded, never Medium.
    const status = page.getByRole('table', { name: /^Status/ })
    await expect(status.locator('.vela-status')).toHaveText(['Status unknown', 'Healthy', 'Warning', 'Degraded', 'Unhealthy'])
    // A copy mark is always in view, and is at least the smallest target.
    const mark = swatch.getByRole('button', { name: 'Copy --vela-bg-global' })
    await expect(mark).toBeVisible()
    const box = (await mark.boundingBox())!
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24)
  })

  test('a copy mark copies the whole token and says so', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/#/foundations/spacing')
    await page.getByRole('button', { name: 'Copy --vela-space-20' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveText('Copied --vela-space-20')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('--vela-space-20')
    // Each bar is the token's own length; the skipped 50 is drawn, and says it is not a token.
    expect(await page.locator('.fd-row', { has: page.locator('code', { hasText: /^--vela-space-20$/ }) }).locator('.fd-bar').evaluate((el) => el.getBoundingClientRect().width)).toBe(20)
    await expect(page.locator('.fd-row--skipped')).toContainText('no token')
  })

  test('Motion: a curve plays when asked, by transform only, and again from the start', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/#/foundations/motion')
    const row = page.locator('.fd-row', { has: page.locator('code', { hasText: /^--vela-ease-spring$/ }) })
    const mover = row.locator('.fd-run__mover')
    // At rest until asked.
    expect(await mover.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
    await expect(mover).toHaveCSS('transition-property', 'transform')
    await row.getByRole('button', { name: 'Play --vela-ease-spring' }).click()
    await expect(row.locator('.fd-run')).toHaveClass(/is-end/)
    // It ends one track's length along: its own width, as translateX(100%) says.
    const width = await mover.evaluate((el) => el.getBoundingClientRect().width)
    expect(width).toBeGreaterThan(50)
    await expect.poll(() => mover.evaluate((el) => Math.round(new DOMMatrix(getComputedStyle(el).transform).m41))).toBe(Math.round(width))
    // Played over duration-travel on the spring itself.
    expect(await mover.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.24s')
    // Again: back to the start at once, then across.
    await row.getByRole('button', { name: 'Play --vela-ease-spring' }).click()
    await expect(row.locator('.fd-run')).toHaveClass(/is-end/)
  })

  test('the Overview opens the three scales on Colour, at their section, focused', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('main').getByRole('link', { name: /^Severity 6, status 5, risk 3/ }).click()
    await expect(page).toHaveURL(/#\/foundations\/color\?section=taxonomies$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Severity, status and risk' })).toBeFocused()
  })

  test("Not found's proposals card opens the Overview's proposals, focused", async ({ page }) => {
    await page.goto('/#/components/firewall-rule')
    const card = page.getByRole('main').getByRole('link', { name: /^Specified, not built yet 9 proposals/ })
    await expect(card).toHaveAttribute('href', '#/?section=proposals')
    await card.click()
    await expect(page.getByRole('heading', { level: 2, name: 'Specified, not built yet' })).toBeFocused()
    await expect(page.locator('.ov-proposals > li')).toHaveCount(9)
  })

  test('every Overview card has hover, focus and pressed states, and nothing moves', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('.ov-ways .shell-card').first()
    const edge = () => card.evaluate((el) => getComputedStyle(el).borderTopColor)
    // Where it sits on the page, whatever the scroll.
    const place = () => card.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height].map(Math.round) })
    const at = await place()
    const rest = await edge()
    await card.hover()
    await expect.poll(edge).not.toBe(rest)
    await expect(card.locator('.shell-card__title')).toHaveCSS('text-decoration-line', 'underline')
    await page.mouse.down()
    const pressed = await edge()
    const pressedAt = await place()
    // Off the card before letting go, so the press is not a click.
    await page.mouse.move(0, 0)
    await page.mouse.up()
    expect(pressed).not.toBe(rest)
    expect(pressedAt).toEqual(at)
    await page.goto('/')
    await page.locator('.ov-ways .shell-card').first().focus()
    await expect(page.locator('.ov-ways .shell-card').first()).toHaveCSS('outline-style', 'solid')
  })

  test("Search marks each result's kind by a glyph and a word, and titles a rule in plain words", async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Search' })
    const combo = dialog.getByRole('combobox')
    const first = dialog.getByRole('option').first()
    await combo.fill('dialog')
    await expect(first.locator('.shell-search__kind')).toHaveText('Component')
    await expect(first.locator('.shell-search__kind svg')).toHaveCount(1)
    await combo.fill('evidence')
    await expect(first.locator('.shell-search__kind')).toHaveText('Proposal')
    // The kind is not said twice: no Proposal tag beside the title.
    await expect(first.locator('.site-tag')).toHaveCount(0)
    await combo.fill('filter grammar')
    await expect(first.locator('.shell-search__kind')).toHaveText('Contract')
    await combo.fill('toggle-label-required')
    await expect(first.locator('.shell-search__kind')).toHaveText('Rule')
    await expect(first.locator('.shell-search__title')).toHaveText('Label required')
    await expect(first.locator('.shell-search__id')).toHaveText('toggle-label-required')
    // Each kind has its own glyph, so the kind is never told by colour alone.
    const glyphs = new Set<string>()
    for (const q of ['dialog', 'evidence', 'filter grammar', 'toggle-label-required', 'combobox']) {
      await combo.fill(q)
      const kind = dialog.locator('.shell-search__kind').first()
      glyphs.add(`${await kind.innerText()}:${await kind.locator('svg').innerHTML()}`)
    }
    expect(new Set([...glyphs].map((g) => g.split(':').slice(1).join(':'))).size).toBe(5)
  })

  test("Appearance shows each mode before it is chosen, painted by that theme's tokens", async ({ page }) => {
    await page.goto('/#/components/button')
    await page.getByRole('button', { name: /^Appearance/ }).click()
    const mode = page.getByRole('region', { name: 'Appearance' }).getByRole('group', { name: 'Mode' })
    // Named by the word; the picture is decorative.
    for (const name of ['System', 'Light', 'Dark']) {
      const button = mode.getByRole('button', { name, exact: true })
      await expect(button).toBeVisible()
      await expect(button.locator('.shell-segment__picture')).toHaveAttribute('aria-hidden', 'true')
    }
    const page_ = (name: string) => mode.getByRole('button', { name, exact: true }).locator('.shell-preview__page')
    const fill = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor)
    const light = await fill(page_('Light'))
    const dark = await fill(page_('Dark'))
    expect(light).not.toBe(dark)
    // System is both, split.
    expect(await page_('System').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))).toEqual([light, dark])
    await expect(page.getByRole('region', { name: 'Appearance' })).toContainText(/System follows your screen\. It is (light|dark) now\./)
    // Choosing one marks it, and the previews do not change with the page.
    await mode.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(mode.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-current', 'true')
    expect(await fill(page_('Light'))).toBe(light)
    await expect(page.getByRole('region', { name: 'Appearance' })).not.toContainText('System follows your screen')
  })

  test('at 390 the Overview and the Foundations pages never scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of ['/', '/#/foundations/color', '/#/foundations/typography', '/#/foundations/spacing', '/#/foundations/sizing', '/#/foundations/radius', '/#/foundations/motion']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 }), path).toBeVisible()
      expect(await noSidewaysScroll(page), path).toBe(true)
    }
  })
})
