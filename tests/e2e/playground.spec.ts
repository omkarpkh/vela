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
  for (const name of ['Button', 'Toggle', 'Input', 'Contextual Alert', 'Status Indicator', 'Risk Pill', 'Tabs', 'Icon', 'Checkbox', 'Radio Group', 'Table']) {
    await nav.getByRole('link', { name, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(page.getByRole('tab', { name: /^Tokens/ })).not.toHaveText(/Tokens\s*0$/)
  }
})

// Two entry points, one playground (decisions/002): the Tabs page renders the same props through
// the core or the headless (Base UI) implementation, and the Code tab's import line and
// "Dependencies" line follow the choice. Both implementations must behave the same on the stage.
test('the Tabs page switches implementation, and the import and Dependencies lines follow', async ({ page }) => {
  await page.goto('/#/components/tabs')
  await expect(page.getByRole('heading', { level: 1, name: 'Tabs' })).toBeVisible()
  const contract = page.getByRole('region', { name: 'Contract' })
  await expect(contract.locator('.pg-install')).toContainText("import { Tabs } from '@omkarux/vela'")
  await expect(contract.locator('.pg-dependencies')).toHaveText('Dependencies: none')

  await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
  await expect(contract.locator('.pg-install')).toContainText("import { Tabs } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-dependencies')).toHaveText('Dependencies: @base-ui/react (optional peer, via /headless)')

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
// the import line names `/headless` and the Dependencies line is the spec's. On the stage the
// Base UI markup must hit the stylesheet: the fill keys on aria-checked, disabled on :disabled.
test('the Checkbox page renders the headless Checkbox: Space toggles, the fill follows aria-checked', async ({ page }) => {
  await page.goto('/#/components/checkbox')
  await expect(page.getByRole('heading', { level: 1, name: 'Checkbox' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Implementation' })).toHaveCount(0)
  const contract = page.getByRole('region', { name: 'Contract' })
  await expect(contract.locator('.pg-install')).toContainText("import { Checkbox } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-dependencies')).toHaveText('Dependencies: @base-ui/react (optional peer, via /headless)')

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
  const contract = page.getByRole('region', { name: 'Contract' })
  await expect(contract.locator('.pg-install')).toContainText("import { RadioGroup } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-dependencies')).toHaveText('Dependencies: @base-ui/react (optional peer, via /headless)')

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
