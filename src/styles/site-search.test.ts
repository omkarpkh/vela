import { describe, it, expect } from 'vitest'
import { buildIndex, search, closest, MISSING } from '../../demo/playground/search'
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

  it('puts a title before an alias at the same strength: "alert" is Contextual Alert, then Dialog', () => {
    expect(top('alert', 2)).toEqual(['Contextual Alert', 'Dialog'])
    // An exact alias beats a title that only starts with the query.
    expect(top('tab', 2)).toEqual(['Tabs', 'Table'])
  })

  it('finds a component from its "When to use" lines, in any spec', () => {
    expect(top('save or discard', 1)).toEqual(['Dialog'])
  })

  it('finds rule ids, at most three, and only on three letters or more', () => {
    expect(search(index, 'toggle-label-required')[0].item).toMatchObject({ kind: 'rule', href: '#/components/toggle/rules' })
    expect(search(index, 'dropdown').filter((h) => h.item.kind === 'rule').length).toBeLessThanOrEqual(3)
    expect(search(index, 'to').some((h) => h.item.kind === 'rule')).toBe(false)
  })

  it('never returns Start, Project or Demos pages', () => {
    for (const q of ['overview', 'changelog', 'roadmap', 'adopt', 'motion review', 'status'])
      expect(search(index, q).map((h) => h.item.kind).filter((k) => !['component', 'missing', 'proposal', 'foundation', 'rule'].includes(k))).toEqual([])
    expect(search(index, 'changelog')).toEqual([])
  })

  it('returns nothing for nothing', () => {
    expect(search(index, '   ')).toEqual([])
    expect(search(index, 'zzzz')).toEqual([])
  })

  it('suggests the closest components for an unknown link, by a word or by spelling', () => {
    expect(closest(index, 'modal-window').map((i) => i.title)).toEqual(['Dialog'])
    expect(closest(index, 'buton')[0].title).toBe('Button')
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
