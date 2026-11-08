import { test, expect, type Page } from '@playwright/test'

// The header at every width (slice 7, item 2b; Omkar, 8 Nov 2026). On main before this, from 620 to
// 1000px the version tag ran under Search, and from 620 to 1040px Search's hint wrapped onto two to
// five lines and spilled out of its box. This sweep would have caught both: it walks every width from
// 320 to 1440px in 20px steps and fails on anything in the header that overlaps another thing, wraps
// onto a second line, is clipped, or leaves the window. The message names the width and the parts.

/** What is wrong in the header at the current width, each problem in words. */
const headerProblems = (page: Page) =>
  page.evaluate(() => {
    const header = document.querySelector('header.topbar') as HTMLElement
    const problems: string[] = []
    const name = (el: Element) => {
      const label = el.getAttribute('aria-label')
      const cls = String(el.getAttribute('class') ?? '').split(' ')[0]
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${label ? ` "${label}"` : ''}`
    }
    const shown = (el: Element) => {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') return false
      const r = el.getBoundingClientRect()
      return r.width > 1 && r.height > 1
    }
    // Visually hidden words (clipped to nothing, for a screen reader) are not drawn, so not measured.
    const hiddenText = (el: Element) => {
      for (let e: Element | null = el; e && e !== header; e = e.parentElement) {
        const cs = getComputedStyle(e)
        if (cs.clipPath === 'inset(50%)' || cs.clip === 'rect(0px, 0px, 0px, 0px)') return true
      }
      return false
    }

    // The parts of the bar, left to right: the menu, the logo, Search, Appearance and each mark.
    const parts = [...header.querySelectorAll(':scope > *, .topbar__right > *, .topbar__marks > *, .shell-search-slot > *')]
      .filter((el) => !el.matches('.topbar__right, .topbar__marks, .shell-search-slot, .shell-appearance, dialog, section'))
      .concat([...header.querySelectorAll('.shell-appearance > button')])
      .filter(shown)
    const vw = document.documentElement.clientWidth
    const bar = header.getBoundingClientRect()
    for (const p of parts) {
      const r = p.getBoundingClientRect()
      if (r.left < -0.5 || r.right > vw + 0.5) problems.push(`${name(p)} leaves the window (${Math.round(r.left)} to ${Math.round(r.right)}, window ${vw})`)
      if (r.top < bar.top - 0.5 || r.bottom > bar.bottom + 0.5) problems.push(`${name(p)} leaves the bar's height`)
    }
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i].getBoundingClientRect()
        const b = parts[j].getBoundingClientRect()
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (x > 0.5 && y > 0.5) problems.push(`${name(parts[i])} overlaps ${name(parts[j])} by ${Math.round(x)}px`)
      }
    }

    // Every run of words in the header sits on one line.
    const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!
      if (!(n.textContent ?? '').trim() || !shown(el) || hiddenText(el) || el.closest('dialog, section, [hidden]')) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
      if (tops.size > 1) problems.push(`"${n.textContent!.trim()}" in ${name(el)} wraps onto ${tops.size} lines`)
      // And inside the part it belongs to: words that run out of their button are clipped or spill.
      const host = parts.find((p) => p.contains(el))
      if (host) {
        const box = host.getBoundingClientRect()
        for (const r of range.getClientRects()) {
          if (r.width > 0 && (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5)) {
            problems.push(`"${n.textContent!.trim()}" spills out of ${name(host)}`)
            break
          }
        }
      }
    }

    // Nothing is clipped: no element's content is wider than its box.
    for (const el of [header, ...header.querySelectorAll('*')]) {
      if (!shown(el) || hiddenText(el) || el.closest('dialog, section, [hidden]')) continue
      const h = el as HTMLElement
      if (h.clientWidth > 0 && h.scrollWidth > h.clientWidth + 1) problems.push(`${name(el)} is clipped (${h.scrollWidth}px of content in ${h.clientWidth}px)`)
    }
    return problems
  })

test.describe('the header at every width', () => {
  test('from 320 to 1440px nothing in the header overlaps, wraps or is clipped', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 800 })
    await page.goto('/#/foundations/elevation')
    await page.evaluate(() => document.fonts.ready)
    const found: string[] = []
    for (let width = 320; width <= 1440; width += 20) {
      await page.setViewportSize({ width, height: 800 })
      // Two frames: the media and container queries, then the layout they cause.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      for (const p of await headerProblems(page)) found.push(`${width}px: ${p}`)
    }
    expect(found, found.join('\n')).toEqual([])
  })
})

// Search sizes itself by its own slot, a container query, never by the window (item 2b), and its
// glyph-only form is Vela's Icon Button (item 7). Widths with room to spare either side of each step.
test.describe('Search in the header', () => {
  const banner = (page: Page) => page.getByRole('banner')

  test('the full hint, then "Search" with the shortcut, then the Icon Button alone; the name is always the words on screen', async ({ page }) => {
    await page.goto('/#/components/button')
    await page.evaluate(() => document.fonts.ready)
    const full = banner(page).getByRole('button', { name: 'Search, or type a name you know', exact: true })
    const short = banner(page).getByRole('button', { name: 'Search', exact: true })
    // 1440: the slot holds the whole hint.
    await expect(full).toBeVisible()
    await expect(full).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K /')
    await expect(full.locator('kbd')).toBeVisible()
    // 800: "Search" and the shortcut, on one line, as a field.
    await page.setViewportSize({ width: 800, height: 800 })
    await expect(full).toHaveCount(0)
    await expect(short).toBeVisible()
    // The words drawn (innerText leaves out what is not drawn): "Search" and the shortcut, no more.
    await expect.poll(() => short.evaluate((b) => (b as HTMLElement).innerText.replace(/\s+/g, ' ').trim())).toMatch(/^Search ?(⌘K|Ctrl K)$/)
    await expect(short).toHaveClass(/shell-search-button/)
    // 620: the Icon Button alone, named "Search", with the same shortcuts.
    await page.setViewportSize({ width: 620, height: 800 })
    await expect(short).toBeVisible()
    await expect(short).toHaveClass(/vela-icon-button/)
    await expect(short).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K /')
    await expect(short.locator('.vela-icon-button__glyph')).toHaveAttribute('aria-hidden', 'true')
    // Only one Search button is ever in the accessibility tree.
    await expect(banner(page).getByRole('button', { name: /^Search/ })).toHaveCount(1)
  })

  test('the Icon Button form: no frame, its name in a label tooltip, and it opens the dialog and takes focus back', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/components/button')
    const button = banner(page).getByRole('button', { name: 'Search', exact: true })
    await expect(button).toHaveClass(/vela-icon-button--regular/)
    // The Icon Button's 1px transparent edge at rest: no frame, as the marks beside it.
    await expect(button).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    await button.focus()
    const tip = page.locator('.vela-tooltip', { hasText: 'Search' })
    await expect(tip).toBeVisible()
    await expect(tip).toHaveAttribute('aria-hidden', 'true')
    await expect(button).not.toHaveAttribute('aria-describedby')
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('combobox', { name: 'Search' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(button).toBeFocused()
  })

  test('"or type a name you know" is said in the dialog\'s own field', async ({ page }) => {
    await page.setViewportSize({ width: 620, height: 800 })
    await page.goto('/#/components/button')
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog', { name: 'Search' }).getByRole('combobox')).toHaveAttribute('placeholder', 'Type a name you know, an alias such as “modal”, or a rule id')
  })
})

// Appearance is its icon alone below about 1000px, its name kept for a screen reader and shown in a
// label tooltip (item 2b). It opens its panel as it always has.
test.describe('Appearance in the header', () => {
  test('from 1000px it shows its word and names its state; below, the icon alone, named "Appearance" in a tooltip', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 })
    await page.goto('/#/components/button')
    const banner = page.getByRole('banner')
    await expect(banner.getByRole('button', { name: 'Appearance: theme System, brand Default', exact: true })).toContainText('Appearance')
    await page.setViewportSize({ width: 999, height: 800 })
    const button = banner.getByRole('button', { name: 'Appearance', exact: true })
    await expect(button).toBeVisible()
    await expect(button).toHaveText('')
    await button.hover()
    const tip = page.locator('.vela-tooltip', { hasText: 'Appearance' })
    await expect(tip).toBeVisible()
    await expect(tip).toHaveText('Appearance')
    await expect(tip).toHaveAttribute('aria-hidden', 'true')
    await expect(button).not.toHaveAttribute('aria-describedby')
    // It still opens its panel, says so, and Escape puts focus back on it.
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    const panel = page.getByRole('region', { name: 'Appearance' })
    await expect(panel).toBeVisible()
    await panel.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Dark', exact: true }).focus()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(button).toBeFocused()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})

// Item 7 (Omkar, 8 Nov 2026): every glyph-only control in the header is Vela's Icon Button, one look
// at every width: no frame, the same box, a transparent rest, its name in a label tooltip. On a
// phone that is the menu, Search and Appearance; at 620 the same three; at 800 Search has its words
// again, so the menu and Appearance.
test.describe('the header\'s glyph-only controls', () => {
  for (const [width, names] of [[390, ['Show navigation', 'Search', 'Appearance']], [620, ['Show navigation', 'Search', 'Appearance']], [800, ['Show navigation', 'Appearance']]] as const) {
    test(`at ${width}px ${names.join(', ')} are Icon Buttons with one look`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/#/components/button')
      await page.mouse.move(width / 2, 700)
      const banner = page.getByRole('banner')
      // Every button in the header that shows no words is one of these, and each is an Icon Button.
      const glyphOnly = await banner.locator('button:visible').evaluateAll((bs) => bs.filter((b) => !(b as HTMLElement).innerText.trim()).map((b) => b.getAttribute('aria-label')))
      expect(glyphOnly).toEqual([...names])
      const looks: string[] = []
      for (const name of names) {
        const button = banner.getByRole('button', { name, exact: true })
        await expect(button).toHaveClass(/vela-icon-button vela-icon-button--regular/)
        looks.push(JSON.stringify(await button.evaluate((b) => {
          const cs = getComputedStyle(b)
          const r = b.getBoundingClientRect()
          return { w: r.width, h: r.height, border: [cs.borderTopWidth, cs.borderTopColor], background: cs.backgroundColor, radius: cs.borderTopLeftRadius }
        })))
        // Its name, shown in a label tooltip on keyboard focus, and heard once.
        await button.focus()
        const tip = page.locator('.vela-tooltip:not([data-ending-style])', { hasText: name })
        await expect(tip).toHaveText(name)
        await expect(tip).toHaveAttribute('aria-hidden', 'true')
        await expect(button).not.toHaveAttribute('aria-describedby')
        await button.blur()
      }
      // One look: the same box, the Icon Button's 1px transparent edge, no fill at rest.
      expect(new Set(looks).size, looks.join('\n')).toBe(1)
      expect(JSON.parse(looks[0])).toEqual({ w: 35, h: 35, border: ['1px', 'rgba(0, 0, 0, 0)'], background: 'rgba(0, 0, 0, 0)', radius: expect.any(String) })
    })
  }

  test('the menu Icon Button says what a press does, and opens and closes the navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#/components/button')
    const banner = page.getByRole('banner')
    const show = banner.getByRole('button', { name: 'Show navigation', exact: true })
    await expect(show).toHaveAttribute('aria-expanded', 'false')
    await expect(show).toHaveAttribute('aria-controls', 'site-nav')
    await show.click()
    const hide = banner.getByRole('button', { name: 'Hide navigation', exact: true })
    await expect(hide).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible()
    await hide.click()
    await expect(show).toHaveAttribute('aria-expanded', 'false')
    await expect(show).toBeFocused()
  })
})
