import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
// Shared with `npm run contrast` so the report and the test cannot disagree.
import { loadThemes, auditTheme, resolve, composite, contrast } from '../../scripts/contrast-core.mjs'

const themes = loadThemes()

describe('design tokens', () => {
  for (const theme of ['light', 'dark'] as const) {
    describe(`${theme} theme`, () => {
      it('resolves every semantic colour token to a real hex value', () => {
        // Catches a dangling var() the moment it is introduced, in either theme.
        expect(() => resolve(themes[theme], '--vela-text-default')).not.toThrow()
        expect(() => resolve(themes[theme], '--vela-bg-global')).not.toThrow()
      })

      type Result = { label: string; ratio: number; min: number; negative: boolean }
      const results: Result[] = auditTheme(themes[theme], theme)
      it.each(results.filter((r) => !r.negative).map((r) => r.label))(
        'meets WCAG 2.1 AA: %s',
        (label) => {
          const r = results.find((x) => x.label === label)!
          expect(
            r.ratio,
            `${label}: ${r.ratio.toFixed(2)}:1 is below the ${r.min}:1 minimum`,
          ).toBeGreaterThanOrEqual(r.min)
        },
      )
      // A negative case is a pairing that must not ship. It stays listed only while it fails.
      it.each(results.filter((r) => r.negative).map((r) => r.label))(
        'fails WCAG 2.1 AA, as listed: %s',
        (label) => {
          const r = results.find((x) => x.label === label)!
          expect(r.ratio, `${label}: ${r.ratio.toFixed(2)}:1 now passes; remove the negative case`).toBeLessThan(r.min)
        },
      )
    })
  }

  // The site's pairs (playground spec, slice 0): tag text on a container in both themes, locked text
  // on the raised surface, and de-emphasized text on a container as a negative case, at 4.35:1 in
  // light. Named here so a refactor of the list cannot quietly drop them.
  it('lists the site pairs, with de-emphasized text on a container as a negative case', () => {
    const byLabel = (theme: 'light' | 'dark') => Object.fromEntries(auditTheme(themes[theme], theme).map((r) => [r.label, r]))
    const light = byLabel('light'), dark = byLabel('dark')
    for (const label of ['Site tag text on container', 'Site locked value text on raised surface', 'Site segment label, hovered']) {
      expect(light[label]?.pass, `${label}, light`).toBe(true)
      expect(dark[label]?.pass, `${label}, dark`).toBe(true)
    }
    const neg = 'De-emphasized text on container (negative case: must not ship)'
    expect(light[neg]).toMatchObject({ negative: true, pass: true })
    expect(light[neg].ratio.toFixed(2)).toBe('4.35')
    expect(dark[neg]).toMatchObject({ negative: false, pass: true })
  })

  it('defines the dark theme without redefining a single primitive', () => {
    // The architectural claim, enforced: dark mode re-points semantics only.
    // A raw hex here would mean the two-layer split had started to leak.
    const darkSource = readFileSync(
      resolvePath(process.cwd(), 'src/styles/tokens.dark.body.css'),
      'utf8',
    )
    const rawHex = darkSource.match(/--vela-[\w-]+:\s*#[0-9a-f]{3,6}/gi) ?? []
    expect(rawHex, `dark theme must not contain raw hex: ${rawHex.join(', ')}`).toHaveLength(0)
  })

  // The hero logo's outer ring is drawn at 75% opacity (brand/README.md), so what reaches the screen
  // is a composite no token holds and PAIRS cannot list. Measured here in both themes, against the
  // 3:1 a graphic needs. The ratio is in the test name and pinned, so the name cannot drift from it.
  describe('logo: the hero outer ring at 75% opacity', () => {
    const cases = [
      ['--vela-white', '--vela-primary-500', 'white at 75% over primary-500', '4.17'],
      ['--vela-primary-500', '--vela-white', 'primary-500 at 75% over white', '3.61'],
    ] as const
    for (const theme of ['light', 'dark'] as const) {
      it.each(cases)(`${theme}: %s on %s (%s) measures %s:1, at least 3:1`, (fg, bg, _what, measured) => {
        const under = resolve(themes[theme], bg)
        const ratio = contrast(composite(resolve(themes[theme], fg), under, 0.75), under)
        expect(ratio).toBeGreaterThanOrEqual(3)
        expect(ratio.toFixed(2)).toBe(measured)
      })
    }
  })
})
