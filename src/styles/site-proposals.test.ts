import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PROPOSALS, readProposal, waitingOnText } from '../../demo/playground/proposals'
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
    // No Figma set exists for any of them yet, and no discussion is linked: the page says so.
    expect(PROPOSALS.filter((p) => p.figma || p.discuss)).toEqual([])
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
