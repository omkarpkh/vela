/**
 * Search (playground spec, section 10): titles, aliases, and the "use this instead" lines in every
 * spec's "When to use" section, plus rule ids, proposals and foundations. Built from the same
 * sources as the pages, so a new component is searchable the moment it is in the registry.
 *
 * Never indexed: Start, Project and Demos pages. A component query should find components, not the
 * nine unrelated links the audit counted.
 */
import { CATALOG as REGISTRY } from './catalog'
import { PROPOSALS } from './proposals'
import { statusOf } from './status'
import { href } from '../router'
import { FOUNDATIONS } from '../nav'

export type Kind = 'component' | 'missing' | 'proposal' | 'foundation' | 'rule'

export interface Item {
  kind: Kind
  id: string
  title: string
  href: string
  /** A lifecycle tag, shown as words: Experimental, Proposal, Planned, Specified, Not in Vela. Approved carries none. */
  tag?: string
  aliases: string[]
  /** The "When to use" lines that send a reader here, without their markdown. */
  uses: string[]
  /** One line that tells this result apart from its neighbours (the decision sign). */
  sign: string
}

/** Plain text from a line of spec markdown: no emphasis, code ticks or links. */
const plain = (md: string) => md.replace(/\*\*|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim()

/** The "When to use" bullets of a spec, each with the bold names it points to. */
function whenToUse(spec: string): { text: string; targets: string[] }[] {
  const m = spec.match(/^## When to use[^\n]*\n([\s\S]*?)(?=^## )/m)
  if (!m) return []
  const bullets = m[1].split(/\n(?=- )/).map((b) => b.replace(/^- /, '').replace(/\n\s+/g, ' ').trim()).filter(Boolean)
  return bullets.map((b) => {
    const [left, right = ''] = b.split('→')
    return { text: plain(left).replace(/[.,;:]$/, ''), targets: [...right.matchAll(/\*\*([^*]+)\*\*/g)].map((t) => t[1].trim()) }
  })
}

/** The spec's one-sentence summary: its first paragraph's first sentence. */
const summary = (spec: string) => plain(spec.replace(/^# [^\n]*\n+/, '').split(/\n\n/)[0]).split(/(?<=\.)\s/)[0]

/**
 * Not in the kit yet (playground spec, section 10, and DESIGN.md "Not in the kit"). Each says where
 * it stands and the closest thing that exists, so a search for it still ends somewhere useful.
 * The phase is ROADMAP.md's; the closest component is a link.
 */
export const MISSING: { id: string; title: string; aliases: string[]; stands: string; sign: string; closest: string }[] = [
  // A form value: Dropdown List acts at once and is never in a form (its spec), so the nearest for a
  // form is Radio Group, for a few options that fit on screen (playground spec v1.2, section 10).
  { id: 'select-list', title: 'Select List', aliases: ['select', 'dropdown', 'picklist', 'form select'], stands: 'planned for Phase 1', sign: 'A form value, chosen from a list and submitted with the form.', closest: 'radio-group' },
  { id: 'combobox', title: 'Combobox', aliases: ['autocomplete', 'typeahead', 'autosuggest'], stands: 'planned for Phase 1', sign: 'A text field that suggests values as you type.', closest: 'input' },
  { id: 'segmented-control', title: 'Segmented Control', aliases: ['segmented', 'button group', 'toggle group'], stands: 'specified, not built yet', sign: 'One choice from a few, every option visible at once.', closest: 'radio-group' },
  { id: 'tag', title: 'Tag', aliases: ['tag', 'chip', 'badge', 'label', 'lozenge'], stands: 'not planned yet', sign: 'A short label on an item. For an object\'s state Vela has Status Indicator; for a risk score, Risk Pill.', closest: 'status-indicator' },
  { id: 'spinner', title: 'Loading state', aliases: ['spinner', 'loading', 'progress', 'busy'], stands: 'planned for Phase 1, as widget loading states', sign: 'Something in progress. Today a Button shows its own while its action runs.', closest: 'button' },
  { id: 'side-navigation', title: 'Side Navigation', aliases: ['sidebar', 'side nav', 'navigation', 'nav'], stands: 'not specified yet', sign: 'The page-level list of places. Within a page, Tabs switch sections.', closest: 'tabs' },
]

/**
 * The tag says where a missing component stands, as its line does: "Planned" only for what the
 * roadmap plans, "Specified" for a spec that isn't built, and "Not in Vela" for the rest.
 */
export function missingTag(stands: string): 'Planned' | 'Specified' | 'Not in Vela' {
  if (/^planned\b/i.test(stands)) return 'Planned'
  if (/^specified\b/i.test(stands)) return 'Specified'
  return 'Not in Vela'
}

export function buildIndex(): Item[] {
  const items: Item[] = []
  const nameToId = new Map(REGISTRY.map((e) => [e.name.toLowerCase(), e.id]))
  // Every "When to use" line, in every spec, filed under the component it points to.
  const uses = new Map<string, string[]>()
  for (const e of REGISTRY) for (const w of whenToUse(e.spec)) for (const t of w.targets) {
    const id = nameToId.get(t.toLowerCase().replace(/ `[^`]*`.*$/, '').replace(/\s+variant=.*$/, ''))
    if (id && w.text) uses.set(id, [...(uses.get(id) ?? []), w.text])
  }
  for (const e of REGISTRY) {
    const own = uses.get(e.id) ?? []
    const status = statusOf(e.spec).label
    items.push({
      kind: 'component', id: e.id, title: e.name, href: href({ kind: 'component', id: e.id }),
      tag: status === 'Approved' ? undefined : status,
      aliases: e.aliases, uses: own,
      sign: own[0] ? `${own[0].charAt(0).toUpperCase()}${own[0].slice(1)}.` : summary(e.spec),
    })
  }
  for (const m of MISSING) {
    const closest = REGISTRY.find((e) => e.id === m.closest)!
    items.push({ kind: 'missing', id: m.id, title: m.title, href: href({ kind: 'component', id: closest.id }), tag: missingTag(m.stands), aliases: m.aliases, uses: [], sign: m.sign })
  }
  for (const p of PROPOSALS) items.push({ kind: 'proposal', id: p.id, title: p.name, href: href({ kind: 'proposal', id: p.id }), tag: 'Proposal', aliases: [], uses: [], sign: plain(p.what) })
  for (const f of FOUNDATIONS) items.push({ kind: 'foundation', id: f.id, title: f.title, href: href({ kind: 'foundation', id: f.id }), aliases: [], uses: [], sign: f.kind })
  for (const e of REGISTRY) for (const r of e.spec.matchAll(/\[\[rule:\s*([^|\]]+?)\s*\|\s*(compiler|runtime|browser|convention)\s*\]\]/g))
    items.push({ kind: 'rule', id: r[1], title: r[1], href: `${href({ kind: 'component', id: e.id, tab: 'rules' })}?rule=${r[1]}`, aliases: [], uses: [], sign: `${e.name} rule, ${r[2] === 'browser' ? 'browser test' : r[2]}` })
  return items
}

export interface Hit { item: Item; score: number; alias?: string }

const KIND_ORDER: Record<Kind, number> = { component: 0, missing: 1, proposal: 2, foundation: 3, rule: 4 }
const norm = (s: string) => s.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * How well `q` matches a name: exact, then prefix, then a word's prefix, then anywhere. An alias
 * scores lower than a title at every step but exact, so "alert" finds Contextual Alert before the
 * Dialog that is also called "alert dialog", and "tab" finds Tabs (an exact alias) before Table.
 */
const TITLE = [100, 80, 65, 45], ALIAS = [90, 60, 50, 30], USES = 25
function nameScore(name: string, q: string, scale = TITLE): number {
  const n = norm(name)
  if (n === q) return scale[0]
  if (n.startsWith(q)) return scale[1]
  if (n.split(' ').some((w) => w.startsWith(q))) return scale[2]
  if (n.includes(q)) return scale[3]
  return 0
}

export function search(index: Item[], query: string, limit = 10): Hit[] {
  const q = norm(query)
  if (!q) return []
  const hits: Hit[] = []
  for (const item of index) {
    // Rule ids are long and many: they match only on their own words, never on a single letter.
    if (item.kind === 'rule' && (q.length < 3 || !norm(item.id).includes(q))) continue
    let score = nameScore(item.title, q)
    let alias: string | undefined
    for (const a of item.aliases) {
      const s = nameScore(a, q, ALIAS)
      if (s > score) { score = s; alias = a }
    }
    if (score === 0 && q.length >= 3 && item.uses.some((u) => norm(u).includes(q))) score = USES
    if (item.kind === 'rule') score = Math.min(score, 20)
    if (score > 0) hits.push({ item, score, alias })
  }
  // A "When to use" line is a weak match: it only shows when no name or alias matched. So
  // "notification" finds Toast, and no longer Toggle ("Notifications on/off").
  const strong = hits.some((h) => h.score > USES && h.item.kind !== 'rule')
  if (strong) for (let i = hits.length - 1; i >= 0; i--) if (hits[i].score === USES) hits.splice(i, 1)
  hits.sort((a, b) => b.score - a.score || KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] || a.item.title.localeCompare(b.item.title))
  // At most three rule ids, so a word that starts many ids never pushes the components out.
  let rules = 0
  return hits.filter((h) => h.item.kind !== 'rule' || ++rules <= 3).slice(0, limit)
}

/** Levenshtein distance between two strings. */
function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

export interface Nearest {
  /** The words the reader typed, as words: "firewall-rule" is "firewall rule". */
  words: string
  /** How the matches were found: by a name or an alias (meaning), by a slip of spelling, or not at all. */
  how: 'meaning' | 'spelling' | 'none'
  /** Up to three parts that exist, closest first. */
  parts: Item[]
  /** What the words name that is not in Vela yet (a missing component), each with the part to use today. */
  gaps: Item[]
}

/**
 * The closest parts to an address that went nowhere (Not found, slice 5 of the playground uplift).
 * By meaning first: the words, whole and then one by one, against every name and alias in the
 * catalogue and the list of what is not in Vela yet. A "When to use" line counts only for the whole
 * name ("incident note" finds Text Area), never for one word of it, so "firewall-rule" does not send
 * a reader to Text Area because its spec mentions "a rule description". Then spelling, but only for a
 * slip (a quarter of the letters or fewer), so a long name never lands on whatever is nearest.
 * Nothing found is an answer too: the page flags the gap.
 */
export function nearest(index: Item[], asked: string): Nearest {
  const words = norm(asked)
  const parts: Item[] = []
  const gaps: Item[] = []
  const add = (list: Item[], i: Item) => { if (!list.some((x) => x.id === i.id)) list.push(i) }
  const tries = [words, ...words.split(' ').filter((w) => w.length >= 3 && w !== words)]
  tries.forEach((q, n) => {
    for (const h of search(index, q, 20)) {
      if (h.score <= USES && (n > 0 || h.score < USES)) continue
      if (h.item.kind === 'component') add(parts, h.item)
      else if (h.item.kind === 'missing') add(gaps, h.item)
    }
  })
  if (parts.length || gaps.length) return { words, how: 'meaning', parts: parts.slice(0, 3), gaps: gaps.slice(0, 2) }
  const slip = Math.max(1, Math.floor(words.length / 4))
  const near = index.filter((i) => i.kind === 'component')
    .map((i) => ({ i, d: Math.min(distance(words, norm(i.title)), ...i.aliases.map((a) => distance(words, norm(a)))) }))
    .filter((x) => x.d <= slip)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((x) => x.i)
  return { words, how: near.length ? 'spelling' : 'none', parts: near, gaps: [] }
}

/** Up to three components closest to a name that matched none, for an unknown component link. */
export function closest(index: Item[], name: string): Item[] {
  const q = norm(name)
  // The whole name, then each of its words ("modal window" finds Dialog through "modal").
  for (const part of [q, ...q.split(' ').filter((w) => w.length >= 3)]) {
    const found = search(index, part, 20).filter((h) => h.item.kind === 'component').map((h) => h.item)
    if (found.length > 0) return found.slice(0, 3)
  }
  const dist = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
    for (let j = 1; j <= b.length; j++) d[0][j] = j
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    return d[a.length][b.length]
  }
  return index.filter((i) => i.kind === 'component').map((i) => ({ i, d: dist(q, norm(i.title)) })).sort((a, b) => a.d - b.d).slice(0, 3).map((x) => x.i)
}
