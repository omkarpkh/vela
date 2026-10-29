import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// guidelines/figma-map.json tells an agent what to write for an instance of each Figma set —
// the job Code Connect does on an Organization plan, compiled from the specs on every plan.
const root = resolve(process.cwd())
const committed = readFileSync(resolve(root, 'guidelines/figma-map.json'), 'utf8')
const fresh = execFileSync('node', [resolve(root, 'scripts/sync-figma-descriptions.mjs'), '--map'], { encoding: 'utf8' })
const map = JSON.parse(committed)
const exported = readFileSync(resolve(root, 'src/index.ts'), 'utf8')

describe('Figma → code map', () => {
  it('is current with the specs (run `npm run figma:map`)', () => {
    expect(committed).toBe(fresh)
  })

  it('has one entry per component spec', () => {
    const specs = readdirSync(resolve(root, 'guidelines/components')).filter((f) => f.endsWith('.md'))
    expect(map.sets.map((s: any) => s.spec.split('/').pop()).sort()).toEqual(specs.sort())
  })

  it('names an export the package really has, imported from @omkarux/vela', () => {
    for (const s of map.sets) {
      const name = s.write.split('.')[0]
      expect(exported, s.set).toMatch(new RegExp(`\\b${name}\\b`))
      expect(s.import).toBe(`import { ${name} } from '@omkarux/vela'`)
    }
  })

  it('maps every Figma property to a prop, and links every built set to its node', () => {
    for (const s of map.sets) {
      expect(s.figmaToProp.length, s.set).toBeGreaterThan(0)
      if (s.node) expect(s.url).toContain(`node-id=${s.node.replace(':', '-')}`)
    }
  })

  it('maps the Tab set to Tabs.Trigger, because the set is one trigger', () => {
    expect(map.sets.find((s: any) => s.set === 'Tab').write).toBe('Tabs.Trigger')
  })
})
