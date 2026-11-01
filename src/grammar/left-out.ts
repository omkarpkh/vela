/**
 * `leftOutQuery`: a query that matches exactly the records where the original is `unknown`
 * (filter-grammar.md, `grammar-missing-is-unknown`), so a backend that runs the grammar can count
 * what was left out. Built from `is-not-set` and the original conditions:
 *
 *   unknown(condition)  = its field is not set (never, for `is-set` and `is-not-set`)
 *   unknown(and)        = every item matches or is unknown, and some item is unknown
 *   unknown(or)         = no item matches, and some item is unknown
 *
 * "No item matches" needs each item's negation. A condition's negation is its negated operator, or,
 * for a number or a time, the operators either side of it (`at-least` 5 is "not `less-than` 5").
 * Two cases have no negation in the grammar, and inside an `or` they throw rather than return a
 * query that is wrong: an ordering, `between` or `within-last` on a `many` field, and `is` on a
 * `many` boolean ("no element is greater than 5" is not "some element is at most 5"). A `within-last`
 * inside an `or` is negated against a fixed time, so it needs `now`.
 *
 * The result can be deeper or longer than the limits on untrusted input: those limits are for
 * input. Its own conditions on a missing field are `unknown` or `match`, never a false "match".
 */
import { canonical } from './check'
import { NEGATES, isNegated, OPERATOR_WORDS, shapeOf } from './operators'
import { durationMs } from './time'
import type { Condition, FieldSpec, Fields, LeftOutOptions, Node, Operator, Query } from './types'

const NONE = Symbol('matches nothing')
type Built = Node | typeof NONE

const notSet = (field: string): Condition => ({ kind: 'condition', field, operator: 'is-not-set' } as Condition)
const isSet = (field: string): Condition => ({ kind: 'condition', field, operator: 'is-set' } as Condition)
const cond = (field: string, operator: Operator, value?: unknown): Condition =>
  (value === undefined ? { kind: 'condition', field, operator } : { kind: 'condition', field, operator, value }) as Condition

const key = (n: Node) => JSON.stringify(n)

function join(kind: 'and' | 'or', parts: Built[]): Built {
  let items: Node[] = []
  for (const p of parts) {
    if (p === NONE) { if (kind === 'and') return NONE; continue }
    if (p.kind === 'group' && (p.join === kind || p.items.length === 1)) items.push(...p.items)
    else items.push(p)
  }
  // Absorption, to keep the result short: "A and (A or B)" matches where A does, and so does
  // "A or (A and B)". The same item twice is the item once.
  const direct = new Set(items.filter((n) => n.kind === 'condition').map(key))
  items = items.filter((n, i) => (n.kind === 'condition' ? items.findIndex((m) => key(m) === key(n)) === i : !n.items.some((m) => direct.has(key(m)))))
  if (!items.length) return NONE
  return items.length === 1 ? items[0] : { kind: 'group', join: kind, items: items as [Node, ...Node[]] }
}
const and = (...p: Built[]) => join('and', p)
const or = (...p: Built[]) => join('or', p)

class Builder {
  constructor(readonly fields: Fields, readonly now: number | undefined) {}

  spec(c: Condition): FieldSpec { return this.fields[c.field] }

  /** Matches where the condition, with its field set, does not match. */
  negation(c: Condition): Built {
    const spec = this.spec(c)
    const v = (c as { value?: unknown }).value
    const f = c.field
    if (isNegated(c.operator)) return cond(f, NEGATES[c.operator], v)
    const pos = Object.entries(NEGATES).find(([, p]) => p === c.operator)
    const words = `${spec.label} ${OPERATOR_WORDS[c.operator]}`
    const cannot = (why: string): never => {
      throw new TypeError(`leftOutQuery: the grammar can't say what "${words}" leaves out inside an 'or', ${why}`)
    }
    const several = `because ${spec.label} has several values, and the grammar has no operator for "no value ${OPERATOR_WORDS[c.operator]} …".`
    if (spec.type === 'boolean') return spec.many ? cannot(several) : cond(f, 'is', !v)
    // A negated operator negates exactly, many-valued or not: it means "no element matches".
    if (pos && (spec.type !== 'number' || c.operator === 'is')) return cond(f, pos[0] as Operator, v)
    if (spec.many) cannot(several)
    switch (c.operator) {
      case 'greater-than': return cond(f, 'at-most', v)
      case 'at-most': return cond(f, 'greater-than', v)
      case 'at-least': return cond(f, 'less-than', v)
      case 'less-than': return cond(f, 'at-least', v)
      case 'between': {
        const r = v as { from: unknown; to: unknown }
        return spec.type === 'number'
          ? or(cond(f, 'less-than', r.from), cond(f, 'greater-than', r.to))
          : or(cond(f, 'before', r.from), cond(f, 'after', r.to))
      }
      // A time has no "at or after": "not before t" is "after t, or at t".
      case 'before': return or(cond(f, 'after', v), cond(f, 'between', { from: v, to: v }))
      case 'after': return or(cond(f, 'before', v), cond(f, 'between', { from: v, to: v }))
      case 'within-last': {
        if (this.now === undefined) cannot('without `now`: pass `now`, as evaluate takes it.')
        const from = new Date(this.now! - durationMs(v as string)).toISOString()
        return or(cond(f, 'before', from), cond(f, 'after', new Date(this.now!).toISOString()))
      }
    }
    return cannot('because this operator has no negation.')
  }

  /** unknown(n) */
  unknown(n: Node): Built {
    if (n.kind === 'condition') return shapeOf(n.operator) === 'none' ? NONE : notSet(n.field)
    if (n.join === 'and') return and(...n.items.map((i) => this.matchOrUnknown(i)), or(...n.items.map((i) => this.unknown(i))))
    return and(...n.items.map((i) => this.notMatch(i)), or(...n.items.map((i) => this.unknown(i))))
  }

  /** match(n) or unknown(n) */
  matchOrUnknown(n: Node): Built {
    if (n.kind === 'condition') return shapeOf(n.operator) === 'none' ? n : or(n, notSet(n.field))
    return n.join === 'and' ? and(...n.items.map((i) => this.matchOrUnknown(i))) : or(...n.items.map((i) => this.matchOrUnknown(i)))
  }

  /** no-match(n) or unknown(n) */
  notMatch(n: Node): Built {
    if (n.kind === 'condition') {
      if (n.operator === 'is-set') return notSet(n.field)
      if (n.operator === 'is-not-set') return isSet(n.field)
      return or(this.negation(n), notSet(n.field))
    }
    return n.join === 'and' ? or(...n.items.map((i) => this.notMatch(i))) : and(...n.items.map((i) => this.notMatch(i)))
  }
}

const firstField = (n: Node): string => (n.kind === 'condition' ? n.field : firstField(n.items[0]))

/** A query that matches exactly the records where `query` is `unknown`. */
export function leftOutQuery<F extends Fields>(query: NoInfer<Query<F>>, fields: F, options: LeftOutOptions = {}): Query<F> {
  const q = canonical(query as Query<F>, fields, 'leftOutQuery') as unknown as Query
  const now = options.now instanceof Date && !Number.isNaN(options.now.getTime()) ? options.now.getTime() : undefined
  let built = new Builder(fields, now).unknown(q.root)
  // A query that is never unknown (only `is-set` and `is-not-set`) leaves nothing out.
  if (built === NONE) built = and(isSet(firstField(q.root)), notSet(firstField(q.root)))
  const root = built === NONE || built.kind === 'condition' ? { kind: 'group', join: 'and', items: [built] } : built
  return canonical({ grammar: 1, root } as Query<F>, fields, 'leftOutQuery')
}
