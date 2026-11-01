/**
 * `defineFields`: a host's fields, declared once per data source (filter-grammar.md, API).
 *
 * The types reject an invented type, a missing trust or a trust without its source or writer. The
 * same checks run here, for a schema that reaches the core from JavaScript, and throw: a schema is
 * written by the host's own developers, so a bad one is a bug to fix, not input to report.
 */
import type { FieldSchema, FieldSpec, Fields, FieldType } from './types'

export const FIELD_TYPES: readonly FieldType[] = ['text', 'identifier', 'domain', 'ip', 'number', 'time', 'enum', 'boolean']
const KEY = /^[a-z][a-z0-9_.]*$/

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

function fail(key: string, why: string): never {
  throw new TypeError(`defineFields: field \`${key}\` ${why}`)
}

function checkSpec(key: string, spec: unknown): FieldSpec {
  if (!KEY.test(key)) fail(key, 'needs a key of lower-case letters, digits, "_" and ".", starting with a letter.')
  if (key === 'and' || key === 'or') fail(key, 'is a join word in the text form, so it can\'t be a key.')
  if (!isObject(spec)) fail(key, 'needs a spec object.')
  const allowed = ['label', 'type', 'trust', 'many', ...(spec.type === 'number' ? ['unit'] : []), ...(spec.type === 'enum' ? ['values'] : [])]
  for (const k of Object.keys(spec)) if (!allowed.includes(k)) fail(key, `has \`${k}\`, which isn't part of a field spec here.`)
  if (!nonEmpty(spec.label)) fail(key, 'needs a label: the words an analyst would say.')
  if (!FIELD_TYPES.includes(spec.type as FieldType)) fail(key, `needs a type, one of ${FIELD_TYPES.join(', ')}.`)
  const trust = spec.trust
  if (!isObject(trust)) fail(key, 'needs a trust: who could have set its values. There is no default.')
  const trustKeys = Object.keys(trust).sort().join(',')
  if (trust.kind === 'system-record') {
    if (!nonEmpty(trust.source) || trustKeys !== 'kind,source') fail(key, 'is a system record, so its trust needs a `source` and nothing else.')
  } else if (trust.kind === 'agent-output' || trust.kind === 'untrusted') {
    if (!nonEmpty(trust.writtenBy) || trustKeys !== 'kind,writtenBy') fail(key, `is ${trust.kind}, so its trust needs \`writtenBy\` and nothing else.`)
  } else fail(key, 'needs a trust of system-record, agent-output or untrusted.')
  if ('many' in spec && spec.many !== true) fail(key, 'takes `many: true` or no `many` at all.')
  if (spec.type === 'number' && 'unit' in spec && !nonEmpty(spec.unit)) fail(key, 'has a unit that is not a word.')
  if (spec.type === 'enum') {
    const values = spec.values
    if (!Array.isArray(values) || values.length === 0) fail(key, 'is an enum, so it needs at least one value.')
    const seen = new Set<string>()
    for (const v of values) {
      if (!isObject(v) || typeof v.value !== 'string' || v.value === '' || !nonEmpty(v.label) || Object.keys(v).sort().join(',') !== 'label,value')
        fail(key, 'has an enum value that is not { value, label }.')
      if (seen.has(v.value)) fail(key, `has the enum value \`${v.value}\` twice.`)
      seen.add(v.value)
    }
  }
  return spec as FieldSpec
}

const deepFreeze = <T>(v: T): T => {
  if (typeof v === 'object' && v !== null && !Object.isFrozen(v)) {
    Object.freeze(v)
    for (const k of Object.keys(v)) deepFreeze((v as Record<string, unknown>)[k])
  }
  return v
}

/** Freezes a copy of the schema; the `FieldName` union is its keys. */
export function defineFields<const S extends FieldSchema>(schema: S): Fields<S> {
  if (!isObject(schema)) throw new TypeError('defineFields: the schema is an object of field keys to specs.')
  const copy: Record<string, FieldSpec> = {}
  for (const key of Object.keys(schema)) copy[key] = checkSpec(key, structuredCloneLite(schema[key]))
  if (!Object.keys(copy).length) throw new TypeError('defineFields: the schema needs at least one field.')
  return deepFreeze(copy) as unknown as Fields<S>
}

/** A plain copy of JSON-like data, so freezing the schema never freezes the host's own object. */
function structuredCloneLite<T>(v: T): T {
  if (Array.isArray(v)) return v.map(structuredCloneLite) as T
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, structuredCloneLite(x)])) as T
  return v
}

/** The spec of a declared field, read safely (`__proto__` is never a field). */
export const specOf = (fields: Fields, key: string): FieldSpec | undefined =>
  Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : undefined
