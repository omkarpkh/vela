import { describe, it, expect } from 'vitest'
import { buildIndex, search, closest, nearest, MISSING, missingTag } from '../../demo/playground/search'
import { REGISTRY, GROUPS } from '../../demo/playground/registry'

// Playground slice 3 (playground spec, sections 2 and 10): search over titles, aliases and the
// "When to use" lines, ranked so a shared alias still puts the right thing first (A2).
const index = buildIndex()
const top = (q: string, n = 3) => search(index, q).slice(0, n).map((h) => h.item.title)

describe('search', () => {
  it('finds a component by an alias, and says which alias matched', () => {
    const [hit] = search(index, 'modal')
    expect(hit.item.title).toBe('Dialog')
    expect(hit.alias).toBe('modal')
    expect(top('switch', 1)).toEqual(['Toggle'])
    expect(top('banner', 1)).toEqual(['Contextual Alert'])
  })

  it('ranks a shared alias: what exists first, then what is not in Vela yet', () => {
    expect(top('dropdown', 2)).toEqual(['Dropdown List', 'Select List'])
    const select = search(index, 'dropdown')[1].item
    expect(select.kind).toBe('missing')
    expect(select.tag).toBe('Planned')
  })

  it('tags a missing component by where it stands: Planned only for what the roadmap plans', () => {
    const tagOf = (id: string) => index.find((i) => i.kind === 'missing' && i.id === id)!.tag
    expect([tagOf('select-list'), tagOf('combobox'), tagOf('spinner')]).toEqual(['Planned', 'Planned', 'Planned'])
    expect(tagOf('segmented-control')).toBe('Specified')
    // Icon Button left the list when it was built (1 Nov 2026): a search for it finds the component.
    expect(index.some((i) => i.kind === 'missing' && i.id === 'icon-button')).toBe(false)
    expect([tagOf('tag'), tagOf('side-navigation')]).toEqual(['Not in Vela', 'Not in Vela'])
    for (const m of MISSING) expect(['Planned', 'Specified', 'Not in Vela'], m.id).toContain(missingTag(m.stands))
  })

  it('puts a title before an alias at the same strength: "alert" is Contextual Alert, then Dialog', () => {
    expect(top('alert', 2)).toEqual(['Contextual Alert', 'Dialog'])
    // An exact alias beats a title that only starts with the query.
    expect(top('tab', 2)).toEqual(['Tabs', 'Table'])
  })

  it('finds a component from its "When to use" lines, in any spec', () => {
    expect(top('save or discard', 1)).toEqual(['Dialog'])
  })

  it('finds rule ids, at most three, and only on three letters or more', () => {
    expect(search(index, 'toggle-label-required')[0].item).toMatchObject({ kind: 'rule', href: '#/components/toggle/rules?rule=toggle-label-required' })
    expect(search(index, 'dropdown').filter((h) => h.item.kind === 'rule').length).toBeLessThanOrEqual(3)
    expect(search(index, 'to').some((h) => h.item.kind === 'rule')).toBe(false)
  })

  it('never returns Start, Project or Demos pages', () => {
    for (const q of ['overview', 'all states', 'changelog', 'roadmap', 'adopt', 'motion review', 'status'])
      expect(search(index, q).map((h) => h.item.kind).filter((k) => !['component', 'missing', 'proposal', 'foundation', 'rule'].includes(k))).toEqual([])
    expect(search(index, 'changelog')).toEqual([])
  })

  it('finds the Filter Grammar contract, listed under Foundations, by "filter"', () => {
    const [hit] = search(index, 'filter')
    expect(hit.item).toMatchObject({ kind: 'foundation', id: 'filter-grammar', title: 'Filter Grammar', href: '#/foundations/filter-grammar', sign: 'Contract' })
  })

  it('returns nothing for nothing', () => {
    expect(search(index, '   ')).toEqual([])
    expect(search(index, 'zzzz')).toEqual([])
  })

  it('suggests the closest components for an unknown link, by a word or by spelling', () => {
    expect(closest(index, 'modal-window').map((i) => i.title)).toEqual(['Dialog'])
    expect(closest(index, 'buton')[0].title).toBe('Button')
  })

  // Slice 5 of the playground uplift: Not found names the closest parts by meaning, through the
  // catalogue's names and aliases, and flags the gap when there are none.
  it('Not found: by meaning, through an alias; a slip of spelling; and nothing, said plainly', () => {
    const titles = (q: string) => nearest(index, q).parts.map((i) => i.title)
    expect(nearest(index, 'modal-window')).toMatchObject({ words: 'modal window', how: 'meaning' })
    expect(titles('modal-window')).toEqual(['Dialog'])
    expect(titles('data-grid')[0]).toBe('Table')
    expect(nearest(index, 'buton')).toMatchObject({ how: 'spelling' })
    expect(titles('buton')[0]).toBe('Button')
    // A word of the name in a "When to use" line is not meaning: no Text Area for a firewall rule.
    const firewall = nearest(index, 'firewall-rule')
    expect(firewall).toMatchObject({ words: 'firewall rule', how: 'none', parts: [], gaps: [] })
    expect(titles('firewall-rule')).not.toContain('Text Area')
    // A name Vela has not built yet is a gap, with the part to use today.
    expect(nearest(index, 'select').gaps.map((i) => i.title)).toContain('Select List')
  })

  // Playground spec v1.2, section 10: Vela-less names answer "not in Vela yet" with the nearest
  // component, and an alias points only where the component's own "When to use" covers the job.
  it('answers names Vela has nothing for, rather than "Nothing matches"', () => {
    for (const q of ['tag', 'chip', 'spinner', 'loading', 'sidebar']) {
      const [first] = search(index, q)
      expect(first?.item.kind, q).toBe('missing')
    }
  })

  it('sends a form select to Radio Group, never to Dropdown List, which is never in a form', () => {
    expect(MISSING.find((m) => m.id === 'select-list')!.closest).toBe('radio-group')
  })

  it('finds the components that carry a severity, and drops weak matches when a name matched', () => {
    expect(top('severity', 2).sort()).toEqual(['Contextual Alert', 'Toast'])
    expect(search(index, 'notification').map((h) => h.item.title)).not.toContain('Toggle')
  })

  it('points every not-in-kit entry at a component that exists', () => {
    for (const m of MISSING) expect(REGISTRY.some((e) => e.id === m.closest), m.id).toBe(true)
  })
})

describe('nav groups', () => {
  it('gives every component one of the five groups, from its registry entry', () => {
    for (const e of REGISTRY) expect(GROUPS, e.id).toContain(e.group)
    expect(REGISTRY.find((e) => e.id === 'dropdown-list')!.group).toBe('Overlays')
    const inputs = REGISTRY.filter((e) => e.group === 'Inputs').map((e) => e.name).sort()
    expect(inputs).toEqual(['Checkbox', 'Input', 'Radio Group', 'Text Area', 'Toggle'])
  })
})
