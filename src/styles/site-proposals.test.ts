import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PROPOSALS } from '../../demo/playground/proposals'
import { readProposal, waitingOnText } from '../../demo/playground/proposal-read'
import { REGISTRY } from '../../demo/playground/registry'

// The Proposal pages (playground spec, section 7): one per spec in guidelines/proposals/, read from
// the folder's README and from each spec, so the site cannot list a proposal the repo does not have.
const dir = resolve(process.cwd(), 'guidelines/proposals')
const read = (file: string) => readFileSync(resolve(dir, file), 'utf8')
const BUILT = REGISTRY.map((e) => e.name)

describe('Proposal pages', () => {
  it('lists every spec in guidelines/proposals, and nothing the kit has built', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
    expect(PROPOSALS.map((p) => p.file).sort()).toEqual(files)
    for (const p of PROPOSALS) expect(BUILT, p.name).not.toContain(p.name)
    // No Figma set exists for any of them yet: the page says so. The two proposed in PR #21 link to
    // it as their discussion (playground spec section 7); no other has one.
    expect(PROPOSALS.filter((p) => p.figma)).toEqual([])
    expect(PROPOSALS.filter((p) => p.discuss).map((p) => [p.id, p.discuss])).toEqual([
      ['evidence-locker', 'https://github.com/omkarpkh/vela/pull/21'],
      ['agent-provenance-badge', 'https://github.com/omkarpkh/vela/pull/21'],
    ].filter(([id]) => PROPOSALS.some((p) => p.id === id)))
  })

  it.each(PROPOSALS.map((p) => p.id))('%s reads into a summary, a responsive table or line, and read-only Props tables', (id) => {
    const p = PROPOSALS.find((x) => x.id === id)!
    const page = readProposal(read(p.file), p.name, BUILT)
    expect(page.summary.length).toBeGreaterThan(80)
    expect(page.summary).not.toMatch(/Proposal — not built|\*\*Status:\*\*/)
    expect(page.responsive).toBeTruthy()
    expect(page.props.length).toBeGreaterThan(0)
    for (const t of page.props) expect(t).toMatch(/^\| Prop \| Type \| Default \| Notes \|/)
    // It waits only on other proposals, never on itself or on a component the kit ships.
    for (const name of page.waitingOn) {
      expect(name).not.toBe(p.name)
      expect(BUILT).not.toContain(name)
    }
  })

  it('the Evidence Locker waits on the Action Impact Card and the Calibrated Confidence Gate, not on the shipped Popover', () => {
    const page = readProposal(read('evidence-locker.md'), 'Evidence Locker', BUILT)
    expect(page.summary.startsWith('Everything an agent used to reach one conclusion')).toBe(true)
    expect(page.responsive?.split('\n')[0]).toBe('| Container width | Layout |')
    expect(waitingOnText(page.waitingOn)).toBe('the Action Impact Card (Phase 2) and the Calibrated Confidence Gate (Phase 2)')
  })
})

// Slice 4 of the playground uplift (s5-proposal): the proposal page reads every fact from its spec.
import { WORKED_EXAMPLES, wordsOf, asWords } from '../../demo/playground/proposal-steps'
import { statesOf, promisesOf, sourcesOf, partsOf, wordSetsOf, propRowsOf } from '../../demo/playground/proposal-read'
import { proposalRulesOf } from '../../demo/playground/facts'
import { partStatus } from '../../demo/pages/proposal-parts'
import { CATALOG } from '../../demo/playground/catalog'
import { statusOf } from '../../demo/playground/status'

describe('Proposal pages, slice 4', () => {
  const NO_EXAMPLE = ['verdict-card', 'action-impact-card', 'autonomy-ladder', 'calibrated-confidence-gate', 'agent-provenance-badge']

  it('a spec with no worked example has no steps: five of nine, and Approval Queue, which names its example but never writes it', () => {
    for (const id of NO_EXAMPLE) {
      expect(read(`${id}.md`), id).not.toMatch(/worked example/i)
      expect(WORKED_EXAMPLES[id], id).toBeUndefined()
    }
    // Approval Queue names a Figma frame called a worked example; there is no story in the spec to draw steps from.
    expect(read('approval-queue.md')).toMatch(/Example frame `Approval Queue — worked example`/)
    expect(WORKED_EXAMPLES['approval-queue']).toBeUndefined()
    expect(Object.keys(WORKED_EXAMPLES).sort()).toEqual(['awareness-clock', 'evidence-locker', 'override-and-teach-panel'])
  })

  it.each(Object.keys(WORKED_EXAMPLES))('every word of %s\'s steps is the spec\'s own', (id) => {
    const spec = asWords(read(`${id}.md`))
    expect(spec).toMatch(/worked example/i)
    for (const w of wordsOf(WORKED_EXAMPLES[id])) expect(spec, w).toContain(asWords(w))
    // Every pin in a sketch has its note, and every note its pin.
    for (const s of WORKED_EXAMPLES[id].steps) {
      const pins = s.blocks.flatMap((b) => (b.pin ? [b.pin] : []))
      expect(s.notes.map((n) => n.pin), s.title).toEqual(pins)
    }
  })

  it.each(PROPOSALS.map((p) => p.id))('%s: the state count is the States table\'s rows', (id) => {
    const md = read(`${id}.md`)
    const table = md.split(/^## States\s*$/m)[1].split(/^## /m)[0].split('\n').filter((l) => l.startsWith('|'))
    const states = statesOf(md)
    expect(states.length).toBe(table.length - 2)
    expect(states.every((s) => s.name && s.renders)).toBe(true)
  })

  it('Evidence Locker: 21 states, 20 promises (17 with a proof), 7 sources, 2 word sets, 8 props', () => {
    const md = read('evidence-locker.md')
    expect(statesOf(md)).toHaveLength(21)
    const promises = promisesOf(md)
    expect(promises).toHaveLength(20)
    expect(promises.filter((p) => p.level !== 'convention')).toHaveLength(17)
    expect(sourcesOf(md).map((s) => s.title)).toEqual([
      'OWASP Agentic Top 10 (Dec 2025), ASI01, Agent Goal Hijack',
      'Greshake et al., 2023 ("Not what you\'ve signed up for", arXiv 2302.12173)',
      'Hines et al., 2024 ("Defending Against Indirect Prompt Injection Attacks With Spotlighting", Microsoft, arXiv 2403.14720)',
      'EU AI Act, Article 13(1) and 14(4)(c)',
      'Rastogi et al., CCS 2025 (n = 248); Alahmadi et al., USENIX Security 2022',
      'The security-vendor landscape (13 vendors, read 28 Oct 2026)',
      'The verdict-card study (the page at /verdict-card/ on omkarux.com)',
    ])
    // No source in this spec carries a link, so none is drawn as one.
    expect(sourcesOf(md).filter((s) => s.href)).toEqual([])
    expect(wordSetsOf(md).map((s) => [s.name, s.values.length])).toEqual([['Content trust', 3], ['Evidence channel', 3]])
    expect(propRowsOf(md).map((p) => p.name)).toEqual(['conclusion', 'items', 'claims', 'notSeen', 'confidence', 'rationale', 'groupBy', 'timeZone'])
  })

  it.each(PROPOSALS.map((p) => p.id))('%s: promises agree with the rule count the page has always shown', (id) => {
    const md = read(`${id}.md`)
    const promises = promisesOf(md)
    const counted = proposalRulesOf(md)
    expect(promises.length).toBe(counted.total)
    for (const l of counted.byLevel) expect(promises.filter((p) => p.level === l.level).length, l.level).toBe(l.count)
    // The README's "Rules (with proofs)" column says the same.
    const row = readmeRow(id)
    expect(row, id).toBeTruthy()
    expect(`${promises.length} (${promises.filter((p) => p.level !== 'convention').length})`).toBe(row)
    for (const p of promises) expect(p.lead, p.id).not.toMatch(/\*|`/)
  })

  it('part statuses come from the kit: Popover is in the kit, Combobox is not, a proposal is a proposal', () => {
    const el = partsOf(read('evidence-locker.md'), 'Evidence Locker')
    const popover = el.find((p) => p.name === 'Popover')!
    expect(popover.role).toBe('built-from')
    expect(partStatus('Popover')).toMatchObject({ kind: 'kit', status: statusOf(CATALOG.find((c) => c.name === 'Popover')!.spec).label })
    expect(partStatus('Table')).toMatchObject({ kind: 'kit' })
    expect(partStatus('Button')).toMatchObject({ kind: 'kit', status: 'Approved' })
    expect(partStatus('Calibrated Confidence Gate')).toMatchObject({ kind: 'proposal', href: '#/proposals/calibrated-confidence-gate' })
    expect(partStatus('Verdict Card')).toMatchObject({ kind: 'proposal' })
    expect(partStatus('Combobox')).toMatchObject({ kind: 'missing', closest: { name: 'Input' } })
    expect(partStatus('Agent Action Ledger')).toMatchObject({ kind: 'missing' })
    // Every part every spec names resolves, and every kit part is one the catalogue lists.
    for (const p of PROPOSALS) for (const part of partsOf(read(p.file), p.name)) {
      const s = partStatus(part.name)
      if (s.kind === 'kit' && part.name !== 'Filter Grammar') expect(CATALOG.map((c) => c.name), part.name).toContain(part.name)
      if (BUILT.includes(part.name)) expect(s.kind, part.name).toBe('kit')
      if (PROPOSALS.some((q) => q.name === part.name)) expect(s.kind, part.name).toBe('proposal')
    }
    // Override & Teach Panel is built from a Combobox, which the kit does not have.
    const otp = partsOf(read('override-and-teach-panel.md'), 'Override & Teach Panel')
    expect(otp.find((p) => p.name === 'Combobox')?.role).toBe('built-from')
  })
})

function readmeRow(id: string): string | undefined {
  const readme = read('README.md')
  return readme.match(new RegExp(`\\]\\(${id}\\.md\\) \\|[^|]*\\| (\\d+ \\(\\d+\\)) \\|`))?.[1]
}
