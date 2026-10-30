import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { rulesOf, dependenciesFor, figmaSetFor, dateWords, builtLine } from '../../demo/playground/facts'
import { statusOf } from '../../demo/playground/status'
import { parseHash, href, sameRoute } from '../../demo/router'

// Playground slice 1 (playground spec, section 4): the contract facts grid reads only what the
// repository already holds, and the page tabs have addresses that keep every old link working.
const dir = resolve(process.cwd(), 'guidelines/components')
const spec = (f: string) => readFileSync(resolve(dir, f), 'utf8')
const { version } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))

describe('the contract facts', () => {
  it('counts every rule tag in a spec by its level, the levels in the Rules tab order', () => {
    const r = rulesOf('a [[rule: a-one | compiler]] b [[rule: a-two | browser]] [[rule: a-three|compiler]] [[rule: a-four | convention]]')
    expect(r.total).toBe(4)
    expect(r.byLevel.map((l) => `${l.count} ${l.words}`)).toEqual(['2 compiler', '1 browser test', '1 convention'])
  })

  it('agrees with the rule checker on every spec: the per-spec counts sum to its total', () => {
    let total = 0
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const r = rulesOf(spec(f))
      expect(r.byLevel.reduce((n, l) => n + l.count, 0), f).toBe(r.total)
      total += r.total
    }
    // The same number `npm run rules:check` prints ("N rules across 17 specs").
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8')
    expect(readme).toContain(`of the ${total} by the TypeScript compiler`)
  })

  it('names the dependencies by entry: none for core, the optional peer for headless', () => {
    expect(dependenciesFor('@omkarux/vela')).toBe('None at runtime')
    expect(dependenciesFor('@omkarux/vela/headless')).toBe('@base-ui/react, an optional peer')
  })

  it('links a Figma set only when the library has one with a node', () => {
    expect(figmaSetFor('button.md')?.url).toMatch(/node-id=7-122$/)
    expect(figmaSetFor('dropdown-list.md')).toBeUndefined()
    expect(figmaSetFor('no-such.md')).toBeUndefined()
  })

  it('reads the status from the spec: Experimental where the spec says so, Approved by default', () => {
    expect(statusOf(spec('dropdown-list.md')).label).toBe('Experimental')
    expect(statusOf(spec('button.md')).label).toBe('Approved')
  })

  it('says which build the proofs are from: version, commit and UTC date', () => {
    expect(dateWords('2026-10-29')).toBe('29 Oct 2026')
    expect(dateWords(undefined)).toBeUndefined()
    expect(dateWords('yesterday')).toBeUndefined()
    expect(builtLine('f3d8844', '2026-10-29')).toBe(`${version} · f3d8844 · 29 Oct 2026`)
    expect(builtLine('unknown', undefined)).toBe(`${version} · unknown`)
  })
})

describe('page tab addresses', () => {
  it('keeps the old address for the Playground tab and adds a segment for the others', () => {
    expect(parseHash('#/components/button')).toEqual({ kind: 'component', id: 'button' })
    expect(parseHash('#/components/button/rules')).toEqual({ kind: 'component', id: 'button', tab: 'rules' })
    expect(href({ kind: 'component', id: 'button', tab: 'tokens' })).toBe('#/components/button/tokens')
    expect(href({ kind: 'component', id: 'button' })).toBe('#/components/button')
  })

  it('ignores an unknown tab and the shared-link query, so such a link still opens the page', () => {
    expect(parseHash('#/components/button/nope')).toEqual({ kind: 'component', id: 'button' })
    expect(parseHash('#/components/button?v=1&variant=destructive')).toEqual({ kind: 'component', id: 'button' })
    expect(parseHash('#/components/button/rules?v=1')).toEqual({ kind: 'component', id: 'button', tab: 'rules' })
  })

  it('treats a component tab as the same page, so its nav link stays current', () => {
    expect(sameRoute({ kind: 'component', id: 'button', tab: 'rules' }, { kind: 'component', id: 'button' })).toBe(true)
    expect(sameRoute({ kind: 'component', id: 'button' }, { kind: 'component', id: 'toggle' })).toBe(false)
  })
})
