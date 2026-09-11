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
    expect(d).toMatch(/src\/components\/\w+\/\w+\.tsx {2}· {2}guidelines\/components\/[\w-]+\.md$/)
  })
})
