/**
 * `validateQuery` and `normalise` (filter-grammar.md, `grammar-untyped-input-checked` and
 * `grammar-round-trips`), and the canonical form every other function works on.
 *
 * An object has no text, so a `validateQuery` error is at 0 with length 0, and its message starts by
 * saying where it is: "In condition 2: …" (conditions numbered as they read, from 1), "In group 3: …"
 * (groups likewise, the root being group 1), or nothing for the query as a whole.
 */
import { specOf } from './fields'
import { codePoints } from './hidden'
import { either, negationsOf, OPERATOR_WORDS, positivesOf, shapeOf, takes } from './operators'
import { textOf } from './text'
import type { Condition, FieldSpec, Fields, Group, Node, Operator, ParseError, ParseResult, Query } from './types'
import { checkElement, elementType, finishList, finishRange, LIMITS, MESSAGES } from './values'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// ---------- the words both parsers use ----------

const squash = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, '')

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = cur
    }
  }
  return row[b.length]
}

/** The declared field nearest to what was written, by key or label, or none. Shown, never applied. */
export function suggest(fields: Fields, raw: string): FieldSpec | undefined {
  if (raw.length > 200) return undefined
  const keys = Object.keys(fields)
  const exact = keys.find((k) => squash(k) === squash(raw) || squash(fields[k].label) === squash(raw))
  if (exact) return fields[exact]
  let best: string | undefined, bestD = Infinity
  for (const k of keys) {
    const d = distance(raw.toLowerCase(), k)
    if (d < bestD && d <= Math.max(1, Math.floor(k.length / 4))) { best = k; bestD = d }
  }
  return best ? fields[best] : undefined
}

export const unknownField = (fields: Fields, raw: string) => {
  const near = suggest(fields, raw)
  return `\`${raw.length > 48 ? `${raw.slice(0, 48)}…` : raw}\` is not a field here.${near ? ` Did you mean ${near.label}?` : ''}`
}

const looksNegated = (op: string) => /(^|-)(not|none)(-|$)/.test(op)

export function wrongOperator(spec: FieldSpec, op: string): string {
  const negs = negationsOf(spec.type)
  const offer = looksNegated(op) && negs.length ? negs : positivesOf(spec.type)
  return `${spec.label} can't use '${op.length > 32 ? `${op.slice(0, 32)}…` : op}'. Use ${either(offer.map((o) => OPERATOR_WORDS[o]))}.`
}

const WHAT: Record<FieldSpec['type'], string> = {
  text: 'a string', identifier: 'a string', domain: 'a host name, as a string', ip: 'an IP address, as a string',
  number: 'a number', time: 'a time with an offset, as a string', enum: 'one of its values, as a string', boolean: 'true or false',
}

export function takesWhat(spec: FieldSpec, op: Operator): string {
  const head = `${spec.label} '${OPERATOR_WORDS[op]}'`
  switch (shapeOf(op)) {
    case 'none': return `${head} takes no value.`
    case 'list': return `${head} takes a list of values, each ${WHAT[spec.type]}.`
    case 'range': return `${head} takes both bounds: { from, to }, each ${WHAT[spec.type]}.`
    case 'cidr': return `${head} takes a range, as a string like "10.0.0.0/8".`
    case 'duration': return `${head} takes a duration, as a string like "7d".`
    default: return `${head} takes ${WHAT[spec.type]}.`
  }
}

// ---------- the object check ----------

type Ctx = { fields: Fields; errors: ParseError[]; conditions: number; groups: number; limits: boolean; stopped: boolean }

const err = (ctx: Ctx, where: string, message: string) => { ctx.errors.push({ at: 0, length: 0, message: where ? `${where}: ${message}` : message }) }

function unknownKeys(ctx: Ctx, where: string, o: Record<string, unknown>, allowed: string[], what: string) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) err(ctx, where, `\`${k.length > 48 ? `${k.slice(0, 48)}…` : k}\` isn't part of ${what} here.`)
}

function checkCondition(ctx: Ctx, c: Record<string, unknown>): Condition | null {
  const where = `In condition ${++ctx.conditions}`
  if (ctx.limits && ctx.conditions > LIMITS.conditions) { ctx.stopped = true; return null }
  unknownKeys(ctx, where, c, ['kind', 'field', 'operator', 'value'], 'a condition')
  const before = ctx.errors.length
  if (typeof c.field !== 'string') { err(ctx, where, 'A condition needs a `field`: one of the declared keys.'); return null }
  const spec = specOf(ctx.fields, c.field)
  if (!spec) { err(ctx, where, unknownField(ctx.fields, c.field)); return null }
  if (typeof c.operator !== 'string') { err(ctx, where, `A condition needs an \`operator\`. ${spec.label} can use ${either([...positivesOf(spec.type), ...negationsOf(spec.type)].map((o) => OPERATOR_WORDS[o]))}.`); return null }
  if (!takes(spec.type, c.operator)) { err(ctx, where, wrongOperator(spec, c.operator)); return null }
  const op = c.operator
  const shape = shapeOf(op)
  const v = c.value
  const type = elementType(spec)
  const element = (x: unknown): string | number | boolean | null => {
    if (typeof x !== type) { err(ctx, where, takesWhat(spec, op)); return null }
    const r = checkElement(spec, op, x as string | number | boolean)
    if (!r.ok) { err(ctx, where, r.message); return null }
    return r.value
  }
  let value: unknown
  if (shape === 'none') {
    if (v !== undefined) err(ctx, where, takesWhat(spec, op))
  } else if (shape === 'list') {
    if (!Array.isArray(v)) err(ctx, where, takesWhat(spec, op))
    else if (ctx.limits && v.length > LIMITS.values) err(ctx, where, MESSAGES.tooManyValues)
    else {
      const out = v.map(element)
      if (out.every((x) => x !== null)) {
        const r = finishList(spec, out as string[])
        if (r.ok) value = r.value
        else err(ctx, where, r.message)
      }
    }
  } else if (shape === 'range') {
    if (!isObject(v)) err(ctx, where, takesWhat(spec, op))
    else {
      unknownKeys(ctx, where, v, ['from', 'to'], 'a range')
      if (!('from' in v) || !('to' in v)) err(ctx, where, takesWhat(spec, op))
      else {
        const [from, to] = [element(v.from), element(v.to)]
        if (from !== null && to !== null) {
          const r = finishRange(spec, from as string | number, to as string | number)
          if (r.ok) value = r.value
          else err(ctx, where, r.message)
        }
      }
    }
  } else {
    const x = v === undefined ? (err(ctx, where, takesWhat(spec, op)), null) : element(v)
    if (x !== null) value = x
  }
  if (ctx.errors.length > before) return null
  return (shape === 'none' ? { kind: 'condition', field: c.field, operator: op } : { kind: 'condition', field: c.field, operator: op, value }) as Condition
}

function checkGroup(ctx: Ctx, g: Record<string, unknown>, depth: number): Group | null {
  const where = `In group ${++ctx.groups}`
  unknownKeys(ctx, where, g, ['kind', 'join', 'items'], 'a group')
  const before = ctx.errors.length
  if (ctx.limits && depth > LIMITS.depth) { err(ctx, where, MESSAGES.tooDeep); return null }
  if (g.join !== 'and' && g.join !== 'or') err(ctx, where, 'A group needs a `join`: \'and\' or \'or\'.')
  if (!Array.isArray(g.items) || g.items.length === 0) { err(ctx, where, 'A group needs at least one item in `items`.'); return null }
  const items: Node[] = []
  g.items.forEach((item: unknown, i: number) => {
    if (ctx.stopped) return
    const n = node(ctx, item, depth, `${where}, item ${i + 1}`)
    if (n) items.push(n)
  })
  if (ctx.errors.length > before || ctx.stopped) return null
  // A group of one has nothing to join: its join is always written 'and'.
  return { kind: 'group', join: items.length === 1 ? 'and' : (g.join as 'and' | 'or'), items: items as [Node, ...Node[]] }
}

function node(ctx: Ctx, item: unknown, depth: number, where: string): Node | null {
  if (isObject(item) && item.kind === 'condition') return checkCondition(ctx, item)
  if (isObject(item) && item.kind === 'group') return checkGroup(ctx, item, depth + 1)
  err(ctx, where, 'Each item is a condition or a group, with `kind` set to \'condition\' or \'group\'.')
  return null
}

const deepFreeze = <T>(v: T): T => {
  if (typeof v === 'object' && v !== null && !Object.isFrozen(v)) {
    Object.freeze(v)
    for (const k of Object.keys(v)) deepFreeze((v as Record<string, unknown>)[k])
  }
  return v
}

/** Queries already in canonical form, and the fields they were checked against. */
const CANONICAL = new WeakMap<object, Fields>()

export function seal<F extends Fields>(query: Query<F>, fields: F): Query<F> {
  deepFreeze(query)
  CANONICAL.set(query, fields)
  return query
}

/** The text form is held to the same limit as typed text, so every valid query can be typed back. */
export function tooLongAsText(query: Query, fields: Fields): boolean {
  const text = textOf(query, fields)
  return text.length > LIMITS.characters && codePoints(text).length > LIMITS.characters
}

export function checkObject(input: unknown, fields: Fields, limits: boolean): ParseResult {
  const ctx: Ctx = { fields, errors: [], conditions: 0, groups: 0, limits, stopped: false }
  if (!isObject(input)) return { ok: false, errors: [{ at: 0, length: 0, message: 'A query is an object: { grammar: 1, root }.' }] }
  unknownKeys(ctx, '', input, ['grammar', 'root'], 'a query')
  if (input.grammar !== 1) {
    const v = input.grammar
    err(ctx, '', typeof v === 'number' && Number.isInteger(v) && v > 1
      ? `This query is written for grammar version ${v}. This version of Vela reads version 1.`
      : 'A query needs `grammar: 1`.')
  }
  let root: Group | null = null
  if (isObject(input.root) && input.root.kind === 'group') root = checkGroup(ctx, input.root, 1)
  else err(ctx, '', 'The root of a query is a group: { kind: \'group\', join, items }.')
  if (ctx.stopped) return { ok: false, errors: [{ at: 0, length: 0, message: MESSAGES.tooManyConditions }] }
  if (ctx.errors.length || !root) return { ok: false, errors: ctx.errors as [ParseError, ...ParseError[]] }
  const query: Query = { grammar: 1, root }
  if (limits && tooLongAsText(query, fields)) return { ok: false, errors: [{ at: 0, length: 0, message: MESSAGES.tooLong }] }
  return { ok: true, query: seal(query, fields) }
}

/** Checks an object from anywhere that isn't typed code: an agent, a saved view, a stored value. */
export function validateQuery<F extends Fields>(input: unknown, fields: F): ParseResult<F> {
  return checkObject(input, fields, true) as ParseResult<F>
}

/** The canonical form of a query, checked against its fields; a query that isn't valid throws. */
export function canonical<F extends Fields>(query: Query<F>, fields: F, fn: string): Query<F> {
  if (CANONICAL.get(query) === fields) return query
  // The limits on untrusted input are for input. A query built by code (leftOutQuery's) may be larger.
  const r = checkObject(query, fields, false)
  if (!r.ok) throw new TypeError(`${fn}: this query isn't valid. ${r.errors[0].message}`)
  return r.query as unknown as Query<F>
}

export function normalise<F extends Fields>(query: NoInfer<Query<F>>, fields: F): Query<F> {
  return canonical(query as Query<F>, fields, 'normalise')
}

/** Whether a query has a condition that needs `now`. */
export const hasWithinLast = (n: Node): boolean => n.kind === 'group' ? n.items.some(hasWithinLast) : n.operator === 'within-last'
