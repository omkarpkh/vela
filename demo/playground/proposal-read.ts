/**
 * Reading one proposal spec into its page (playground spec, section 7, "Proposal"; slice 4 of the
 * playground uplift, s5-proposal). Split from proposals.ts, which the navigation needs on every
 * page, so this parser is fetched with the spec when a Proposal page opens and never rides in the
 * main bundle.
 *
 * Every fact on a proposal page is read here, from the spec, so the page cannot say what the spec
 * does not: its states (the States table, every row), what it is built from (the "Built from"
 * bullets, each part's status read from the kit's own catalogue by the caller), its promises (the
 * rule ids under "Hard constraints", counted by how each will be checked), its sources (the Intent's
 * "What it answers"), its word sets ("New taxonomies" or "New closed sets"), and its props. The
 * site never rewrites a spec: its dashes are turned into a colon or a full stop by the display layer
 * (`undash`, rules-read.ts) when the page renders them.
 */
import { PROPOSALS } from './proposals'
import { cells } from './spec'

export interface ProposalPage {
  summary: string
  responsive?: string
  props: string[]
  waitingOn: string[]
}

/** One row of the spec's States table, as the spec writes it. */
export interface ProposalState { name: string; renders: string }

/** How a promise will be checked, once the component is built. */
export type PromiseLevel = 'compiler' | 'runtime' | 'browser' | 'convention'

/** One rule under "Hard constraints": its bold lead and its id. */
export interface ProposalPromise { id: string; level: PromiseLevel; lead: string }

/** One source the Intent says the spec answers. `href` only where the spec gives a link. */
export interface ProposalSource { title: string; line: string; href?: string }

/** One closed word set the spec adds. */
export interface WordSet { name: string; values: string[]; describes: string }

/** One prop, from the spec's Props tables. */
export interface PropRow { name: string; type: string; notes: string }

/**
 * Where a part named in "Built from" stands today. The caller reads it from the kit's catalogue,
 * the proposals' README and the site's list of missing components, never from the spec's prose.
 */
export type PartStatus =
  | { kind: 'kit'; status: string; href: string }
  | { kind: 'proposal'; href: string }
  | { kind: 'missing'; stands?: string; closest?: { name: string; href: string } }
  | { kind: 'self' }

/** What a part's relation to this proposal is: it is built from it, or the part sits around it. */
export type PartRole = 'built-from' | 'around' | 'later'

export interface ProposalPart { name: string; role: PartRole; words: string }

export interface ProposalDetail extends ProposalPage {
  /** The one line under the title: the summary's first sentence. */
  line: string
  states: ProposalState[]
  parts: ProposalPart[]
  promises: ProposalPromise[]
  sources: ProposalSource[]
  wordSets: WordSet[]
  propRows: PropRow[]
}

const sectionBody = (md: string, heading: string) => {
  const m = md.match(new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))
  return m?.[1] ?? ''
}

/** Each markdown table in a body, as its own block of lines. */
const tablesOf = (body: string) => {
  const out: string[] = []
  let cur: string[] = []
  for (const line of body.split('\n')) {
    if (line.startsWith('|')) cur.push(line)
    else if (cur.length) { out.push(cur.join('\n')); cur = [] }
  }
  if (cur.length) out.push(cur.join('\n'))
  return out
}

/** A table's body rows, as cells, without its header and separator. */
const rowsOf = (table: string) => table.split('\n').slice(2).map(cells)

/** Top-level bullets, each with its wrapped and nested lines joined on. */
function bulletsOf(body: string): string[] {
  const bullets: string[] = []
  for (const line of body.split('\n')) {
    if (line.startsWith('- ')) bullets.push(line)
    else if (/^\s+\S/.test(line) && bullets.length) bullets[bullets.length - 1] += ' ' + line.trim()
    else if (line.trim() && !line.startsWith('- ') && bullets.length && !/^\s/.test(line)) bullets.push('')   // a paragraph ends the list
  }
  return bullets.filter(Boolean)
}

// "Built from" bullets that point the other way (who places, opens or feeds this one) or to later
// work are not things it waits on.
const NOT_A_DEPENDENCY = /^- (Placed in|Placed by|Opened from|Feeds|Fed by|Around it|Inside it later|Later|Reads from)\b/i
const LATER = /^- (Inside it later|Later)\b/i

/** Markdown's marks gone: bold, code ticks, links as their words. */
export const plain = (md: string) => md
  .replace(/\\\*/g, '\u0000').replace(/\*\*|`/g, '').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:)]|$)/g, '$1$2').replace(/\u0000/g, '*')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()

/** The first sentence of a passage, its markdown kept. */
function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  // A full stop that ends a sentence: not inside "et al." or "v2.0", and followed by a capital or a quote.
  const m = t.match(/^([\s\S]*?[^.](?<!\bet al)(?<!\be\.g)(?<!\bi\.e)[.!?])\s+(?=[A-Z"“(*`])/)
  return (m ? m[1] : t).trim()
}

/**
 * The parts "Built from" names, in its order: each bold name once, with what it is for. Names in
 * code (`resolveRoute`) are functions of another proposal, and lowercase names ("case deadlines
 * page pattern") are page patterns, not parts; neither is a box on the map.
 */
export function partsOf(md: string, self: string): ProposalPart[] {
  const out: ProposalPart[] = []
  for (const b of bulletsOf(sectionBody(md, 'Built from'))) {
    const role: PartRole = LATER.test(b) ? 'later' : NOT_A_DEPENDENCY.test(b) ? 'around' : 'built-from'
    const names = [...b.matchAll(/\*\*([^*`]+)\*\*/g)]
    names.forEach((n, i) => {
      const name = n[1].replace(/\s+primitives$/i, '').trim()
      if (!/^[A-Z]/.test(name) || name === self || out.some((p) => p.name === name)) return
      // What it is for: the words after this name, up to the next name or the end of its clause.
      const from = (n.index ?? 0) + n[0].length
      const to = names[i + 1]?.index ?? b.length
      // A leading note in brackets is the spec's bookkeeping ("(core)", "(Phase 1)", a file path), not
      // what the part is for; the words end at the clause's end.
      const words = plain(b.slice(from, to)).replace(/^[\s,;:]+/, '').replace(/^\([^)]*\)[,:]?\s*/, '').split(/;\s/)[0].replace(/[\s;,]+(and|the|an?|its)?$/i, '').replace(/\s*;$/, '')
      out.push({ name, role, words })
    })
  }
  return out
}

/** The rules under "Hard constraints", each with its bold lead and how it will be checked. */
export function promisesOf(md: string): ProposalPromise[] {
  const out: ProposalPromise[] = []
  for (const b of bulletsOf(sectionBody(md, 'Hard constraints'))) {
    const lead = b.match(/^- \*\*(.+?)\*\*/)?.[1] ?? firstSentence(plain(b.slice(2)))
    for (const r of b.matchAll(/`([a-z0-9-]+)` · (compiler|runtime|browser|convention)\b/g))
      out.push({ id: r[1], level: r[2] as PromiseLevel, lead: plain(lead).replace(/[.:]$/, '') })
  }
  return out
}

/**
 * The sources the Intent names under "What it answers": each bold-led bullet, and each bullet that
 * is only a link. A subsection (`###`, the Autonomy Ladder's departures from its public page) is the
 * spec's own reasoning, not a source.
 */
export function sourcesOf(md: string): ProposalSource[] {
  const intent = sectionBody(md, 'Intent').split(/^### /m)[0]
  const out: ProposalSource[] = []
  for (const b of bulletsOf(intent)) {
    const link = b.match(/^- \[([^\]]+)\]\((https?:[^)]+)\)\s*$/)
    if (link) { out.push({ title: link[1], line: '', href: link[2] }); continue }
    const bold = b.match(/^- \*\*(.+?)\*\*\s*([\s\S]*)$/)
    if (!bold) continue
    const title = plain(bold[1]).replace(/[.:]$/, '')
    // The words straight after a title in brackets belong to it: "(the page at `/verdict-card/` on omkarux.com)".
    let rest = bold[2].trim()
    const aside = rest.match(/^(\([^)]{4,}\))[,.]?\s*/)
    if (aside) rest = rest.slice(aside[0].length)
    const href = b.match(/\]\((https?:[^)]+)\)/)?.[1]
    // A nested list joined onto its lead ("It supplies four ideas: - a ladder …") ends the line at its lead.
    const line = plain(firstSentence(rest.split(/\s-\s/)[0]))
    out.push({ title: aside ? `${title} ${plain(aside[1])}` : title, line, href })
  }
  return out
}

/** The closed word sets a spec adds, from the first table under its "New taxonomies" heading. */
export function wordSetsOf(md: string): WordSet[] {
  const out: WordSet[] = []
  for (const m of md.matchAll(/^### (?:New taxonom(?:y|ies)|New closed sets|Taxonomy:)[^\n]*\n([\s\S]*?)(?=^##|(?![\s\S]))/gm)) {
    const table = tablesOf(m[1])[0]
    if (!table) continue
    for (const row of rowsOf(table)) {
      const name = row[0]?.match(/\*\*(.+?)\*\*/)?.[1]
      if (!name) continue
      const values = [...(row[1] ?? '').matchAll(/`([^`]+)`/g)].map((v) => v[1])
      if (!values.length || out.some((s) => s.name === name)) continue
      out.push({ name, values, describes: plain(row[2] ?? '') })
    }
  }
  return out
}

/** The props of every top-level Props table, in order. */
export function propRowsOf(md: string): PropRow[] {
  return tablesOf(sectionBody(md, 'Props'))
    .filter((t) => /^\|\s*Prop\s*\|/.test(t))
    .flatMap((t) => rowsOf(t).map((r) => ({ name: plain(r[0] ?? ''), type: (r[1] ?? '').replace(/`/g, ''), notes: r[3] ?? '' })))
    .filter((r) => r.name)
}

/** The States table: every row, in the spec's order. */
export function statesOf(md: string): ProposalState[] {
  const table = tablesOf(sectionBody(md, 'States')).find((t) => /^\|\s*State\s*\|/.test(t))
  return table ? rowsOf(table).map((r) => ({ name: r[0], renders: r[1] ?? '' })).filter((s) => s.name) : []
}

/**
 * Read one proposal spec into its page. `built` is the names of components the kit ships (the
 * registry); a proposal waits on the other proposals its "Built from" section builds on.
 */
export function readProposal(md: string, self: string, built: readonly string[]): ProposalDetail {
  // The summary: the paragraphs between the title's notice and the **Status:** line.
  const afterTitle = md.split(/^# .+$/m)[1] ?? ''
  const intro = afterTitle.split(/^\*\*Status:\*\*/m)[0]
  const summary = intro
    .split('\n')
    .filter((l) => !l.startsWith('>'))
    .join('\n')
    .trim()

  // The Responsive behaviour table; a spec whose section is prose (the badge is inline text) gives
  // its first paragraph instead.
  const responsiveBody = sectionBody(md, 'Responsive behaviour').trim()
  const responsive = tablesOf(responsiveBody)[0] ?? (responsiveBody.split(/\n\s*\n/)[0] || undefined)
  const props = tablesOf(sectionBody(md, 'Props')).filter((t) => /^\|\s*Prop\s*\|/.test(t))

  const bullets = bulletsOf(sectionBody(md, 'Built from'))
  const others = PROPOSALS.map((p) => p.name).filter((n) => n !== self && !built.includes(n))
  const waitingOn = others.filter((name) => bullets.some((b) => !NOT_A_DEPENDENCY.test(b) && b.includes(name)))
  return {
    summary, responsive, props, waitingOn,
    line: firstSentence(summary.split(/\n\s*\n/)[0]),
    states: statesOf(md),
    parts: partsOf(md, self),
    promises: promisesOf(md),
    sources: sourcesOf(md),
    wordSets: wordSetsOf(md),
    propRows: propRowsOf(md),
  }
}

/** "the Calibrated Confidence Gate (Phase 2) and the Action Impact Card (Phase 2)" */
export function waitingOnText(names: string[]): string {
  const items = names.map((n) => `the ${n} (Phase 2)`)
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** "A, B and C" */
export function listWords(names: readonly string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
