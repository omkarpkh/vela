import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseSpec } from '../../demo/playground/spec'
import { createElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import { propsOf, statesOf, keyboardOf, SpecSections, NO_CONTROL_REASON } from '../../demo/playground/SpecSections'
import { RULE_SECTIONS, rulesFromSpec } from '../../demo/playground/rules-read'
import { REGISTRY } from '../../demo/playground/registry'
import { INDEX_MIN } from '../../demo/shell/SectionIndex'

// Slice 7 (s5-tabs, Playground tab): Props, States and Keyboard, read from the spec, never written.
const spec = (name: string) => parseSpec(readFileSync(resolve(process.cwd(), `guidelines/components/${name}.md`), 'utf8'))

describe("the Playground tab's spec sections", () => {
  it('Props repeats the Props table, every row', () => {
    const button = propsOf(spec('button'))!
    expect(button.table.split('\n')[0]).toMatch(/^\| Prop/)
    expect(button.count).toBe(spec('button').props.length)
    expect(button.table.split('\n').length - 2).toBe(button.count)
    // A component made of parts repeats its Composition table, parts and all.
    expect(propsOf(spec('tabs'))!.table).toContain('`Tabs.Trigger`')
  })

  it('States is the spec section, counted by its items; none when the spec has none', () => {
    expect(statesOf(spec('tabs'))!.count).toBe(6)
    expect(statesOf(spec('button'))!.count).toBe(4)
    expect(statesOf(spec('icon-button'))!.count).toBeGreaterThan(0) // a table, counted by rows
    expect(statesOf(spec('input'))).toBeNull()
  })

  it("Keyboard is what Accessibility says about keys, and nothing when it says nothing", () => {
    expect(keyboardOf(spec('tabs'))).toMatch(/Roving tabindex/)
    expect(keyboardOf(spec('tabs'))).not.toMatch(/Correct roles throughout/)
    // Nested lines stay with their item.
    expect(keyboardOf(spec('dropdown-list'))).toMatch(/\*\*Keys:\*\*\n\s+- Arrow Up and Arrow Down/)
    expect(keyboardOf(spec('button'))).toBeNull()
    expect(keyboardOf(spec('status-indicator'))).toBeNull()
  })

  it('a page with the stage, the code and two of these gets the index; Status Indicator does not', () => {
    const sections = (n: string) => 2 + [propsOf(spec(n)), statesOf(spec(n)), keyboardOf(spec(n))].filter(Boolean).length
    expect(sections('tabs')).toBeGreaterThanOrEqual(INDEX_MIN)
    expect(sections('button')).toBeGreaterThanOrEqual(INDEX_MIN)
    expect(sections('status-indicator')).toBeLessThan(INDEX_MIN)
  })
})

// Slice 7 fixes, item 9 (Omkar, 8 Nov 2026): each thing shown once. "Also in the API" is gone from the
// controls: the Props table tags a prop with no control and carries the registry's words for it; and
// States is on the Playground tab only.
describe('each thing shown once', () => {
  const files = readdirSync(resolve(process.cwd(), 'guidelines/components')).filter((f) => f.endsWith('.md'))
  const md = (f: string) => readFileSync(resolve(process.cwd(), `guidelines/components/${f}`), 'utf8')

  it('the Rules tab shows Motion and Anti-patterns after the ledger, never States', () => {
    expect([...RULE_SECTIONS]).toEqual(['Motion', 'Anti-patterns'])
  })

  it('no spec tags a rule inside States, so the Rules count is the same with States on the Playground tab', () => {
    expect(files.length).toBeGreaterThan(15)
    for (const f of files) {
      const states = statesOf(parseSpec(md(f)))
      // A tag here would count on neither tab: move the rule to Hard constraints, where the ledger reads it.
      expect(states?.body ?? '', f).not.toMatch(/\[\[rule:/)
    }
    // The ledger reads Hard constraints only: a tag in States is not a rule it lists.
    const sample = '## States\n\n- Hover. [[rule: x-hover | browser]]\n\n## Hard constraints\n\n- One. [[rule: x-one | compiler]]\n'
    expect(rulesFromSpec(sample).map((r) => r.id)).toEqual(['x-one'])
  })

  it("a prop with no control is tagged in Props, its reason a description, and the registry's words follow its Notes", () => {
    const entry = REGISTRY.find((e) => e.id === 'button')!
    const s = spec('button')
    render(createElement(SpecSections, { name: 'Button', spec: s, specHref: '#', noControl: [{ prop: 'type' }], explain: entry.explain }))
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(s.props.length)
    const tagged = rows.filter((r) => within(r).queryByRole('button', { name: 'no control' }))
    expect(tagged).toHaveLength(1)
    expect(tagged[0].querySelector('td')!.textContent).toMatch(/^type/)
    // The words "Also in the API" showed, now in the row's Notes, after the spec's own.
    expect(tagged[0].lastElementChild!.textContent).toContain('With "submit", clicking it sends the form.')
    expect(NO_CONTROL_REASON).not.toMatch(/[—–]/)
  })

  it('a Composition table tags a part\'s prop by part and name', () => {
    const s = spec('tabs')
    const triggerValue = s.props.find((p) => p.part === 'Tabs.Trigger' && p.prop === 'value')!
    render(createElement(SpecSections, { name: 'Tabs', spec: s, specHref: '#', noControl: [triggerValue] }))
    const tagged = screen.getAllByRole('button', { name: 'no control' })
    expect(tagged).toHaveLength(1)
    // On the row that names value under Tabs.Trigger, not the root's own value.
    expect(tagged[0].closest('tr')!.textContent).toMatch(/^Tabs\.Triggervalue no control/)
  })
})
