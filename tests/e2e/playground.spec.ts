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
  for (const name of ['Button', 'Toggle', 'Input', 'Contextual Alert', 'Status Indicator', 'Risk Pill', 'Tabs', 'Checkbox', 'Radio Group', 'Popover', 'Tooltip', 'Dialog']) {
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
