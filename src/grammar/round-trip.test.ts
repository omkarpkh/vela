import { describe, expect, it } from 'vitest'
import { defineFields, evaluate, leftOutQuery, normalise, parseQuery, queryToText, validateQuery } from '..'
import type { FieldRecord, FieldSpec, Query } from '..'

// A small seeded generator, written here so CI is reproducible and the grammar gains no dependency.
// mulberry32: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c (public domain).
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED = 20261101

// Every one of the 8 types, each with and without `many: true`, and all three kinds of trust.
const sys = (source: string) => ({ kind: 'system-record' as const, source })
const fields = defineFields({
  't': { label: 'Subject', type: 'text', trust: { kind: 'untrusted', writtenBy: 'the sender' } },
  'tm': { label: 'Tag', type: 'text', many: true, trust: { kind: 'agent-output', writtenBy: 'the agent' } },
  'id': { label: 'Account', type: 'identifier', trust: sys('IdP') },
  'idm': { label: 'Hash', type: 'identifier', many: true, trust: { kind: 'untrusted', writtenBy: 'the file' } },
  'd': { label: 'Sender domain', type: 'domain', trust: sys('Gateway') },
  'dm': { label: 'Link domain', type: 'domain', many: true, trust: { kind: 'untrusted', writtenBy: 'the sender' } },
  'ip': { label: 'Source IP', type: 'ip', trust: sys('Firewall') },
  'ipm': { label: 'Host IP', type: 'ip', many: true, trust: sys('CMDB') },
  'n': { label: 'Size', type: 'number', unit: 'MB', trust: sys('Gateway') },
  'nm': { label: 'Port', type: 'number', many: true, trust: sys('Firewall') },
  'tt': { label: 'First seen', type: 'time', trust: sys('Sensor clock') },
  'ttm': { label: 'Sign-in time', type: 'time', many: true, trust: sys('IdP') },
  'e': { label: 'Severity', type: 'enum', values: [{ value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }, { value: 'Very low', label: 'Very low' }, { value: 'and', label: 'And' }], trust: sys('Pipeline') },
  'em': { label: 'Category', type: 'enum', many: true, values: [{ value: 'phish', label: 'Phishing' }, { value: 'bec', label: 'BEC' }, { value: 'x_y-1', label: 'X' }], trust: sys('Pipeline') },
  'b': { label: 'Listed', type: 'boolean', trust: sys('Vendor master') },
  'bm': { label: 'Flag', type: 'boolean', many: true, trust: sys('Detectors') },
})
type F = typeof fields
type Key = keyof F & string
const KEYS = Object.keys(fields) as Key[]

const NOW = new Date('2026-10-31T14:15:00Z')

const OPS: Record<string, string[]> = {
  text: ['is', 'is-not', 'is-one-of', 'is-none-of', 'contains', 'does-not-contain', 'starts-with', 'does-not-start-with', 'ends-with', 'does-not-end-with', 'is-set', 'is-not-set'],
  identifier: ['is', 'is-not', 'is-one-of', 'is-none-of', 'starts-with', 'does-not-start-with', 'is-set', 'is-not-set'],
  domain: ['is', 'is-not', 'is-one-of', 'is-none-of', 'is-subdomain-of', 'is-not-subdomain-of', 'is-set', 'is-not-set'],
  ip: ['is', 'is-not', 'is-one-of', 'is-none-of', 'in-range', 'not-in-range', 'is-set', 'is-not-set'],
  number: ['is', 'is-not', 'greater-than', 'at-least', 'less-than', 'at-most', 'between', 'is-set', 'is-not-set'],
  time: ['before', 'after', 'between', 'within-last', 'is-set', 'is-not-set'],
  enum: ['is', 'is-not', 'is-one-of', 'is-none-of', 'is-set', 'is-not-set'],
  boolean: ['is', 'is-set', 'is-not-set'],
}

/** Values drawn wide (for the round trip) or from a small pool (so records and queries meet). */
function makeGen(rand: () => number, small: boolean) {
  const int = (n: number) => Math.floor(rand() * n)
  const pick = <T,>(xs: readonly T[]): T => xs[int(xs.length)]
  const ch = (cp: number) => String.fromCodePoint(cp)
  const CHARS = ['a', 'b', 'I', 'n', 'v', 'o', 'i', 'c', 'e', ' ', '"', '\\', 'é', 'Σ', 'ς', 'ß', '-', '.', '[', ')', ',',
    ch(0x200b), ch(0x202e), ch(0x2066), ch(0xfeff), ch(0x1f600), ch(0x0a), ch(0x09), ch(0x2028), ch(0x07)]
  const str = () => small ? pick(['inv', 'Invoice', `In${ch(0x200b)}v`, 'x', '']) : Array.from({ length: int(9) }, () => (rand() < 0.03 ? ch(0xd800 + int(0x800)) : pick(CHARS))).join('')
  const label = () => small ? pick(['northwind', 'mail', 'evilnorthwind']) : Array.from({ length: 1 + int(8) }, () => pick([...'abcz09-', 'ü', 'Ü', 'B'])).join('').replace(/^-+|-+$/g, '') || 'a'
  const domain = () => small ? pick(['northwind.example', 'mail.northwind.example', 'evilnorthwind.example', 'contoso.example'])
    : `${Array.from({ length: 1 + int(2) }, label).join('.')}.example${rand() < 0.2 ? '.' : ''}`
  const v4 = () => (small ? [10, 0, 0, int(3)] : [int(256), int(256), int(256), int(256)]).join('.')
  const v6 = () => Array.from({ length: 8 }, () => (rand() < 0.4 ? '0' : int(0x10000).toString(16))).join(':')
  const ip = () => small ? pick(['10.0.0.1', '10.0.0.2', '::ffff:10.0.0.1', '2001:db8::1', '192.168.1.1']) : rand() < 0.5 ? v4() : rand() < 0.3 ? `::ffff:${v4()}` : v6()
  const cidr = () => {
    if (small) return pick(['10.0.0.0/8', '10.0.0.0/30', '2001:db8::/32', '::ffff:10.0.0.0/104', '0.0.0.0/0'])
    const prefix = int(33)
    const addr = [int(256), int(256), int(256), int(256)]
    const bits = addr.map((b, i) => b & ((0xff << (8 - Math.max(0, Math.min(8, prefix - 8 * i)))) & 0xff))
    return `${bits.join('.')}/${prefix}`
  }
  const num = () => small ? pick([-1, 0, 1, 2, 3, 5, 10]) : pick([() => int(1000) - 500, () => Number((rand() * 100).toFixed(int(4))), () => 1e-7, () => 1.5e21, () => -0])()
  const time = () => {
    const ms = small ? NOW.getTime() - int(14) * 86_400_000 + int(3) * 86_400_000 : Date.UTC(2020, 0, 1) + int(400_000_000) * 1000
    const off = small ? 0 : pick([0, 330, -300, 60])
    const d = new Date(ms + off * 60_000)
    const pad = (n: number, w = 2) => String(n).padStart(w, '0')
    const zone = off === 0 && rand() < 0.5 ? 'Z' : `${off < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${rand() < 0.2 ? `.${pad(d.getUTCMilliseconds(), 3)}` : ''}${zone}`
  }
  const duration = () => `${small ? pick([1, 7]) : int(100)}${pick(['m', 'h', 'd', 'w'])}`
  const element = (key: Key, op: string): unknown => {
    const spec = fields[key]
    switch (spec.type) {
      case 'text': case 'identifier': return str()
      case 'domain': return domain()
      case 'ip': return op === 'in-range' || op === 'not-in-range' ? cidr() : ip()
      case 'number': return num()
      case 'time': return op === 'within-last' ? duration() : time()
      case 'enum': return pick(spec.values as readonly { value: string }[]).value
      case 'boolean': return rand() < 0.5
    }
  }
  const condition = (): Record<string, unknown> => {
    const field = pick(KEYS)
    const operator = pick(OPS[fields[field].type])
    const c: Record<string, unknown> = { kind: 'condition', field, operator }
    if (operator === 'is-set' || operator === 'is-not-set') return c
    if (operator === 'is-one-of' || operator === 'is-none-of') c.value = Array.from({ length: 1 + int(7) }, () => element(field, operator))
    else if (operator === 'between') {
      const [a, b] = [element(field, operator), element(field, operator)]
      const key = (x: unknown) => (typeof x === 'number' ? x : Date.parse(x as string))
      c.value = key(a) <= key(b) ? { from: a, to: b } : { from: b, to: a }
    } else c.value = element(field, operator)
    return c
  }
  const group = (depth: number): Record<string, unknown> => ({
    kind: 'group', join: rand() < 0.5 ? 'and' : 'or',
    items: Array.from({ length: 1 + int(4) }, () => (depth < 3 && rand() < 0.25 ? group(depth + 1) : condition())),
  })
  const query = (): unknown => ({ grammar: 1, root: group(1) })
  const record = (): FieldRecord => {
    const r: Record<string, unknown> = {}
    for (const key of KEYS) {
      const spec: FieldSpec = fields[key]
      const roll = rand()
      if (roll < 0.2) continue // missing
      if (roll < 0.27) { r[key] = null; continue }
      if (roll < 0.32) { r[key] = spec.type === 'number' ? 'not a number' : 42; continue } // of another type
      const one = () => (spec.type === 'time' && rand() < 0.3 ? new Date(Date.parse(time())) : element(key, spec.type === 'ip' ? 'is' : 'is'))
      r[key] = spec.many ? Array.from({ length: int(4) }, one) : one()
    }
    return r
  }
  return { query, record }
}

function withSeed<T>(seed: number, i: number, detail: () => string, fn: () => T): T {
  try { return fn() } catch (e) {
    throw new Error(`seed ${seed}, case ${i}: ${(e as Error).message}\n  ${detail()}`)
  }
}

// [[rule: grammar-round-trips]]
describe('it round-trips, from one canonical form (a seeded property test)', () => {
  it(`normalise is idempotent, and the text and URL forms give back normalise(q), for 400 queries (seed ${SEED})`, () => {
    const gen = makeGen(mulberry32(SEED), false)
    for (let i = 0; i < 400; i++) {
      const raw = gen.query()
      withSeed(SEED, i, () => JSON.stringify(raw), () => {
        const v = validateQuery(raw, fields)
        if (!v.ok) throw new Error(`the generator made a query validateQuery rejects: ${v.errors.map((e) => e.message).join(' | ')}`)
        const q = raw as Query<F>
        const n = normalise(q, fields)
        expect(n).toEqual(v.query)
        expect(normalise(n, fields)).toEqual(n)
        // A fresh, unfrozen copy goes through the full check, not the cache.
        expect(normalise(JSON.parse(JSON.stringify(n)), fields)).toEqual(n)
        const text = queryToText(n, fields)
        const back = parseQuery(text, fields)
        if (!back.ok) throw new Error(`its text does not parse: ${text}\n  ${back.errors.map((e) => `${e.at}: ${e.message}`).join(' | ')}`)
        expect(back.query).toEqual(n)
        // The URL form: the text, percent-encoded, in one parameter.
        const link = `https://console.example/alerts?${new URLSearchParams({ q: text })}`
        const fromLink = parseQuery(new URL(link).searchParams.get('q')!, fields)
        expect(fromLink.ok && fromLink.query).toEqual(n)
        const encoded = parseQuery(decodeURIComponent(`q=${encodeURIComponent(text)}`.slice(2)), fields)
        expect(encoded.ok && encoded.query).toEqual(n)
      })
    }
  })
})

// [[rule: grammar-missing-is-unknown]] — leftOutQuery, by brute force over generated records.
describe('leftOutQuery gives exactly the unknown set', () => {
  it(`matches a record exactly when the query is unknown for it, over 300 queries × 40 records (seed ${SEED + 1})`, () => {
    const rand = mulberry32(SEED + 1)
    const gen = makeGen(rand, true)
    let checked = 0, unknowns = 0, refused = 0
    for (let i = 0; i < 300; i++) {
      const raw = gen.query()
      const v = validateQuery(raw, fields)
      if (!v.ok) throw new Error(`seed ${SEED + 1}, case ${i}: the generator made an invalid query`)
      const q = v.query
      let left: Query<F>
      try { left = leftOutQuery(q, fields, { now: NOW }) } catch (e) {
        // The two cases the grammar has no negation for, inside an 'or'.
        expect((e as Error).message, `seed ${SEED + 1}, case ${i}`).toMatch(/has several values/)
        refused++
        continue
      }
      for (let j = 0; j < 40; j++) {
        const r = gen.record()
        withSeed(SEED + 1, i, () => `${queryToText(q, fields)}\n  left out: ${queryToText(left, fields)}\n  record: ${JSON.stringify(r)}`, () => {
          const result = evaluate(q, r, fields, { now: NOW })
          if (result === 'unknown') unknowns++
          expect(evaluate(left, r, fields, { now: NOW }) === 'match').toBe(result === 'unknown')
        })
        checked++
      }
    }
    // The run means something only if it met many unknowns, and refused only the rare cases.
    expect(checked).toBeGreaterThan(8_000)
    expect(unknowns).toBeGreaterThan(1_000)
    expect(refused).toBeLessThan(100)
  })
})
