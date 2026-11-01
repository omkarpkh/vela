import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

// flutter/lib/vela_tokens.dart is generated from tokens/vela.tokens.json — the fourth target
// after the CSS, the Figma library and the agent docs. It is held to the same discipline as
// the CSS: every token present, every value identical, never edited by hand.
const root = resolve(process.cwd())
const doc = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))
const overlay = JSON.parse(readFileSync(resolve(root, 'tokens/vela.dark.tokens.json'), 'utf8'))
const dartPath = resolve(root, 'flutter/lib/vela_tokens.dart')
const dart = readFileSync(dartPath, 'utf8')

const ident = (n: string) => n.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
const all: Record<string, any> = {}
for (const [g, toks] of Object.entries(doc)) {
  if (g.startsWith('$')) continue
  for (const [n, t] of Object.entries(toks as Record<string, any>)) all[n] = { ...t, group: g }
}
const dark: Record<string, any> = overlay.color
// Follow aliases to the primitive, per mode — the same walk the CSS custom properties make. The
// dark value is the overlay's when it has one; an alias is a full path, and its last segment is
// the short name the Dart identifiers are built from.
const terminal = (name: string, mode: 'light' | 'dark'): string => {
  const v = mode === 'dark' && dark[name] ? dark[name].$value : all[name].$value
  return typeof v === 'string' && /^\{.+\}$/.test(v) ? terminal(v.slice(1, -1).split('.').pop()!, mode) : name
}
const hexOf = (c: { components: number[] }) => c.components.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
// `static const VelaColors light = VelaColors(\n    bgGlobal: VelaPrimitives.white,\n …);`
const instance = (which: 'light' | 'dark') => {
  const m = new RegExp(`static const VelaColors ${which} = VelaColors\\(([\\s\\S]*?)\\);`).exec(dart)
  if (!m) throw new Error(`no ${which} instance in the Dart file`)
  return Object.fromEntries([...m[1].matchAll(/(\w+): VelaPrimitives\.(\w+),/g)].map((x) => [x[1], x[2]]))
}

describe('Dart target', () => {
  it('declares every primitive with the colour the JSON holds (opaque: alpha FF, then the sRGB components as a byte each)', () => {
    for (const [name, t] of Object.entries(doc.primitives as Record<string, any>))
      expect(dart, name).toContain(`static const Color ${ident(name)} = Color(0xFF${hexOf(t.$value)});`)
  })

  it('gives every semantic a field, and light/dark instances that resolve to the same primitives as the CSS', () => {
    const light = instance('light')
    const dark = instance('dark')
    for (const name of Object.keys(doc.color)) {
      expect(dart, name).toContain(`final Color ${ident(name)};`)
      expect(light[ident(name)], `${name} light`).toBe(ident(terminal(name, 'light')))
      expect(dark[ident(name)], `${name} dark`).toBe(ident(terminal(name, 'dark')))
    }
    expect(Object.keys(light)).toHaveLength(Object.keys(doc.color).length)
    expect(Object.keys(dark)).toHaveLength(Object.keys(doc.color).length)
  })

  it('carries every sizing and typography value, as logical pixels, FontWeight, Duration or Cubic', () => {
    for (const [name, t] of Object.entries({ ...doc.sizing, ...doc.typography, ...doc.motion } as Record<string, any>)) {
      // A dimension alias (target-min names control-height-24) holds the value it resolves to.
      if (t.$type === 'dimension') expect(dart, name).toContain(`static const double ${ident(name)} = ${all[terminal(name, 'light')].$value.value};`)
      // A typography number is a weight; a sizing number (the scrim opacity, the overlay layer) a double.
      else if (t.$type === 'number' && name in doc.typography) expect(dart, name).toContain(`static const FontWeight ${ident(name)} = FontWeight.w${t.$value};`)
      else if (t.$type === 'number') expect(dart, name).toContain(`static const double ${ident(name)} = ${t.$value};`)
      else if (t.$type === 'duration') expect(dart, name).toContain(`static const Duration ${ident(name)} = Duration(milliseconds: ${t.$value.unit === 's' ? t.$value.value * 1000 : t.$value.value});`)
      // A spring's $value aliases its fallback curve; the Dart field holds the curve it resolves to.
      else if (t.$type === 'cubicBezier') expect(dart, name).toContain(`static const Cubic ${ident(name)} = Cubic(${all[terminal(name, 'light')].$value.join(', ')});`)
      else if (t.$type === 'fontFamily') expect(dart, name).toContain(`static const String ${ident(name)} = `)
      else throw new Error(`unmapped token type ${t.$type} on ${name}`)
    }
  })

  it('carries a spring\'s physics beside its fallback curve, as SpringDescription arguments', () => {
    const springs = Object.entries(doc.motion as Record<string, any>).filter(([, t]) => t.$extensions?.['com.omkarux.vela']?.spring)
    expect(springs.map(([n]) => n)).toEqual(['ease-spring'])
    for (const [name, t] of springs) {
      const s = t.$extensions['com.omkarux.vela'].spring
      for (const k of ['stiffness', 'damping', 'mass']) expect(dart, `${name} ${k}`).toContain(`static const double ${ident(name)}${k[0].toUpperCase()}${k.slice(1)} = ${s[k]};`)
    }
  })

  it('composes one TextStyle per size/line-height pair in the ramp', () => {
    const styles = Object.keys(doc.typography).filter((n) => /^text-.+-size$/.test(n)).map((n) => n.slice(5, -5))
    expect(styles.length).toBeGreaterThan(0)
    for (const s of styles) expect(dart, s).toContain(`static const TextStyle ${ident(s)} = TextStyle(`)
  })

  it('regenerating from the source changes nothing (the Dart is not hand-edited)', () => {
    const pubspec = readFileSync(resolve(root, 'flutter/pubspec.yaml'), 'utf8')
    execFileSync('node', ['scripts/build-tokens-dart.mjs'], { cwd: root, stdio: 'ignore' })
    expect(readFileSync(dartPath, 'utf8')).toBe(dart)
    expect(readFileSync(resolve(root, 'flutter/pubspec.yaml'), 'utf8')).toBe(pubspec)
  })

  // Only when a Dart SDK is on the machine — CI does not carry one, the release laptop does.
  const hasDart = spawnSync('dart', ['--version'], { stdio: 'ignore' }).status === 0
  it.skipIf(!hasDart)('parses as Dart (dart format)', () => {
    const r = spawnSync('dart', ['format', '--output=none', dartPath], { encoding: 'utf8' })
    expect(r.status, r.stderr + r.stdout).toBe(0)
  })
})
