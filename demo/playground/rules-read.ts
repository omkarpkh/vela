/**
 * What the component page's tabs read from a spec, as plain data (slice 2 of the playground uplift,
 * s5-tabs). Pure, so the unit tests read the same answers the page shows.
 *
 * - The rules come from the spec itself, which ships with the page, so the Rules tab draws its rows
 *   at once; the proof file (`npm run proofs`) only adds the links and the compiler's own words.
 * - `undash` is the site's display layer for spec text: a spaced em or en dash becomes a colon or a
 *   full stop, a range becomes "to". It never changes a spec file (house style: no dashes in visible
 *   copy; the spec thread owns the specs' own words).
 */
import type { ProofLevel } from './Proofs'

export interface SpecRule { id: string; level: ProofLevel; sentence: string }

/** Every tagged bullet under `## Hard constraints`, in order, as scripts/check-rules.mjs reads them. */
export function rulesFromSpec(md: string): SpecRule[] {
  const section = md.match(/^## Hard constraints[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)
  if (!section) return []
  const bullets: string[] = []
  for (const line of section[1].split('\n')) {
    if (/^- /.test(line)) bullets.push(line)
    else if (/^\s+\S/.test(line) && bullets.length) bullets[bullets.length - 1] += ' ' + line.trim()
  }
  const out: SpecRule[] = []
  for (const b of bullets) {
    const tag = b.match(/\[\[rule:\s*([a-z0-9-]+)\s*\|\s*(compiler|runtime|browser|convention)\s*\]\]/)
    if (!tag) continue
    out.push({ id: tag[1], level: tag[2] as ProofLevel, sentence: b.replace(/^- /, '').replace(/\s*\[\[rule:[^\]]*\]\]\s*/, ' ').replace(/\s+/g, ' ').trim() })
  }
  return out
}

/**
 * The display layer's dashes. A spaced em or en dash before a capital becomes a full stop, any other
 * a colon; a dash standing alone in a table cell is "none"; a number range is "to"; anything left is
 * a comma. Code inside backticks keeps every character.
 */
export function undash(text: string): string {
  return text.split(/(`[^`]*`)/g).map((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return part
    return part
      .replace(/(^|\|)\s*[—–]\s*(?=\||$)/gm, '$1 none ')
      .replace(/^\s*[—–]\s*$/gm, 'none')
      .replace(/(\d)\s*–\s*(\d)/g, '$1 to $2')
      .replace(/([.:;,!?])?\s+[—–]\s+(\*{0,2}["“(]?[A-Z])/g, (_m, p: string | undefined, next: string) => `${p ?? '.'} ${next}`)
      .replace(/\s+[—–]\s+/g, ': ')
      .replace(/\s*[—–]\s*/g, ', ')
  }).join('')
}

/** Markdown's own marks, gone: for matching and for names read aloud. */
export const plain = (md: string) => md.replace(/\*\*|`|\[\[rule:[^\]]*\]\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()

/**
 * A rule's one line, and the rest of its words. The spec leads most rules with a bold sentence; that
 * is the line. Without one, the first sentence is.
 */
export function leadOf(sentence: string): { lead: string; rest: string } {
  const s = undash(sentence)
  const bold = s.match(/^\*\*(.+?)\*\*\s*/)
  if (bold) {
    const inner = bold[1].trim()
    // "**`text-link` is `tiny` or `regular` only**, and **never carries an icon**": a bold lead that
    // runs on is the whole sentence.
    const after = s.slice(bold[0].length)
    if (/^[,;]/.test(after)) return { lead: s.replace(/\.$/, ''), rest: '' }
    return { lead: inner.replace(/[.:]$/, ''), rest: after.trim() }
  }
  const stop = s.search(/\.\s+[A-Z(`*"“]/)
  if (stop < 0) return { lead: s.replace(/\.$/, ''), rest: '' }
  return { lead: s.slice(0, stop), rest: s.slice(stop + 1).trim() }
}

/** Does a rule match what was typed into Find? Its words and its id, any case, every word typed. */
export function ruleMatches(r: { id: string; sentence: string }, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = `${plain(undash(r.sentence))} ${r.id} ${r.id.replace(/-/g, ' ')}`.toLowerCase()
  return words.every((w) => hay.includes(w))
}

/** "❌ A pill shape → `--vela-radius-4`": the don't, and what to do instead, when the spec writes both. */
export interface DontRow { dont: string; instead: string }
export function dontsOf(body: string): DontRow[] | null {
  const bullets: string[] = []
  for (const line of body.split('\n')) {
    if (/^- /.test(line)) bullets.push(line.slice(2))
    else if (/^\s+\S/.test(line) && bullets.length) bullets[bullets.length - 1] += ' ' + line.trim()
    else if (line.trim() && !bullets.length) continue
  }
  if (!bullets.length || !bullets.every((b) => b.trim().startsWith('❌'))) return null
  return bullets.map((b) => {
    const text = undash(b.trim().replace(/^❌\s*/, ''))
    const at = text.indexOf(' → ')
    return at < 0 ? { dont: text, instead: '' } : { dont: text.slice(0, at).trim(), instead: text.slice(at + 3).trim() }
  })
}

/** The checker groups, in the order the guarantees weaken, and what each heading and index item says. */
export const CHECKERS: { level: ProofLevel; index: string; heading: [one: string, many: string]; machine: boolean }[] = [
  { level: 'compiler', index: 'Compiler', heading: ['The compiler refuses this', 'The compiler refuses these'], machine: true },
  { level: 'runtime', index: 'Unit test', heading: ['A unit test checks this', 'A unit test checks these'], machine: true },
  { level: 'browser', index: 'Browser', heading: ['A real browser proves this', 'A real browser proves these'], machine: true },
  { level: 'convention', index: 'Review', heading: ['A reviewer checks this', 'A reviewer checks these'], machine: false },
]

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The words beside the summary's cells: what filled and outlined mean, with the counts, in words. */
export function summaryWords(rules: SpecRule[]): { machine: number; review: number; words: string } {
  const machine = rules.filter((r) => r.level !== 'convention').length
  const review = rules.length - machine
  const parts = [
    machine > 0 ? `Filled: a machine checks it on every build, ${machine}.` : '',
    review > 0 ? `Outlined: a reviewer checks it, ${review}.` : '',
  ].filter(Boolean)
  return { machine, review, words: parts.join(' ') }
}

/** A token name with a break allowed after each hyphen, and nowhere else (sweep T33). */
export const breakable = (name: string) => name.split('-')

/** The first sentence of a spec's intro: the header's one line. */
export function oneLine(intro: string): string {
  const s = undash(intro)
  const at = s.search(/\.\s+[A-Z`*"“(]/)
  return at < 0 ? s : s.slice(0, at + 1)
}
