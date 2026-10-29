import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// bridges/vela.mui-theme.json is the "adopt without rewrite" target: Material UI ThemeOptions
// generated from tokens/vela.tokens.json. Same discipline as the CSS — every colour traces to a
// token, every type variant to the ramp, and regenerating changes nothing.
const root = resolve(process.cwd())
const doc = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))
const overlay = JSON.parse(readFileSync(resolve(root, 'tokens/vela.dark.tokens.json'), 'utf8'))
const bridgePath = resolve(root, 'bridges/vela.mui-theme.json')
const bridge = JSON.parse(readFileSync(bridgePath, 'utf8'))

const all: Record<string, any> = {}
for (const [g, toks] of Object.entries(doc)) {
  if (g.startsWith('$')) continue
  for (const [n, t] of Object.entries(toks as Record<string, any>)) all[n] = t
}
const dark: Record<string, any> = overlay.color
type Mode = 'light' | 'dark'
const MODES: Mode[] = ['light', 'dark']
// The alias walk, independent of scripts/tokens-core.mjs: dark from the overlay, full-path
// aliases by their last segment, and the colour object's components → the hex the bridge ships.
const hex = (name: string, mode: Mode): string => {
  const v = mode === 'dark' && dark[name] ? dark[name].$value : all[name].$value
  if (typeof v === 'string') return hex(v.slice(1, -1).split('.').pop()!, mode)
  return '#' + (v.components as number[]).map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}
const get = (o: any, p: string) => p.split('.').reduce((a, k) => a?.[k], o)
const px = (n: string): number => all[n].$value.value

describe('MUI theme bridge', () => {
  it('resolves every colour role to the token $sources names, per mode', () => {
    const sources = bridge.$sources as Record<string, string>
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    for (const mode of MODES)
      for (const [path, token] of Object.entries(sources)) expect(get(bridge[mode], path), `${mode} ${path}`).toBe(hex(token, mode))
  })

  it('contains no hex that is not a token value for that mode (no raw hex)', () => {
    for (const mode of MODES) {
      const allowed = new Set(Object.keys(all).filter((n) => all[n].$type === 'color').map((n) => hex(n, mode)))
      const found: string[] = []
      JSON.stringify(bridge[mode], (_k, v) => {
        if (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v)) found.push(v)
        return v
      })
      expect(found.length).toBeGreaterThan(0)
      expect(found.filter((h) => !allowed.has(h))).toEqual([])
    }
  })

  it('maps the type ramp with px sizes, ratio line-heights and token weights', () => {
    const type = bridge.$typeSources as Record<string, string>
    expect(Object.keys(type)).toContain('button')
    for (const mode of MODES)
      for (const [variant, s] of Object.entries(type)) {
        const v = bridge[mode].typography[variant]
        expect(v.fontSize, variant).toBe(`${px(`text-${s}-size`)}px`)
        expect(v.lineHeight, variant).toBeCloseTo(px(`text-${s}-line-height`) / px(`text-${s}-size`), 6)
        expect(v.fontWeight, variant).toBe(all[`text-${s}-weight`]?.$value ?? all['font-weight-regular'].$value)
      }
    expect(bridge.light.typography.button.textTransform).toBe('none')
    expect(bridge.light.typography.caption.letterSpacing).toBe(`${px('text-meta-tracking')}px`)
    expect(bridge.light.shape.borderRadius).toBe(px('radius-4'))
    expect(bridge.light.typography.fontFamily).toBe(all['font-family-primary'].$value)
  })

  it('carries the motion tokens: two durations onto Material\'s slots, ease-out on the entering slot, ease-standard on the rest', () => {
    const ms = (n: string) => all[n].$value.value * (all[n].$value.unit === 's' ? 1000 : 1)
    const curve = `cubic-bezier(${all['ease-standard'].$value.join(', ')})`
    const entering = `cubic-bezier(${all['ease-out'].$value.join(', ')})`
    for (const mode of MODES) {
      const { duration, easing } = bridge[mode].transitions
      expect(duration.short).toBe(ms('duration-fast'))
      expect(duration.leavingScreen).toBe(ms('duration-fast'))
      expect(duration.standard).toBe(ms('duration-base'))
      expect(duration.enteringScreen).toBe(ms('duration-base'))
      for (const k of ['easeInOut', 'easeIn', 'sharp']) expect(easing[k], k).toBe(curve)
      expect(easing.easeOut).toBe(entering)
    }
  })

  it('regenerating from the source changes nothing (the bridge is not hand-edited)', () => {
    const before = readFileSync(bridgePath, 'utf8')
    execFileSync('node', ['scripts/build-tokens-mui.mjs'], { cwd: root, stdio: 'ignore' })
    expect(readFileSync(bridgePath, 'utf8')).toBe(before)
  })
})
