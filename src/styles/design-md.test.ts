import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadTokenSet } from '../../scripts/tokens-core.mjs'
import { FILE, BLOCKS, renderDesign, statedValues, handWrittenLines } from '../../scripts/build-design-md.mjs'

// DESIGN.md's token tables are generated from tokens/vela.tokens.json (scripts/build-design-md.mjs,
// run by npm run tokens). Everything else in it is hand-written, and a hand-written line never
// states a token's value: the line says when to use the token, the table says what it is.
const root = resolve(process.cwd())
const set = loadTokenSet(root)
const md = readFileSync(resolve(root, FILE), 'utf8')

describe('DESIGN.md token tables', () => {
  it('are up to date with the token file (run npm run tokens)', () => {
    expect(renderDesign(md, set) === md, `${FILE}'s generated token tables are stale: run npm run tokens`).toBe(true)
  })

  it('has every generated block, each once', () => {
    for (const name of Object.keys(BLOCKS)) expect(md.split(`<!-- generated:${name} (npm run tokens) -->`).length - 1, name).toBe(1)
  })

  it('lists every font family, duration, delay and easing, and every step of the four scales', () => {
    for (const n of ['font-family-primary', 'font-family-display', 'font-family-mono', 'duration-instant', 'duration-travel', 'delay-tooltip', 'ease-standard', 'ease-spring', 'space-25', 'radius-full', 'icon-size-large', 'control-height-60'])
      expect(md).toContain(`| \`--vela-${n}\` |`)
  })

  it('has no hand-written line that names a token and states its value', () => {
    const hits = statedValues(md, set).map((h: { n: number; token: string; value: string }) => `${FILE}:${h.n} ${h.token} states ${h.value}`)
    expect(hits, hits.join('\n')).toEqual([])
  })
})

describe('what states a token value', () => {
  const hits = (line: string) => statedValues(line, set).map((h: { token: string; value: string }) => `${h.token} ${h.value}`)

  it('catches a duration, a curve, a length, a font stack and a spring written beside the token', () => {
    expect(hits('- `--vela-duration-base` (180ms): anything that settles.')).toEqual(['--vela-duration-base 180ms'])
    expect(hits('`--vela-ease-standard` `cubic-bezier(0.2,0,0.2,1)`')).toEqual(['--vela-ease-standard cubic-bezier(0.2, 0, 0.2, 1)'])
    expect(hits('`--vela-space-10` is 10px.')).toEqual(['--vela-space-10 10px'])
    expect(hits('`--vela-font-family-mono`: `ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace`')).toHaveLength(1)
    expect(hits('`--vela-ease-spring`, a spring (stiffness 1200)')).toEqual(['--vela-ease-spring stiffness 1200'])
  })

  it('passes the token on its own, another token\'s value, a longer number and a name that is not a token', () => {
    expect(hits('- `--vela-duration-base`: anything that settles or appears.')).toEqual([])
    expect(hits('`--vela-control-height-48` for Button `huge` → huge is 60px')).toEqual([])
    expect(hits('`--vela-space-10` is not 110px')).toEqual([])
    expect(hits('`--vela-text-meta-*` at 12px')).toEqual([])
  })

  it('skips what is inside a generated block', () => {
    const doc = ['before', '<!-- generated:motion (npm run tokens) -->', '| `--vela-duration-base` | `180ms` |', '<!-- /generated -->', 'after'].join('\n')
    expect(handWrittenLines(doc).map((l: { line: string }) => l.line)).toEqual(['before', 'after'])
    expect(hits(doc)).toEqual([])
  })
})
