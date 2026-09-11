import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The Figma description sync compiles each spec's key sections. If a spec loses
// one of those sections, the description silently degrades — so assert the
// shape here, where a change to the markdown breaks a test instead of a demo.
const root = process.cwd()
const specs = readdirSync(resolve(root, 'guidelines/components')).filter((f) => f.endsWith('.md'))
const entries: { set: string; page: string; description: string; file: string }[] = JSON.parse(
  execFileSync('node', ['scripts/sync-figma-descriptions.mjs', '--json'], { cwd: root, encoding: 'utf8' }),
)

describe('component specs → Figma descriptions', () => {
  it('produces one description per spec', () => {
    expect(entries.map((e) => e.file).sort()).toEqual(specs.sort())
  })

  it.each(specs)('%s has the sections the sync compiles', (file) => {
    const md = readFileSync(resolve(root, 'guidelines/components', file), 'utf8')
    // A compound component documents its API under "Composition", not "Props".
    expect(md, `${file} has no API section`).toMatch(/^## (Props|Composition)/m)
    for (const h of ['## Hard constraints', '## Figma mapping', '## Anti-patterns'])
      expect(md, `${file} is missing ${h}`).toContain(h)
    expect(md, `${file} has no tsx example`).toMatch(/```tsx/)
    expect(md, `${file} does not name its Figma page`).toMatch(/page `[^`]+`/)
  })

  it.each(entries.map((e) => e.set))('%s description carries code, mapping, rules and paths', (set) => {
    const d = entries.find((e) => e.set === set)!.description
    expect(d).toContain('CODE\n<')
    expect(d).toMatch(/FIGMA → PROP\n.+→/)
    expect(d).toMatch(/RULES {2}\S/)
    expect(d).toMatch(/src\/components\/\w+\/\w+\.tsx {2}· {2}guidelines\/components\/[\w-]+\.md\n@omkarux\/vela \d+\.\d+\.\d+$/)
  })
})

// The agent reads overview.md to choose a component and each spec to build it.
// These are the properties that keep generated output on-system — the half of
// the AI check that is deterministic and belongs in the gate. The other half
// (does an agent pick the right component for a prompt) is scored by a person
// per release, with a fixed prompt set, and recorded in the changelog.
describe('the agent-facing contract is complete', () => {
  const overview = readFileSync(resolve(root, 'guidelines/overview.md'), 'utf8')
  const llms = readFileSync(resolve(root, 'guidelines/llms.txt'), 'utf8')

  it.each(specs)('%s is in the overview catalogue and the llms.txt index', (file) => {
    expect(overview, `${file} not in overview.md`).toContain(`components/${file}`)
    expect(llms, `${file} not in llms.txt`).toContain(`components/${file}`)
  })

  it.each(specs)('%s tells an agent when NOT to use it', (file) => {
    const md = readFileSync(resolve(root, 'guidelines/components', file), 'utf8')
    expect(md).toMatch(/^## When to use/m)
    expect(md, `${file} anti-patterns list is too thin to steer generation`).toMatch(/## Anti-patterns[\s\S]*?(- ❌.*\n){3,}/)
  })

  it('names every component that is NOT in the kit, so an agent flags a gap instead of inventing one', () => {
    for (const missing of ['Checkbox', 'Modal', 'Tooltip', 'Icon Button', 'View Switcher'])
      expect(overview).toContain(missing)
  })
})
