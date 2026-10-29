import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { springAt, springLinear, dampingRatio } from '../../scripts/spring.mjs'
import { loadTokenSet, springOf } from '../../scripts/tokens-core.mjs'

// `--vela-ease-spring` is generated: scripts/spring.mjs turns the stiffness, damping and mass in the
// token file into a CSS linear() easing. These tests hold the generator to the three things a
// linear() curve has to get right — time only moves forward, it ends exactly at rest, and the
// overshoot is the one the parameters promise — and hold the stylesheet to the generator.
const root = resolve(process.cwd())
const set = loadTokenSet(root)
const spring = springOf(set, 'ease-spring')!

describe('the spring generator', () => {
  const curve = springLinear(spring, spring.durationMs)

  it('reads the spring from the token file: three physical values and the duration it is drawn over', () => {
    expect(spring).toEqual({ stiffness: 1200, damping: 56, mass: 1, durationMs: 240, durationToken: 'duration-travel' })
    // Under 300ms, and the one step above duration-base (foundations/motion.md).
    expect(spring.durationMs).toBeLessThan(300)
  })

  it('moves time forward only: every stop is later than the one before, from 0% to 100%', () => {
    const times = curve.points.map(([t]: number[]) => t)
    expect(times[0]).toBe(0)
    expect(times.at(-1)).toBe(1)
    for (let i = 1; i < times.length; i++) expect(times[i], `stop ${i}`).toBeGreaterThan(times[i - 1])
    // …and the serialised percentages say the same.
    const pct = [...curve.css.matchAll(/ (\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]))
    for (let i = 1; i < pct.length; i++) expect(pct[i]).toBeGreaterThan(pct[i - 1])
    expect(pct.every((p) => p > 0 && p < 100)).toBe(true)
  })

  it('starts at 0 and ends at exactly 1, and the end was already at rest', () => {
    expect(curve.points[0]).toEqual([0, 0])
    expect(curve.points.at(-1)).toEqual([1, 1])
    expect(curve.css.startsWith('linear(0, ')).toBe(true)
    expect(curve.css.endsWith(', 1)')).toBe(true)
    // The last point is pinned to 1; the residual is the jump that pin makes. Under 0.2%, it is
    // under half a pixel on a 240px slide.
    expect(curve.residual).toBeLessThan(0.002)
  })

  it('overshoots slightly, once: a settle a person can feel, not a wobble', () => {
    expect(curve.zeta).toBeGreaterThan(0.75)
    expect(curve.zeta).toBeLessThan(0.9)
    expect(curve.overshoot).toBeGreaterThan(0.005)
    expect(curve.overshoot).toBeLessThan(0.03)
    // The overshoot is the analytic one for the damping ratio: exp(-πζ / √(1 − ζ²)).
    const z = dampingRatio(spring)
    expect(curve.overshoot).toBeCloseTo(Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z)), 3)
    // Fast arrival: 95% of the way in under half the duration.
    const t95 = curve.points.find(([, x]: number[]) => x >= 0.95)![0]
    expect(t95).toBeLessThan(0.5)
  })

  it('the simplified polyline stays within its tolerance of the true curve', () => {
    let worst = 0
    for (let ms = 0; ms <= spring.durationMs; ms++) {
      const f = ms / spring.durationMs
      const i = curve.points.findIndex(([t]: number[]) => t >= f)
      const [t1, x1] = curve.points[Math.max(0, i - 1)]
      const [t2, x2] = curve.points[i]
      const y = t2 === t1 ? x2 : x1 + ((x2 - x1) * (f - t1)) / (t2 - t1)
      // Away from the pinned end, compare against the physics directly.
      if (ms < spring.durationMs) worst = Math.max(worst, Math.abs(y - springAt(spring, ms / 1000)))
    }
    // The tolerance is perpendicular distance in (time, progress) space plus 4-place rounding.
    expect(worst).toBeLessThan(0.003)
    expect(curve.points.length).toBeLessThan(40)
  })

  it('handles the critically and over-damped regimes without overshoot', () => {
    const critical = { stiffness: 400, damping: 40, mass: 1 }
    const over = { stiffness: 400, damping: 80, mass: 1 }
    expect(dampingRatio(critical)).toBe(1)
    expect(springLinear(critical, 900).overshoot).toBe(0)
    expect(springLinear(over, 2000).overshoot).toBe(0)
    expect(springAt(over, 0)).toBeCloseTo(0, 12)
  })

  it('refuses a spring that has not settled by the end of its duration, rather than snapping', () => {
    expect(() => springLinear({ stiffness: 200, damping: 10, mass: 1 }, 240)).toThrow(/still .*% from rest after 240ms/)
    expect(() => springLinear({ stiffness: 0, damping: 10, mass: 1 }, 240)).toThrow(/stiffness must be a positive number/)
  })
})

describe('the stylesheet carries the generated spring', () => {
  const css = readFileSync(resolve(root, 'src/styles/tokens.light.css'), 'utf8')

  it('declares the fallback curve first, then the spring under @supports for linear()', () => {
    expect(css).toContain('--vela-ease-spring: var(--vela-ease-out);')
    const block = css.slice(css.indexOf('@supports (transition-timing-function: linear(0, 1))'))
    expect(block).toContain(`--vela-ease-spring: ${springLinear(spring, spring.durationMs).css};`)
    // On the same selectors as the token block, so a [data-theme="light"] subtree keeps the spring.
    expect(block).toMatch(/:root,\s*\[data-theme="light"\] \{/)
  })
})
