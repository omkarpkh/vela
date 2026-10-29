import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// tokens/vela.tokens.json is the single source of truth, in the strict DTCG 2025.10 form; its
// dark values live in tokens/vela.dark.tokens.json and tokens/vela.resolver.json combines them.
// These tests make sure nobody edits the generated CSS by hand, nobody breaks the alias graph,
// and nobody slips a legacy shape (a hex string, a "120ms", a flat {grey-700}) back in. They
// read the JSON directly and walk it themselves — deliberately NOT through scripts/tokens-core.mjs,
// so the generators' reader and this proof are two independent interpretations of the same file.
const root = resolve(process.cwd())
const VENDOR = 'com.omkarux.vela'
const doc = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))
const overlay = JSON.parse(readFileSync(resolve(root, 'tokens/vela.dark.tokens.json'), 'utf8'))
const resolver = JSON.parse(readFileSync(resolve(root, 'tokens/vela.resolver.json'), 'utf8'))

const groups = Object.entries(doc).filter(([k]) => !k.startsWith('$')) as [string, Record<string, any>][]
const all: Record<string, any> = {}
const byPath: Record<string, any> = {}
for (const [g, tokens] of groups) for (const [n, t] of Object.entries(tokens)) { all[n] = { ...t, group: g, path: `${g}.${n}` }; byPath[`${g}.${n}`] = all[n] }
const dark: Record<string, any> = Object.fromEntries(Object.entries(overlay.color as Record<string, any>).filter(([k]) => !k.startsWith('$')))
const isAlias = (v: unknown): v is string => typeof v === 'string' && /^\{.+\}$/.test(v)
const hexOf = (c: { components: number[] }) => '#' + c.components.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')

describe('token source', () => {
  it('has every token the CSS declares, and no more', () => {
    const css = readFileSync(resolve(root, 'src/styles/tokens.light.css'), 'utf8')
    const declared = [...css.matchAll(/--vela-([a-z0-9-]+)\s*:/g)].map((m) => m[1])
    expect(new Set(declared)).toEqual(new Set(Object.keys(all)))
  })

  it('every alias — light and dark — is a full path to a token that exists and has the same $type', () => {
    const bad: string[] = []
    const check = (where: string, v: unknown, type: string) => {
      if (!isAlias(v)) return
      const target = v.slice(1, -1)
      if (!target.includes('.')) bad.push(`${where} → ${v} is not a full path`)
      else if (!byPath[target]) bad.push(`${where} → ${v} points at nothing`)
      else if (byPath[target].$type !== type) bad.push(`${where} → ${v} crosses from ${type} to ${byPath[target].$type}`)
    }
    for (const t of Object.values(all)) check(t.path, t.$value, t.$type)
    for (const [n, t] of Object.entries(dark)) check(`dark ${n}`, t.$value, 'color')
    expect(bad).toEqual([])
  })

  it('primitives hold sRGB colour objects whose 6-digit hex agrees with the components; semantics hold aliases — never the other way round', () => {
    for (const [name, t] of Object.entries(doc.primitives as Record<string, any>)) {
      expect(t.$type, name).toBe('color')
      expect(t.$value.colorSpace, name).toBe('srgb')
      expect(t.$value.components, name).toHaveLength(3)
      for (const c of t.$value.components) expect(c, name).toBeGreaterThanOrEqual(0), expect(c, name).toBeLessThanOrEqual(1)
      expect(t.$value.hex, name).toMatch(/^#[0-9a-f]{6}$/)
      expect(t.$value.hex, name).toBe(hexOf(t.$value))
      expect(t.$value.alpha ?? 1, name).toBe(1)
    }
    const rawInSemantic = Object.entries(doc.color as Record<string, any>).filter(([, t]) => !isAlias(t.$value))
    expect(rawInSemantic.map(([n]) => n)).toEqual([])
  })

  it('no legacy value shape anywhere: colours are objects, durations and dimensions are { value, unit }', () => {
    const legacy: string[] = []
    for (const t of Object.values(all)) {
      const v = t.$value
      if (isAlias(v)) continue
      if (t.$type === 'color' && typeof v !== 'object') legacy.push(`${t.path}: colour ${JSON.stringify(v)}`)
      if (t.$type === 'duration' && !(typeof v === 'object' && typeof v.value === 'number' && ['ms', 's'].includes(v.unit))) legacy.push(`${t.path}: duration ${JSON.stringify(v)}`)
      if (t.$type === 'dimension' && !(typeof v === 'object' && typeof v.value === 'number' && ['px', 'rem'].includes(v.unit))) legacy.push(`${t.path}: dimension ${JSON.stringify(v)}`)
      if (t.$type === 'cubicBezier' && !(Array.isArray(v) && v.length === 4)) legacy.push(`${t.path}: cubicBezier ${JSON.stringify(v)}`)
      if (t.$type === 'number' && typeof v !== 'number') legacy.push(`${t.path}: number ${JSON.stringify(v)}`)
    }
    expect(legacy).toEqual([])
  })

  it('vendor data lives under the reverse-domain key only, with no dark value hiding in it', () => {
    const bad: string[] = []
    for (const t of Object.values(all)) {
      for (const k of Object.keys(t.$extensions ?? {})) if (k !== VENDOR) bad.push(`${t.path}: $extensions.${k}`)
      for (const k of Object.keys(t.$extensions?.[VENDOR] ?? {})) if (!['figma', 'raw'].includes(k)) bad.push(`${t.path}: ${VENDOR}.${k}`)
    }
    expect(bad).toEqual([])
    expect(JSON.stringify(doc)).not.toContain('"vela":')
    expect(JSON.stringify(doc)).not.toContain('"dark":')
  })

  it('every token carries the Figma variable name the sync needs', () => {
    const missing = Object.entries(all)
      .filter(([, t]) => ['color', 'dimension', 'number', 'duration', 'cubicBezier'].includes(t.$type))
      .filter(([, t]) => !t.$extensions?.[VENDOR]?.figma)
      .map(([n]) => n)
    expect(missing).toEqual([])
  })

  it('Figma names follow each collection’s naming convention — the drift check depends on it', () => {
    // Found by the read-back: 46 numeric tokens carried names like text/h1-size where the
    // library has size/h1. Values matched, names did not, and nothing had checked the names.
    const RULE: Record<string, RegExp> = {
      color: /^(surface|border|text|icon|button|control|severity|risk|status|focus)\//,
      // `control/` carries the Checkbox and Radio geometry (control/checkbox/size, control/radio/dot) since Phase 1.
      // `popover/`, `dialog/`, `tooltip/`, `opacity/` and `layer/` carry the overlay geometry since Phase 1.
      // `toast/` carries the Toast width since Phase 1.
      sizing: /^(space|icon|control-height|control|radius|focus|stroke|field|toggle|status|popover|dialog|tooltip|opacity|layer|toast)\//,
      typography: /^(size|line-height|weight|tracking)\//,
      // `delay/tooltip` is a wait before an overlay opens, not an animation, so it is not a duration/.
      motion: /^(duration|easing|blur|delay)\//,
    }
    const bad: string[] = []
    for (const [group, re] of Object.entries(RULE))
      for (const [n, t] of Object.entries(doc[group] as Record<string, any>)) {
        if (!['color', 'dimension', 'number', 'duration', 'cubicBezier'].includes(t.$type)) continue
        const f = t.$extensions?.[VENDOR]?.figma
        if (!f || !re.test(f)) bad.push(`${group}/${n} → ${f}`)
      }
    expect(bad).toEqual([])
  })

  it('the dark overlay re-points semantic colours only, each a real change, each carrying only its $value', () => {
    expect(Object.keys(overlay).filter((k) => !k.startsWith('$'))).toEqual(['color'])
    expect(overlay.color.$type).toBe('color')
    expect(Object.keys(dark).length).toBeGreaterThan(50)
    const bad: string[] = []
    for (const [n, t] of Object.entries(dark)) {
      const b = all[n]
      if (!b || b.group !== 'color') bad.push(`${n}: not a semantic colour`)
      else if (t.$value === b.$value) bad.push(`${n}: same as light`)
      if (Object.keys(t).join() !== '$value') bad.push(`${n}: carries ${Object.keys(t).join(', ')}`)
    }
    expect(bad).toEqual([])
    // the one place the dark theme used to be a mirror: these two differ, so they are here
    expect(dark['bg-global'].$value).toBe('{primitives.grey-950}')
    expect(dark['btn-primary-hover-bg'].$value).toBe('{primitives.primary-450}')
    // and a colour whose dark alias equals its light alias is NOT here
    expect(all['primary-active-bg'].$value).toBe('{primitives.primary-500}')
    expect(dark['primary-active-bg']).toBeUndefined()
  })

  it('the resolver combines the two files: one base set, a theme modifier with light (default, nothing overlaid) and dark', () => {
    expect(resolver.$schema).toBe('https://www.designtokens.org/schemas/2025.10/resolver.json')
    // the module’s prose says 2025-10-01 in one section and 2025-11-01 in another; its published
    // JSON Schema and Terrazzo both require "2025.10"
    expect(resolver.version).toBe('2025.10')
    expect(resolver.resolutionOrder).toEqual([{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }])
    expect(resolver.sets.base.sources).toEqual([{ $ref: 'vela.tokens.json' }])
    expect(resolver.modifiers.theme.default).toBe('light')
    expect(resolver.modifiers.theme.contexts).toEqual({ light: [], dark: [{ $ref: 'vela.dark.tokens.json' }] })
    for (const ref of ['vela.tokens.json', 'vela.dark.tokens.json']) expect(existsSync(resolve(root, 'tokens', ref)), ref).toBe(true)
    for (const file of [doc, overlay]) expect(file.$schema).toBe('https://www.designtokens.org/schemas/2025.10/format.json')
  })

  it('regenerating the CSS from the source changes nothing (the CSS is not hand-edited)', () => {
    const light = readFileSync(resolve(root, 'src/styles/tokens.light.css'), 'utf8')
    const darkCss = readFileSync(resolve(root, 'src/styles/tokens.dark.body.css'), 'utf8')
    execFileSync('node', ['scripts/build-tokens.mjs'], { cwd: root, stdio: 'ignore' })
    expect(readFileSync(resolve(root, 'src/styles/tokens.light.css'), 'utf8')).toBe(light)
    expect(readFileSync(resolve(root, 'src/styles/tokens.dark.body.css'), 'utf8')).toBe(darkCss)
  })

  it('the dark CSS declares exactly the overlay’s re-pointed aliases, and the light values for the rest', () => {
    const darkCss = readFileSync(resolve(root, 'src/styles/tokens.dark.body.css'), 'utf8')
    for (const [name, decl] of [...darkCss.matchAll(/--vela-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]])) {
      const v = dark[name]?.$value ?? all[name].$value
      expect(decl, name).toBe(`var(--vela-${(v as string).slice(1, -1).split('.').pop()})`)
    }
  })
})
