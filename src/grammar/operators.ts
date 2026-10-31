/**
 * Which operators each field type takes, and the shape of each operator's value
 * (filter-grammar.md, Field types). The tables are the runtime half of the types in `types.ts`;
 * `grammar.test.ts` checks the two agree.
 */
import type { FieldType, NegatedOperator, Operator } from './types'

/** Each type's positive operators, in the order the errors suggest them, then its negations. */
const POSITIVE: Record<FieldType, readonly Operator[]> = {
  text: ['is', 'is-one-of', 'contains', 'starts-with', 'ends-with'],
  identifier: ['is', 'is-one-of', 'starts-with'],
  domain: ['is', 'is-one-of', 'is-subdomain-of'],
  ip: ['is', 'is-one-of', 'in-range'],
  number: ['is', 'greater-than', 'at-least', 'less-than', 'at-most', 'between'],
  time: ['before', 'after', 'between', 'within-last'],
  enum: ['is', 'is-one-of'],
  boolean: ['is'],
}

/** Each negation, to the positive operator it negates. */
export const NEGATES: Record<NegatedOperator, Operator> = {
  'is-not': 'is',
  'is-none-of': 'is-one-of',
  'does-not-contain': 'contains',
  'does-not-start-with': 'starts-with',
  'does-not-end-with': 'ends-with',
  'is-not-subdomain-of': 'is-subdomain-of',
  'not-in-range': 'in-range',
}
const NEGATION_OF = new Map(Object.entries(NEGATES).map(([neg, pos]) => [pos, neg as NegatedOperator]))

export const isNegated = (op: Operator): op is NegatedOperator => op in NEGATES

/** The positives a type takes, and its negations: a number has only `is-not`, a time and a boolean none. */
export const positivesOf = (type: FieldType) => POSITIVE[type]
export const negationsOf = (type: FieldType): readonly Operator[] =>
  type === 'number' ? ['is-not']
  : type === 'time' || type === 'boolean' ? []
  : POSITIVE[type].map((op) => NEGATION_OF.get(op)).filter((op): op is NegatedOperator => !!op)

export const operatorsOf = (type: FieldType): readonly Operator[] => [...positivesOf(type), ...negationsOf(type), 'is-set', 'is-not-set']

export const takes = (type: FieldType, op: string): op is Operator => (operatorsOf(type) as readonly string[]).includes(op)

/** Every operator id the grammar knows. */
export const ALL_OPERATORS: readonly Operator[] = [...new Set((Object.keys(POSITIVE) as FieldType[]).flatMap(operatorsOf))]

export type Shape = 'none' | 'one' | 'list' | 'range' | 'cidr' | 'duration'

export function shapeOf(op: Operator): Shape {
  switch (op) {
    case 'is-set': case 'is-not-set': return 'none'
    case 'is-one-of': case 'is-none-of': return 'list'
    case 'between': return 'range'
    case 'in-range': case 'not-in-range': return 'cidr'
    case 'within-last': return 'duration'
    default: return 'one'
  }
}

/** The English operator words: the readback's defaults, and the words the errors use. */
export const OPERATOR_WORDS: { [O in Operator]: string } = {
  'is': 'is',
  'is-not': 'is not',
  'is-one-of': 'is one of',
  'is-none-of': 'is none of',
  'contains': 'contains',
  'does-not-contain': 'does not contain',
  'starts-with': 'starts with',
  'does-not-start-with': 'does not start with',
  'ends-with': 'ends with',
  'does-not-end-with': 'does not end with',
  'is-subdomain-of': 'is a subdomain of',
  'is-not-subdomain-of': 'is not a subdomain of',
  'in-range': 'is in',
  'not-in-range': 'is not in',
  'greater-than': 'is greater than',
  'at-least': 'is at least',
  'less-than': 'is less than',
  'at-most': 'is at most',
  'between': 'is between',
  'before': 'is before',
  'after': 'is after',
  'within-last': 'is within the last',
  'is-set': 'is set',
  'is-not-set': 'is not set',
}

/** "'a', 'b' or 'c'": quoted, joined in plain English, no serial comma. */
export const either = (words: readonly string[]) => {
  const q = words.map((w) => `'${w}'`)
  return q.length <= 1 ? q.join('') : `${q.slice(0, -1).join(', ')} or ${q[q.length - 1]}`
}
