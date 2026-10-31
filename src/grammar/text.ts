/**
 * The text form (filter-grammar.md, The text form): field keys as declared, operators as their
 * ids, strings quoted, lists in brackets, one join per group and brackets around every inner group.
 * The URL form is this text, percent-encoded, in one parameter, `q=`.
 */
import { quote } from './hidden'
import { shapeOf } from './operators'
import type { Condition, FieldSpec, Fields, Group, Query } from './types'

/** A number written in full, never with an exponent (the text form has none): `1e-7` is `0.0000001`. */
export function decimal(n: number): string {
  const s = String(n)
  const m = s.match(/^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/)
  if (!m) return s
  const [, sign, int, frac = '', exp] = m
  const digits = int + frac
  const point = 1 + Number(exp)
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`
}

export const BARE_ENUM = /^[a-z0-9_-]+$/

function element(spec: FieldSpec, op: Condition['operator'], v: unknown): string {
  switch (spec.type) {
    case 'number': return decimal(v as number)
    case 'boolean': return String(v)
    case 'ip': return v as string
    // `and` and `or` are the joins, so an enum value spelt like one is quoted.
    case 'enum': return BARE_ENUM.test(v as string) && v !== 'and' && v !== 'or' ? (v as string) : quote(v as string)
    case 'time': return shapeOf(op) === 'duration' ? (v as string) : quote(v as string)
    default: return quote(v as string)
  }
}

function conditionText(c: Condition, fields: Fields): string {
  const spec = fields[c.field]
  const head = `${c.field} ${c.operator}`
  const v = (c as { value?: unknown }).value
  switch (shapeOf(c.operator)) {
    case 'none': return head
    case 'list': return `${head} [${(v as unknown[]).map((x) => element(spec, c.operator, x)).join(', ')}]`
    case 'range': {
      const r = v as { from: unknown; to: unknown }
      return `${head} ${element(spec, c.operator, r.from)} and ${element(spec, c.operator, r.to)}`
    }
    default: return `${head} ${element(spec, c.operator, v)}`
  }
}

function groupText(g: Group, fields: Fields): string {
  return g.items.map((n) => (n.kind === 'group' ? `(${groupText(n, fields)})` : conditionText(n, fields))).join(` ${g.join} `)
}

/** The text of a query already in canonical form. */
export const textOf = (q: Query, fields: Fields) => groupText(q.root, fields)
