/**
 * The contract facts on a component page (playground spec, section 4): what the grid reads, all
 * from sources that already exist — the spec's rule tags, package.json, the Figma map and the
 * build — so the page cannot claim more than the repository proves.
 */
import { version } from '../../package.json'
import figmaMap from '../../guidelines/figma-map.json'
import { OPTIONAL_PEERS, type Entry } from './install'

/** The four enforcement levels, in the order the Rules tab lists them, as a tag reads each. */
export const LEVELS = [
  { level: 'compiler', words: 'compiler' },
  { level: 'runtime', words: 'runtime' },
  { level: 'browser', words: 'browser test' },
  { level: 'convention', words: 'convention' },
] as const
export type Level = (typeof LEVELS)[number]['level']

/** Every `[[rule: id | level]]` tag in a spec, counted by level. */
export function rulesOf(spec: string): { total: number; byLevel: { level: Level; words: string; count: number }[] } {
  const found = [...spec.matchAll(/\[\[rule:\s*[^|\]]+?\s*\|\s*(compiler|runtime|browser|convention)\s*\]\]/g)].map((m) => m[1] as Level)
  const byLevel = LEVELS.map((l) => ({ ...l, count: found.filter((f) => f === l.level).length })).filter((l) => l.count > 0)
  return { total: found.length, byLevel }
}

/**
 * A proposal's planned rules. A proposal lists each rule as `` `id` · level `` at the end of its bullet
 * under "## Hard constraints"; the tags become `[[rule: … ]]` when the spec enters
 * guidelines/components/. Counted from that section only, so a rule named in prose elsewhere is not
 * counted twice. Zero means none were found, so the page leaves the count out rather than show 0.
 */
export function proposalRulesOf(spec: string): ReturnType<typeof rulesOf> {
  const section = spec.split(/^## Hard constraints\s*$/m)[1]?.split(/^## /m)[0] ?? ''
  const found = [...section.matchAll(/`[a-z0-9-]+` · (compiler|runtime|browser|convention)\b/g)].map((m) => m[1] as Level)
  const byLevel = LEVELS.map((l) => ({ ...l, count: found.filter((f) => f === l.level).length })).filter((l) => l.count > 0)
  return { total: found.length, byLevel }
}

/** What a consumer installs besides the package, for the entry they import from. */
export function dependenciesFor(entry: Entry): string {
  if (!entry.endsWith('/headless')) return 'None at runtime'
  return OPTIONAL_PEERS.map((p) => `${p}, an optional peer`).join('; ')
}

type FigmaSet = { spec: string; state: 'published' | 'built' | 'none'; url?: string | null }

/** The spec's Figma set, when one exists in the library with a node to open. */
export function figmaSetFor(specFile: string): { url: string; state: 'published' | 'built' } | undefined {
  const set = (figmaMap.sets as FigmaSet[]).find((s) => s.spec === `guidelines/components/${specFile}`)
  if (!set || set.state === 'none' || !set.url) return undefined
  return { url: set.url, state: set.state }
}

/** "29 Oct 2026" from "2026-10-29"; the build date is UTC. */
export function dateWords(iso: string | undefined): string | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Which build the page (and so its proofs) comes from: version · commit · date (A25). */
export function builtLine(commit: string, iso: string | undefined): string {
  return [version, commit, dateWords(iso)].filter(Boolean).join(' · ')
}
