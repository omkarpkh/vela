/**
 * `evaluate`: one record against one query (filter-grammar.md, `grammar-missing-is-unknown`). For
 * tests, previews and small lists; a host's backend runs real queries from the same object.
 *
 * A record is read by the field keys exactly as declared (`record["sender.domain"]`), never as a
 * path. A field's values are the ones of its type: a missing key, `null`, a value of another type
 * or an empty list all count as no value, so the result is `unknown`, and `is-not-set` matches.
 * A `many` field takes a list (a single value is read as a list of one); a field without `many`
 * that is given a list has no value.
 *
 * On an `untrusted` text, identifier or domain field, the hidden characters are removed from both
 * sides before comparing. On every other field, matching is exact.
 */
import { canonical, hasWithinLast } from './check'
import { isSubdomainOf, normaliseDomain } from './domain'
import { fold } from './fold'
import { hasHidden, withoutHidden } from './hidden'
import { inRange, normaliseCidr, parseIp, type Cidr, type Ip } from './ip'
import { isNegated, NEGATES, shapeOf } from './operators'
import { durationMs, parseTime } from './time'
import type { Condition, Evaluation, NegatedOperator, EvaluateOptions, FieldRecord, FieldSpec, Fields, Group, Node, Operator, Query } from './types'

type Comparable = string | number | boolean | Ip

/** One stored value as it is compared, or `undefined` when it is not a value of this field's type. */
function comparable(spec: FieldSpec, v: unknown): Comparable | undefined {
  const untrusted = spec.trust.kind === 'untrusted'
  switch (spec.type) {
    case 'text': return typeof v === 'string' ? fold(untrusted ? withoutHidden(v) : v) : undefined
    case 'identifier': return typeof v === 'string' ? (untrusted ? withoutHidden(v) : v) : undefined
    case 'domain': {
      if (typeof v !== 'string') return undefined
      const visible = untrusted ? withoutHidden(v) : v
      // Exact matching on other fields: a hidden character makes it no host name at all.
      if (hasHidden(visible)) return undefined
      const r = normaliseDomain(visible)
      return r.ok ? r.ascii : undefined
    }
    case 'ip': return typeof v === 'string' ? parseIp(v) ?? undefined : undefined
    case 'number': return typeof v === 'number' && Number.isFinite(v) ? v : undefined
    case 'time': {
      if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.getTime()
      return typeof v === 'string' ? parseTime(v) ?? undefined : undefined
    }
    case 'enum': return typeof v === 'string' && spec.values.some((x) => x.value === v) ? v : undefined
    case 'boolean': return typeof v === 'boolean' ? v : undefined
  }
}

/** A record's values for one field, in compared form. Empty means it has none. */
export function valuesOf(spec: FieldSpec, raw: unknown): Comparable[] {
  if (raw === undefined || raw === null) return []
  const list = spec.many ? (Array.isArray(raw) ? raw : [raw]) : Array.isArray(raw) ? [] : [raw]
  return list.map((v) => comparable(spec, v)).filter((v): v is Comparable => v !== undefined)
}

/** A condition's own value, in compared form. */
type Prepared = { one?: Comparable; many?: Comparable[]; from?: number; to?: number; cidr?: Cidr; ms?: number }

function prepareOne(spec: FieldSpec, op: Operator, v: unknown): Comparable {
  if (shapeOf(op) === 'cidr') return v as string
  const untrusted = spec.trust.kind === 'untrusted'
  switch (spec.type) {
    case 'text': return fold(untrusted ? withoutHidden(v as string) : (v as string))
    case 'identifier': return untrusted ? withoutHidden(v as string) : (v as string)
    case 'ip': return parseIp(v as string)!
    case 'time': return parseTime(v as string)!
    default: return v as Comparable
  }
}

const PREPARED = new WeakMap<Condition, Prepared>()

function prepare(spec: FieldSpec, c: Condition): Prepared {
  const hit = PREPARED.get(c)
  if (hit) return hit
  const v = (c as { value?: unknown }).value
  const op = isNegated(c.operator) ? NEGATES[c.operator] : c.operator
  const p: Prepared = {}
  switch (shapeOf(op)) {
    case 'none': break
    case 'list': p.many = (v as unknown[]).map((x) => prepareOne(spec, op, x)); break
    case 'range': {
      const r = v as { from: unknown; to: unknown }
      p.from = prepareOne(spec, op, r.from) as number
      p.to = prepareOne(spec, op, r.to) as number
      break
    }
    case 'cidr': {
      const r = normaliseCidr(v as string)
      if (r.ok) p.cidr = r.cidr
      break
    }
    case 'duration': p.ms = durationMs(v as string); break
    default: p.one = prepareOne(spec, op, v)
  }
  PREPARED.set(c, p)
  return p
}

const same = (a: Comparable, b: Comparable) =>
  typeof a === 'object' && typeof b === 'object' ? a.family === b.family && a.bytes.every((x, i) => x === b.bytes[i]) : a === b

/** Whether one stored value meets a positive operator. */
function meets(op: Operator, p: Prepared, v: Comparable, now: number | undefined): boolean {
  switch (op) {
    case 'is': return same(v, p.one!)
    case 'is-one-of': return p.many!.some((x) => same(v, x))
    case 'contains': return (v as string).includes(p.one as string)
    case 'starts-with': return (v as string).startsWith(p.one as string)
    case 'ends-with': return (v as string).endsWith(p.one as string)
    case 'is-subdomain-of': return isSubdomainOf(v as string, p.one as string)
    case 'in-range': return !!p.cidr && inRange(v as Ip, p.cidr)
    case 'greater-than': case 'after': return (v as number) > (p.one as number)
    case 'at-least': return (v as number) >= (p.one as number)
    case 'less-than': case 'before': return (v as number) < (p.one as number)
    case 'at-most': return (v as number) <= (p.one as number)
    case 'between': return (v as number) >= p.from! && (v as number) <= p.to!
    case 'within-last': return (v as number) >= now! - p.ms! && (v as number) <= now!
    default: return false
  }
}

function condition(fields: Fields, c: Condition, record: FieldRecord, now: number | undefined): Evaluation {
  const spec = fields[c.field]
  const values = valuesOf(spec, Object.prototype.hasOwnProperty.call(record, c.field) ? record[c.field] : undefined)
  if (c.operator === 'is-set') return values.length ? 'match' : 'no-match'
  if (c.operator === 'is-not-set') return values.length ? 'no-match' : 'match'
  // Missing is not a match, and not a "no" either: whether the operator is positive or negated.
  if (!values.length) return 'unknown'
  const negated = isNegated(c.operator)
  const op = negated ? NEGATES[c.operator as NegatedOperator] : c.operator
  const p = prepare(spec, c)
  const any = values.some((v) => meets(op, p, v, now))
  return any !== negated ? 'match' : 'no-match'
}

export function node(fields: Fields, n: Node, record: FieldRecord, now: number | undefined): Evaluation {
  if (n.kind === 'condition') return condition(fields, n, record, now)
  return group(fields, n, record, now)
}

function group(fields: Fields, g: Group, record: FieldRecord, now: number | undefined): Evaluation {
  let unknown = false
  for (const item of g.items) {
    const r = node(fields, item, record, now)
    if (g.join === 'and' && r === 'no-match') return 'no-match'
    if (g.join === 'or' && r === 'match') return 'match'
    if (r === 'unknown') unknown = true
  }
  return unknown ? 'unknown' : g.join === 'and' ? 'match' : 'no-match'
}

/** One record against one query. `now` is required when the query has a `within-last`. */
export function evaluate<F extends Fields>(query: NoInfer<Query<F>>, record: FieldRecord, fields: F, options: EvaluateOptions = {}): Evaluation {
  const q = canonical(query as Query<F>, fields, 'evaluate') as unknown as Query
  const now = options.now instanceof Date && !Number.isNaN(options.now.getTime()) ? options.now.getTime() : undefined
  if (now === undefined && hasWithinLast(q.root))
    throw new TypeError('evaluate: this query has \'within-last\', so pass `now`. The result then depends on the record alone, and a test can be reproduced.')
  if (typeof record !== 'object' || record === null) throw new TypeError('evaluate: a record is an object of field keys to values.')
  return node(fields, q.root, record, now)
}
