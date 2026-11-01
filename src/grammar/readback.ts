/**
 * `readback`: the sentence people and screen readers get (filter-grammar.md,
 * `grammar-readback-complete`). Every condition by its field's label, each group's own join word,
 * brackets around every inner group, string values quoted, and never "or" unless the query says it.
 *
 * The short form, for chips and summaries, lists up to 5 values of a list and then "and n more".
 * The full form (`full: true`), for the ledger and every `aria-describedby`, lists every value, and
 * also carries the two notes about how values are matched: "ignoring hidden characters" after a
 * condition on an `untrusted` text, identifier or domain field, and, once, "IPv4-mapped addresses are
 * matched as IPv4" when the query has a condition on an `ip` field.
 *
 * A comma comes before a group's join when one of its items has its own "and" or comma: an inner
 * group, a list of two or more values, a `between`, or a note.
 */
import { canonical, hasWithinLast } from './check'
import { unicodeDomain } from './domain'
import { shown } from './hidden'
import { isNegated, NEGATES, OPERATOR_WORDS, shapeOf } from './operators'
import { decimal } from './text'
import { normaliseDuration, parseTime } from './time'
import type { Condition, Fields, Group, Operator, Query, ReadbackOptions, ReadbackStrings } from './types'
import { isStringField } from './values'

const plural = (one: string, many: string) => (n: number) => (n === 1 ? one : many)

/** The English defaults. */
export const ENGLISH: ReadbackStrings = {
  operators: OPERATOR_WORDS,
  and: 'and',
  or: 'or',
  any: 'any',
  no: 'no',
  more: (n) => `${n} more`,
  subdomainOf: (d) => `is ${d} or one of its subdomains`,
  notSubdomainOf: (d) => `is neither ${d} nor one of its subdomains`,
  between: (from, to) => `is between ${from} and ${to}, inclusive`,
  withinLast: (duration, anchor) => `is within the last ${duration} (to ${anchor})`,
  units: { m: plural('minute', 'minutes'), h: plural('hour', 'hours'), d: plural('day', 'days'), w: plural('week', 'weeks') },
  booleans: { true: 'true', false: 'false' },
  couldHaveBeenSetBy: (writer) => `(could have been set by ${writer})`,
  ignoringHiddenCharacters: 'ignoring hidden characters',
  ipv4Mapped: 'IPv4-mapped addresses are matched as IPv4',
}

export const SHORT_LIST = 5

/** The default `locale`: British English, Vela's language. */
export const DEFAULT_LOCALE = 'en-GB'

type Ctx = { fields: Fields; s: ReadbackStrings; locale: string; full: boolean; markTrust: boolean; timeZone: string; now?: Date }

function time(ctx: Ctx, ms: number): string {
  return new Intl.DateTimeFormat(ctx.locale, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    timeZone: ctx.timeZone, timeZoneName: 'short',
  }).format(ms)
}

/** A domain as people read it: the Unicode form, and the punycode beside it when the two differ. */
function domain(ascii: string, quoted: boolean): string {
  const unicode = unicodeDomain(ascii)
  const main = quoted ? `"${shown(unicode ?? ascii)}"` : shown(unicode ?? ascii)
  return unicode ? `${main} (${ascii})` : main
}

function element(ctx: Ctx, c: Condition, v: unknown): string {
  const spec = ctx.fields[c.field]
  switch (spec.type) {
    case 'text': case 'identifier': return `"${shown(v as string)}"`
    case 'domain': return domain(v as string, true)
    case 'ip': return v as string
    case 'number': return spec.unit ? `${decimal(v as number)} ${spec.unit}` : decimal(v as number)
    case 'time': return time(ctx, parseTime(v as string)!)
    case 'enum': return spec.values.find((x) => x.value === v)!.label
    case 'boolean': return ctx.s.booleans[String(v) as 'true' | 'false']
  }
}

function list(ctx: Ctx, items: string[]): string {
  const { s } = ctx
  if (!ctx.full && items.length > SHORT_LIST) return `${items.slice(0, SHORT_LIST).join(', ')} ${s.and} ${s.more(items.length - SHORT_LIST)}`
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} ${s.and} ${items[items.length - 1]}`
}

const notes = (ctx: Ctx, c: Condition) => {
  const spec = ctx.fields[c.field]
  return ctx.full && spec.trust.kind === 'untrusted' && isStringField(spec) && shapeOf(c.operator) !== 'none'
}

/** Whether a condition's own words carry an "and" or a comma. */
const compound = (ctx: Ctx, c: Condition) => {
  const v = (c as { value?: unknown }).value
  return notes(ctx, c) || c.operator === 'between' || (Array.isArray(v) && v.length > 1)
}

function condition(ctx: Ctx, c: Condition): string {
  const { s } = ctx
  const spec = ctx.fields[c.field]
  const label = ctx.markTrust && spec.trust.kind !== 'system-record' ? `${spec.label} ${s.couldHaveBeenSetBy(spec.trust.writtenBy)}` : spec.label
  // A multi-valued field reads "any …" or "no …", with the positive operator's words after "no".
  const negated = isNegated(c.operator) || c.operator === 'is-not-set'
  const op: Operator = !spec.many ? c.operator : c.operator === 'is-not-set' ? 'is-set' : isNegated(c.operator) ? NEGATES[c.operator] : c.operator
  const subject = spec.many ? `${negated ? s.no : s.any} ${label}` : label
  const v = (c as { value?: unknown }).value
  let words: string
  switch (op) {
    case 'is-set': case 'is-not-set': words = s.operators[op]; break
    case 'is-subdomain-of': words = s.subdomainOf(domain(v as string, false)); break
    case 'is-not-subdomain-of': words = s.notSubdomainOf(domain(v as string, false)); break
    case 'between': {
      const r = v as { from: unknown; to: unknown }
      words = s.between(element(ctx, c, r.from), element(ctx, c, r.to))
      break
    }
    case 'within-last': {
      const d = normaliseDuration(v as string)
      if (!d.ok) throw new TypeError(d.message)
      words = s.withinLast(`${d.amount} ${s.units[d.unit](d.amount)}`, time(ctx, ctx.now!.getTime()))
      break
    }
    default:
      words = `${s.operators[op]} ${Array.isArray(v) ? list(ctx, v.map((x) => element(ctx, c, x))) : element(ctx, c, v)}`
  }
  return `${subject} ${words}${notes(ctx, c) ? `, ${s.ignoringHiddenCharacters}` : ''}`
}

function group(ctx: Ctx, g: Group): string {
  const parts = g.items.map((n) => (n.kind === 'group' ? `(${group(ctx, n)})` : condition(ctx, n)))
  const comma = g.items.some((n) => n.kind === 'group' || compound(ctx, n))
  return parts.join(comma ? `, ${ctx.s[g.join]} ` : ` ${ctx.s[g.join]} `)
}

const hasIp = (fields: Fields, g: Group): boolean =>
  g.items.some((n) => (n.kind === 'group' ? hasIp(fields, n) : fields[n.field].type === 'ip' && shapeOf(n.operator) !== 'none'))

type StringsInput = ReadbackOptions['strings']

function merge(input: StringsInput): ReadbackStrings {
  if (!input) return ENGLISH
  return {
    ...ENGLISH, ...input,
    operators: { ...ENGLISH.operators, ...input.operators },
    units: { ...ENGLISH.units, ...input.units },
    booleans: { ...ENGLISH.booleans, ...input.booleans },
  }
}

/**
 * The readback sentence. `now` and `timeZone` are required when the query has a `within-last`.
 * `locale` (BCP 47, default "en-GB") is the one `Intl.DateTimeFormat` writes times in, and the one a
 * capital letter is made in. It is an option, not one of the `strings`: the words are what a host
 * translates, and the locale is how dates and capitals are written.
 */
export function readback<F extends Fields>(query: NoInfer<Query<F>>, fields: F, options: ReadbackOptions = {}): string {
  const q = canonical(query as Query<F>, fields, 'readback') as unknown as Query
  if (hasWithinLast(q.root) && (!(options.now instanceof Date) || Number.isNaN(options.now.getTime()) || !options.timeZone))
    throw new TypeError('readback: this query has \'within-last\', so pass `now` and `timeZone`. The sentence then says what it was read against, and a ledger line can be reproduced.')
  const ctx: Ctx = { fields, s: merge(options.strings), locale: options.locale ?? DEFAULT_LOCALE, full: !!options.full, markTrust: !!options.markTrust, timeZone: options.timeZone ?? 'UTC', now: options.now }
  let sentence = group(ctx, q.root)
  if (ctx.full && hasIp(fields, q.root)) sentence += `; ${ctx.s.ipv4Mapped}`
  // A sentence that starts on a multi-valued field starts with "any" or "no": give it its capital.
  for (const w of [ctx.s.any, ctx.s.no]) if (w && sentence.startsWith(`${w} `)) sentence = w.charAt(0).toLocaleUpperCase(ctx.locale) + sentence.slice(1)
  return sentence
}
