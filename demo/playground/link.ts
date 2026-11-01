/**
 * Shared links (playground spec, section 11). A component page's settings travel in a query after
 * its address: `#/components/button?v=1&stage=full&variant=destructive`.
 *
 * - A link carries only closed sets: the props whose values the spec lists, switches, the
 *   implementation, the stage and Compare. Text props are never put in a link, and never read from
 *   one: a link must not make a trusted page show words a stranger wrote (OWASP, content spoofing).
 * - Anything else in the query is ignored.
 * - An illegal value is replaced by the default, and a notice says so, in words.
 * - `v` is the format's version. Version 1 is the only one; any other falls back to the defaults,
 *   with a notice.
 */
import type { Control } from './spec'
import type { Values } from './registry'

export const LINK_VERSION = '1'
export type Stage = 'beside' | 'full'
export type Compare = 'off' | 'themes'
export const STAGES: Stage[] = ['beside', 'full']
export const COMPARES: Compare[] = ['off', 'themes']

export interface LinkState {
  values: Values
  stage?: Stage
  compare?: Compare
  /** The container width in px (section 5, "Stage width"): a number, clamped by the page to its range. */
  width?: number
  notices: string[]
}

/** The query part of a hash ("v=1&size=tiny"), or "" when there is none. */
export const queryOf = (hash: string) => (hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '')

/**
 * Reads a link's query against the page's closed controls. `defaults` are the page's own starting
 * values; `implementations` the ids the page offers, when it offers a choice.
 */
export function readLink(query: string, name: string, controls: Control[], defaults: Values, implementations: string[] = []): LinkState {
  const params = new URLSearchParams(query)
  // `section` is the section index's place on the page (demo/shell/SectionIndex.tsx), not a setting.
  params.delete('section')
  // `rule` is a link to one rule on the Rules tab (slice 2 of the playground uplift), not a setting.
  params.delete('rule')
  const out: LinkState = { values: {}, notices: [] }
  if ([...params.keys()].length === 0) return out
  const v = params.get('v')
  if (v !== LINK_VERSION) {
    out.notices.push(v === null
      ? "This link doesn't say which version of the playground made it, so its settings were not read. Showing the defaults."
      : `This link was made by version ${v} of the playground, which this page can't read. Showing the defaults.`)
    return out
  }
  for (const c of controls) {
    if (c.kind === 'text' || !params.has(c.prop)) continue
    const raw = params.get(c.prop)!
    if (c.kind === 'boolean') {
      if (raw === 'true' || raw === 'false') out.values[c.prop] = raw === 'true'
      else out.notices.push(`This link asked for ${c.prop} \`${raw}\`, which isn't on or off. Showing ${defaults[c.prop] === true ? 'on' : 'off'}.`)
    } else if (c.options?.includes(raw)) out.values[c.prop] = raw
    else out.notices.push(`This link asked for ${c.prop} \`${raw}\`, which ${name} doesn't have. Showing \`${String(defaults[c.prop] ?? c.default)}\`.`)
  }
  if (params.has('implementation') && implementations.length > 1) {
    const raw = params.get('implementation')!
    if (implementations.includes(raw)) out.values.implementation = raw
    else out.notices.push(`This link asked for the ${raw} implementation, which ${name} doesn't have. Showing ${implementations[0]}.`)
  }
  const stage = params.get('stage')
  if (stage !== null) {
    if ((STAGES as string[]).includes(stage)) out.stage = stage as Stage
    else out.notices.push(`This link asked for a stage called \`${stage}\`. Showing the default.`)
  }
  const compare = params.get('compare')
  if (compare !== null) {
    if ((COMPARES as string[]).includes(compare)) out.compare = compare as Compare
    else out.notices.push(`This link asked to compare \`${compare}\`, which this page can't. Showing Off.`)
  }
  // A number, never free text (section 11): digits only, read as pixels.
  const w = params.get('w')
  if (w !== null) {
    if (/^\d{1,5}$/.test(w)) out.width = Number(w)
    else out.notices.push(`This link asked for a container width of \`${w}\`, which isn't a number of pixels. Showing the full width.`)
  }
  return out
}

/** The query for the current settings: only what differs from the defaults, closed sets only. */
export function writeLink(controls: Control[], values: Values, defaults: Values, extra: { implementation?: string; defaultImplementation?: string; stage: Stage; defaultStage: Stage; compare: Compare; width?: number }): string {
  const params = new URLSearchParams()
  for (const c of controls) {
    if (c.kind === 'text') continue
    const now = values[c.prop], was = defaults[c.prop]
    if (now !== was && now !== undefined) params.set(c.prop, String(now))
  }
  if (extra.implementation && extra.implementation !== extra.defaultImplementation) params.set('implementation', extra.implementation)
  if (extra.stage !== extra.defaultStage) params.set('stage', extra.stage)
  if (extra.compare !== 'off') params.set('compare', extra.compare)
  if (extra.width !== undefined) params.set('w', String(Math.round(extra.width)))
  if ([...params.keys()].length === 0) return ''
  return `v=${LINK_VERSION}&${params.toString()}`
}
