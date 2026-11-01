import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Foundation } from '../../demo/pages/Foundation'
import { FOUNDATIONS } from '../../demo/nav'
import { GROUP } from '../../demo/playground/tokens'
import { splitSpec, withoutTables, colourGroups, ROLES, LEVEL_WORDS, typeRoles, otherSizes, OWNS, MOTION, useOf } from '../../demo/pages/foundation-read'
import { PROPOSAL_RULES } from '../../demo/pages/overview-facts'
import { PROPOSALS } from '../../demo/playground/proposals'
import { STATUSES } from '../../demo/pages/overview-facts'
import { buildIndex, search, ruleTitle } from '../../demo/playground/search'
import { kindWord } from '../../demo/shell/Search'

// Slice 6 of the playground uplift: the Foundations pages are their specs with the tables turned into
// specimens, every value read from the token file. These hold each page to the files it is read from.

const md = (id: string) => FOUNDATIONS.find((f) => f.id === id)!.md
// Rows past "Show N more" are hidden until found: still on the page, so still counted.
const copyNames = (root: HTMLElement) => within(root).queryAllByRole('button', { name: /^Copy /, hidden: true }).map((b) => b.getAttribute('aria-label') ?? b.textContent)

describe('reading a foundation spec', () => {
  it('cuts the spec at its sections, and a picture takes the place of the tables only', () => {
    const { intro, sections } = splitSpec(md('spacing'))
    expect(intro).toMatch(/^A 5px-based scale/)
    expect(sections.map((s) => s.id)).toEqual(['rules', 'anti-patterns'])
    expect(withoutTables(intro)).not.toMatch(/^\|/m)
    expect(useOf(intro, '--vela-space-20')).toBe('Section padding, tab gaps')
  })

  it('puts every colour token in exactly one place: a group, or a taxonomy row', () => {
    const grouped = colourGroups().flatMap((g) => g.tokens)
    const kinds = ['severity', 'risk'] as const
    const taxonomy = [
      ...kinds.flatMap((k) => ROLES.flatMap((r) => (k === 'severity' ? ['success', 'info', 'warning', 'minor', 'major', 'critical'] : ['low', 'medium', 'high']).map((l) => r.token(k, l)))),
      ...STATUSES.map((s) => `--vela-signal-status-${s}`),
    ]
    expect([...grouped, ...taxonomy].sort()).toEqual([...GROUP.color].sort())
  })

  it("shows a status by the Status Indicator's own word: the fourth is Degraded, never Medium", () => {
    expect(STATUSES.map(LEVEL_WORDS.status)).toEqual(['Status unknown', 'Healthy', 'Warning', 'Degraded', 'Unhealthy'])
  })

  it("reads the type scale's roles from the spec's own table, each with its class", () => {
    const { sections } = splitSpec(md('typography'))
    const roles = typeRoles(sections.find((s) => s.id === 'the-scale')!.body)
    expect(roles.map((r) => r.role)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Body', 'Meta', 'Mono meta'])
    expect(roles[0]).toMatchObject({ triple: '32 / 300 / 42', className: '.vela-h1' })
  })

  it('gives every sizing token one page, and the motion tokens one group each', () => {
    const owned = GROUP.sizing.filter((n) => OWNS.spacing(n) || OWNS.radius(n) || OWNS.sizing(n))
    expect([...owned, ...otherSizes()].sort()).toEqual([...GROUP.sizing].sort())
    const motion = [...MOTION.durations(), ...MOTION.curves(), ...MOTION.waits(), ...MOTION.brand(), ...MOTION.other()]
    expect(motion.sort()).toEqual([...GROUP.motion].sort())
  })
})

describe('the Foundations pages', () => {
  it('Colour: every semantic colour has a copy mark, and the Status row says Degraded', () => {
    const { container } = render(<Foundation id="color" />)
    const names = copyNames(container)
    for (const t of GROUP.color) expect(names, t).toContain(`Copy ${t}`)
    // Primitives are drawn for reference and never bound: no copy mark.
    expect(names.some((n) => /--vela-grey-/.test(n ?? ''))).toBe(false)
    const status = screen.getByRole('table', { name: /^Status/ })
    expect(within(status).getByText('Degraded')).toBeInTheDocument()
    expect(within(status).queryByText('Medium')).toBeNull()
  })

  it.each([
    ['typography', 'typography'],
    ['spacing', 'space'],
    ['radius', 'radius'],
    ['motion', 'motion'],
  ])('%s: every one of its tokens has a copy mark', (id, kind) => {
    const { container } = render(<Foundation id={id} />)
    const names = copyNames(container)
    const tokens = kind === 'typography' ? GROUP.typography : kind === 'motion' ? GROUP.motion : GROUP.sizing.filter(kind === 'space' ? OWNS.spacing : OWNS.radius)
    for (const t of tokens) expect(names, t).toContain(`Copy ${t}`)
  })

  it('sizing: its own tokens and the other sizes all have a copy mark, and the spec\'s paragraphs stay', () => {
    const { container } = render(<Foundation id="sizing" />)
    const names = copyNames(container)
    for (const t of GROUP.sizing.filter((n) => OWNS.sizing(n)).concat(otherSizes())) expect(names, t).toContain(`Copy ${t}`)
    expect(container).toHaveTextContent('Button and the input family do not share a height ramp.')
  })

  it('a duration and a curve each have a Play button named for its token', () => {
    render(<Foundation id="motion" />)
    for (const t of [...MOTION.durations(), ...MOTION.curves()]) expect(screen.getByRole('button', { name: `Play ${t}` })).toBeInTheDocument()
  })

  it('one h1, sections as h2, and each page ends on the next foundation', () => {
    for (const f of FOUNDATIONS.filter((x) => x.kind === 'Foundation')) {
      const { container, unmount } = render(<Foundation id={f.id} />)
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      const levels = [...container.querySelectorAll('h1, h2, h3, h4')].map((h) => Number(h.tagName[1]))
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `${f.id}, heading ${i}`).toBeLessThanOrEqual(1)
      const next = FOUNDATIONS[FOUNDATIONS.indexOf(f) + 1]
      expect(container.querySelector('.shell-next')).toHaveAttribute('href', `#/foundations/${next.id}`)
      unmount()
    }
  })
})

describe('the Overview and the overlays read their facts', () => {
  it("each proposal's rules come from the proposals README, and every proposal has them", () => {
    for (const p of PROPOSALS) {
      expect(PROPOSAL_RULES[p.id], p.id).toBeDefined()
      expect(PROPOSAL_RULES[p.id].proved).toBeLessThanOrEqual(PROPOSAL_RULES[p.id].rules)
    }
  })

  it('a rule is titled in plain words, and found by its title or its id', () => {
    expect(ruleTitle('toggle-label-required', 'toggle')).toBe('Label required')
    expect(ruleTitle('alert-dialog-actions-are-fixed', 'dialog')).toBe('Alert dialog actions are fixed')
    const index = buildIndex()
    const byId = search(index, 'toggle-label-required')[0]
    expect(byId.item).toMatchObject({ kind: 'rule', title: 'Label required', ruleId: 'toggle-label-required' })
    expect(search(index, 'label required').some((h) => h.item.ruleId === 'toggle-label-required')).toBe(true)
  })

  it('every kind of result has its word, and a contract says so', () => {
    const index = buildIndex()
    expect(new Set(index.map(kindWord))).toEqual(new Set(['Component', 'Not in Vela', 'Proposal', 'Foundation', 'Contract', 'Rule']))
    expect(kindWord(index.find((i) => i.id === 'filter-grammar')!)).toBe('Contract')
  })
})
