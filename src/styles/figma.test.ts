import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// scripts/sync-figma.mjs compiles tokens/vela.tokens.json into the Plugin API script that writes the
// Figma library — the target that cannot be diffed in git, so its compiler is held here instead.
const root = resolve(process.cwd())
const doc = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))
const script = execFileSync('node', [resolve(root, 'scripts/sync-figma.mjs')], { encoding: 'utf8' })
const entries: any[] = JSON.parse(script.match(/const ENTRIES = (\[.*?\]);\n/s)![1])
const byCss = Object.fromEntries(entries.map((e) => [e.css, e]))

describe('Figma sync: the motion tokens use Figma\'s own motion types', () => {
  it('a duration becomes a TIMING variable in seconds', () => {
    for (const [css, t] of Object.entries<any>(doc.motion)) {
      if (t.$type !== 'duration') continue
      const e = byCss[css]
      expect(e, css).toBeDefined()
      expect(e.collection).toBe('Motion')
      expect(e.type).toBe('TIMING')
      expect(e.light).toBeCloseTo(parseInt(t.$value) / 1000, 6)
    }
    expect(byCss['duration-fast'].light).toBe(0.12)
  })

  it('the curve becomes an EASING variable holding the same cubic-bezier', () => {
    const t = doc.motion['ease-standard']
    const e = byCss['ease-standard']
    expect(e.type).toBe('EASING')
    expect(e.light).toEqual({
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1: t.$value[0], y1: t.$value[1], x2: t.$value[2], y2: t.$value[3] },
    })
  })

  it('motion variables carry no scopes: Figma refuses scopes on TIMING and EASING, the type decides where they are offered', () => {
    for (const e of entries.filter((e) => e.collection === 'Motion')) expect(e.scopes, e.css).toBeNull()
    expect(script).toContain('if (e.scopes) v.scopes = e.scopes;')
  })

  it('a variable whose type changed is recreated, never edited in place', () => {
    expect(script).toContain("if (v && v.resolvedType !== e.type) { v.remove(); v = null; retyped++; }")
  })

  it('nothing else changed type: colours are COLOR, every other number is FLOAT', () => {
    for (const e of entries) {
      if (e.collection === 'Motion') continue
      expect(e.type, e.css).toBe(e.collection === 'Color' || e.collection === 'Primitives' && typeof e.light === 'string' && e.light.startsWith('#') ? 'COLOR' : 'FLOAT')
    }
  })
})
