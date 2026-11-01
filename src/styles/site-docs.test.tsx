import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Markdown, docCells } from '../../demo/playground/Markdown'
import { sectionsOf, phasesOf } from '../../demo/pages/Doc'
import { stillToCome } from '../../demo/pages/Status'
import { statusOf } from '../../demo/playground/status'

// Slice 5 of the playground uplift: the doc pages. No markdown mark reaches a reader; the rail and
// the Roadmap's phases are read from the document's own headings; Status says what still stands in
// the spec's own words, with no file path.
const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')
const BASE = 'https://github.com/omkarpkh/vela/blob/main'

describe('a repository document, rendered', () => {
  const text = (md: string) => render(<Markdown source={md} top="h2" doc={{ base: BASE }} />).container

  it('links are links, whatever their words hold; repo paths point at GitHub', () => {
    const c = text('See [`guidelines/proposals/`](guidelines/proposals/README.md) and [the site](https://omkarpkh.github.io/vela/).')
    const links = [...c.querySelectorAll('a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual([`${BASE}/guidelines/proposals/README.md`, 'https://omkarpkh.github.io/vela/'])
    expect(links[0].querySelector('code')?.textContent).toBe('guidelines/proposals/')
    expect(c.textContent).not.toMatch(/\]\(|\[/)
  })

  it('code keeps every character: double backticks, a backtick run inside, a rule tag written as code', () => {
    const c = text('A ` ```tsx ` example, `` page `Name` ``, and `[[rule: id | compiler]]`.')
    expect([...c.querySelectorAll('code')].map((x) => x.textContent)).toEqual(['```tsx', 'page `Name`', '[[rule: id | compiler]]'])
  })

  it('nests one level of bullets, and no dash or asterisk is printed', () => {
    const c = text('- **Parent** — one\n  continued\n  - child *one*\n    continued\n- Second')
    expect(c.querySelectorAll('ul ul li')).toHaveLength(1)
    expect(c.textContent).not.toMatch(/[—–*]|^\s*- /m)
    expect(c.querySelector('em')?.textContent).toBe('one')
  })

  it('a pipe inside code stays in its table cell', () => {
    expect(docCells('| a | `x | y` | b |')).toEqual(['a', '`x | y`', 'b'])
  })

  it('every project document renders with no markdown mark outside code', () => {
    for (const f of ['CHANGELOG.md', 'ROADMAP.md', 'CONTRIBUTING.md', 'ACCESSIBILITY.md']) {
      const c = text(read(f).replace(/^# .+\n/, '')).cloneNode(true) as HTMLElement
      c.querySelectorAll('code, pre').forEach((x) => x.remove())
      expect(c.textContent, f).not.toMatch(/\*\*|\]\(|[—–]|\[\[|`/)
    }
  })
})

describe('the rail and the Roadmap\'s phases come from the document', () => {
  it('names each section by its first words, and its id is the heading\'s', () => {
    const roadmap = sectionsOf(read('ROADMAP.md'))
    expect(roadmap[0]).toEqual({ id: 'the-direction', label: 'The direction' })
    expect(roadmap.map((s) => s.label)).toContain('Phase 2b')
    expect(sectionsOf(read('CHANGELOG.md'))[0].label).toBe('Unreleased')
  })

  it('reads every phase, in order, and the one in progress', () => {
    const phases = phasesOf(read('ROADMAP.md'))
    expect(phases.map((p) => p.number)).toEqual(['0', '1', '2', '2b', '3', '4', '5'])
    expect(phases.filter((p) => p.state).map((p) => p.number)).toEqual(['0'])
    expect(phases[0]).toMatchObject({ name: 'Foundation hardening', state: 'in progress' })
  })
})

describe('Component status', () => {
  it('says what still stands in the spec\'s own words, with no file path, parenthesis or dash', () => {
    const spec = (id: string) => statusOf(read(`guidelines/components/${id}.md`)).note
    expect(stillToCome(spec('text-area'))).toBe('Approved once the API has been reviewed.')
    expect(stillToCome(spec('icon'))).toBe('Approved once the kit\'s own inline glyphs have moved onto it.')
    for (const id of ['brand-mark', 'icon-button', 'table', 'dropdown-list', 'checkbox'])
      expect(stillToCome(spec(id)), id).not.toMatch(/[()—–]|\.(md|js|tsx)\b|scripts\/|GOVERNANCE/)
  })
})
