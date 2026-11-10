import { test, expect } from '@playwright/test'
import { setTheme } from '../theme'
import { contrast, composite } from '../../scripts/contrast-math.mjs'

// The Adopt page (#/adopt) prints the measured text contrast beside every severity colour, on both
// sides (0.16.1, item 1b). Before 0.16.1 its Vela side drew "In consult" white on #3d7fd6 at
// 4.03:1 under a footer that says every change is contrast checked. This test reads the colours
// the browser actually painted for each labelled element, measures them here with the function
// PAIRS is asserted with, and holds the label to that number: the ratio alone when it passes, and
// "below 4.5:1" in words when it does not. Every ratio on the Vela side must pass.

type Painted = { of: string; text: string; data: number; fg: string; bg: string }

const rgba = (css: string) => {
  const [r, g, b, a = 1] = css.match(/[\d.]+/g)!.map(Number)
  return { hex: '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''), a }
}
const measured = (p: Painted) => {
  const bg = rgba(p.bg)
  expect(bg.a, `${p.of}: the background is opaque`).toBe(1)
  const fg = rgba(p.fg)
  return contrast(fg.a < 1 ? composite(fg.hex, bg.hex, fg.a) : fg.hex, bg.hex)
}
const label = (ratio: number) => {
  if (ratio >= 4.5) return `${ratio.toFixed(2)}:1`
  return `${Math.min(Math.floor(ratio * 100) / 100, 4.49).toFixed(2)}:1, below 4.5:1`
}

for (const theme of ['light', 'dark'] as const) {
  test(`Adopt · ${theme}: each severity colour is labelled with its measured contrast, and the Vela side passes`, async ({ page }) => {
    await page.goto('/#/adopt')
    await setTheme(page, theme)
    await expect(page.getByRole('heading', { name: 'Adopt without rewrite' })).toBeVisible()
    const columns = await page.locator('.adopt-col').evaluateAll((cols) =>
      cols.map((col) => {
        // The first painted background at or above an element: what its text actually sits on.
        const under = (el: Element | null): string => {
          for (; el; el = el.parentElement) {
            const b = getComputedStyle(el).backgroundColor
            if (b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') return b
          }
          return 'rgb(255, 255, 255)'
        }
        return [...col.querySelectorAll('[data-adopt-ratio]')].map((note) => {
          const of = note.getAttribute('data-adopt-ratio')!
          const target =
            of.startsWith('chip:') ? note.parentElement!.querySelector('.MuiChip-root')! :
            of.startsWith('alert:') ? note.closest('.MuiAlert-root')! :
            col.querySelector(`.MuiButton-color${of.split(':')[1].replace(/^./, (c) => c.toUpperCase())}`)!
          return { of, text: note.textContent ?? '', data: Number(note.getAttribute('data-ratio')), fg: getComputedStyle(target).color, bg: under(target) }
        })
      }),
    )
    expect(columns).toHaveLength(2)
    // The Vela side's Alert paints Vela's own alert colours (0.16.1): the bridge's style variants
    // reach the screen, not Material's derivation from palette.warning.light.
    const tokens = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement)
      return { fg: css.getPropertyValue('--vela-text-severity-warning').trim(), bg: css.getPropertyValue('--vela-bg-severity-warning').trim() }
    })
    const velaAlert = await page.locator('.adopt-col').nth(1).locator('.MuiAlert-root').first().evaluate((el) => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }))
    expect(rgba(velaAlert.fg).hex, 'Vela alert text is text-severity-warning').toBe(tokens.fg.toLowerCase())
    expect(rgba(velaAlert.bg).hex, 'Vela alert fill is bg-severity-warning').toBe(tokens.bg.toLowerCase())
    const [stock, vela] = columns
    for (const [side, notes] of [['stock', stock], ['vela', vela]] as const) {
      // An alert, the error text button and the four status chips.
      expect(notes.map((n) => n.of).sort(), side).toEqual(['alert:warning', 'chip:info', 'chip:success', 'chip:warning', 'chip:warning', 'text-button:error'])
      for (const n of notes) {
        const ratio = measured(n)
        expect(n.data, `${side} ${n.of}: the ratio the page computed matches what was painted`).toBeCloseTo(ratio, 2)
        expect(n.text, `${side} ${n.of}`).toBe(`Contrast ${label(ratio)}`)
        if (side === 'vela') expect(ratio, `vela ${n.of}: ${ratio.toFixed(2)}:1 on the Vela side`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
}
