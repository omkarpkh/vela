import { test, expect, type Page, type Locator } from '@playwright/test'

// Identifiers break only before their separators (DESIGN.md, "Identifiers"; table.md). Browsers
// break after a hyphen or a slash, which left the Overview's console reading "vpn-edge-" / "east"
// on a phone: one name read as two. These checks read the lines the browser actually drew, one
// character at a time, so they fail on the bug itself, not on the markup that prevents it.

const SEPARATOR = /[._/-]$/

/** The rendered lines of every element the locator matches: each character's box, grouped by its top. */
async function linesOf(cells: Locator) {
  return cells.evaluateAll((els) =>
    els.map((el) => {
      const chars: { c: string; top: number }[] = []
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
        for (let i = 0; i < n.length; i++) {
          const r = document.createRange()
          r.setStart(n, i)
          r.setEnd(n, i + 1)
          const box = r.getClientRects()[0]
          if (box) chars.push({ c: n.data[i], top: Math.round(box.top) })
        }
      }
      const lines: string[] = []
      let last: number | null = null
      for (const { c, top } of chars) {
        if (top !== last) { lines.push(''); last = top }
        lines[lines.length - 1] += c
      }
      return { text: el.textContent ?? '', lines }
    }),
  )
}

/** Fails on any identifier line that ends with a separator, or any name whose lines are not exactly its text. */
async function expectBreaksOnlyBeforeSeparators(cells: Locator, where: string) {
  const all = await linesOf(cells)
  expect(all.length, `${where}: identifier cells`).toBeGreaterThan(0)
  for (const { text, lines } of all) {
    expect(lines.join(''), `${where}: ${text}`).toBe(text)
    for (const line of lines.slice(0, -1)) expect(line, `${where}: "${text}" drawn as ${JSON.stringify(lines)}`).not.toMatch(SEPARATOR)
  }
  return all
}

/** The stage's light frame on the Table page, narrowed to a host of `width` px as a grid track. */
async function tableStage(page: Page, width?: number) {
  await page.goto('/#/components/table')
  const body = page.locator('.pg-frame[data-theme="light"] .pg-frame-body')
  await expect(body.getByRole('table', { name: 'Assets' })).toBeVisible()
  if (width) {
    await body.evaluate((el: HTMLElement, w) => {
      el.style.display = 'grid'
      el.style.gridTemplateColumns = '1fr'
      el.style.width = `${w}px`
      el.style.maxWidth = `${w}px`
    }, width)
  }
  return body
}

/** Chooses layout="fixed" on the Table page, from the keyboard as the playground tests do. */
async function fixedLayout(page: Page) {
  const controls = page.getByRole('complementary', { name: 'Controls' })
  const group = controls.getByRole('group', { name: 'layout', exact: true })
  if (await group.count()) { await group.getByRole('button', { name: 'fixed', exact: true }).focus(); await page.keyboard.press('Enter') }
  else await controls.getByLabel('layout', { exact: true }).selectOption('fixed')
}

test.describe('identifiers', () => {
  // [[rule: table-identifier-breaks-before-separators]]
  test('on the Overview a name never ends a line with a separator: in the console, and in the one asset a phone shows', async ({ page }) => {
    // Where the console's plate cannot hold its table at the floor, the hero shows its first asset
    // instead (slice 7 fixes, PR D); wherever the table shows, it keeps the floor and fits whole.
    for (const [width, view] of [[320, 'asset'], [360, 'asset'], [390, 'asset'], [430, 'asset'], [768, 'console'], [1440, 'console']] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      if (view === 'asset') {
        await expect(page.locator('.ov-asset')).toBeVisible()
        await expect(page.locator('.ov-console__screen')).toBeHidden()
        await expectBreaksOnlyBeforeSeparators(page.locator('.ov-asset__name'), `${width}px`)
        continue
      }
      const cells = page.locator('.ov-console .vela-table__cell--identifier')
      await expect(cells).toHaveCount(3)
      await expectBreaksOnlyBeforeSeparators(cells, `${width}px`)
      for (const w of await cells.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))) expect(w).toBeGreaterThanOrEqual(160 - 0.5)
      // The console is a picture and cannot scroll: the whole table fits its frame, Risk included.
      const fit = await page.locator('.ov-console .vela-table__region').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
      expect(fit.scroll, `${width}px: the console's table fits its frame`).toBeLessThanOrEqual(fit.client)
    }
    // The one asset's name goes through the same helper: in a frame too narrow for it whole, it
    // breaks before a separator ("vpn-edge" / "-east"), never after one.
    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto('/')
    const name = page.locator('.ov-asset__name')
    await expect(name).toBeVisible()
    await name.evaluate((el: HTMLElement) => { el.style.width = '80px' })
    const [drawn] = await expectBreaksOnlyBeforeSeparators(name, 'an 80px frame')
    expect(drawn.lines.length).toBeGreaterThan(1)
  })

  // [[rule: table-identifier-breaks-before-separators]]
  test('on the Table page names break only before a separator, in auto and fixed layout and in a host too narrow for a segment', async ({ page }) => {
    for (const layout of ['auto', 'fixed'] as const) {
      for (const width of [undefined, 360, 200]) {
        const body = await tableStage(page, width)
        if (layout === 'fixed') {
          await fixedLayout(page)
          await expect(body.locator('.vela-table')).toHaveClass(/vela-table--fixed/)
        }
        await expectBreaksOnlyBeforeSeparators(body.locator('.vela-table__cell--identifier'), `${layout} ${width ?? 'stage'}px`)
      }
    }
    // A segment wider than its whole column breaks inside itself and is never cut: with the floor
    // token set to 60px on this stage, the column is 60px and "-primary" has no room, yet the text is
    // still all there. The token is lowered rather than the header's width overridden, so the header
    // and the cells' own minimum agree (on CI an override of the header alone lost to the cells'
    // 160px minimum). It goes in before the table turns fixed: Chromium keeps a fixed table's column
    // widths when a header cell's width changes afterwards.
    const body = await tableStage(page)
    await body.evaluate((el: HTMLElement) => el.style.setProperty('--vela-identifier-width-min', '60px'))
    await fixedLayout(page)
    await expect(body.locator('.vela-table')).toHaveClass(/vela-table--fixed/)
    expect(await body.locator('.pg-table-identifier-col').evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(60)
    const cell = body.getByRole('rowheader', { name: 'db-primary-eu-west-1' })
    const [drawn] = await expectBreaksOnlyBeforeSeparators(cell, 'a 60px column')
    expect(drawn.lines.length).toBeGreaterThan(2)
    const clipped = await cell.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
    expect(clipped).toBe(false)
  })

  // [[rule: table-identifier-text-is-the-value]]
  test('selecting and copying a name gives exactly the name, wherever it broke', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const body = await tableStage(page, 200)
    const cell = body.getByRole('rowheader', { name: 'db-primary-eu-west-1' })
    const [drawn] = await linesOf(cell)
    expect(drawn.lines.length, 'the name wraps in this host').toBeGreaterThan(1)
    const selected = await cell.evaluate((el) => {
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      return sel.toString()
    })
    expect(selected).toBe('db-primary-eu-west-1')
    await page.keyboard.press('ControlOrMeta+C')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('db-primary-eu-west-1')
  })

  // [[rule: table-identifier-column-floor]]
  test('a name column never gets narrower than the floor token: the region scrolls instead, and the page does not', async ({ page }) => {
    const body = await tableStage(page, 360)
    const floor = await body.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--vela-identifier-width-min')))
    expect(floor).toBe(160)
    const widths = await body.locator('.vela-table__cell--identifier').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))
    expect(widths.length).toBe(7)
    for (const w of widths) expect(w).toBeGreaterThanOrEqual(floor - 0.5)
    const sizes = await body.evaluate((el: HTMLElement) => {
      const region = el.querySelector('[role="region"]') as HTMLElement
      return { host: el.scrollWidth, hostClient: el.clientWidth, region: region.scrollWidth, regionClient: region.clientWidth }
    })
    expect(sizes.region).toBeGreaterThan(sizes.regionClient)
    expect(sizes.host).toBeLessThanOrEqual(sizes.hostClient + 1)
    // Fixed layout takes its widths from the header row: the host binds the same token there, and
    // the column keeps it however narrow the host is.
    await fixedLayout(page)
    await expect(body.locator('.vela-table')).toHaveClass(/vela-table--fixed/)
    const fixed = await body.locator('.pg-table-identifier-col').evaluate((el) => el.getBoundingClientRect().width)
    expect(fixed).toBeGreaterThanOrEqual(floor - 0.5)
  })
})
