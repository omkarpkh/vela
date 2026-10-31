/**
 * The value checks `parseQuery` and `validateQuery` share, so the typed line and an agent's object
 * get the same errors in the same words, and the same canonical value back.
 */
import { normaliseDomain } from './domain'
import { shownShort } from './hidden'
import { compareIp, normaliseCidr, normaliseIp, parseIp } from './ip'
import { either, shapeOf } from './operators'
import { normaliseDuration, normaliseTime, parseTime } from './time'
import type { FieldSpec, Operator } from './types'

export const LIMITS = { characters: 10_000, conditions: 200, values: 1_000, depth: 3 } as const

export const MESSAGES = {
  tooManyConditions: `This query has more than ${LIMITS.conditions} conditions. Split it, or save it as a view.`,
  tooLong: `This query is longer than ${LIMITS.characters.toLocaleString('en-GB')} characters. Split it, or save it as a view.`,
  tooManyValues: `This list has more than ${LIMITS.values.toLocaleString('en-GB')} values. Split it, or save it as a view.`,
  tooDeep: `Groups can be nested ${LIMITS.depth} deep at most.`,
  mixedJoins: 'Add brackets to say which comes first: \'and\' and \'or\' are mixed here.',
  emptyList: 'A list needs at least one value.',
}

export type Checked<T = unknown> = { ok: true; value: T } | { ok: false; message: string }

/** The JavaScript type one element of this operator's value has. */
export const elementType = (spec: FieldSpec): 'string' | 'number' | 'boolean' =>
  spec.type === 'number' ? 'number' : spec.type === 'boolean' ? 'boolean' : 'string'

/** One element of a value, already of its JavaScript type: checked, and in its canonical form. */
export function checkElement(spec: FieldSpec, op: Operator, v: string | number | boolean): Checked<string | number | boolean> {
  const shape = shapeOf(op)
  switch (spec.type) {
    case 'text':
    case 'identifier':
      return { ok: true, value: v }
    case 'domain': {
      const r = normaliseDomain(v as string)
      return r.ok ? { ok: true, value: r.ascii } : r
    }
    case 'ip': {
      const r = shape === 'cidr' ? normaliseCidr(v as string) : normaliseIp(v as string)
      return r.ok ? { ok: true, value: r.value } : r
    }
    case 'number': {
      const n = v as number
      if (!Number.isFinite(n)) return { ok: false, message: `\`${String(n)}\` is not a number this grammar can write.` }
      return { ok: true, value: n === 0 ? 0 : n } // -0 is 0
    }
    case 'time': {
      const r = shape === 'duration' ? normaliseDuration(v as string) : normaliseTime(v as string)
      return r.ok ? { ok: true, value: r.value } : r
    }
    case 'enum': {
      if (spec.values.some((x) => x.value === v)) return { ok: true, value: v }
      return { ok: false, message: `\`${shownShort(String(v))}\` is not a value of ${spec.label}. Use ${either(spec.values.map((x) => x.value))}.` }
    }
    case 'boolean':
      return { ok: true, value: v }
  }
}

/** The order a list is kept in: an enum's in its schema's order, IPs by address, the rest by code unit. */
function compare(spec: FieldSpec): (a: string, b: string) => number {
  if (spec.type === 'enum') {
    const at = new Map(spec.values.map((x, i) => [x.value, i]))
    return (a, b) => at.get(a)! - at.get(b)!
  }
  if (spec.type === 'ip') return (a, b) => compareIp(parseIp(a)!, parseIp(b)!)
  return (a, b) => (a < b ? -1 : a > b ? 1 : 0)
}

/** A list's elements, each already checked: de-duplicated and sorted, or the limit it breaks. */
export function finishList(spec: FieldSpec, values: string[]): Checked<string[]> {
  if (!values.length) return { ok: false, message: MESSAGES.emptyList }
  if (values.length > LIMITS.values) return { ok: false, message: MESSAGES.tooManyValues }
  return { ok: true, value: [...new Set(values)].sort(compare(spec)) }
}

/** Both bounds of a `between`, inclusive: the lower may not be greater than the upper. */
export function finishRange(spec: FieldSpec, from: string | number, to: string | number): Checked<{ from: string | number; to: string | number }> {
  const [a, b] = spec.type === 'time' ? [parseTime(from as string)!, parseTime(to as string)!] : [from as number, to as number]
  if (a > b) return { ok: false, message: `'between' needs the lower bound first: ${shownShort(String(from))} is ${spec.type === 'time' ? 'after' : 'greater than'} ${shownShort(String(to))}.` }
  return { ok: true, value: { from, to } }
}

/** Whether a value of this field could hold a hidden character (and so be matched without them). */
export const isStringField = (spec: FieldSpec) => spec.type === 'text' || spec.type === 'identifier' || spec.type === 'domain'
