import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseSpec, printJsx } from '../../demo/playground/spec'

// The playground's controls, token pane and rules are parsed out of the specs. These tests
// hold the specs to a shape the parser can read, and catch a spec naming a token that does
// not exist — the one contract check nothing else was making.
const root = resolve(process.cwd())
const dir = resolve(root, 'guidelines/components')
const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
const tokens = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))
const known = new Set<string>()
for (const [g, toks] of Object.entries(tokens)) if (!g.startsWith('$')) for (const n of Object.keys(toks as object)) known.add(`--vela-${n}`)

describe('playground spec parser', () => {
  it.each(files)('%s parses into controls and names only tokens that exist', (file) => {
    const spec = parseSpec(readFileSync(resolve(dir, file), 'utf8'), [...known])
    expect(spec.title.length).toBeGreaterThan(0)
    expect(spec.tokens.length, `${file} names no tokens`).toBeGreaterThan(0)
    expect(spec.props.length).toBeGreaterThan(0)
    expect(spec.controls.length).toBeGreaterThan(0)
    expect(spec.tokens.filter((t) => !known.has(t)), `${file} names unknown tokens`).toEqual([])
  })

  it('reads the Button prop sets exactly as the type declares them', () => {
    const spec = parseSpec(readFileSync(resolve(dir, 'button.md'), 'utf8'))
    const c = (p: string) => spec.controls.find((x) => x.prop === p)
    expect(c('variant')?.options).toEqual(['primary', 'standard', 'destructive'])
    expect(c('appearance')?.options).toEqual(['filled', 'hollow', 'text-link'])
    expect(c('size')?.options).toEqual(['tiny', 'regular', 'large', 'huge'])
    expect(c('size')?.default).toBe('regular')
    expect(c('disabled')).toMatchObject({ kind: 'boolean', default: false })
    expect(c('icon')).toMatchObject({ kind: 'boolean' })
    expect(c('children')).toMatchObject({ kind: 'text' })
    expect(spec.bindings['primary · filled']?.Background).toBe('--vela-btn-primary-bg')
  })

  it('expands a token pattern against the real names', () => {
    const spec = parseSpec(readFileSync(resolve(dir, 'contextual-alert.md'), 'utf8'), [...known])
    expect(spec.tokens).toContain('--vela-bg-severity-critical')
    expect(spec.tokens.filter((t) => t.endsWith('-'))).toEqual([])
  })

  it('reads a Composition table and keeps only the root part as controls', () => {
    const spec = parseSpec(readFileSync(resolve(dir, 'tabs.md'), 'utf8'))
    expect(spec.props.some((p) => p.part === 'Tabs.Trigger' && p.prop === 'count')).toBe(true)
    expect(spec.controls.map((c) => c.prop)).toEqual(['defaultValue', 'size'])
  })

  it('prints JSX without defaults or empties', () => {
    const out = printJsx('Button', { variant: 'primary', size: 'regular', disabled: false, loading: true }, { size: 'regular', disabled: false }, 'Save', { icon: '<PlusIcon />' })
    expect(out).toBe('<Button variant="primary" loading icon={<PlusIcon />}>\n  Save\n</Button>')
  })
})
