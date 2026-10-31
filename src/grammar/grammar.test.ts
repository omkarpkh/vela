import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineFields, evaluate, leftOutQuery, normalise, parseQuery, queryToText, readback, validateQuery } from '..'
import type { ParseResult, Query } from '..'
import { FOLDS, fold } from './fold'
import { HIDDEN_RANGES } from './hidden'
import { operatorsOf } from './operators'
import { punycodeDecode } from './domain'

// Filter Grammar (guidelines/contracts/filter-grammar.md). The schema is the spec's API example, with
// three fields added for the Words table: a number without a unit, a multi-valued text field and a
// multi-valued Source IP (the Words table reads "any Source IP", so the field is `many: true` here).
// Hidden characters are made from their code points; none is typed into this file.
const SEVERITY_VALUES = [{ value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }] as const
const fields = defineFields({
  'sender.domain': { label: 'Authenticated sender domain', type: 'domain', trust: { kind: 'system-record', source: 'Mail gateway (DMARC-aligned From)' } },
  'subject': { label: 'Subject', type: 'text', trust: { kind: 'untrusted', writtenBy: 'the email\'s sender' } },
  'vendor.listed': { label: 'Payment account on the vendor list', type: 'boolean', trust: { kind: 'system-record', source: 'Vendor master' } },
  'severity': { label: 'Severity', type: 'enum', values: SEVERITY_VALUES, trust: { kind: 'system-record', source: 'Detection pipeline' } },
  'first_seen': { label: 'First seen', type: 'time', trust: { kind: 'system-record', source: 'Sensor clock' } },
  'source.ip': { label: 'Source IP', type: 'ip', many: true, trust: { kind: 'system-record', source: 'Firewall log' } },
  'recipients': { label: 'Recipients', type: 'number', trust: { kind: 'system-record', source: 'Mail gateway' } },
  'tags': { label: 'Tag', type: 'text', many: true, trust: { kind: 'agent-output', writtenBy: 'the triage agent' } },
  'account': { label: 'Account', type: 'identifier', trust: { kind: 'system-record', source: 'Identity provider' } },
})
type F = typeof fields

const ZWSP = String.fromCodePoint(0x200b)
const RLO = String.fromCodePoint(0x202e)

function parsed(text: string): Query<F> {
  const r = parseQuery(text, fields)
  if (!r.ok) throw new Error(`expected "${text}" to parse: ${r.errors.map((e) => e.message).join(' | ')}`)
  return r.query
}
function errorsOf(r: ParseResult<F>) {
  if (r.ok) throw new Error('expected errors')
  return r.errors
}
const one = (r: ParseResult<F>) => errorsOf(r).map((e) => e.message)

const NOW = new Date('2026-10-31T14:15:00Z') // 19:45 in India

describe('the core imports nothing', () => {
  it('no React, no DOM and no Node-only module, so a backend and the browser import the same code', () => {
    const dir = resolve(process.cwd(), 'src/grammar')
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const src = readFileSync(resolve(dir, f), 'utf8')
      for (const m of src.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]/gm)) expect(m[1], f).toMatch(/^\.\//)
      expect(src, f).not.toMatch(/\b(document|window|navigator|localStorage|Buffer|process)\./)
    }
  })
})

describe('defineFields', () => {
  // grammar-trust-declared, its runtime half: a schema from JavaScript is checked the same way.
  it('freezes the schema and throws on a field the types would reject', () => {
    expect(Object.isFrozen(fields)).toBe(true)
    expect(Object.isFrozen(fields['severity'])).toBe(true)
    const bad = (spec: unknown) => () => defineFields({ x: spec } as never)
    expect(bad({ label: 'X', type: 'text' })).toThrow(/needs a trust/)
    expect(bad({ label: 'X', type: 'text', trust: { kind: 'unknown' } })).toThrow(/system-record, agent-output or untrusted/)
    expect(bad({ label: 'X', type: 'text', trust: { kind: 'system-record' } })).toThrow(/needs a `source`/)
    expect(bad({ label: 'X', type: 'text', trust: { kind: 'untrusted', source: 'S' } })).toThrow(/needs `writtenBy`/)
    expect(bad({ label: 'X', type: 'colour', trust: { kind: 'system-record', source: 'S' } })).toThrow(/needs a type/)
    expect(bad({ label: 'X', type: 'enum', values: [], trust: { kind: 'system-record', source: 'S' } })).toThrow(/at least one value/)
    expect(() => defineFields({ 'Sender': { label: 'S', type: 'text', trust: { kind: 'system-record', source: 'S' } } })).toThrow(/lower-case/)
    expect(() => defineFields({ and: { label: 'S', type: 'text', trust: { kind: 'system-record', source: 'S' } } })).toThrow(/join word/)
  })

  it('knows 8 types, each with its operators, is-set and is-not-set', () => {
    expect(operatorsOf('domain')).not.toContain('contains')
    expect(operatorsOf('domain')).not.toContain('ends-with')
    expect(operatorsOf('enum')).not.toContain('between')
    expect(operatorsOf('boolean')).toEqual(['is', 'is-set', 'is-not-set'])
    expect(operatorsOf('number')).toEqual(['is', 'greater-than', 'at-least', 'less-than', 'at-most', 'between', 'is-not', 'is-set', 'is-not-set'])
    expect(operatorsOf('time')).toEqual(['before', 'after', 'between', 'within-last', 'is-set', 'is-not-set'])
    expect(operatorsOf('text')).toHaveLength(12)
  })
})

describe('the text form', () => {
  it('parses the spec\'s two examples, and writes them back', () => {
    const a = parsed('sender.domain is "northwind.example" and subject contains "Invoice"')
    expect(a).toEqual({ grammar: 1, root: { kind: 'group', join: 'and', items: [
      { kind: 'condition', field: 'sender.domain', operator: 'is', value: 'northwind.example' },
      { kind: 'condition', field: 'subject', operator: 'contains', value: 'Invoice' },
    ] } })
    const text = 'severity is-one-of [high, critical] and (first_seen within-last 7d or source.ip in-range 10.0.0.0/8)'
    expect(queryToText(parsed(text), fields)).toBe(text)
  })

  it('writes a number in full, never with an exponent', () => {
    const q: Query<F> = { grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'recipients', operator: 'at-least', value: 1e-7 }] } }
    expect(queryToText(q, fields)).toBe('recipients at-least 0.0000001')
    const big: Query<F> = { grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'recipients', operator: 'less-than', value: 1e21 }] } }
    expect(queryToText(big, fields)).toBe('recipients less-than 1000000000000000000000')
  })

  it('takes `between` as two values joined by and', () => {
    expect(queryToText(parsed('recipients between 1 and 10'), fields)).toBe('recipients between 1 and 10')
    expect(parsed('recipients between 1 and 10').root.items[0]).toEqual({ kind: 'condition', field: 'recipients', operator: 'between', value: { from: 1, to: 10 } })
  })
})

// [[rule: grammar-untyped-input-checked]]
describe('untyped input is checked, never guessed', () => {
  it('names an undeclared field, with a suggestion it does not apply (Words: Unknown field)', () => {
    const e = errorsOf(parseQuery('sender_domain is "northwind.example"', fields))
    expect(e).toEqual([{ at: 0, length: 13, message: '`sender_domain` is not a field here. Did you mean Authenticated sender domain?' }])
    expect(one(parseQuery('colour is "red"', fields))).toEqual(['`colour` is not a field here.'])
  })

  it('names an operator outside its type (Words: Wrong operator)', () => {
    const e = errorsOf(parseQuery('sender.domain contains "northwind"', fields))
    expect(e).toEqual([{ at: 14, length: 8, message: 'Authenticated sender domain can\'t use \'contains\'. Use \'is\', \'is one of\' or \'is a subdomain of\'.' }])
    expect(one(parseQuery('sender.domain ends-with "northwind.example"', fields))[0]).toMatch(/can't use 'ends-with'/)
    expect(one(parseQuery('severity between high and critical', fields))[0]).toBe('Severity can\'t use \'between\'. Use \'is\' or \'is one of\'.')
    expect(one(parseQuery('sender.domain does-not-contain "x"', fields))[0]).toBe('Authenticated sender domain can\'t use \'does-not-contain\'. Use \'is not\', \'is none of\' or \'is not a subdomain of\'.')
  })

  it('rejects a value of the wrong shape, an enum value not in values, and malformed values', () => {
    expect(one(parseQuery('severity is [high]', fields))).toEqual(['Severity \'is\' needs a value here.'])
    expect(one(parseQuery('severity is-one-of high', fields))).toEqual(['Severity \'is one of\' takes a list in brackets, like [a, b].'])
    expect(one(parseQuery('severity is medium', fields))).toEqual(['`medium` is not a value of Severity. Use \'high\' or \'critical\'.'])
    expect(one(parseQuery('source.ip is 10.0.0.256', fields))).toEqual(['`10.0.0.256` is not an IP address.'])
    expect(one(parseQuery('source.ip in-range 10.0.0.0/33', fields))).toEqual(['`10.0.0.0/33` is not a range. Write a network and a prefix length, like 10.0.0.0/8.'])
    expect(one(parseQuery('first_seen before "2026-10-31"', fields))).toEqual(['`2026-10-31` is not a time with an offset. Write it like "2026-10-31T19:45:00+05:30".'])
    expect(one(parseQuery('first_seen before "2026-10-31T19:45:00"', fields))[0]).toMatch(/not a time with an offset/)
    expect(one(parseQuery('first_seen within-last 7days', fields))).toEqual(['`7days` is not a duration. Write a whole number and m, h, d or w, like 7d.'])
    expect(one(parseQuery('recipients at-least 1e3', fields))).toEqual(['`1e3` is not a number. Write it like 10 or 2.5.'])
    expect(one(parseQuery('vendor.listed is yes', fields))).toEqual(['`yes` is not true or false.'])
    expect(one(parseQuery('subject contains Invoice', fields))).toEqual(['Subject takes its value in double quotes, like "Invoice".'])
    expect(one(parseQuery('severity is-one-of []', fields))).toEqual(['A list needs at least one value.'])
    expect(one(parseQuery('severity is-set high', fields))).toEqual(['Severity \'is set\' takes no value.'])
  })

  it('reports every value error it can find, each at its own place', () => {
    const e = errorsOf(parseQuery('severity is medium and source.ip is 10.0.0.256', fields))
    expect(e.map((x) => [x.at, x.length])).toEqual([[12, 6], [36, 10]])
  })

  // The Words table, word for word.
  it('mixed joins are an error, not a precedence rule (Words: Mixed joins)', () => {
    const text = 'severity is high and subject contains "a" or subject contains "b"'
    expect(errorsOf(parseQuery(text, fields))).toEqual([{ at: text.indexOf(' or ') + 1, length: 2, message: 'Add brackets to say which comes first: \'and\' and \'or\' are mixed here.' }])
    expect(parseQuery('severity is high and (subject contains "a" or subject contains "b")', fields).ok).toBe(true)
  })

  it('groups nest 3 deep at most, the root being the first (Words: Too deep)', () => {
    const three = '(severity is high or (severity is critical and subject contains "a"))'
    expect(parseQuery(three, fields).ok).toBe(true)
    const four = '(severity is high or (severity is critical and (subject contains "a" or subject contains "b")))'
    expect(errorsOf(parseQuery(four, fields))).toEqual([{ at: four.indexOf('(subject'), length: 1, message: 'Groups can be nested 3 deep at most.' }])
    const deep: unknown = { grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'group', join: 'and', items: [{ kind: 'group', join: 'and', items: [
      { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'severity', operator: 'is', value: 'high' }] }] }] }] } }
    expect(one(validateQuery(deep, fields))).toEqual(['In group 4: Groups can be nested 3 deep at most.'])
  })

  it('an unknown key on any object is an error, not a silent drop (Words: Unknown key)', () => {
    const agent: unknown = { grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'severity', operator: 'is', value: 'high', boost: 2 }] } }
    expect(errorsOf(validateQuery(agent, fields))).toEqual([{ at: 0, length: 0, message: 'In condition 1: `boost` isn\'t part of a condition here.' }])
    expect(one(validateQuery({ grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'severity', operator: 'is', value: 'high' }], weight: 1 } }, fields)))
      .toEqual(['In group 1: `weight` isn\'t part of a group here.'])
    expect(one(validateQuery({ grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'recipients', operator: 'between', value: { from: 1, to: 2, step: 1 } }] } }, fields)))
      .toEqual(['In condition 1: `step` isn\'t part of a range here.'])
    expect(one(validateQuery({ grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'severity', operator: 'is', value: 'high' }] }, note: 'x' }, fields)))
      .toEqual(['`note` isn\'t part of a query here.'])
  })

  it('validateQuery gives the same errors as parseQuery, saying which condition', () => {
    const q = (items: unknown[]): unknown => ({ grammar: 1, root: { kind: 'group', join: 'and', items } })
    expect(one(validateQuery(q([{ kind: 'condition', field: 'sender_domain', operator: 'is', value: 'x.example' }]), fields)))
      .toEqual(['In condition 1: `sender_domain` is not a field here. Did you mean Authenticated sender domain?'])
    expect(one(validateQuery(q([
      { kind: 'condition', field: 'severity', operator: 'is', value: 'high' },
      { kind: 'condition', field: 'sender.domain', operator: 'contains', value: 'x' },
    ]), fields))).toEqual(['In condition 2: Authenticated sender domain can\'t use \'contains\'. Use \'is\', \'is one of\' or \'is a subdomain of\'.'])
    expect(one(validateQuery(q([{ kind: 'condition', field: 'severity', operator: 'is', value: ['high'] }]), fields)))
      .toEqual(['In condition 1: Severity \'is\' takes one of its values, as a string.'])
    expect(one(validateQuery(q([{ kind: 'condition', field: 'recipients', operator: 'between', value: { from: 10, to: 1 } }]), fields)))
      .toEqual(['In condition 1: \'between\' needs the lower bound first: 10 is greater than 1.'])
    expect(one(validateQuery(q([]), fields))).toEqual(['In group 1: A group needs at least one item in `items`.'])
    expect(one(validateQuery({ grammar: 1, root: [{ kind: 'condition', field: 'severity', operator: 'is', value: 'high' }] }, fields)))
      .toEqual(['The root of a query is a group: { kind: \'group\', join, items }.'])
    expect(one(validateQuery({ grammar: 2, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'severity', operator: 'is', value: 'high' }] } }, fields)))
      .toEqual(['This query is written for grammar version 2. This version of Vela reads version 1.'])
    expect(one(validateQuery('severity is high', fields))).toEqual(['A query is an object: { grammar: 1, root }.'])
    expect(one(validateQuery(q([{ kind: 'condition', field: '__proto__', operator: 'is', value: 'x' }]), fields))).toEqual(['In condition 1: `__proto__` is not a field here.'])
  })

  it('returns the canonical object from an agent\'s', () => {
    const r = validateQuery({ grammar: 1, root: { kind: 'group', join: 'or', items: [{ kind: 'condition', field: 'sender.domain', operator: 'is-one-of', value: ['Northwind.Example.', 'contoso.example', 'northwind.example'] }] } }, fields)
    expect(r.ok && r.query).toEqual({ grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'sender.domain', operator: 'is-one-of', value: ['contoso.example', 'northwind.example'] }] } })
  })

  it('past a limit, returns a plain error, never a truncated query (Words: Too large)', () => {
    const conditions = (n: number) => Array.from({ length: n }, (_, i) => `recipients is ${i}`).join(' and ')
    expect(parseQuery(conditions(200), fields).ok).toBe(true)
    expect(one(parseQuery(conditions(201), fields))).toEqual(['This query has more than 200 conditions. Split it, or save it as a view.'])
    const items = Array.from({ length: 201 }, (_, i) => ({ kind: 'condition', field: 'recipients', operator: 'is', value: i }))
    expect(one(validateQuery({ grammar: 1, root: { kind: 'group', join: 'and', items } }, fields))).toEqual(['This query has more than 200 conditions. Split it, or save it as a view.'])

    const long = `subject contains "${'a'.repeat(9_990)}"`
    expect(long.length).toBeGreaterThan(10_000)
    expect(errorsOf(parseQuery(long, fields))).toEqual([{ at: 10_000, length: long.length - 10_000, message: 'This query is longer than 10,000 characters. Split it, or save it as a view.' }])
    expect(one(validateQuery({ grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'subject', operator: 'contains', value: 'a'.repeat(10_000) }] } }, fields)))
      .toEqual(['This query is longer than 10,000 characters. Split it, or save it as a view.'])

    const values = (n: number) => `account is-one-of [${Array.from({ length: n }, (_, i) => `"a${i}"`).join(', ')}]`
    expect(parseQuery(values(1_000), fields).ok).toBe(true)
    expect(one(parseQuery(values(1_001), fields))).toEqual(['This list has more than 1,000 values. Split it, or save it as a view.'])
    expect(one(validateQuery({ grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'account', operator: 'is-one-of', value: Array.from({ length: 1_001 }, (_, i) => `a${i}`) }] } }, fields)))
      .toEqual(['In condition 1: This list has more than 1,000 values. Split it, or save it as a view.'])
  })

  it('names the syntax errors in plain words', () => {
    expect(errorsOf(parseQuery('', fields))).toEqual([{ at: 0, length: 0, message: 'Type a condition: a field, an operator and a value.' }])
    expect(one(parseQuery('subject contains "Invoice', fields))).toEqual(['This quote is never closed.'])
    expect(one(parseQuery('(severity is high', fields))).toEqual(['This bracket is never closed.'])
    expect(one(parseQuery('severity is high)', fields))).toEqual(['This bracket closes nothing.'])
    expect(one(parseQuery('severity is high and', fields))).toEqual(['Add a condition after \'and\'.'])
    expect(one(parseQuery('severity', fields))).toEqual(['Add an operator after Severity, like \'is\'.'])
    expect(one(parseQuery('severity is high subject contains "a"', fields))).toEqual(['Join conditions with \'and\' or \'or\'.'])
    expect(one(parseQuery('subject contains "a\\qb"', fields))).toEqual(['`\\q` is not an escape here. Use \\", \\\\ or \\u{…}.'])
    expect(one(parseQuery(`severity${ZWSP} is high`, fields))).toEqual(['There is a hidden character here, ⟨U+200B⟩. Take it out, or write it inside a quoted value as \\u{200B}.'])
  })

  it('every function but the two parsers throws on a query that isn\'t valid', () => {
    const bad = { grammar: 1, root: { kind: 'group', join: 'and', items: [{ kind: 'condition', field: 'severity', operator: 'is', value: 'medium' }] } } as unknown as Query<F>
    expect(() => normalise(bad, fields)).toThrow('normalise: this query isn\'t valid. In condition 1: `medium` is not a value of Severity.')
    expect(() => queryToText(bad, fields)).toThrow(TypeError)
    expect(() => readback(bad, fields)).toThrow(TypeError)
    expect(() => evaluate(bad, {}, fields)).toThrow(TypeError)
    expect(() => leftOutQuery(bad, fields)).toThrow(TypeError)
  })
})

// [[rule: grammar-readback-complete]]
describe('the readback says all of it', () => {
  it('Words: Readback, simple', () => {
    expect(readback(parsed('sender.domain is "northwind.example" and subject contains "Invoice"'), fields))
      .toBe('Authenticated sender domain is "northwind.example" and Subject contains "Invoice"')
  })

  it('Words: Readback, a group, with the anchor from `now` in `timeZone`', () => {
    const q = parsed('severity is-one-of [high, critical] and (first_seen within-last 7d or source.ip in-range 10.0.0.0/8)')
    // The spec's words, exactly, when the locale is one whose short name for India's zone is "IST".
    expect(readback(q, fields, { now: NOW, timeZone: 'Asia/Kolkata', strings: { locale: 'en-IN' } }))
      .toBe('Severity is one of High and Critical, and (First seen is within the last 7 days (to 31 Oct 2026, 19:45 IST) or any Source IP is in 10.0.0.0/8)')
    // The default locale is British English, and en-GB names the zone by its offset (Node 22, ICU 78).
    expect(readback(q, fields, { now: NOW, timeZone: 'Asia/Kolkata' }))
      .toBe('Severity is one of High and Critical, and (First seen is within the last 7 days (to 31 Oct 2026, 19:45 GMT+5:30) or any Source IP is in 10.0.0.0/8)')
  })

  it('a within-last without `now`, or without `timeZone`, is an error', () => {
    const q = parsed('first_seen within-last 7d')
    expect(() => readback(q, fields)).toThrow(/pass `now` and `timeZone`/)
    expect(() => readback(q, fields, { now: NOW })).toThrow(/pass `now` and `timeZone`/)
    expect(() => evaluate(q, { first_seen: '2026-10-30T00:00:00Z' }, fields)).toThrow(/pass `now`/)
  })

  it('Words: Readback, a subdomain, and the Unicode form beside the punycode', () => {
    expect(readback(parsed('sender.domain is-subdomain-of "northwind.example"'), fields))
      .toBe('Authenticated sender domain is northwind.example or one of its subdomains')
    expect(readback(parsed('sender.domain is "bücher.example"'), fields))
      .toBe('Authenticated sender domain is "bücher.example" (xn--bcher-kva.example)')
    expect(readback(parsed('sender.domain is-not-subdomain-of "northwind.example"'), fields))
      .toBe('Authenticated sender domain is neither northwind.example nor one of its subdomains')
  })

  it('Words: Readback, missing', () => {
    expect(readback(parsed('severity is-not-set'), fields)).toBe('Severity is not set')
    expect(readback(parsed('severity is-set'), fields)).toBe('Severity is set')
  })

  it('names every condition by its label, brackets every inner group, and quotes strings', () => {
    expect(readback(parsed('account is "a-1" or (vendor.listed is false and recipients at-least 3)'), fields))
      .toBe('Account is "a-1", or (Payment account on the vendor list is false and Recipients is at least 3)')
  })

  it('between is inclusive and says so', () => {
    expect(readback(parsed('recipients between 1 and 10'), fields)).toBe('Recipients is between 1 and 10, inclusive')
  })

  it('a multi-valued field reads "any …" or "no …"', () => {
    expect(readback(parsed('source.ip in-range 10.0.0.0/8'), fields)).toBe('Any Source IP is in 10.0.0.0/8')
    expect(readback(parsed('tags is-not "test"'), fields)).toBe('No Tag is "test"')
    expect(readback(parsed('severity is high and tags is-not "test"'), fields)).toBe('Severity is High and no Tag is "test"')
  })

  it('the short form lists 5 values, then always ends "and n more"; the full form lists every value', () => {
    const q = parsed('account is-one-of ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"]')
    expect(readback(q, fields)).toBe('Account is one of "a1", "a2", "a3", "a4", "a5" and 3 more')
    expect(readback(q, fields, { full: true })).toBe('Account is one of "a1", "a2", "a3", "a4", "a5", "a6", "a7" and "a8"')
    expect(readback(parsed('account is-one-of ["a1", "a2", "a3", "a4", "a5", "a6"]'), fields)).toBe('Account is one of "a1", "a2", "a3", "a4", "a5" and 1 more')
    expect(readback(parsed('account is-one-of ["a1", "a2", "a3", "a4", "a5"]'), fields)).toBe('Account is one of "a1", "a2", "a3", "a4" and "a5"')
  })

  it('with markTrust, a field that is not a system record carries its writer', () => {
    expect(readback(parsed('subject contains "Invoice"'), fields, { markTrust: true }))
      .toBe('Subject (could have been set by the email\'s sender) contains "Invoice"')
    expect(readback(parsed('severity is high'), fields, { markTrust: true })).toBe('Severity is High')
    expect(readback(parsed('tags is "x"'), fields, { markTrust: true })).toBe('Any Tag (could have been set by the triage agent) is "x"')
  })

  it('never says "or" unless the query does', () => {
    const q = parsed('severity is-one-of [high, critical] and source.ip is-one-of [10.0.0.1, 10.0.0.2]')
    expect(readback(q, fields, { full: true })).not.toMatch(/\bor\b/)
    expect(readback(parsed('severity is high or severity is critical'), fields)).toBe('Severity is High or Severity is Critical')
  })

  it('takes its words from `strings`, so it can be translated; the text form cannot', () => {
    const q = parsed('severity is-one-of [high, critical] and recipients at-least 3')
    expect(readback(q, fields, { strings: { and: 'und', operators: { 'is-one-of': 'ist eines von', 'at-least': 'ist mindestens' } } }))
      .toBe('Severity ist eines von High und Critical, und Recipients ist mindestens 3')
    expect(queryToText(q, fields)).toBe('severity is-one-of [high, critical] and recipients at-least 3')
  })

  it('the full form carries the IPv4-mapped note once', () => {
    const q = parsed('source.ip is ::ffff:10.0.0.5 or source.ip in-range 10.0.0.0/8')
    expect(readback(q, fields, { full: true })).toBe('Any Source IP is 10.0.0.5 or any Source IP is in 10.0.0.0/8; IPv4-mapped addresses are matched as IPv4')
    expect(readback(q, fields)).toBe('Any Source IP is 10.0.0.5 or any Source IP is in 10.0.0.0/8')
  })

  it('reads an absolute time in `timeZone`, or in UTC without one', () => {
    const q = parsed('first_seen before "2026-10-31T19:45:00+05:30"')
    expect(readback(q, fields)).toBe('First seen is before 31 Oct 2026, 14:15 UTC')
    expect(readback(q, fields, { timeZone: 'Asia/Kolkata', strings: { locale: 'en-IN' } })).toBe('First seen is before 31 Oct 2026, 19:45 IST')
  })
})

// [[rule: grammar-hidden-characters-visible]]
describe('hidden characters are made visible', () => {
  const evaded = `Inv${ZWSP}oice`

  it('Words: Readback, hidden characters — on an untrusted field, matching ignores them', () => {
    const q = parsed('subject contains "Invoice"')
    expect(evaluate(q, { subject: evaded }, fields)).toBe('match')
    expect(evaluate(q, { subject: `Pay this ${RLO}eciovnI` }, fields)).toBe('no-match')
    expect(readback(q, fields, { full: true })).toBe('Subject contains "Invoice", ignoring hidden characters')
  })

  it('on every other field, matching is exact', () => {
    expect(evaluate(parsed('account is "admin"'), { account: `ad${ZWSP}min` }, fields)).toBe('no-match')
    expect(evaluate(parsed('tags contains "invoice"'), { tags: [evaded] }, fields)).toBe('no-match')
    expect(evaluate(parsed('sender.domain is "northwind.example"'), { 'sender.domain': `north${ZWSP}wind.example` }, fields)).toBe('unknown')
  })

  it('keeps the value exactly, and writes it as an escape in the text form and the readback', () => {
    const q = parsed(`subject contains "${evaded}"`)
    expect((q.root.items[0] as { value: string }).value).toBe(evaded)
    expect(queryToText(q, fields)).toBe('subject contains "Inv\\u{200B}oice"')
    expect(parsed('subject contains "Inv\\u{200B}oice"')).toEqual(q)
    expect(readback(q, fields)).toBe('Subject contains "Inv⟨U+200B⟩oice"')
    expect(readback(parsed(`tags is "${RLO}gat"`), fields)).toBe('Any Tag is "⟨U+202E⟩gat"')
  })

  it('every character of the Evidence Locker\'s sets is escaped, and a host name may hold none', () => {
    for (const [a, b] of HIDDEN_RANGES) for (let cp = a; cp <= b; cp++) {
      const c = String.fromCodePoint(cp)
      const q = parsed(`subject is "a${c}b"`)
      expect(queryToText(q, fields)).toBe(`subject is "a\\u{${cp.toString(16).toUpperCase()}}b"`)
      expect(evaluate(q, { subject: 'ab' }, fields)).toBe('match')
      expect(one(parseQuery(`sender.domain is "a${c}b.example"`, fields))[0]).toMatch(/has a hidden character, which a host name can't contain/)
    }
    expect(HIDDEN_RANGES.reduce((n, [a, b]) => n + b - a + 1, 0)).toBe(14)
  })

  it('compares text with NFC and simple case folding, as far as fold.ts claims', () => {
    for (const [a, b] of FOLDS) expect(fold(String.fromCodePoint(a))).toBe(fold(String.fromCodePoint(b)))
    expect(fold('ΟΔΟΣ')).toBe(fold('οδος'))
    expect(fold('Straße')).not.toBe(fold('STRASSE'))
    expect(fold('é')).toBe(fold('é'))
    expect(evaluate(parsed('subject is "ΟΔΟΣ"'), { subject: 'οδοσ' }, fields)).toBe('match')
    expect(evaluate(parsed('subject contains "invoice"'), { subject: 'INVOICE #4' }, fields)).toBe('match')
    expect(evaluate(parsed('account is "Admin"'), { account: 'admin' }, fields)).toBe('no-match')
  })
})

// [[rule: grammar-domain-boundary]]
describe('domains match on label boundaries', () => {
  it('is-subdomain-of matches the apex and its subdomains, never evilnorthwind.example', () => {
    const q = parsed('sender.domain is-subdomain-of "northwind.example"')
    expect(evaluate(q, { 'sender.domain': 'northwind.example' }, fields)).toBe('match')
    expect(evaluate(q, { 'sender.domain': 'mail.northwind.example' }, fields)).toBe('match')
    expect(evaluate(q, { 'sender.domain': 'evilnorthwind.example' }, fields)).toBe('no-match')
    expect(evaluate(q, { 'sender.domain': 'northwind.example.evil.example' }, fields)).toBe('no-match')
  })

  it('normalises to lower case, punycode and no trailing dot', () => {
    expect(parsed('sender.domain is "Northwind.Example."')).toEqual(parsed('sender.domain is "northwind.example"'))
    expect(queryToText(parsed('sender.domain is "Bücher.example"'), fields)).toBe('sender.domain is "xn--bcher-kva.example"')
    expect(evaluate(parsed('sender.domain is "northwind.example"'), { 'sender.domain': 'NORTHWIND.example.' }, fields)).toBe('match')
    expect(punycodeDecode('bcher-kva')).toBe('bücher')
    expect(punycodeDecode('nrthwind-invoices-zco')).toBe(`n${String.fromCodePoint(0x043e)}rthwind-invoices`)
  })

  it('an empty label, or a label over 63 octets, is an error', () => {
    expect(one(parseQuery('sender.domain is "northwind..example"', fields))).toEqual(['`northwind..example` has an empty label.'])
    expect(one(parseQuery('sender.domain is "northwind.example.."', fields))).toEqual(['`northwind.example..` has an empty label.'])
    expect(one(parseQuery('sender.domain is "."', fields))).toEqual(['`.` has an empty label.'])
    const label = 'a'.repeat(64)
    expect(one(parseQuery(`sender.domain is "${label}.example"`, fields))[0]).toMatch(/has a label longer than 63 characters\.$/)
    expect(parseQuery(`sender.domain is "${'a'.repeat(63)}.example"`, fields).ok).toBe(true)
    // 63 octets in its punycode form: 59 characters with one 'ü' are 66 octets as xn--….
    expect(one(parseQuery(`sender.domain is "${'a'.repeat(58)}ü.example"`, fields))[0]).toMatch(/longer than 63 characters/)
    expect(one(parseQuery('sender.domain is "10.0.0.1"', fields))).toEqual(['`10.0.0.1` is an IP address, not a host name.'])
    expect(one(parseQuery('sender.domain is "north wind.example"', fields))).toEqual(['`north wind.example` is not a host name.'])
  })

  it('IPv4-mapped IPv6 is normalised to IPv4 before matching, so ::ffff:10.0.0.5 is in 10.0.0.0/8', () => {
    const q = parsed('source.ip in-range 10.0.0.0/8')
    expect(evaluate(q, { 'source.ip': ['::ffff:10.0.0.5'] }, fields)).toBe('match')
    expect(evaluate(q, { 'source.ip': ['::ffff:a00:5'] }, fields)).toBe('match')
    expect(evaluate(q, { 'source.ip': ['11.0.0.1', '2001:db8::1'] }, fields)).toBe('no-match')
    expect(queryToText(parsed('source.ip is ::ffff:10.0.0.5'), fields)).toBe('source.ip is 10.0.0.5')
    expect(queryToText(parsed('source.ip in-range ::ffff:10.0.0.0/104'), fields)).toBe('source.ip in-range 10.0.0.0/8')
    expect(queryToText(parsed('source.ip is-one-of [2001:DB8:0:0:0:0:0:1, 10.0.0.2, 10.0.0.10]'), fields)).toBe('source.ip is-one-of [10.0.0.2, 10.0.0.10, 2001:db8::1]')
  })
})

// [[rule: grammar-ranges-valid]]
describe('ranges are real ranges', () => {
  it('10.0.0.5/8 is an error that names 10.0.0.0/8', () => {
    expect(errorsOf(parseQuery('source.ip in-range 10.0.0.5/8', fields))).toEqual([{ at: 19, length: 10, message: '`10.0.0.5/8` is not a network address. Did you mean 10.0.0.0/8?' }])
    expect(one(parseQuery('source.ip in-range 2001:db8::1/32', fields))).toEqual(['`2001:db8::1/32` is not a network address. Did you mean 2001:db8::/32?'])
    expect(one(parseQuery('source.ip in-range 10.0.0.5', fields))[0]).toMatch(/is not a range/)
    expect(evaluate(parsed('source.ip in-range 2001:db8::/32'), { 'source.ip': ['2001:db8:ffff::1'] }, fields)).toBe('match')
  })

  it('between needs its lower bound first, and both bounds are inclusive', () => {
    expect(one(parseQuery('recipients between 10 and 1', fields))).toEqual(['\'between\' needs the lower bound first: 10 is greater than 1.'])
    expect(one(parseQuery('first_seen between "2026-10-31T00:00:00Z" and "2026-10-30T00:00:00Z"', fields)))
      .toEqual(['\'between\' needs the lower bound first: 2026-10-31T00:00:00Z is after 2026-10-30T00:00:00Z.'])
    const q = parsed('recipients between 1 and 10')
    expect([0, 1, 5, 10, 11].map((n) => evaluate(q, { recipients: n }, fields))).toEqual(['no-match', 'match', 'match', 'match', 'no-match'])
    expect(parseQuery('recipients between 3 and 3', fields).ok).toBe(true)
    expect(readback(q, fields)).toMatch(/between 1 and 10, inclusive$/)
  })
})

// [[rule: grammar-missing-is-unknown]]
describe('missing is not a match', () => {
  it('a condition on a field the record lacks is unknown, positive or negated', () => {
    expect(evaluate(parsed('severity is high'), {}, fields)).toBe('unknown')
    expect(evaluate(parsed('severity is-not high'), {}, fields)).toBe('unknown')
    expect(evaluate(parsed('severity is-not high'), { severity: null }, fields)).toBe('unknown')
    expect(evaluate(parsed('severity is-not high'), { severity: 'critical' }, fields)).toBe('match')
    expect(evaluate(parsed('tags is-not "test"'), { tags: [] }, fields)).toBe('unknown')
    expect(evaluate(parsed('tags is-not "test"'), { tags: ['a', 'test'] }, fields)).toBe('no-match')
    expect(evaluate(parsed('tags is "test"'), { tags: ['a', 'test'] }, fields)).toBe('match')
    expect(evaluate(parsed('recipients less-than 3'), { recipients: '2' }, fields)).toBe('unknown')
  })

  it('and is unknown unless another item is no-match; or is unknown unless another item is a match', () => {
    const and = parsed('severity is high and recipients at-least 3')
    expect(evaluate(and, { recipients: 5 }, fields)).toBe('unknown')
    expect(evaluate(and, { recipients: 1 }, fields)).toBe('no-match')
    const or = parsed('severity is high or recipients at-least 3')
    expect(evaluate(or, { recipients: 5 }, fields)).toBe('match')
    expect(evaluate(or, { recipients: 1 }, fields)).toBe('unknown')
  })

  it('is-set and is-not-set ask for missing values on purpose, and are never unknown', () => {
    expect(evaluate(parsed('severity is-not-set'), {}, fields)).toBe('match')
    expect(evaluate(parsed('severity is-set'), {}, fields)).toBe('no-match')
    expect(evaluate(parsed('tags is-not-set'), { tags: [] }, fields)).toBe('match')
  })

  it('leftOutQuery matches exactly the unknown records', () => {
    const q = parsed('severity is-not high')
    const left = leftOutQuery(q, fields)
    expect(queryToText(left, fields)).toBe('severity is-not-set')
    for (const r of [{}, { severity: 'high' }, { severity: 'critical' }]) expect(evaluate(left, r, fields) === 'match').toBe(evaluate(q, r, fields) === 'unknown')
    // A query that can't be unknown leaves nothing out.
    const never = leftOutQuery(parsed('severity is-set'), fields)
    for (const r of [{}, { severity: 'high' }]) expect(evaluate(never, r, fields)).toBe('no-match')
  })

  it('leftOutQuery needs `now` for a within-last inside an or, and refuses what the grammar can\'t say', () => {
    const q = parsed('first_seen within-last 7d or severity is high')
    expect(() => leftOutQuery(q, fields)).toThrow(/pass `now`/)
    expect(leftOutQuery(q, fields, { now: NOW })).toBeTruthy()
    const many = defineFields({ size: { label: 'Size', type: 'number', many: true, trust: { kind: 'system-record', source: 'S' } }, x: { label: 'X', type: 'boolean', trust: { kind: 'system-record', source: 'S' } } })
    const r = parseQuery('size at-least 3 or x is true', many)
    expect(r.ok && (() => leftOutQuery(r.query, many))).toThrow(/Size has several values/)
    const fine = parseQuery('size at-least 3 and x is true', many)
    expect(fine.ok && leftOutQuery(fine.query, many)).toBeTruthy()
  })
})
