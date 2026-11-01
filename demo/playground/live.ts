/**
 * The words around the component stage (slice 3 of the playground uplift, s5-tabs level 4):
 * - the Live caption's props, written as the code that renders them (`<Tabs size="regular">`);
 * - the resting stage's range: the component across its main closed values, at the settings on the
 *   page, each a legal combination, with the reason for any the settings leave out.
 * Pure, so a unit test holds them to the Props table and to the spec's locks.
 */
import type { Control } from './spec'
import type { Lock, Values } from './registry'

/** One form in a range: the values it sets over the page's, and its name under the picture. */
export interface RangeItem {
  patch: Values
  /** Under the picture. Left out when the component already says it (a Risk Pill's level). */
  name?: string
}

export interface Range {
  /** What the range runs across, in words: "variant and appearance". */
  across: string
  /** The forms, from the Props table's own values (`optionsOf`), never a value typed beside it. */
  items: (controls: readonly Control[]) => RangeItem[]
  /** Block components (an alert, a field) stack, one under the other; the rest sit in a row. */
  stack?: boolean
}

/** A select's values, as the Props table lists them. */
export const optionsOf = (controls: readonly Control[], prop: string) => controls.find((c) => c.prop === prop)?.options ?? []

/**
 * The Live caption: the tag and every closed prop on show, from the Props table only. A select's
 * value is always written, even its default, because the caption says what is on the stage; a
 * switch is written only when it is on. Free text (a label, children) is the code bar's to show.
 * Pass only the Props table's controls: a stage-only control (Icon Button's glyph) is not a prop.
 */
export function liveProps(tag: string, controls: readonly Control[], v: Values): string {
  const attrs: string[] = []
  for (const c of controls) {
    const x = v[c.prop] ?? c.default
    if (c.kind === 'select' && typeof x === 'string' && x !== '') attrs.push(`${c.prop}="${x}"`)
    // A switch for a slot or a callback (an icon, onDismiss) is written as an expression, never as `true`.
    else if (c.kind === 'boolean' && x === true) attrs.push(c.type === 'boolean' ? c.prop : `${c.prop}={…}`)
  }
  return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`
}

/** The props a range holds still: the caption's props without the ones the range runs across. */
export function heldProps(tag: string, controls: readonly Control[], v: Values, items: readonly RangeItem[]): string {
  const varied = new Set(items.flatMap((i) => Object.keys(i.patch)))
  return liveProps(tag, controls.filter((c) => !varied.has(c.prop)), v)
}

type Locks = (v: Values) => Record<string, Record<string, Lock>>

/** Why a combination can't be shown: the spec's own reasons for each value it locks. */
export function lockedReasons(x: Values, locks?: Locks): string[] {
  const l = locks?.(x) ?? {}
  return [...new Set(Object.entries(l).flatMap(([p, byValue]) => (String(x[p]) in byValue ? [byValue[String(x[p])].reason] : [])))]
}

/**
 * The range at the page's settings: each item over the current values, kept only when the spec's
 * rules allow it; what is left out is said once, in the rules' own words.
 */
export function rangeAt(items: readonly RangeItem[], v: Values, locks?: Locks, constrain?: (v: Values) => Values) {
  const shown: { item: RangeItem; values: Values }[] = []
  const reasons = new Set<string>()
  for (const item of items) {
    const x = { ...v, ...item.patch }
    const why = lockedReasons(x, locks)
    if (why.length > 0) why.forEach((r) => reasons.add(r))
    else shown.push({ item, values: constrain ? constrain(x) : x })
  }
  return { shown, left: [...reasons] }
}

/** Every combination of the values given, in order: the first prop changes slowest. */
export function cross(axes: Record<string, string[]>, name: (p: Values) => string = (p) => Object.values(p).join(', ')): RangeItem[] {
  let out: Values[] = [{}]
  for (const [prop, values] of Object.entries(axes)) out = out.flatMap((p) => values.map((x) => ({ ...p, [prop]: x })))
  return out.map((patch) => ({ patch, name: name(patch) }))
}
