/**
 * The Proposal pages' data (playground spec, section 7, "Proposal"; P1 request, item 3), read from
 * the same files the repository ships: guidelines/proposals/README.md is the index, and each spec
 * is loaded only when its page opens, so eight long specs do not ride in the main bundle.
 *
 * A proposal is a written spec, not a built component: its page has no stage, no controls, no
 * snippet and no install. It carries the spec's summary, its Responsive behaviour table, its Props
 * tables (read-only), and what it waits on, all read from the spec.
 */
import readme from '../../guidelines/proposals/README.md?raw'

export interface Proposal {
  id: string
  name: string
  file: string
  /** "What it is", from the README's table. */
  what: string
  /** A pull request or discussion to follow, where one exists. None does yet. */
  discuss?: string
  /** The Figma set's node id, where one exists. None does yet. */
  figma?: string
}

// | [Verdict Card](verdict-card.md) | One agent verdict on one case, … | 28 (22) | pressure-tested |
export const PROPOSALS: Proposal[] = [...readme.matchAll(/^\|\s*\[([^\]]+)\]\(([\w-]+)\.md\)\s*\|\s*([^|]+?)\s*\|/gm)].map((m) => ({
  id: m[2],
  name: m[1],
  file: `${m[2]}.md`,
  what: m[3],
}))

const LOADERS = import.meta.glob<string>(['../../guidelines/proposals/*.md', '!../../guidelines/proposals/README.md'], { query: '?raw', import: 'default' })

export function loadProposal(id: string): Promise<string> | undefined {
  return LOADERS[`../../guidelines/proposals/${id}.md`]?.()
}

export interface ProposalPage {
  summary: string
  responsive?: string
  props: string[]
  waitingOn: string[]
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

// "Built from" bullets that point the other way (who places, opens or feeds this one) or to later
// work are not things it waits on.
const NOT_A_DEPENDENCY = /^- (Placed in|Placed by|Opened from|Feeds|Fed by|Around it|Inside it later|Later)\b/i

/**
 * Read one proposal spec into its page. `built` is the names of components the kit ships (the
 * registry); a proposal waits on the other proposals its "Built from" section builds on.
 */
export function readProposal(md: string, self: string, built: readonly string[]): ProposalPage {
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

  const bullets: string[] = []
  for (const line of sectionBody(md, 'Built from').split('\n')) {
    if (line.startsWith('- ')) bullets.push(line)
    else if (/^\s+\S/.test(line) && bullets.length) bullets[bullets.length - 1] += ' ' + line.trim()
  }
  const others = PROPOSALS.map((p) => p.name).filter((n) => n !== self && !built.includes(n))
  const waitingOn = others.filter((name) => bullets.some((b) => !NOT_A_DEPENDENCY.test(b) && b.includes(name)))
  return { summary, responsive, props, waitingOn }
}

/** "the Calibrated Confidence Gate (Phase 2) and the Action Impact Card (Phase 2)" */
export function waitingOnText(names: string[]): string {
  const items = names.map((n) => `the ${n} (Phase 2)`)
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
