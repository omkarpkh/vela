import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
// Shared with `npm run contrast` so the report and the test cannot disagree.
import { loadThemes, auditTheme, resolve } from '../../scripts/contrast-core.mjs'

const themes = loadThemes()

describe('design tokens', () => {
  for (const theme of ['light', 'dark'] as const) {
    describe(`${theme} theme`, () => {
      it('resolves every semantic colour token to a real hex value', () => {
        // Catches a dangling var() the moment it is introduced, in either theme.
        expect(() => resolve(themes[theme], '--vela-text-default')).not.toThrow()
        expect(() => resolve(themes[theme], '--vela-bg-global')).not.toThrow()
      })

      const results = auditTheme(themes[theme])
      it.each(results.map((r: { label: string }) => r.label))(
        'meets WCAG 2.1 AA: %s',
        (label) => {
          const r = results.find((x: { label: string }) => x.label === label)!
          expect(
            r.ratio,
            `${label}: ${r.ratio.toFixed(2)}:1 is below the ${r.min}:1 minimum`,
          ).toBeGreaterThanOrEqual(r.min)
        },
      )
    })
  }

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
})
