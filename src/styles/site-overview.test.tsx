import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { StatusIndicator } from '../index'
import { Overview } from '../../demo/pages/Overview'
import { FACTS, RULES, RELEASED, TARGETS, FOUNDATIONS_LINE, SEVERITIES, STATUSES, RISKS, STATUS_WORDS } from '../../demo/pages/overview-facts'
import { releaseFacts, siteFacts } from '../../scripts/vite-site-facts.mjs'
import { PAIRS } from '../../scripts/contrast-core.mjs'

// The site's Overview (#/), redesigned on 1 Nov 2026: every number on it comes from the build. These
// tests hold each number to the file it is counted from, and fail if the page carries a digit that
// isn't one of them.
const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')
const pkg = JSON.parse(read('package.json'))

describe('the release highlights (CHANGELOG.md, RELEASING.md step 3)', () => {
  it("the current version's section has a date and three highlights", () => {
    const r = releaseFacts(read('CHANGELOG.md'), pkg.version)
    expect(r.date, `## [${pkg.version}] — YYYY-MM-DD in CHANGELOG.md`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(r.highlights, `a **Highlights:** list of three under ## [${pkg.version}]`).toHaveLength(3)
    for (const h of r.highlights) expect(h.trim()).not.toBe('')
    expect(RELEASED.highlights).toEqual(r.highlights)
  })

  it('reads only the bullets after **Highlights:**, in their own section, and nothing when there are none', () => {
    const md = [
      '## [Unreleased]', '', '**Highlights:**', '', '- Not this one.', '',
      '## [1.2.0] — 2026-11-01', '', '**Highlights:**', '', '- One `thing`.', '- Two,', '  across lines.', '- **Three.**', '', '### Added', '- Not a highlight.', '',
      '## [1.1.0] — 2026-10-01', '', '### Added', '- No highlights here.', '',
    ].join('\n')
    expect(releaseFacts(md, '1.2.0')).toEqual({ version: '1.2.0', date: '2026-11-01', highlights: ['One thing.', 'Two, across lines.', 'Three.'] })
    expect(releaseFacts(md, '1.1.0').highlights).toEqual([])
    expect(releaseFacts(md, '9.9.9')).toEqual({ version: '9.9.9', date: null, highlights: [] })
  })
})

describe('every number on the Overview is counted from its source', () => {
  it('rules: every tag under Hard constraints in guidelines/components/, as rules:check counts them', () => {
    const dir = 'guidelines/components'
    const levels = { automated: 0, review: 0 }
    let total = 0
    for (const f of readdirSync(resolve(process.cwd(), dir)).filter((f) => f.endsWith('.md'))) {
      const section = read(`${dir}/${f}`).match(/^## Hard constraints[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? ''
      for (const m of section.matchAll(/\[\[rule:\s*[a-z0-9-]+\s*\|\s*([a-z]+)\s*\]\]/g)) {
        total++
        if (m[1] === 'convention') levels.review++
        else levels.automated++
      }
    }
    expect(RULES).toEqual({ total, ...levels })
  })

  it('checks, pairs, dependencies, components and proposals', () => {
    expect(FACTS.checks).toBe(JSON.parse(read('demo/checks.json')).total)
    expect(FACTS.pairs).toBe(PAIRS.length)
    expect(FACTS.deps).toBe(Object.keys(pkg.dependencies ?? {}).length)
    expect(FACTS.built).toBe(readdirSync(resolve(process.cwd(), 'guidelines/components')).filter((f) => f.endsWith('.md')).length)
    expect(FACTS.specified).toBe(readdirSync(resolve(process.cwd(), 'guidelines/proposals')).filter((f) => f.endsWith('.md') && f !== 'README.md').length)
    expect(siteFacts().PAIRS).toBe(PAIRS.length)
    expect(read('scripts/contrast-core.mjs').split('\n')[siteFacts().PAIRS_LINE - 1]).toMatch(/^export const PAIRS/)
  })

  it('the taxonomies: one value per signal token, in each row', () => {
    const css = read('src/styles/tokens.light.css')
    const row = (t: string) => [...new Set([...css.matchAll(new RegExp(`--vela-signal-${t}-([a-z]+):`, 'g'))].map((m) => m[1]))].sort()
    expect([...SEVERITIES].sort()).toEqual(row('severity'))
    expect([...STATUSES].sort()).toEqual(row('status'))
    expect([...RISKS].sort()).toEqual(row('risk'))
  })

  it("the status words are the Status Indicator's own", () => {
    for (const s of STATUSES) {
      const { container, unmount } = render(<StatusIndicator status={s} />)
      expect(container.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe(STATUS_WORDS[s])
      unmount()
    }
  })

  it('the Foundations line names the Foundations pages, in nav order', () => {
    const titles = ['colour', 'typography', 'spacing', 'sizing', 'radius', 'motion']
    expect(FOUNDATIONS_LINE).toBe('Colour, typography, spacing, sizing, radius and motion')
    expect(FOUNDATIONS_LINE.toLowerCase().replace(' and ', ', ').split(', ')).toEqual(titles)
  })
})

describe('the Overview page', () => {
  it('has no digit that the build did not generate', () => {
    const { container } = render(<Overview />)
    const generated = [...container.querySelectorAll('[data-generated]')]
    // Every counted value is on the page, marked.
    const marked = generated.map((n) => n.textContent ?? '')
    for (const v of [RULES.total, RULES.automated, RULES.review, FACTS.checks, FACTS.pairs, FACTS.deps, FACTS.built, FACTS.specified, SEVERITIES.length, STATUSES.length, RISKS.length, RELEASED.version])
      expect(marked, String(v)).toContain(String(v))
    // Take the generated values away, and the install line's code; what is left has no digit.
    const copy = container.cloneNode(true) as HTMLElement
    copy.querySelectorAll('[data-generated], .ov-install__code').forEach((n) => n.remove())
    const left = copy.textContent ?? ''
    expect(left.length).toBeGreaterThan(500)
    expect(left.match(/.{0,30}\d.{0,30}/g) ?? []).toEqual([])
  })

  it('has one h1, then h2 sections, then h3 cards', () => {
    const { container } = render(<Overview />)
    const levels = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]))
    expect(levels.filter((l) => l === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1)
    expect(Math.max(...levels)).toBe(3)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Check it yourself', 'Built for security products', 'Ways in', `New in ${pkg.version}`, 'Specified, not built yet',
    ])
  })

  it('has one primary call to action, and the install line names what it copies', () => {
    const { container } = render(<Overview />)
    expect(container.querySelectorAll('.shell-action--primary')).toHaveLength(1)
    expect(within(container).getByRole('link', { name: 'Browse components' })).toHaveAttribute('href', TARGETS.components)
    expect(within(container).getByRole('button', { name: 'Copy install command' })).toBeInTheDocument()
    expect(container.querySelector('.ov-install__code')).toHaveTextContent(/^npm install @omkarux\/vela$/)
  })
})
