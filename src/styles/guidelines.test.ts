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
    // "Responsive behaviour" is required since Phase 0 (28 Oct 2026): every component states what
    // flexes, what is fixed, and what it does in a narrow host — or names the gap.
    for (const h of ['## Hard constraints', '## Responsive behaviour', '## Figma mapping', '## Anti-patterns'])
      expect(md, `${file} is missing ${h}`).toContain(h)
    expect(md, `${file} has no tsx example`).toMatch(/```tsx/)
    expect(md, `${file} does not name its Figma page`).toMatch(/page `[^`]+`/)
  })

  it.each(entries.map((e) => e.set))('%s description carries code, mapping, rules and paths', (set) => {
    const d = entries.find((e) => e.set === set)!.description
    expect(d).toMatch(/Use the library component; do not rebuild it from this frame\.\nCODE\nimport \{ \w+(?:, \w+)* \} from '@omkarux\/vela(\/headless)?'\n/)
    expect(d).toMatch(/FIGMA → PROP\n.+→/)
    expect(d).toMatch(/RULES {2}\S/)
    // A headless-only component (Checkbox, Radio Group) lives under src/headless, not src/components.
    expect(d).toMatch(/src\/(components|headless)\/\w+\/\w+\.tsx {2}· {2}guidelines\/components\/[\w-]+\.md\n@omkarux\/vela \d+\.\d+\.\d+$/)
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
    // Checkbox and Radio left this list in Phase 1 (they ship from /headless), and so did Modal and
    // Tooltip when Dialog and Tooltip arrived; the sentence that names the rest has to survive, and
    // it must no longer call any of them missing.
    const notInKit = overview.match(/Not yet specced: ([^.]+)\./)?.[1] ?? ''
    for (const missing of ['Select List', 'Token Pill', 'Icon Button', 'Actions Dropdown', 'View Switcher'])
      expect(notInKit).toContain(missing)
    // Toast joined in Phase 1 too; it was never on this list, but the specs that called it missing must not.
    for (const shipped of ['Checkbox', 'Radio', 'Modal', 'Tooltip', 'Popover', 'Dialog', 'Toast']) expect(notInKit).not.toContain(shipped)
    // DESIGN.md carries the same list, and the same removals.
    const designNotInKit = readFileSync(resolve(root, 'DESIGN.md'), 'utf8').match(/Not yet specced: ([^.]+)\./)?.[1] ?? ''
    for (const shipped of ['Modal', 'Tooltip', 'Toast']) expect(designNotInKit).not.toContain(shipped)
    // No spec still sends an agent to a Toast that is "not in this kit".
    for (const file of specs) {
      const md = readFileSync(resolve(root, 'guidelines/components', file), 'utf8')
      expect(md, `${file} still calls Toast missing`).not.toMatch(/toast[^.\n]*not in this kit/i)
    }
    expect(designNotInKit).toContain('Select List')
  })

  it('keeps a shipped component out of both "not in the kit" lists', () => {
    const design = readFileSync(resolve(root, 'DESIGN.md'), 'utf8')
    const notYet = (md: string) => md.match(/Not yet specced:([\s\S]*?)Flag rather than guess/)![1]
    // Icon is matched as a word not followed by "Button": Icon Button is genuinely not in the kit.
    const named = (list: string, c: string) => new RegExp(`\\b${c}\\b(?! Button)`).test(list)
    expect(named(' Icon Button, Modal', 'Icon')).toBe(false)
    for (const shipped of ['Text Area', 'Input', 'Tabs', 'Icon', 'Checkbox', 'Radio Group', 'Table', 'Popover', 'Tooltip', 'Dialog'])
      for (const [name, md] of [['overview.md', overview], ['DESIGN.md', design]] as const)
        expect(named(notYet(md), shipped), `${shipped} is listed as missing in ${name}`).toBe(false)
  })
})
