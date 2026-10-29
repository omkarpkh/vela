import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// scripts/figma/pages/*.figma.js draw the library's Changelog and Status pages from the
// repository (build-pages.mjs compiles the data in). check-pages.mjs runs each one in the mock
// Plugin API — twice, the way a re-run in the library would — so the page it draws can be
// asserted here and linted with the reviewer rules the component builders answer to.
const root = process.cwd()
const cli = (...args: string[]) => {
  try { return execFileSync('node', ['scripts/figma/check-pages.mjs', ...args, '--json'], { cwd: root, encoding: 'utf8' }) }
  catch (e: any) { return e.stdout as string }
}
type Node = { t: string; n: string; ch?: Node[]; chars?: string; style?: string | null; fill?: string[]; stroke?: string[]; link?: string; list?: string; rad?: [number, string | null]; wh?: [number, number, string | null, string | null] }
const lintReport: Record<string, { problems: { rule: string; node: string; what: string; waived: boolean }[]; allow: { rule: string; reason: string }[]; bytes: number }> = JSON.parse(cli('--lint'))
const built = (page: string) => JSON.parse(cli('--dump', page, '--runs', '2')) as { bytes: number; runs: { result: any; topLevel: { id: string; type: string; name: string }[] }[]; tree: Node }
const all = (n: Node): Node[] => [n, ...(n.ch ?? []).flatMap(all)]
const kid = (n: Node, name: string) => n.ch!.find((c) => c.n === name)!
const released = [...readFileSync('CHANGELOG.md', 'utf8').matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1])

describe('Figma doc pages, built in the mock Plugin API', () => {
  it('builds both pages and both pass the reviewer rules', () => {
    expect(Object.keys(lintReport).sort()).toEqual(['changelog', 'status'])
    for (const [page, r] of Object.entries(lintReport)) {
      expect(r.problems.filter((p) => !p.waived).map((p) => `${page} ${p.rule}  ${p.node}: ${p.what}`)).toEqual([])
    }
  })

  it('only Status waives anything: the Label column width, which has no token', () => {
    expect(lintReport.changelog.allow).toEqual([])
    expect(lintReport.status.allow.map((a) => a.rule)).toEqual(['raw-size'])
  })

  it('each script stays under 50 KB', () => {
    for (const r of Object.values(lintReport)) expect(r.bytes).toBeLessThan(50 * 1024)
  })
})

describe.each(['changelog', 'status'])('the %s page', (page) => {
  const b = built(page)
  const name = page === 'changelog' ? 'Changelog' : 'Status'

  it('a second run rebuilds the same frame in place: still one frame, with the same id', () => {
    const [first, second] = b.runs
    expect(first.result.reused).toBe(false)
    expect(second.result.reused).toBe(true)
    expect(second.topLevel).toEqual(first.topLevel)
    expect(second.topLevel).toEqual([{ id: first.result.frameId, type: 'FRAME', name }])
  })

  it('is a 1080-wide page frame on surface/global, padded space/60, with no components', () => {
    expect(b.tree.wh![0]).toBe(1080)
    expect(b.tree.fill).toEqual(['surface/global'])
    expect(all(b.tree).filter((n) => /COMPONENT|INSTANCE/.test(n.t))).toEqual([])
  })

  it('gives every text a text style and binds every fill and stroke to a variable', () => {
    for (const n of all(b.tree)) {
      if (n.t === 'TEXT') expect(n.style, `"${n.chars}"`).toMatch(/^(Heading\/H[1-6]|Body\/(Default|Meta|Link))$/)
      for (const p of [...(n.fill ?? []), ...(n.stroke ?? [])]) expect(p, n.n).toMatch(/^(surface|border|text)\//)
    }
  })

  it('ends with the stamp: read from which commit, on which day', () => {
    const texts = b.tree.ch!.filter((c) => c.t === 'TEXT').map((c) => c.chars!)
    const stamp = texts.find((t) => t.startsWith('Read from '))!
    expect(stamp).toMatch(/ at \S+ [0-9a-f]{7,}(\+uncommitted)? \(\d{1,2} [A-Z][a-z]{2} \d{4}\)\./)
    expect(b.tree.ch!.indexOf(b.tree.ch!.find((c) => c.chars === stamp)!)).toBeGreaterThanOrEqual(b.tree.ch!.length - 2)
  })
})

describe('the Changelog page', () => {
  const { tree } = built('changelog')
  const cards = tree.ch!.filter((c) => c.t === 'FRAME')

  it('has one card per released version, newest first, and none for Unreleased', () => {
    expect(cards.map((c) => c.n)).toEqual(released)
    expect(JSON.stringify(tree)).not.toMatch(/Unreleased/)
  })

  it('cards are surface/container on border/subtle, radius/4, padded space/20', () => {
    for (const c of cards) {
      expect([c.fill, c.stroke, c.rad![1]]).toEqual([['surface/container'], ['border/subtle'], 'radius/4'])
      expect((c as any).pad.map((p: any) => p[1])).toEqual(['space/20', 'space/20', 'space/20', 'space/20'])
    }
  })

  it('heads each card with the version in H3 and a Meta date line saying whether it is on npm — every version but 0.1.0', () => {
    for (const c of cards) {
      const [version, date] = kid(c, 'Header').ch!
      expect([version.chars, version.style]).toEqual([c.n, 'Heading/H3'])
      expect(date.style).toBe('Body/Meta')
      expect(date.chars).toMatch(c.n === '0.1.0' ? /^9 Sep 2026 · Not on npm$/ : /^\d{1,2} [A-Z][a-z]{2} 2026 · On npm$/)
    }
    expect(kid(cards.find((c) => c.n === '0.12.1')!, 'Header').ch![1].chars).toBe('9 Oct 2026 · On npm')
  })

  it('lists each section under an H6 as Body bullets of the bold lead-ins, word for word', () => {
    const c = cards.find((x) => x.n === '0.12.1')!
    expect(c.ch!.filter((s) => s.t === 'FRAME' && s.n !== 'Header').map((s) => s.n)).toEqual(['Fixed', 'Added'])
    const fixed = kid(c, 'Fixed').ch!
    expect([fixed[0].chars, fixed[0].style]).toEqual(['Fixed', 'Heading/H6'])
    expect([fixed[1].style, fixed[1].list]).toEqual(['Body/Default', 'UNORDERED'])
    expect(fixed[1].chars!.split('\n')).toEqual([
      'The Figma builders now reproduce the library as it was corrected by hand on 9 October',
      'The text styles have a source.',
      'The code draws the same boxes.',
      'npm run tokens:figma --only <Collection> wrote empty values.',
    ])
    expect(kid(cards.find((x) => x.n === '0.1.0')!, 'Added').ch![1].chars!.split('\n')[0]).toBe('Components:')
  })

  it('links every card to its full entry on GitHub', () => {
    for (const c of cards) {
      const link = c.ch![c.ch!.length - 1]
      expect([link.chars, link.style]).toEqual(['Full entry: CHANGELOG.md', 'Body/Link'])
      expect(link.link).toMatch(/^https:\/\/github\.com\/omkarpkh\/vela\/blob\/main\/CHANGELOG\.md#\d+--\d{4}-\d{2}-\d{2}$/)
    }
    expect(cards[0].ch!.at(-1)!.link).toBe('https://github.com/omkarpkh/vela/blob/main/CHANGELOG.md#0121--2026-10-09')
  })

  it('says where "on npm" came from: the committed published.json, which lists every release but 0.1.0', () => {
    expect(tree.ch!.at(-1)!.chars).toContain('On npm: per scripts/figma/pages/published.json')
    const file = JSON.parse(readFileSync('scripts/figma/pages/published.json', 'utf8'))
    expect(file.versions.every((v: string) => released.includes(v))).toBe(true)
    expect(file.versions).not.toContain('0.1.0')
  })
})

describe('the Status page', () => {
  const { tree } = built('status')
  const table = kid(tree, 'Table')
  const rows = table.ch!.filter((r) => r.n !== 'Header')
  const label = (r: Node) => kid(r, 'label').ch![0].ch![0].chars

  it('has the legend: the four GOVERNANCE.md labels as neutral outlined chips, in its own words', () => {
    const legend = kid(tree, 'Legend')
    const items = legend.ch!.filter((c) => c.t === 'FRAME')
    expect(items.map((i) => i.n)).toEqual(['Approved', 'Known bugs', 'Experimental', 'Retired'])
    expect(items[0].ch![1].chars).toBe('Specced, built, tested, in the Figma library, every rule tagged and proved. Semver applies in full. Breaking changes follow VERSIONING.md.')
    for (const i of items) {
      const chip = i.ch![0].ch![0]
      expect([chip.n, chip.fill, chip.stroke, chip.rad![1], chip.ch![0].style]).toEqual(['chip', [], ['border/default'], 'radius/3', 'Body/Meta'])
    }
  })

  it('never colours a label with a taxonomy', () => {
    expect(JSON.stringify(tree)).not.toMatch(/"(severity|risk|status)\//)
  })

  it('has seven rows in registry order: Risk Pill Experimental, the other six Approved', () => {
    expect(rows.map((r) => r.n)).toEqual(['Button', 'Toggle', 'Input', 'Contextual Alert', 'Status Indicator', 'Risk Pill', 'Tabs'])
    expect(rows.filter((r) => label(r) === 'Approved')).toHaveLength(6)
    expect(label(rows.find((r) => r.n === 'Risk Pill')!)).toBe('Experimental')
  })

  it('fills Figma set, React export, Since and Spec from the repository', () => {
    expect(kid(table, 'Header').ch!.map((c) => c.chars)).toEqual(['Component', 'Label', 'Figma set', 'React export', 'Since', 'Spec'])
    const cells = (n: string) => rows.find((r) => r.n === n)!.ch!.filter((c) => c.t === 'TEXT')
    const [, set, exp, since, spec] = cells('Contextual Alert')
    expect([set.chars, exp.chars, since.chars, spec.chars]).toEqual(['Contextual Alert · page Contextual Alert', 'ContextualAlert · @omkarux/vela', '0.1.0', 'contextual-alert.md'])
    expect(spec.link).toBe('https://github.com/omkarpkh/vela/blob/main/guidelines/components/contextual-alert.md')
    const [, rset, , rsince, rspec] = cells('Risk Pill')
    expect([rset.chars, rsince.chars, rspec.chars]).toEqual(['None yet — the builder is ready (risk-pill.figma.js)', 'Unreleased', 'risk-pill.md (branch)'])
    expect(rspec.link).not.toContain('/blob/main/')
  })
})
