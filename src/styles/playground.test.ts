import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { implementationsOf, literalsOf, parseSpec, printJsx, splitRow } from '../../demo/playground/spec'

// The playground's controls, token pane and rules are parsed out of the specs. These tests
// hold the specs to a shape the parser can read, and catch a spec naming a token that does
// not exist — the one contract check nothing else was making.
const root = resolve(process.cwd())
const dir = resolve(root, 'guidelines/components')
const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
const tokens = JSON.parse(readFileSync(resolve(root, 'tokens/vela.tokens.json'), 'utf8'))
const known = new Set<string>()
for (const [g, toks] of Object.entries(tokens)) if (!g.startsWith('$')) for (const n of Object.keys(toks as object)) if (!n.startsWith('$')) known.add(`--vela-${n}`)

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

  it('reads no prop rows out of a code block in the Props section', () => {
    // brand-mark.md writes its types as a union, one member per line, each starting with a pipe.
    const spec = parseSpec(readFileSync(resolve(dir, 'brand-mark.md'), 'utf8'))
    expect(spec.props.map((p) => p.prop)).toEqual(['name', 'size', 'label', 'decorative'])
    const iconButton = parseSpec(readFileSync(resolve(dir, 'icon-button.md'), 'utf8'))
    expect(iconButton.props.every((p) => /^[a-zA-Z]+$/.test(p.prop))).toBe(true)
  })

  it('lists the values of a literal type, and none for a free one', () => {
    expect(literalsOf('`"top" | "bottom"`')).toEqual(['top', 'bottom'])
    expect(literalsOf('`1 | 2 | 3`')).toEqual([1, 2, 3])
    expect(literalsOf('`"npm"`')).toEqual(['npm'])
    expect(literalsOf('`true`')).toEqual([true])
    for (const free of ['`string`', '`boolean`', '`ReactNode`', '`(v) => void`', '`boolean | "page"`', '`{ label: string }`'])
      expect(literalsOf(free), free).toBeUndefined()
  })

  it('splits a row that names two props or two parts', () => {
    const [value, onValueChange] = splitRow({ part: 'Tabs', prop: 'value / onValueChange', type: '`string` / `(v) => void`', notes: 'n' })
    expect(value).toMatchObject({ part: 'Tabs', prop: 'value', type: '`string`' })
    expect(onValueChange).toMatchObject({ part: 'Tabs', prop: 'onValueChange', type: '`(v) => void`' })
    expect(splitRow({ part: 'Table.Head / Table.Body', prop: 'children', type: '`ReactNode`', notes: '' }).map((r) => [r.part, r.type]))
      .toEqual([['Table.Head', '`ReactNode`'], ['Table.Body', '`ReactNode`']])
    expect(splitRow({ prop: 'size', type: '`"a" | "b"`', notes: '' })).toEqual([{ prop: 'size', type: '`"a" | "b"`', notes: '' }])
  })

  it('reads the Implementations table by its column names', () => {
    const spec = parseSpec(readFileSync(resolve(dir, 'tabs.md'), 'utf8'))
    expect(implementationsOf(spec).map((r) => [r.entry, r.status])).toEqual([['@omkarux/vela', 'Approved'], ['@omkarux/vela/headless', 'Experimental']])
    expect(implementationsOf(parseSpec(readFileSync(resolve(dir, 'button.md'), 'utf8')))).toEqual([])
  })

  it('prints JSX without defaults or empties', () => {
    const out = printJsx('Button', { variant: 'primary', size: 'regular', disabled: false, loading: true }, { size: 'regular', disabled: false }, 'Save', { icon: '<PlusIcon />' })
    expect(out).toBe('<Button variant="primary" loading icon={<PlusIcon />}>\n  Save\n</Button>')
  })
})
