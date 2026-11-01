import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// guidelines/figma-map.json tells an agent what to write for an instance of each Figma set —
// the job Code Connect does on an Organization plan, compiled from the specs on every plan.
const root = resolve(process.cwd())
const committed = readFileSync(resolve(root, 'guidelines/figma-map.json'), 'utf8')
const fresh = execFileSync('node', [resolve(root, 'scripts/sync-figma-descriptions.mjs'), '--map'], { encoding: 'utf8' })
const map = JSON.parse(committed)
const core = readFileSync(resolve(root, 'src/index.ts'), 'utf8')
const headless = readFileSync(resolve(root, 'src/headless/index.ts'), 'utf8')

describe('Figma → code map', () => {
  it('is current with the specs (run `npm run figma:map`)', () => {
    expect(committed).toBe(fresh)
  })

  it('has one entry per component spec', () => {
    const specs = readdirSync(resolve(root, 'guidelines/components')).filter((f) => f.endsWith('.md'))
    expect(map.sets.map((s: any) => s.spec.split('/').pop()).sort()).toEqual(specs.sort())
  })

  it('names an export the package really has, imported from the entry point that has it', () => {
    for (const s of map.sets) {
      const name = s.write.split('.')[0]
      const fromHeadless = s.import.endsWith(`'@omkarux/vela/headless'`)
      expect(fromHeadless ? headless : core, s.set).toMatch(new RegExp(`export \\{ (?:\\w+, )*${name}(?:, \\w+)* \\}`))
      // Most sets import the one name an agent writes; Toast also needs its provider (R14).
      const names = s.set === 'Toast' ? 'ToastProvider, useToast' : name
      expect(s.import).toBe(`import { ${names} } from '@omkarux/vela${fromHeadless ? '/headless' : ''}'`)
    }
  })

  it('imports a headless-born component from /headless, never from the core', () => {
    for (const n of ['Checkbox', 'Radio']) {
      expect(map.sets.find((s: any) => s.set === n).import).toMatch(/'@omkarux\/vela\/headless'$/)
    }
  })

  it('maps every Figma property to a prop, and links every built set to its node', () => {
    for (const s of map.sets) {
      expect(s.figmaToProp.length, s.set).toBeGreaterThan(0)
      if (s.node) expect(s.url).toContain(`node-id=${s.node.replace(':', '-')}`)
    }
  })

  it('lists every extra set of a multi-set component with its own export (Table: header cell, cell, row)', () => {
    for (const s of map.sets) for (const a of (s.also ?? []).filter((a: any) => a.kind !== 'part')) {
      expect(a.write.split('.')[0], a.set).toBe(s.write.split('.')[0])
      expect(core, a.set).toMatch(new RegExp(`export \\{ ${a.write.split('.')[0]} \\}`))
      expect(a.state, a.set).toBe(s.state)
      expect(a.import, a.set).toBe(s.import)
      if (a.node) expect(a.url).toContain(`node-id=${a.node.replace(':', '-')}`)
      else expect(a.url).toBeNull()
    }
    const table = map.sets.find((s: any) => s.spec.endsWith('/table.md'))
    expect([table.set, table.write, table.import]).toEqual(['Table Header Cell', 'Table.HeaderCell', "import { Table } from '@omkarux/vela'"])
    expect(table.also.map((a: any) => [a.set, a.write])).toEqual([['Table Cell', 'Table.Cell'], ['Table Row', 'Table.Row']])
    for (const a of table.also) expect([a.state, a.import], a.set).toEqual([table.state, table.import])
  })

  // A part (`kind: 'part'`): a set its component draws and no one imports, the Tabs overflow control
  // (tabs.md, Overflow). The map and the description never claim an import for it.
  it('claims no import for a part: its import and write are null, it says what draws it, and has its own state', () => {
    const parts = map.sets.flatMap((s: any) => (s.also ?? []).filter((a: any) => a.kind === 'part').map((a: any) => ({ ...a, of: s.set })))
    expect(parts.map((p: any) => [p.set, p.of, p.state, p.node, p.url, p.import, p.write, p.part])).toEqual([
      ['Tabs overflow control', 'Tab', 'none', null, null, null, null, 'drawn by Tabs (headless) when tabs overflow'],
    ])
    const entries: { sets: { name: string; description: string }[] }[] = JSON.parse(execFileSync('node', [resolve(root, 'scripts/sync-figma-descriptions.mjs'), '--json'], { encoding: 'utf8' }))
    const d = entries.flatMap((e) => e.sets).find((e) => e.name === 'Tabs overflow control')!.description.split('\n')
    expect(d[d.indexOf('CODE') + 1]).toBe('No import: this set is drawn by Tabs (headless) when tabs overflow.')
    expect(d.some((l) => l.startsWith('import '))).toBe(false)
    // Its builder is written, as every set with no node yet has.
    expect(existsSync(resolve(root, 'scripts/figma/components/tabs-overflow-control.figma.js'))).toBe(true)
  })

  it('starts every Figma description\'s CODE block with the same import the map has', () => {
    const entries: { sets: { name: string; description: string }[] }[] = JSON.parse(execFileSync('node', [resolve(root, 'scripts/sync-figma-descriptions.mjs'), '--json'], { encoding: 'utf8' }))
    // A multi-set component (Table) describes each of its sets; each extra set is checked as its own row.
    const described = entries.flatMap((e) => e.sets)
    const all = map.sets.flatMap((s: any) => [s, ...(s.also ?? [])])
    expect(described.map((e) => e.name).sort()).toEqual(all.map((s: any) => s.set).sort())
    // A part claims no import; the test below reads its CODE block.
    for (const s of all.filter((s: any) => s.kind !== 'part')) {
      const d = described.find((e) => e.name === s.set)!.description
      const lines = d.split('\n')
      const at = lines.indexOf('CODE')
      expect(lines[at - 1], s.set).toBe('Use the library component; do not rebuild it from this frame.')
      expect(lines[at + 1], s.set).toBe(s.import)
      if (s.write.includes('.')) expect(lines[at + 2], s.set).toBe(`This set is one ${s.write}.`)
      else expect(lines[at + 2].startsWith('This set is one'), s.set).toBe(false)
    }
    expect(map.sets.find((s: any) => s.set === 'Tab').import).toBe(`import { Tabs } from '@omkarux/vela'`)
    expect(map.sets.find((s: any) => s.set === 'Radio').import).toBe(`import { RadioGroup } from '@omkarux/vela/headless'`)
  })

  it('gives every set a state from the closed set: a published set always has a node, a none set never does', () => {
    for (const s of map.sets.flatMap((s: any) => [s, ...(s.also ?? [])])) {
      expect(['published', 'built', 'none'], s.set).toContain(s.state)
      if (s.state === 'published') expect(s.node, s.set).toMatch(/^\d+:\d+$/)
      if (s.state === 'none') expect(s.node, s.set).toBeNull()
      if (!s.node) expect(s.url, s.set).toBeNull()
    }
    // The library was published on 29 Oct 2026 (the second publish carried the 0.13.0 state): all
    // 18 sets — 16 entries, Table's two `also` sets among them — are published, each with its node.
    // Brand Mark and Icon Button (1 Nov 2026) have none yet: their builders are written and not run.
    // Nor does the Tabs overflow control, a part of Tabs, whose builder is written too (1 Nov 2026).
    const all = map.sets.flatMap((s: any) => [s, ...(s.also ?? [])])
    expect(all).toHaveLength(22)
    const pub = all.filter((s: any) => s.state === 'published').map((s: any) => s.set).sort()
    expect(pub).toEqual(['Button', 'Checkbox', 'Contextual Alert', 'Dialog', 'Dropdown List item', 'Icon', 'Input', 'Popover', 'Radio', 'Risk Pill', 'Status Indicator', 'Tab', 'Table Cell', 'Table Header Cell', 'Table Row', 'Text Area', 'Toast', 'Toggle', 'Tooltip'])
    expect(map.sets.find((s: any) => s.set === 'Risk Pill')).toMatchObject({ state: 'published', node: '127:14' })
    // Dropdown List, built for 0.14.0 (R20), was published on 31 Oct 2026 (R21): no set is built-only.
    expect(map.sets.find((s: any) => s.set === 'Dropdown List item')).toMatchObject({ state: 'published', node: '164:85' })
    expect(all.filter((s: any) => s.state === 'built')).toEqual([])
    expect(all.filter((s: any) => s.state === 'none').map((s: any) => [s.set, s.node, s.url])).toEqual([['Brand Mark', null, null], ['Icon Button', null, null], ['Tabs overflow control', null, null]])
  })

  it('maps the Tab set to Tabs.Trigger, because the set is one trigger', () => {
    expect(map.sets.find((s: any) => s.set === 'Tab').write).toBe('Tabs.Trigger')
  })
})
