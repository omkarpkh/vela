/**
 * Reading one proposal spec into its page (playground spec, section 7, "Proposal"). Split from
 * proposals.ts, which the navigation needs on every page, so this parser is fetched with the spec
 * when a Proposal page opens and never rides in the main bundle.
 */
import { PROPOSALS } from './proposals'

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
