/**
 * The Foundations pages' data (slice 6 of the playground uplift): what each page shows, read from the
 * two files that hold it, the foundation's own markdown in guidelines/foundations/ and the token file.
 * Nothing here is typed twice: a value is the token file's, a use is the spec's own table cell, and a
 * section's words are the spec's paragraphs.
 *
 * A foundation page is its spec with the tables turned into specimens: where a section has a picture
 * (a swatch, a line of rendered type, a bar), the section's table goes and its paragraphs stay under
 * the picture. A section with no picture is read as the document it is.
 */
import { GROUP, resolve, descriptionOf } from '../playground/tokens'
import { slugOf } from '../playground/Markdown'
import { STATUS_LABELS } from '../../src/components/StatusIndicator/StatusIndicator'
import type { Severity, Status, Risk } from '../../src'
import tokensJson from '../../tokens/vela.tokens.json'

export interface MdSection { id: string; heading: string; body: string }

/** The spec cut at its `## ` headings: what comes before the first, then each section. */
export function splitSpec(md: string): { intro: string; sections: MdSection[] } {
  const body = md.replace(/^# .+\n/, '')
  const parts = body.split(/^## /m)
  const intro = parts.shift()!.trim()
  const sections = parts.map((p) => {
    const nl = p.indexOf('\n')
    const heading = (nl === -1 ? p : p.slice(0, nl)).trim()
    return { id: slugOf(heading), heading, body: (nl === -1 ? '' : p.slice(nl + 1)).trim() }
  })
  return { intro, sections }
}

/** A section without its tables: the picture stands in for them. */
export const withoutTables = (md: string) => md.split('\n').filter((l) => !l.startsWith('|')).join('\n').replace(/\n{3,}/g, '\n\n').trim()

/** The first paragraph, as the page's one-line lede. */
export const firstParagraph = (md: string) => md.split(/\n\n/)[0].replace(/\s*\n\s*/g, ' ').trim()

/** A markdown table's rows as cells, the header dropped: `| a | b |` is ['a', 'b']. */
export function tableRows(md: string): string[][] {
  const rows = md.split('\n').filter((l) => l.startsWith('|')).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
  return rows.slice(2)
}

/** The cell of the table row that names `token`, column `col`; '' when no row does. */
export function useOf(md: string, token: string, col = 2): string {
  const row = tableRows(md).find((r) => r[0].replace(/`/g, '') === token)
  return row?.[col]?.replace(/\*\*|`/g, '') ?? ''
}

// ------------------------------------------------------------------------------------- colour --

/** Every colour token on the Colour page, in the groups a reader looks for them by. */
export const COLOUR_GROUPS: { id: string; title: string; test: (name: string) => boolean }[] = [
  { id: 'surfaces', title: 'Surfaces', test: (n) => /^--vela-(bg-|primary-)/.test(n) },
  { id: 'text', title: 'Text', test: (n) => n.startsWith('--vela-text-') },
  { id: 'borders', title: 'Borders and focus', test: (n) => n.startsWith('--vela-border-') || n === '--vela-focus-ring-color' },
  { id: 'icons', title: 'Icons', test: (n) => n.startsWith('--vela-icon-') || n === '--vela-brand-mark' },
  { id: 'buttons', title: 'Buttons', test: (n) => n.startsWith('--vela-btn-') },
  { id: 'controls', title: 'Controls', test: (n) => /^--vela-(control|toggle)-/.test(n) },
]

const TAXONOMY = /-(severity|risk|status)-/

/** The semantic colours outside the three taxonomies, by group. A token no group takes goes in the last. */
export function colourGroups(): { id: string; title: string; tokens: string[] }[] {
  const plain = GROUP.color.filter((n) => !TAXONOMY.test(n))
  const groups = COLOUR_GROUPS.map((g) => ({ id: g.id, title: g.title, tokens: [] as string[] }))
  for (const n of plain) (groups[COLOUR_GROUPS.findIndex((g) => g.test(n))] ?? groups[groups.length - 1]).tokens.push(n)
  return groups.filter((g) => g.tokens.length > 0)
}

/** The six roles each severity and risk level fills, in the spec's order, and the word for each. */
export const ROLES = [
  { role: 'bg', words: 'Background', token: (t: string, l: string) => `--vela-bg-${t}-${l}` },
  { role: 'border', words: 'Border', token: (t: string, l: string) => `--vela-border-${t}-${l}` },
  { role: 'signal', words: 'Signal', token: (t: string, l: string) => `--vela-signal-${t}-${l}` },
  { role: 'icon', words: 'Icon', token: (t: string, l: string) => `--vela-icon-${t}-${l}` },
  { role: 'text', words: 'Text', token: (t: string, l: string) => `--vela-text-${t}-${l}` },
  { role: 'indicator', words: 'Indicator', token: (t: string, l: string) => `--vela-border-${t}-${l}-indicator` },
] as const

/**
 * The words each level is shown with. A status is shown with the Status Indicator's own word, so the
 * fourth dot says "Degraded", as the component and the spec do: `medium` is a token and a prop, and
 * "Medium" is a risk word (color.md, "Status"; the evaluation's naming check).
 */
export const LEVEL_WORDS = {
  severity: (s: Severity) => s.charAt(0).toUpperCase() + s.slice(1),
  status: (s: Status) => STATUS_LABELS[s],
  risk: (r: Risk) => r.charAt(0).toUpperCase() + r.slice(1),
}

/** The primitive families, in file order, each with its steps: `grey` is 50 to 950. Black and white stand alone. */
export function primitiveFamilies(): { family: string; tokens: string[] }[] {
  const out: { family: string; tokens: string[] }[] = []
  for (const n of GROUP.primitives) {
    const m = n.match(/^--vela-([a-z]+)-\d+$/)
    const family = m ? m[1] : 'black and white'
    const f = out.find((x) => x.family === family) ?? (out.push({ family, tokens: [] }), out[out.length - 1])
    f.tokens.push(n)
  }
  return out
}

// --------------------------------------------------------------------------------- typography --

/** The type scale's roles, read from the spec's table, each with its tokens and class. */
export interface TypeRole { role: string; triple: string; className: string; tokens: string[]; mono?: boolean }
export function typeRoles(md: string): TypeRole[] {
  return tableRows(md).filter((r) => r.length >= 3).map(([role, triple, cls]) => {
    const key = role.toLowerCase().replace(/\s+/g, '-')
    const mono = key === 'mono-meta'
    const base = mono ? 'meta' : key
    const tokens = GROUP.typography.filter((t) => t.startsWith(`--vela-text-${base}-`))
    return { role, triple: triple.replace(/`/g, '').replace(/,\s*/g, ' · '), className: cls.replace(/`/g, '').trim(), tokens: mono ? ['--vela-font-family-mono', ...tokens] : tokens, mono }
  })
}

// ------------------------------------------------------------------------------------- sizing --

/** The sizing tokens a foundation page owns. What none of them owns is "other sizes", on Sizing. */
export const OWNS = {
  spacing: (n: string) => n.startsWith('--vela-space-'),
  radius: (n: string) => n.startsWith('--vela-radius-'),
  sizing: (n: string) => /^--vela-(control-height-|target-min|icon-)/.test(n),
}
export const otherSizes = () => GROUP.sizing.filter((n) => !OWNS.spacing(n) && !OWNS.radius(n) && !OWNS.sizing(n))

/** A step the scale skips on purpose, drawn where it would sit: 50 sits between 40 and 60. */
export const SKIPPED_SPACE = { after: '--vela-space-40', name: '--vela-space-50' }

// ------------------------------------------------------------------------------------- motion --

/** The motion tokens by what they do: durations a person sees move, curves, and waits that are not motion. */
export const MOTION = {
  durations: () => GROUP.motion.filter((n) => /^--vela-duration-(instant|fast|base|travel)$/.test(n)),
  curves: () => GROUP.motion.filter((n) => n.startsWith('--vela-ease-')),
  waits: () => GROUP.motion.filter((n) => /^--vela-(delay-(tooltip|preview)|duration-toast)$/.test(n)),
  brand: () => GROUP.motion.filter((n) => /brand-pulse/.test(n)),
  other: () => GROUP.motion.filter((n) => !/^--vela-(duration-|delay-|ease-)/.test(n)),
}

/** A token's value as the page shows it: the light value, and the dark one when it differs. */
export function valueWords(name: string): { light: string; dark?: string } {
  const light = resolve(name, 'light')
  const dark = resolve(name, 'dark')
  return dark !== light ? { light, dark } : { light }
}

/** The token's description, its first sentence, without the token file's em dashes. */
export function useLine(name: string): string {
  const d = descriptionOf(name).replace(/\s+[—–]\s+/g, ': ')
  const first = d.split(/(?<=\.)\s/)[0]
  return first
}

/** The spring's physical values, from the token's own extension, when the token is a spring. */
type SpringExt = { stiffness: number; damping: number; mass: number; duration: string }
export function springOf(name: string): SpringExt | null {
  const n = name.replace(/^--vela-/, '')
  const t = (tokensJson as unknown as { motion: Record<string, { $extensions?: Record<string, { spring?: SpringExt }> }> }).motion[n]
  return t?.$extensions?.['com.omkarux.vela']?.spring ?? null
}

/** The four numbers of a cubic-bezier value, as resolve() writes it. */
export const bezierNumbers = (v: string) => (v.match(/cubic-bezier\(([^)]+)\)/)?.[1].split(',').map(Number) ?? [0, 0, 1, 1]) as [number, number, number, number]
