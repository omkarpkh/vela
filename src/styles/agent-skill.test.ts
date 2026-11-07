import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The agent skill (skills/vela/SKILL.md, installed with `npx skills add omkarpkh/vela`) routes to
// the files the package ships, and the report it ends with is written once, in llms.txt. These
// tests keep the three pointing at each other: the skill at real files, the report's link at the
// request form's real field ids.
const root = resolve(process.cwd())
const read = (f: string) => readFileSync(resolve(root, f), 'utf8')
const skill = read('skills/vela/SKILL.md')
const llms = read('guidelines/llms.txt')
const form = read('.github/ISSUE_TEMPLATE/component-request.yml')

describe('the Vela agent skill', () => {
  it('has the frontmatter the skills CLI requires: a lowercase name and a description', () => {
    const fm = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ''
    expect(fm).toMatch(/^name: vela$/m)
    const description = fm.match(/^description: (.+)$/m)?.[1] ?? ''
    expect(description).toContain('@omkarux/vela')
    expect(description.length).toBeLessThanOrEqual(1024)
  })

  it('routes to files the package ships, in order, and states the one rule', () => {
    const order = ['node_modules/@omkarux/vela/', 'guidelines/llms.txt', 'DESIGN.md', 'guidelines/components.json', 'guidelines/components/<file>.md']
    const at = order.map((s) => skill.indexOf(s))
    expect(at.every((i) => i >= 0), order.filter((_, i) => at[i] < 0).join(', ')).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    expect(skill).toContain('Never invent a component. Name the closest match and flag the gap.')
    expect(skill).toContain('whenToUse')
  })

  it('points at the report in llms.txt rather than repeating it', () => {
    expect(llms).toContain('## When you finish: the report')
    expect(skill).toContain('"When you finish: the report"')
    expect(skill).not.toMatch(/File it:/)
  })
})

describe('the report in llms.txt', () => {
  it('has the four groups in order, and no score', () => {
    const section = llms.split('## When you finish: the report')[1].split(/^## /m)[0]
    const groups = ['**Used.**', '**Built from tokens.**', '**Invented.**', '**Flagged gaps.**'].map((g) => section.indexOf(g))
    expect(groups.every((i) => i >= 0)).toBe(true)
    expect([...groups].sort((a, b) => a - b)).toEqual(groups)
    expect(section).toContain('no score')
  })

  it('links the request form by its own template file and field ids', () => {
    const ids = [...form.matchAll(/^ {4}id: ([a-z]+)$/gm)].map((m) => m[1])
    const links = [...llms.matchAll(/https:\/\/github\.com\/omkarpkh\/vela\/issues\/new\?(\S+)/g)].map((m) => new URLSearchParams(m[1]))
    expect(links.length).toBeGreaterThan(0)
    for (const q of links) {
      expect(q.get('template')).toBe('component-request.yml')
      for (const key of [...q.keys()].filter((k) => k !== 'template' && k !== 'title')) expect(ids, key).toContain(key)
    }
    // A link cannot fill the form's dropdown (tested signed in, 7 Nov 2026), so no link carries
    // `closest`. The closest component is named in the title instead, and must be a menu option.
    for (const q of links) {
      expect(q.has('closest')).toBe(false)
      if (!q.has('title')) continue // the pattern, written over several lines to read
      const named = q.get('title')?.match(/\(closest: ([^)]+)\)/)?.[1]
      expect(named, 'the title names the closest component').toBeTruthy()
      expect(form).toContain(`        - ${named}\n`)
    }
  })
})
