import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { REGISTRY, type Values } from '../../demo/playground/registry'
import { parseSpec } from '../../demo/playground/spec'
import { liveProps, heldProps, rangeAt, cross } from '../../demo/playground/live'
import { RangeStage } from '../../demo/playground/RangeStage'
import { Stage } from '../../demo/shell/Stage'

// Slice 3 of the playground uplift: the component stage on every Playground tab (s5-tabs, level 4).
// The Live caption says the closed props on show, from the Props table only; the resting stage shows
// the range from the table's own values, and the spec's locks decide what it leaves out.

const entry = (id: string) => REGISTRY.find((e) => e.id === id)!
const specOf = (id: string) => parseSpec(entry(id).spec)
/** The Props table's controls the page shows: what the caption may write. */
const tableControls = (id: string) => specOf(id).controls.filter((c) => !entry(id).hide?.includes(c.prop) && !entry(id).noControl?.includes(c.prop))
const seeded = (id: string): Values => {
  const e = entry(id)
  const out: Values = {}
  for (const c of [...tableControls(id), ...(e.extra ?? [])]) out[c.prop] = e.seed[c.prop] ?? c.default
  return { ...out, ...e.seed }
}

describe('the Live caption', () => {
  it('writes the tag and every closed prop on show, defaults included, as the design draws it', () => {
    expect(liveProps('Tabs', tableControls('tabs'), seeded('tabs'))).toBe('<Tabs size="regular">')
    expect(liveProps('Tabs', tableControls('tabs'), { ...seeded('tabs'), size: 'large' })).toBe('<Tabs size="large">')
  })

  it('writes a switch only when it is on, and a slot as an expression, never as true', () => {
    const v = seeded('button')
    expect(liveProps('Button', tableControls('button'), v)).toBe('<Button variant="primary" appearance="filled" size="regular" icon={…}>')
    expect(liveProps('Button', tableControls('button'), { ...v, icon: false, disabled: true })).toBe('<Button variant="primary" appearance="filled" size="regular" disabled>')
  })

  it('never writes free text or a stage-only control', () => {
    // Icon Button's glyph is a stage choice, not a prop; its label is free text.
    const caption = liveProps('IconButton', tableControls('icon-button'), seeded('icon-button'))
    expect(caption).not.toMatch(/glyph|label=/)
    expect(liveProps('Input', tableControls('input'), seeded('input'))).not.toMatch(/Tenant name|hint=/)
  })

  it('every prop the caption writes is a row of the Props table, with a value from it', () => {
    for (const e of REGISTRY) {
      if (e.live) continue
      const spec = specOf(e.id)
      const caption = liveProps(e.src, tableControls(e.id), seeded(e.id))
      for (const [, prop, value] of caption.matchAll(/ (\w+)="([^"]*)"/g)) {
        const c = spec.controls.find((x) => x.prop === prop)
        expect(c, `${e.id}: ${prop}`).toBeDefined()
        expect(c!.options, `${e.id}: ${prop}="${value}"`).toContain(value)
      }
    }
  })

  it('a toast is said as the call that raises it', () => {
    expect(entry('toast').live!(seeded('toast'))).toBe("toast.add({ severity: 'success' })")
  })
})

describe('the resting stage: the range', () => {
  const withRange = REGISTRY.filter((e) => e.range).map((e) => e.id)

  it('is on the components whose live stage shows one instance, and not where the stage already shows the range', () => {
    expect(withRange).toEqual(['button', 'toggle', 'input', 'contextual-alert', 'status-indicator', 'risk-pill', 'checkbox'])
    // Tabs' demo, Table's rows, and Icon's, Icon Button's and Brand Mark's sets already show it.
    for (const id of ['tabs', 'table', 'icon', 'icon-button', 'brand-mark']) expect(entry(id).range).toBeUndefined()
  })

  it.each(withRange)('%s: every value it sets is one the Props table allows', (id) => {
    const controls = [...specOf(id).controls, ...(entry(id).extra ?? [])]
    const items = entry(id).range!.items(controls)
    expect(items.length).toBeGreaterThan(1)
    for (const item of items)
      for (const [prop, value] of Object.entries(item.patch)) {
        const c = controls.find((x) => x.prop === prop)
        expect(c, `${id}: ${prop}`).toBeDefined()
        if (c!.kind === 'select') expect(c!.options).toContain(value)
        if (c!.kind === 'boolean') expect(typeof value).toBe('boolean')
      }
  })

  it("Button: text-link is primary only, so the range holds seven forms, and an icon leaves text-link out, in the rule's words", () => {
    const e = entry('button')
    const items = e.range!.items(specOf('button').controls)
    expect(items.map((i) => i.name)).toEqual(['primary, filled', 'primary, hollow', 'primary, text-link', 'standard, filled', 'standard, hollow', 'destructive, filled', 'destructive, hollow'])
    const plain = rangeAt(items, { ...seeded('button'), icon: false }, e.locks, e.constrain)
    expect(plain.shown).toHaveLength(7)
    expect(plain.left).toEqual([])
    const iconed = rangeAt(items, seeded('button'), e.locks, e.constrain)
    expect(iconed.shown.map((s) => s.item.name)).not.toContain('primary, text-link')
    expect(iconed.left).toEqual(['text-link never carries an icon.'])
  })

  it('the range caption holds still what the range does not run across', () => {
    const items = entry('button').range!.items(specOf('button').controls)
    expect(heldProps('Button', tableControls('button'), seeded('button'), items)).toBe('<Button size="regular" icon={…}>')
  })

  it('cross gives every combination, the first prop changing slowest', () => {
    expect(cross({ a: ['1', '2'], b: ['x', 'y'] }).map((i) => i.name)).toEqual(['1, x', '1, y', '2, x', '2, y'])
  })

  it('renders each form inert and unheard, with its name in words; a form that says its own word is named for readers only', () => {
    const e = entry('risk-pill')
    const items = e.range!.items(specOf('risk-pill').controls)
    const { shown } = rangeAt(items, seeded('risk-pill'))
    render(<RangeStage entry={e} shown={shown} left={[]} across="risk" held="<RiskPill size=&quot;regular&quot;>" frames={['light']} reduced={false} settings={{}} onReset={() => {}} />)
    const region = screen.getByRole('region', { name: 'The range' })
    const list = within(region).getByRole('list', { name: 'Risk Pill, every risk' })
    const cells = within(list).getAllByRole('listitem')
    expect(cells.map((c) => c.textContent)).toEqual(['Low' + 'low', 'Medium' + 'medium', 'High' + 'high'])
    for (const c of cells) {
      const pic = c.querySelector('.pg-range__pic')!
      expect(pic).toHaveAttribute('inert')
      expect(pic).toHaveAttribute('aria-hidden', 'true')
      expect(c.querySelector('.vela-sr-only')).not.toBeNull()
    }
  })

  it('says what the settings leave out, under the plate', () => {
    const e = entry('button')
    const items = e.range!.items(specOf('button').controls)
    const r = rangeAt(items, seeded('button'), e.locks, e.constrain)
    render(<RangeStage entry={e} shown={r.shown} left={r.left} across="variant and appearance" held="" frames={['light', 'dark']} reduced={false} settings={{}} onReset={() => {}} />)
    expect(screen.getByText('Not in the range with these settings: text-link never carries an icon.')).toBeInTheDocument()
    // Compare on Themes: one row per theme, each named for it.
    expect(screen.getByRole('list', { name: 'Button, every variant and appearance, light' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Button, every variant and appearance, dark' })).toBeInTheDocument()
  })
})

describe('the stage on the page', () => {
  it('the Stage part carries its step in the arrival, so the stage lands first', () => {
    render(<Stage props="<Button>" arrive="1"><button type="button">Save</button></Stage>)
    expect(screen.getByRole('region', { name: 'Live demo' })).toHaveAttribute('data-arrive', '1')
  })

  it('on a phone, focus inside the pinned plate never scrolls the page (slice 2 finding)', () => {
    const css = readFileSync(resolve(process.cwd(), 'demo/playground.css'), 'utf8')
    expect(css).toMatch(/\.pg:not\(\.is-unpinned\) \.pg-stage-region \* \{ scroll-margin-top: calc\(-1 \* \(var\(--pg-strip, var\(--pg-strip-height\)\) \+ var\(--vela-space-10\)\)\); \}/)
    expect(css).toMatch(/scroll-padding-top: calc\(var\(--site-topbar-height\) \+ var\(--pg-strip, var\(--pg-strip-height\)\) \+ var\(--vela-space-10\)\)/)
  })
})
