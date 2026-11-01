import { describe, it, expect } from 'vitest'
import { render, within } from '@testing-library/react'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { States, SHOWN } from '../../demo/pages/States'
import { How } from '../../demo/pages/How'
import { STATUSES, STATUS_WORDS } from '../../demo/pages/overview-facts'
import { PAIRS } from '../../scripts/contrast-core.mjs'

// Fix 0 of the site evaluation (1 Nov 2026): the words and numbers the site shows outside the
// Overview. A status is said in the Status Indicator's own words, never a risk word; a count is read
// from what it counts, never typed beside it.
const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')

describe('the status words', () => {
  it("medium is said Degraded, as the spec says, and no status is said with a risk word", () => {
    const spec = read('guidelines/components/status-indicator.md')
    expect(spec).toMatch(/`medium` means degraded/)
    expect(spec).toContain('"Degraded"')
    expect(STATUS_WORDS.medium).toBe('Degraded')
    const riskWords = ['low', 'medium', 'high']
    for (const s of STATUSES) expect(riskWords, s).not.toContain(STATUS_WORDS[s].toLowerCase())
  })

  it('All states labels each dot with those words, so the fourth is never "Medium"', () => {
    const { container } = render(<States />)
    const section = [...container.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent === 'Status Indicator')!
    const labels = [...section.querySelectorAll('.vela-status__label')].map((n) => n.textContent)
    expect(labels).toEqual(STATUSES.map((s) => STATUS_WORDS[s]))
    expect(within(section).queryByText('Medium')).toBeNull()
  })
})

describe('the counts on All states and How it is made', () => {
  it('All states counts the components it shows, one section each', () => {
    const { container } = render(<States />)
    const titles = [...container.querySelectorAll('section > h2')].map((h) => h.textContent).filter((t) => t !== 'Tokens')
    expect(titles).toEqual([...SHOWN])
    expect(container.querySelector('.page-head')!.textContent).toContain(`${SHOWN.length} components · ${PAIRS.length} contrast pairs`)
  })

  it('How it is made states the contrast pairs the build counted', () => {
    const { container } = render(<How />)
    expect(container.textContent).toContain(`${PAIRS.length} contrast pairs hold in both themes`)
  })

  it('no page under demo/ types a count of contrast pairs by hand', () => {
    const walk = (d: string): string[] => readdirSync(resolve(process.cwd(), d), { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${d}/${e.name}`] : []))
    for (const f of walk('demo')) expect(read(f), f).not.toMatch(/\b\d+\s+(contrast\s+)?pairs\b/)
  })
})
