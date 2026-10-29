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
  for (const name of ['Button', 'Toggle', 'Input', 'Text Area', 'Contextual Alert', 'Status Indicator', 'Risk Pill', 'Tabs', 'Icon', 'Checkbox', 'Radio Group', 'Table', 'Popover', 'Tooltip', 'Dialog', 'Toast']) {
    await nav.getByRole('link', { name, exact: true }).click()
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
// The Tabs stage at phone width: the frame used to centre a body that hugs its content, so a
// panel with shorter text moved the whole tab list. And the list scrolls sideways only: the
// underline's 1px past the padding box must not become a vertical scroll range, which a touch
// browser shows as a stray scrollbar at the list's end.
test('on the Tabs page the tab list stays put when the panel changes, and never scrolls vertically', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 900 })
  for (const impl of ['core', 'headless'] as const) {
    await page.goto('/#/components/tabs')
    if (impl === 'headless') await page.getByRole('group', { name: 'Implementation' }).getByRole('button', { name: 'headless' }).click()
    const frame = page.locator('.pg-frame[data-theme="light"]')
    const list = frame.getByRole('tablist')
    await expect(list).toBeVisible()
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
  const contract = page.getByRole('region', { name: 'Contract' })
  await expect(contract.locator('.pg-install')).toContainText("import { Popover } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-dependencies')).toHaveText('Dependencies: @base-ui/react (optional peer, via /headless)')

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
  const contract = page.getByRole('region', { name: 'Contract' })
  await expect(contract.locator('.pg-install')).toContainText("import { Tooltip } from '@omkarux/vela/headless'")

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
  const contract = page.getByRole('region', { name: 'Contract' })
  await expect(contract.locator('.pg-install')).toContainText("import { Dialog } from '@omkarux/vela/headless'")

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
  const contract = page.getByRole('region', { name: 'Contract' })
  await expect(contract.locator('.pg-install')).toContainText("import { ToastProvider, useToast } from '@omkarux/vela/headless'")
  await expect(contract.locator('.pg-dependencies')).toHaveText('Dependencies: @base-ui/react (optional peer, via /headless)')

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

// The Tabs selected indicator (tabs.md, Motion), on the Motion review page, in both
// implementations. jsdom has no layout and no Web Animations, so all four proofs live here.
// The page's own "×5 slow motion" switch widens the window in which a flight can be inspected;
// it changes only the playback rate of running animations, never the CSS under test.
test.describe('the Tabs indicator', () => {
  type Probe = {
    moving: boolean; instant: boolean; opacity: string; transitionProperty: string
    left: string; width: string; listWidth: number; x: number; scale: number
    animations: { property: string; rate: number }[]
    elsewhere: string[]
  }
  // What the bar is doing right now: its computed geometry, its transform as numbers, and every
  // animation on it and anywhere else in the Tabs subtree.
  const probe = (impl: string) => async (page: import('@playwright/test').Page) =>
    page.locator(`.motion-frame[data-theme="light"] [data-implementation="${impl}"] .vela-tabs`).evaluate((root): Probe => {
      const list = root.querySelector<HTMLElement>('.vela-tabs__list')!
      const bar = root.querySelector<HTMLElement>('.vela-tabs__indicator')!
      const cs = getComputedStyle(bar)
      const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform)
      const prop = (a: Animation) => (a as CSSTransition).transitionProperty ?? (a as CSSAnimation).animationName ?? '?'
      return {
        moving: list.hasAttribute('data-vela-moving'),
        instant: root.hasAttribute('data-vela-instant'),
        opacity: cs.opacity,
        transitionProperty: cs.transitionProperty,
        left: cs.left,
        width: cs.width,
        listWidth: list.clientWidth,
        x: m.e,
        scale: m.a,
        animations: bar.getAnimations().map((a) => ({ property: prop(a), rate: a.playbackRate })),
        elsewhere: root.getAnimations({ subtree: true }).filter((a) => (a.effect as KeyframeEffect).target !== bar).map(prop),
      }
    })
  // Where the bar belongs under a tab: its left edge in the list's coordinates, its width as a
  // fraction of the list's.
  const target = (impl: string, name: string) => async (page: import('@playwright/test').Page) =>
    page.locator(`.motion-frame[data-theme="light"] [data-implementation="${impl}"] .vela-tabs__list`).evaluate((list: HTMLElement, name) => {
      const tab = [...list.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.startsWith(name))!
      const l = list.getBoundingClientRect(), t = tab.getBoundingClientRect()
      return { x: t.left - l.left + list.scrollLeft, scale: t.width / list.clientWidth }
    }, name)
  const tab = (page: import('@playwright/test').Page, impl: string, name: string) =>
    page.locator('.motion-frame[data-theme="light"]').getByRole('tablist', { name: `Views (${impl})` }).getByRole('tab', { name: new RegExp(`^${name}`) })
  const slowMotion = (page: import('@playwright/test').Page) => page.getByRole('switch', { name: '×5 slow motion' }).click()

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

        // [[rule: tabs-indicator-moves-by-transform]]
        test('a pointer switch slides the bar by transform alone, on the spring, while left and width stay put', async ({ page }) => {
          await slowMotion(page)
          const before = await probe(impl)(page)
          expect(before.moving).toBe(false)
          expect(before.opacity).toBe('0')
          await tab(page, impl, 'Audit log').click()
          const a = await probe(impl)(page)
          expect(a.moving).toBe(true)
          expect(a.opacity).toBe('1')
          expect(a.transitionProperty).toBe('transform')
          // One animation on the bar, a transform transition…
          expect(a.animations.map((x) => x.property)).toEqual(['transform'])
          // …slowed by the review switch, whose frame loop reaches a new transition on its next frame.
          await expect.poll(async () => (await probe(impl)(page)).animations).toEqual([{ property: 'transform', rate: 0.2 }])
          // Nothing in the Tabs animates geometry: only the triggers' colour may be settling.
          expect(a.elsewhere.every((p) => p === 'color')).toBe(true)
          await page.waitForTimeout(150)
          const b = await probe(impl)(page)
          expect(b.moving).toBe(true)
          // Layout never moves: the bar is the list's full width at its left edge throughout.
          for (const p of [before, a, b]) {
            expect(p.left).toBe('0px')
            expect(Math.abs(parseFloat(p.width) - p.listWidth)).toBeLessThan(1)   // clientWidth is rounded
          }
          // …while the transform travels towards the pressed tab.
          const end = await target(impl, 'Audit log')(page)
          expect(Math.abs(b.x - end.x)).toBeLessThan(Math.abs(before.x - end.x))
          await expect.poll(async () => (await probe(impl)(page)).moving, { timeout: 5000 }).toBe(false)
        })

        // [[rule: tabs-indicator-retargets]]
        test('a second press mid-flight turns the bar from where it is and it ends under the second tab', async ({ page }) => {
          await slowMotion(page)
          await tab(page, impl, 'Audit log').click()
          await page.waitForTimeout(250)
          const mid = await probe(impl)(page)
          expect(mid.moving).toBe(true)
          await tab(page, impl, 'Assets').click()
          const turned = await probe(impl)(page)
          const assets = await target(impl, 'Assets')(page)
          // Retargeted, not restarted or snapped: still in flight, one transform transition, and
          // not yet under Assets.
          expect(turned.moving).toBe(true)
          expect(turned.animations.map((x) => x.property)).toEqual(['transform'])
          expect(Math.abs(turned.x - assets.x)).toBeGreaterThan(2)
          await expect.poll(async () => (await probe(impl)(page)).moving, { timeout: 5000 }).toBe(false)
          const rest = await probe(impl)(page)
          expect(rest.x).toBeCloseTo(assets.x, 0)
          expect(rest.scale).toBeCloseTo(assets.scale, 3)
          await expect(tab(page, impl, 'Assets')).toHaveAttribute('aria-selected', 'true')
          expect(await tab(page, impl, 'Assets').evaluate((el) => getComputedStyle(el).borderBottomColor)).not.toBe('rgba(0, 0, 0, 0)')
        })

        // [[rule: tabs-keyboard-switch-is-instant]]
        test('a keyboard switch moves the underline at once: nothing in the Tabs animates', async ({ page }) => {
          await tab(page, impl, 'Alerts').focus()
          await page.keyboard.press('ArrowRight')
          const p = await probe(impl)(page)
          expect(p.moving).toBe(false)
          expect(p.instant).toBe(true)
          expect(p.animations).toEqual([])
          expect(p.elsewhere).toEqual([])
          await expect(tab(page, impl, 'Assets')).toHaveAttribute('aria-selected', 'true')
          expect(await tab(page, impl, 'Assets').evaluate((el) => getComputedStyle(el).borderBottomColor)).not.toBe('rgba(0, 0, 0, 0)')
          expect(await tab(page, impl, 'Alerts').evaluate((el) => getComputedStyle(el).borderBottomColor)).toBe('rgba(0, 0, 0, 0)')
        })
      })

      // The project default: reducedMotion 'reduce'.
      // [[rule: tabs-indicator-reduced-motion-end-state]]
      // [[rule: tabs-indicator-rest-is-the-border]]
      test('under reduced motion a pointer switch lands at its end state, and at rest the underline is the tab\'s own border', async ({ page }) => {
        await tab(page, impl, 'Audit log').click()
        // The reduced-motion collapse gives every property change a 0.01ms transition, the bar's
        // hand-back to the border included, so "at rest" is polled for rather than read once.
        await expect.poll(async () => { const p = await probe(impl)(page); return [p.moving, p.opacity] }, { timeout: 2000 }).toEqual([false, '0'])
        const rest = await probe(impl)(page)
        const end = await target(impl, 'Audit log')(page)
        // The bar has gone to the tab and is invisible; the tab's border is the underline, in the
        // bar's colour (--vela-border-active), and no other tab has one.
        expect(rest.opacity).toBe('0')
        expect(rest.x).toBeCloseTo(end.x, 0)
        expect(rest.scale).toBeCloseTo(end.scale, 3)
        const barColour = await page.locator(`.motion-frame[data-theme="light"] [data-implementation="${impl}"] .vela-tabs__indicator`).evaluate((el) => getComputedStyle(el).backgroundColor)
        for (const name of ['Alerts', 'Assets', 'Identities', 'Audit log']) {
          const colour = await tab(page, impl, name).evaluate((el) => getComputedStyle(el).borderBottomColor)
          expect(colour, name).toBe(name === 'Audit log' ? barColour : 'rgba(0, 0, 0, 0)')
        }
      })
    })
  }

  test('the Motion review page lists every motion token with its value and reason, in light and dark', async ({ page }) => {
    await page.goto('/#/motion')
    const rows = page.locator('.motion-tokens tbody tr')
    await expect(rows).toHaveCount(10)
    await expect(page.locator('.motion-tokens tr[data-token="ease-spring"] td').first()).toContainText('stiffness 1200, damping 56, mass 1')
    await expect(page.locator('.motion-tokens tr[data-token="ease-out"] td').first()).toHaveText('cubic-bezier(0.25, 1, 0.5, 1)')
    await expect(page.locator('.motion-frame[data-theme="dark"] .vela-tabs__list')).toHaveCount(2)
    // The dark frame re-points the underline colour: the two frames' active borders differ.
    const active = (m: string) => page.locator(`.motion-frame[data-theme="${m}"] [data-implementation="core"] [role="tab"][aria-selected="true"]`).evaluate((el) => getComputedStyle(el).borderBottomColor)
    expect(await active('light')).not.toBe(await active('dark'))
    await expect(page.getByText('review aid', { exact: false })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------------------------
// The motion pass, part 2 (toast.md, popover.md, tooltip.md, dialog.md, checkbox.md,
// radio-group.md, toggle.md — each spec's Motion section). Every animated part is proved four
// ways: it animates only transform and opacity (the stack also uses the `translate` and `scale`
// properties, which are transform); under reduced motion it reads correctly at its end state; a
// second trigger mid-flight ends in the right state; a keyboard change does not animate. jsdom has
// no layout and no Web Animations, so all of it lives here, on the Motion review page.
// ---------------------------------------------------------------------------------------------
type Page = import('@playwright/test').Page
type Locator = import('@playwright/test').Locator
type Anim = { kind: string; property: string }
const MOVING = new Set(['transform', 'translate', 'scale', 'opacity'])
const COLOUR = /^(color|background-color|border-color|border-(top|right|bottom|left)-color|outline-color)$/

// Every animation on an element (and, with subtree, under it): whether it is a CSS transition or a
// keyframe animation, and what it animates.
const animationsOf = (loc: Locator, subtree = false) =>
  loc.evaluate((el, subtree) => el.getAnimations({ subtree }).map((a) => ({
    kind: a.constructor.name,
    property: (a as CSSTransition).transitionProperty ?? (a as CSSAnimation).animationName ?? '?',
  })), subtree)
// The animations once they have started. Base UI mounts an entering part with
// data-starting-style and removes it on the next frame, so in the frame it mounts nothing is
// running yet; wait for the transition rather than sample that frame.
const started = async (loc: Locator, subtree = false) => {
  await expect.poll(async () => (await animationsOf(loc, subtree)).length).toBeGreaterThan(0)
  return animationsOf(loc, subtree)
}
const onlyMoves = (anims: Anim[]) => anims.every((a) => a.kind === 'CSSTransition' && (MOVING.has(a.property) || COLOUR.test(a.property)))
const scaleOf = (loc: Locator) => loc.evaluate((el) => {
  const t = getComputedStyle(el).transform
  return t === 'none' ? 1 : new DOMMatrix(t).a
})
const openMotion = async (page: Page) => {
  await page.goto('/#/motion')
  await expect(page.getByRole('heading', { level: 1, name: 'Motion review' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}
const slowMotion = async (page: Page) => {
  await page.getByRole('switch', { name: '×5 slow motion' }).click()
  await page.mouse.move(0, 0)
}
const frameIn = (page: Page, section: string, theme: 'light' | 'dark' = 'light') =>
  page.locator(`section[aria-labelledby="${section}"] .motion-frame[data-theme="${theme}"]`)

test.describe('the motion pass, part 2', () => {
  // ------------------------------------------------------------------------------------- Toast
  test.describe('Toast', () => {
    const region = (page: Page) => page.locator('.vela-overlay-portal[data-theme="light"]').getByRole('region', { name: 'Notifications' })
    const toastNamed = (page: Page, title: string) => region(page).getByRole('dialog', { name: title })
    const raise = (page: Page, severity: 'Success' | 'Info' | 'Warning') =>
      page.getByRole('group', { name: 'Raise a toast (light)' }).getByRole('button', { name: `Raise ${severity}` }).click()
    const TITLE = { Success: 'Policy saved', Info: 'Export started', Warning: 'Policy saved with 2 tenants skipped' }
    // Each toast's box, height, stack variables and running animations, newest first.
    const stack = (page: Page) => region(page).evaluate((r) => [...r.querySelectorAll<HTMLElement>('.vela-toast')]
      .filter((el) => !el.hasAttribute('data-ending-style'))
      .map((el) => {
        const b = el.getBoundingClientRect(), cs = getComputedStyle(el)
        return {
          title: el.querySelector('.vela-toast__title')?.textContent ?? '',
          top: b.top, bottom: b.bottom, height: el.offsetHeight,
          scale: cs.scale === 'none' ? 1 : Number(cs.scale),
          transform: cs.transform, opacity: cs.opacity,
          animations: el.getAnimations().length,
        }
      }))
    const settled = async (page: Page) => {
      await expect.poll(async () => (await stack(page)).every((t) => t.animations === 0 && t.opacity === '1' && t.transform === 'none'), { timeout: 5000 }).toBe(true)
      return stack(page)
    }
    const vh = (page: Page) => page.viewportSize()!.height

    test.describe('with motion', () => {
      test.use({ reducedMotion: 'no-preference' })

      // [[rule: toast-enters-from-its-edge]]
      test('a toast enters from the edge it sits on, by transform and opacity alone, on transitions', async ({ page }) => {
        await openMotion(page)
        await slowMotion(page)
        await raise(page, 'Success')
        const toast = toastNamed(page, TITLE.Success)
        await expect(toast).toBeVisible()
        // In flight: below its place (it rises from the bottom edge), partly transparent, and only
        // opacity and transform are moving — as transitions, never keyframes.
        const a = await started(toast)
        expect(a.map((x) => x.property)).toEqual(expect.arrayContaining(['opacity', 'transform']))
        expect(onlyMoves(a)).toBe(true)
        expect(await toast.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).f)).toBeGreaterThan(0)
        expect(onlyMoves(await animationsOf(region(page), true))).toBe(true)
        // A second toast: the first steps back on `translate` and `scale`, the new one enters on
        // `transform` and `opacity`. Nothing else in the region moves.
        await raise(page, 'Info')
        await expect(toastNamed(page, TITLE.Info)).toBeVisible()
        await started(toastNamed(page, TITLE.Info))
        const all = await animationsOf(region(page), true)
        expect(onlyMoves(all)).toBe(true)
        expect(all.map((x) => x.property)).toEqual(expect.arrayContaining(['translate', 'scale', 'transform', 'opacity']))
        await settled(page)
      })

      // [[rule: toast-stack-reflows-mid-flight]]
      test('a toast raised while another is still entering re-flows the stack from where it is and ends in place', async ({ page }) => {
        await openMotion(page)
        await slowMotion(page)
        await raise(page, 'Success')
        await page.waitForTimeout(300)   // the first is a third of the way in, slowed five times
        const mid = (await stack(page))[0]
        expect(mid.animations).toBeGreaterThan(0)
        await raise(page, 'Info')
        // Still transitions (they retarget); no keyframe restarted anything.
        expect(onlyMoves(await animationsOf(region(page), true))).toBe(true)
        const [front, back] = await settled(page)
        expect(front.title).toBe(TITLE.Info)
        expect(back.title).toBe(TITLE.Success)
        expect(front.bottom).toBeCloseTo(vh(page) - 20, 0)
        expect(back.scale).toBeCloseTo(0.95, 3)
        expect(back.top).toBeCloseTo(vh(page) - 20 - back.height - 10, 0)
      })

      // [[rule: toast-keyboard-dismiss-is-instant]]
      test('from the keyboard nothing in the stack animates: F6 spreads it at once, Escape dismisses at once', async ({ page }) => {
        await openMotion(page)
        await raise(page, 'Success')
        await raise(page, 'Info')
        await page.mouse.move(0, 0)
        await settled(page)
        const quiet = () => region(page).evaluate((el) => ({
          instant: el.hasAttribute('data-vela-instant'),
          animations: el.getAnimations({ subtree: true }).filter((a) => ((a.effect as KeyframeEffect).target as Element)?.classList.contains('vela-toast')).length,
        }))
        // F6: the region takes focus and spreads, with no transition.
        await page.keyboard.press('F6')
        await expect(region(page)).toHaveAttribute('data-expanded', '')
        expect(await quiet()).toEqual({ instant: true, animations: 0 })
        const [front, back] = await stack(page)
        expect(back.scale).toBe(1)
        expect(back.bottom).toBeCloseTo(front.top - 10, 0)
        // Escape on the focused toast: it goes at once, and the one behind takes its place at once.
        await page.keyboard.press('Tab')
        const first = toastNamed(page, TITLE.Info)
        await expect.poll(() => first.evaluate((el) => el.contains(document.activeElement))).toBe(true)
        await page.keyboard.press('Escape')
        expect(await quiet()).toEqual({ instant: true, animations: 0 })
        await expect(first).toHaveCount(0, { timeout: 500 })
        const [left] = await stack(page)
        expect(left.title).toBe(TITLE.Success)
        expect(left.animations).toBe(0)
        expect(left.bottom).toBeCloseTo(vh(page) - 20, 0)
      })

      // [[rule: toast-swipe-follows-the-pointer]]
      test('a toast swiped towards its edge follows the pointer, then carries on out and leaves', async ({ page }) => {
        await openMotion(page)
        await slowMotion(page)
        await raise(page, 'Success')
        const [{ top, height }] = await settled(page)
        const toast = toastNamed(page, TITLE.Success)
        const box = (await toast.boundingBox())!
        const x = box.x + 60, y = top + height / 2   // on the text, not a button: buttons never start a swipe
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x + 15, y, { steps: 3 })
        await page.mouse.move(x + 30, y, { steps: 3 })
        // Mid-swipe: it is where the pointer took it, with no transition between.
        await expect(toast).toHaveAttribute('data-swiping', '')
        const dragged = await toast.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e)
        expect(dragged).toBeGreaterThan(20)
        expect(dragged).toBeLessThan(40)
        expect(await animationsOf(toast)).toEqual([])
        await page.mouse.move(x + 90, y, { steps: 6 })
        await page.mouse.up()
        // Released past the threshold: it leaves to the right from where it was, by transform and opacity.
        await expect(toast).toHaveAttribute('data-swipe-direction', 'right')
        await expect(toast).toHaveAttribute('data-ending-style', '')
        expect(onlyMoves(await animationsOf(toast))).toBe(true)
        const released = await toast.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e)
        expect(released).toBeGreaterThan(60)
        await page.waitForTimeout(300)
        expect(await toast.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e)).toBeGreaterThan(released + 20)
        await expect(toast).toHaveCount(0)
      })
    })

    // The project default: reducedMotion 'reduce'.
    // [[rule: toast-stack-collapses-and-spreads]]
    test('under reduced motion the stack is at its end state: collapsed behind the front toast, spread on hover and on F6', async ({ page }) => {
      await openMotion(page)
      for (const s of ['Success', 'Info', 'Success'] as const) await raise(page, s)
      await page.mouse.move(0, 0)
      let [front, mid, back] = await settled(page)
      const bottom = vh(page) - 20
      // Collapsed: the front toast at its place; each one behind it a step further back, 5% smaller,
      // its top edge a step above the one in front's (the scale pivots on the top edge).
      expect(front.bottom).toBeCloseTo(bottom, 0)
      expect(front.scale).toBe(1)
      expect(mid.scale).toBeCloseTo(0.95, 3)
      expect(back.scale).toBeCloseTo(0.9, 3)
      expect(mid.top).toBeCloseTo(bottom - mid.height - 10, 0)
      expect(back.top).toBeCloseTo(bottom - back.height - 20, 0)
      // Spread on hover: full size, each --vela-space-10 above the one in front.
      await region(page).locator('.vela-toast').first().hover()
      await expect(region(page)).toHaveAttribute('data-expanded', '')
      ;[front, mid, back] = await settled(page)
      expect([front.scale, mid.scale, back.scale]).toEqual([1, 1, 1])
      expect(front.bottom).toBeCloseTo(bottom, 0)
      expect(mid.bottom).toBeCloseTo(front.top - 10, 0)
      expect(back.bottom).toBeCloseTo(mid.top - 10, 0)
      // Crossing the gap between two toasts does not collapse it under the pointer.
      const r = (await region(page).boundingBox())!
      await page.mouse.move(r.x + 40, (front.top + mid.bottom) / 2)
      await expect(region(page)).toHaveAttribute('data-expanded', '')
      // Off it, it closes up again.
      await page.mouse.move(0, 0)
      await expect(region(page)).not.toHaveAttribute('data-expanded')
      expect((await settled(page))[1].scale).toBeCloseTo(0.95, 3)
      // Focus inside the region (F6) spreads it too.
      await page.keyboard.press('F6')
      await expect(region(page)).toHaveAttribute('data-expanded', '')
      ;[front, mid] = await settled(page)
      expect(mid.bottom).toBeCloseTo(front.top - 10, 0)
    })

    // [[rule: toast-stack-keeps-warnings-in-view]]
    test('a warning behind another toast keeps the stack spread, so its title is on screen', async ({ page }) => {
      await openMotion(page)
      await raise(page, 'Warning')
      await raise(page, 'Success')
      await page.mouse.move(0, 0)
      await expect(region(page)).toHaveAttribute('data-vela-spread')
      await expect(region(page)).not.toHaveAttribute('data-expanded')
      const [front, warning] = await settled(page)
      expect(warning.title).toBe(TITLE.Warning)
      expect(warning.scale).toBe(1)
      expect(warning.bottom).toBeCloseTo(front.top - 10, 0)
      // Nothing covers its title: the topmost element at the title's centre is the title.
      const title = toastNamed(page, TITLE.Warning).locator('.vela-toast__title')
      const t = (await title.boundingBox())!
      expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className ?? '', [t.x + t.width / 2, t.y + t.height / 2])).toContain('vela-toast__title')
      // A warning in front hides nothing, so a stack with no warning behind collapses as usual.
      // (A fresh page: after a close button is pressed, Base UI keeps the region hovered until the
      // pointer crosses it again, which would hold the stack spread for a reason of its own.)
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Motion review' })).toBeVisible()
      await raise(page, 'Info')
      await raise(page, 'Warning')
      await page.mouse.move(0, 0)
      await expect(region(page)).not.toHaveAttribute('data-vela-spread')
      const [, behind] = await settled(page)
      expect(behind.scale).toBeCloseTo(0.95, 3)
    })
  })

  // ---------------------------------------------------------------------------- Popover, Tooltip
  for (const overlay of ['popover', 'tooltip'] as const) {
    test.describe(overlay, () => {
      const frame = (page: Page) => frameIn(page, 'motion-overlays')
      const trigger = (page: Page) => frame(page).getByRole('button', { name: overlay === 'popover' ? 'Filters' : 'Export' })
      const popup = (page: Page) => overlay === 'popover' ? page.getByRole('dialog', { name: 'Filter alerts' }) : page.getByRole('tooltip')
      // Pointer open: a press for the popover, a resting pointer for the tooltip.
      const open = async (page: Page) => {
        if (overlay === 'popover') await trigger(page).click()
        else await trigger(page).hover()
        await expect(popup(page)).toBeVisible()
      }
      const close = async (page: Page) => {
        if (overlay === 'popover') await trigger(page).click()
        else await page.mouse.move(0, 0)
      }
      const atRest = async (page: Page) => {
        await expect.poll(async () => (await animationsOf(popup(page))).length, { timeout: 5000 }).toBe(0)
        expect(await popup(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
        expect(await scaleOf(popup(page))).toBe(1)
      }

      test.describe('with motion', () => {
        test.use({ reducedMotion: 'no-preference' })

        // [[rule: popover-grows-from-its-trigger]]
        // [[rule: tooltip-grows-from-its-trigger]]
        test(`the ${overlay} grows from its trigger: scale from 0.96 and opacity, pivoting on Base UI's transform origin`, async ({ page }) => {
          await openMotion(page)
          await slowMotion(page)
          await open(page)
          const a = await started(popup(page))
          expect(a.map((x) => x.property).sort()).toEqual(['opacity', 'transform'])
          expect(onlyMoves(a)).toBe(true)
          const s = await scaleOf(popup(page))
          expect(s).toBeGreaterThanOrEqual(0.96)
          expect(s).toBeLessThan(1)
          // The pivot is the point Base UI computed nearest the trigger (its --transform-origin), not
          // the popup's centre: the popover opens below its trigger, so it pivots on its top edge;
          // the tooltip opens above, so on its bottom edge — under the trigger's centre either way.
          const origin = await popup(page).evaluate((el) => {
            const [x, y] = getComputedStyle(el).transformOrigin.split(' ').map(parseFloat)
            const r = el.getBoundingClientRect()
            return { variable: getComputedStyle(el).getPropertyValue('--transform-origin').trim(), x: r.left + x * (r.width / el.offsetWidth), y, height: el.offsetHeight }
          })
          expect(origin.variable).not.toBe('')
          if (overlay === 'popover') expect(origin.y).toBeLessThanOrEqual(1)
          else expect(origin.y).toBeGreaterThanOrEqual(origin.height - 1)
          const t = (await trigger(page).boundingBox())!
          expect(Math.abs(origin.x - (t.x + t.width / 2))).toBeLessThan(2)
          await atRest(page)
        })

        // [[rule: popover-reopen-mid-flight]]
        // [[rule: tooltip-reopen-mid-flight]]
        test(`a ${overlay} closed and reopened mid-flight turns round and ends open, at rest`, async ({ page }) => {
          // The tooltip waits --vela-delay-tooltip before it opens; with the wait at zero the second
          // hover lands while the first close is still fading. Read at mount, so set before it.
          if (overlay === 'tooltip') {
            await page.addInitScript(() => {
              const s = document.createElement('style')
              s.textContent = '* { --vela-delay-tooltip: 0ms !important; }'
              document.documentElement.appendChild(s)
            })
          }
          await openMotion(page)
          await slowMotion(page)
          await open(page)
          await atRest(page)
          await close(page)
          await page.waitForTimeout(150)
          // Still on screen, fading out…
          expect(await popup(page).evaluate((el) => el.hasAttribute('data-ending-style'))).toBe(true)
          await open(page)
          // …and back: the same popup, at rest and open.
          await atRest(page)
          await expect(popup(page)).toHaveCount(1)
          expect(await popup(page).evaluate((el) => el.hasAttribute('data-ending-style'))).toBe(false)
        })

        // [[rule: popover-keyboard-is-instant]]
        // [[rule: tooltip-keyboard-is-instant]]
        test(`a ${overlay} opened and closed from the keyboard does not animate`, async ({ page }) => {
          await openMotion(page)
          if (overlay === 'popover') {
            await trigger(page).focus()
            await page.keyboard.press('Enter')
          } else {
            await frame(page).getByRole('button', { name: 'Filters' }).focus()
            await page.keyboard.press('Tab')
            await expect(trigger(page)).toBeFocused()
          }
          await expect(popup(page)).toBeVisible()
          expect(await animationsOf(popup(page))).toEqual([])
          expect(await scaleOf(popup(page))).toBe(1)
          await page.keyboard.press('Escape')
          await expect(popup(page)).toHaveCount(0, { timeout: 500 })
        })
      })

      // [[rule: popover-motion-reduced-end-state]]
      // [[rule: tooltip-motion-reduced-end-state]]
      test(`under reduced motion the ${overlay} is at its end state: full size, opaque, and gone when closed`, async ({ page }) => {
        await openMotion(page)
        await open(page)
        await atRest(page)
        await close(page)
        await expect(popup(page)).toHaveCount(0)
      })
    })
  }

  // ------------------------------------------------------------------------------------ Dialog
  test.describe('Dialog', () => {
    test.use({ reducedMotion: 'no-preference' })
    // [[rule: dialog-enters-on-ease-out]]
    test('the dialog enters on ease-out by opacity and a step of rise, and not at all from the keyboard', async ({ page }) => {
      await page.goto('/#/components/dialog')
      const trigger = page.locator('.pg-frame[data-theme="light"] .pg-frame-body').getByRole('button', { name: 'Edit Policy' })
      await trigger.click()
      const dialog = page.getByRole('dialog', { name: 'Edit policy' })
      await expect(dialog).toBeVisible()
      const timing = await dialog.evaluate((el) => getComputedStyle(el).transitionTimingFunction)
      expect(timing).toBe('cubic-bezier(0.25, 1, 0.5, 1), cubic-bezier(0.25, 1, 0.5, 1)')
      expect(onlyMoves(await animationsOf(dialog))).toBe(true)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await trigger.focus()
      await page.keyboard.press('Enter')
      await expect(dialog).toBeVisible()
      expect(await animationsOf(dialog)).toEqual([])
    })
  })

  // ------------------------------------------------------------ Checkbox, Radio Group, Toggle
  // The control's own element (the box, the circle, the track), what shows its state (the mark,
  // the dot, the knob) and how to change it from the keyboard.
  const CONTROLS = {
    checkbox: {
      control: (f: Locator) => f.getByRole('checkbox', { name: 'Include archived policies' }),
      state: (f: Locator) => f.locator('.vela-checkbox__indicator'),
      checked: (f: Locator) => f.getByRole('checkbox', { name: 'Include archived policies' }),
      key: 'Space',
    },
    radio: {
      control: (f: Locator) => f.getByRole('radio', { name: 'Quarantine' }),
      state: (f: Locator) => f.getByRole('radio', { name: 'Quarantine' }).locator('.vela-radio__indicator'),
      checked: (f: Locator) => f.getByRole('radio', { name: 'Quarantine' }),
      key: 'ArrowRight',   // from Block, focused first
    },
    toggle: {
      control: (f: Locator) => f.getByRole('switch', { name: 'Email alerts' }),
      state: (f: Locator) => f.locator('.vela-toggle__knob'),
      checked: (f: Locator) => f.getByRole('switch', { name: 'Email alerts' }),
      key: 'Space',
    },
  } as const

  for (const [name, c] of Object.entries(CONTROLS)) {
    test.describe(name, () => {
      const frame = (page: Page) => frameIn(page, 'motion-controls')
      const control = (page: Page) => c.control(frame(page))
      const state = (page: Page) => c.state(frame(page))
      const press = async (page: Page, dx = 0) => {
        await control(page).scrollIntoViewIfNeeded()   // a mouse moved by hand does not scroll
        const b = (await control(page).boundingBox())!
        await page.mouse.move(dx >= 0 ? b.x + b.width / 2 + dx : b.x + b.width + dx, b.y + b.height / 2)
        await page.mouse.down()
      }
      const stateAtRest = async (page: Page) => {
        await expect.poll(async () => (await animationsOf(state(page))).length, { timeout: 5000 }).toBe(0)
        expect(await state(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      }

      test.describe('with motion', () => {
        test.use({ reducedMotion: 'no-preference' })

        // [[rule: checkbox-mark-scales-in]]
        // [[rule: radio-dot-scales-in]]
        // [[rule: toggle-press-by-transform]]
        test(`a pointer change on the ${name} moves by transform and opacity alone: the press, then the state`, async ({ page }) => {
          await openMotion(page)
          await slowMotion(page)
          await press(page)
          await page.waitForTimeout(100)
          // Pressed: scaled to 0.9 (in at duration-instant, slowed five times), by a transform transition.
          const pressing = await started(control(page))
          expect(onlyMoves(pressing)).toBe(true)
          await expect.poll(() => scaleOf(control(page))).toBeCloseTo(0.9, 2)
          await page.mouse.up()
          await expect(c.checked(frame(page))).toHaveAttribute('aria-checked', 'true')
          // The state arrives: the mark or dot scales in from half size and fades in; the knob slides.
          const arriving = await started(state(page))
          expect(onlyMoves(arriving)).toBe(true)
          if (name !== 'toggle') {
            expect(arriving.map((a) => a.property).sort()).toEqual(['opacity', 'transform'])
            const s = await scaleOf(state(page))
            expect(s).toBeGreaterThanOrEqual(0.5)
            expect(s).toBeLessThan(1)
          }
          expect(onlyMoves(await animationsOf(frame(page), true))).toBe(true)
          await stateAtRest(page)
          await expect.poll(() => scaleOf(control(page)), { timeout: 5000 }).toBe(1)
        })

        // [[rule: checkbox-mark-retargets]]
        // [[rule: radio-dot-retargets]]
        // [[rule: toggle-press-retargets]]
        test(`changing the ${name} again mid-flight turns round and ends in the right state`, async ({ page }) => {
          await openMotion(page)
          await slowMotion(page)
          await control(page).click()
          await page.waitForTimeout(100)
          // Back again while the first change is still moving…
          if (name === 'radio') await frame(page).getByRole('radio', { name: 'Block' }).click()
          else await control(page).click()
          await page.waitForTimeout(100)
          // …and forward once more: it ends checked and at rest, never stranded half-way.
          await control(page).click()
          await expect(c.checked(frame(page))).toHaveAttribute('aria-checked', 'true')
          await stateAtRest(page)
          if (name !== 'toggle') expect(await scaleOf(state(page))).toBe(1)
          await expect.poll(() => scaleOf(control(page)), { timeout: 5000 }).toBe(1)
          if (name === 'radio') await expect(frame(page).locator('.vela-radio__indicator')).toHaveCount(1, { timeout: 5000 })
        })

        // [[rule: checkbox-keyboard-is-instant]]
        // [[rule: radio-keyboard-is-instant]]
        // [[rule: toggle-keyboard-is-instant]]
        test(`a keyboard change on the ${name} lands at once: no press, no state motion`, async ({ page }) => {
          await openMotion(page)
          if (name === 'radio') await frame(page).getByRole('radio', { name: 'Block' }).focus()
          else await control(page).focus()
          await page.keyboard.down(c.key)
          // Held down from the keyboard, the control does not scale.
          expect(await scaleOf(control(page))).toBe(1)
          await page.keyboard.up(c.key)
          await expect(c.checked(frame(page))).toHaveAttribute('aria-checked', 'true')
          expect(await frame(page).locator('[data-vela-instant]').count()).toBe(1)
          const moving = (await animationsOf(frame(page), true)).filter((a) => MOVING.has(a.property) || COLOUR.test(a.property))
          expect(moving).toEqual([])
          expect(await state(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
          if (name !== 'toggle') expect(await scaleOf(state(page))).toBe(1)
        })
      })

      // The project default: reducedMotion 'reduce'.
      // [[rule: checkbox-motion-reduced-end-state]]
      // [[rule: radio-motion-reduced-end-state]]
      // [[rule: toggle-motion-reduced-end-state]]
      test(`under reduced motion the ${name} is at its end state: pressed while held, released after, the state shown in full`, async ({ page }) => {
        await openMotion(page)
        await press(page)
        await expect.poll(() => scaleOf(control(page))).toBeCloseTo(0.9, 3)
        await page.mouse.up()
        await expect(c.checked(frame(page))).toHaveAttribute('aria-checked', 'true')
        await expect.poll(() => scaleOf(control(page))).toBe(1)
        await stateAtRest(page)
        if (name !== 'toggle') expect(await scaleOf(state(page))).toBe(1)
      })

      // [[rule: checkbox-press-keeps-hit-target]]
      // [[rule: radio-press-keeps-hit-target]]
      // [[rule: toggle-press-keeps-hit-target]]
      // The press scales the control to 0.9 under the pointer; the guard holds its original box, so
      // a press half a pixel inside its edge still releases on it and its click fires. Without the
      // guard the release falls where the control no longer is (0.8px a side on a 16px box) and the
      // click goes to the parent — measured in Chromium with the guard removed: 1 of these 2 presses
      // lost on the Checkbox, 2 of 2 on the Toggle. On the Radio both still landed without the guard,
      // for a reason not yet examined, so there this proves only that the press lands; the guard is
      // kept for parity. Clicks are counted, not the state, because a Radio also selects on focus.
      test(`a press at the inner edge of the ${name} still fires its click`, async ({ page }) => {
        await openMotion(page)
        await control(page).evaluate((el) => {
          ;(window as Window & { __hits?: number }).__hits = 0
          el.addEventListener('click', () => { (window as Window & { __hits?: number }).__hits!++ })
        })
        for (const edge of [1, -1]) {
          await control(page).scrollIntoViewIfNeeded()
          const b = (await control(page).boundingBox())!
          const x = edge > 0 ? b.x + 0.5 : b.x + b.width - 0.5
          await page.mouse.move(x, b.y + b.height / 2)
          await page.mouse.down()
          await page.waitForTimeout(150)   // longer than the press transition; .click() cannot fail
          await page.mouse.up()
        }
        expect(await page.evaluate(() => (window as Window & { __hits?: number }).__hits)).toBe(2)
        // And a Checkbox or Toggle pressed twice is back where it started.
        if (name !== 'radio') await expect(c.checked(frame(page))).toHaveAttribute('aria-checked', 'false')
      })
    })
  }
})
