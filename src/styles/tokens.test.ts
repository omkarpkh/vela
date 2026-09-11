import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// tokens/vela.tokens.json is the single source of truth. These tests make sure
// nobody edits the generated CSS by hand and nobody breaks the alias graph.
const root = resolve(process.cwd())
const doc = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))

const groups = Object.entries(doc).filter(([k]) => !k.startsWith('$')) as [string, Record<string, any>][]
const all: Record<string, any> = {}
for (const [g, tokens] of groups) for (const [n, t] of Object.entries(tokens)) all[n] = { ...t, group: g }

describe('token source', () => {
  it('has every token the CSS declares, and no more', () => {
    const css = readFileSync(resolve(root, 'src/styles/tokens.light.css'), 'utf8')
    const declared = [...css.matchAll(/--vela-([a-z0-9-]+)\s*:/g)].map((m) => m[1])
    expect(new Set(declared)).toEqual(new Set(Object.keys(all)))
  })

  it('every alias points at a token that exists', () => {
    const dangling: string[] = []
    for (const [name, t] of Object.entries(all)) {
      for (const v of [t.$value, t.$extensions?.vela?.dark]) {
        if (typeof v === 'string' && /^\{.+\}$/.test(v) && !all[v.slice(1, -1)]) dangling.push(`${name} → ${v}`)
      }
    }
    expect(dangling).toEqual([])
  })

  it('primitives hold raw values and semantics hold aliases — never the other way round', () => {
    for (const [name, t] of Object.entries(doc.primitives as Record<string, any>))
      expect(t.$value, name).toMatch(/^#[0-9a-f]{6}$/)
    const rawInSemantic = Object.entries(doc.color as Record<string, any>).filter(([, t]) => !/^\{.+\}$/.test(t.$value))
    expect(rawInSemantic.map(([n]) => n)).toEqual([])
  })

  it('every token carries the Figma variable name the sync needs', () => {
    const missing = Object.entries(all)
      .filter(([, t]) => t.$type === 'color' || t.$type === 'dimension' || t.$type === 'number')
      .filter(([, t]) => !t.$extensions?.vela?.figma)
      .map(([n]) => n)
    expect(missing).toEqual([])
  })


  it('Figma names follow each collection’s naming convention — the drift check depends on it', () => {
    // Found by the read-back: 46 numeric tokens carried names like text/h1-size where the
    // library has size/h1. Values matched, names did not, and nothing had checked the names.
    const RULE: Record<string, RegExp> = {
      color: /^(surface|border|text|icon|button|control|severity|risk|status|focus)\//,
      sizing: /^(space|icon|control-height|radius|focus)\//,
      typography: /^(size|line-height|weight|tracking)\//,
    }
    const bad: string[] = []
    for (const [group, re] of Object.entries(RULE))
      for (const [n, t] of Object.entries(doc[group] as Record<string, any>)) {
        if (!['color', 'dimension', 'number'].includes(t.$type)) continue
        const f = t.$extensions?.vela?.figma
        if (!f || !re.test(f)) bad.push(`${group}/${n} → ${f}`)
      }
    expect(bad).toEqual([])
  })

  it('regenerating the CSS from the source changes nothing (the CSS is not hand-edited)', () => {
    const light = readFileSync(resolve(root, 'src/styles/tokens.light.css'), 'utf8')
    const dark = readFileSync(resolve(root, 'src/styles/tokens.dark.body.css'), 'utf8')
    execFileSync('node', ['scripts/build-tokens.mjs'], { cwd: root, stdio: 'ignore' })
    expect(readFileSync(resolve(root, 'src/styles/tokens.light.css'), 'utf8')).toBe(light)
    expect(readFileSync(resolve(root, 'src/styles/tokens.dark.body.css'), 'utf8')).toBe(dark)
  })
})
