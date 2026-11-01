/**
 * `parseQuery`: the typed line, or the `q=` of a link, into the canonical object
 * (filter-grammar.md, The text form and Lexical rules). It never guesses: an unknown field,
 * operator or value is an error with its position, and a suggestion is only ever words.
 *
 * Positions are offsets in UTF-16 code units, as a text field's selection counts them.
 */
import { canonical, seal, tooLongAsText, unknownField, wrongOperator } from './check'
import { specOf } from './fields'
import { codePoints, isEscaped } from './hidden'
import { OPERATOR_WORDS, shapeOf, takes } from './operators'
import { BARE_ENUM, textOf } from './text'
import type { Condition, FieldSpec, Fields, Group, Node, Operator, ParseError, ParseResult, Query } from './types'
import { checkElement, finishList, finishRange, LIMITS, MESSAGES } from './values'

type Token =
  | { t: '(' | ')' | '[' | ']' | ','; at: number; length: number }
  | { t: 'word'; at: number; length: number; text: string }
  | { t: 'string'; at: number; length: number; value: string }
  | { t: 'end'; at: number; length: 0 }

/** A syntax error: the parse cannot go on past it. */
class Stop { constructor(readonly error: ParseError) {} }

const WS = /[ \t\n\r]/
const PUNCT = '()[],'
const hex = (cp: number) => cp.toString(16).toUpperCase().padStart(4, '0')

function lex(text: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (WS.test(c)) { i++; continue }
    if (PUNCT.includes(c)) { out.push({ t: c as '(', at: i, length: 1 }); i++; continue }
    if (c === '"') {
      const start = i++
      let value = ''
      for (;;) {
        if (i >= text.length) throw new Stop({ at: start, length: 1, message: 'This quote is never closed.' })
        const d = text[i]
        if (d === '"') { i++; break }
        if (d !== '\\') { value += d; i++; continue }
        const e = text[i + 1]
        if (e === '"' || e === '\\') { value += e; i += 2; continue }
        if (e === 'u' && text[i + 2] === '{') {
          const close = text.indexOf('}', i + 3)
          const digits = close < 0 ? '' : text.slice(i + 3, close)
          const cp = /^[0-9A-Fa-f]{1,6}$/.test(digits) ? parseInt(digits, 16) : NaN
          if (!(cp <= 0x10ffff)) throw new Stop({ at: i, length: close < 0 ? 2 : close - i + 1, message: `\`${text.slice(i, close < 0 ? i + 3 : close + 1)}\` is not a character. Write \\u{…} with 1 to 6 hex digits.` })
          value += String.fromCodePoint(cp)
          i = close + 1
          continue
        }
        throw new Stop({ at: i, length: e === undefined ? 1 : 2, message: `\`\\${e ?? ''}\` is not an escape here. Use \\", \\\\ or \\u{…}.` })
      }
      out.push({ t: 'string', at: start, length: i - start, value })
      continue
    }
    const start = i
    while (i < text.length && !WS.test(text[i]) && !PUNCT.includes(text[i]) && text[i] !== '"') {
      const cp = text.codePointAt(i)!
      if (isEscaped(cp)) throw new Stop({ at: i, length: cp > 0xffff ? 2 : 1, message: `There is a hidden character here, ⟨U+${hex(cp)}⟩. Take it out, or write it inside a quoted value as \\u{${hex(cp)}}.` })
      i += cp > 0xffff ? 2 : 1
    }
    out.push({ t: 'word', at: start, length: i - start, text: text.slice(start, i) })
  }
  out.push({ t: 'end', at: text.length, length: 0 })
  return out
}

const KEY = /^[a-z][a-z0-9_.]*$/
const NUMBER = /^-?\d+(\.\d+)?$/
const isJoin = (tok: Token) => tok.t === 'word' && (tok.text === 'and' || tok.text === 'or')

class Parser {
  i = 0
  errors: ParseError[] = []
  conditions = 0
  tooMany: Token | null = null
  constructor(readonly toks: Token[], readonly fields: Fields) {}

  peek() { return this.toks[this.i] }
  next() { return this.toks[this.i++] }
  fail(tok: Token, message: string): never { throw new Stop({ at: tok.at, length: tok.length, message }) }
  note(tok: Token, message: string) { this.errors.push({ at: tok.at, length: tok.length, message }) }

  group(depth: number, open: Token | null): Group {
    const items: Node[] = []
    let join: 'and' | 'or' | null = null
    for (;;) {
      const n = this.term(depth)
      if (n) items.push(n)
      const t = this.peek()
      if (isJoin(t)) {
        const word = (t as { text: 'and' | 'or' }).text
        if (join && word !== join) this.fail(t, MESSAGES.mixedJoins)
        join = word
        this.next()
        const after = this.peek()
        if (after.t === 'end' || after.t === ')') this.fail(t, `Add a condition after '${word}'.`)
        continue
      }
      if (t.t === ')') {
        if (open) { this.next(); break }
        this.fail(t, 'This bracket closes nothing.')
      }
      if (t.t === 'end') {
        if (open) this.fail(open, 'This bracket is never closed.')
        break
      }
      this.fail(t, 'Join conditions with \'and\' or \'or\'.')
    }
    return { kind: 'group', join: items.length === 1 ? 'and' : join ?? 'and', items: items as [Node, ...Node[]] }
  }

  term(depth: number): Node | null {
    const t = this.peek()
    if (t.t === '(') {
      this.next()
      if (depth + 1 > LIMITS.depth) this.fail(t, MESSAGES.tooDeep)
      return this.group(depth + 1, t)
    }
    if (t.t === 'word' && !isJoin(t)) return this.condition()
    if (t.t === 'end' && this.i === 0) this.fail(t, 'Type a condition: a field, an operator and a value.')
    if (t.t === 'end' || t.t === ')') this.fail(t, 'Add a condition here.')
    this.fail(t, 'A condition starts with a field here.')
  }

  condition(): Condition | null {
    const fieldTok = this.next() as Extract<Token, { t: 'word' }>
    if (++this.conditions === LIMITS.conditions + 1) this.tooMany = fieldTok
    const spec = KEY.test(fieldTok.text) ? specOf(this.fields, fieldTok.text) : undefined
    const before = this.errors.length
    if (!spec) this.note(fieldTok, unknownField(this.fields, fieldTok.text))
    const label = spec?.label ?? fieldTok.text
    const opTok = this.peek()
    if (opTok.t !== 'word' || isJoin(opTok)) this.fail(opTok.t === 'end' ? fieldTok : opTok, `Add an operator after ${label}, like 'is'.`)
    this.next()
    const known = (Object.keys(OPERATOR_WORDS) as string[]).includes(opTok.text)
    if (spec && !takes(spec.type, opTok.text)) this.note(opTok, wrongOperator(spec, opTok.text))
    const op = opTok.text as Operator
    if (!known) {
      // An operator nobody knows: skip one value, if one follows, and go on looking for errors.
      const v = this.peek()
      if (v.t === 'string' || (v.t === 'word' && !isJoin(v))) this.next()
      else if (v.t === '[') this.value(undefined, 'is-one-of', label)
      return null
    }
    const value = this.value(this.errors.length > before ? undefined : spec, op, label)
    if (this.errors.length > before || !spec) return null
    return (shapeOf(op) === 'none' ? { kind: 'condition', field: fieldTok.text, operator: op } : { kind: 'condition', field: fieldTok.text, operator: op, value }) as Condition
  }

  /** The operator's value, read by its shape. With no spec (an error is already noted), it is only skipped. */
  value(spec: FieldSpec | undefined, op: Operator, label: string): unknown {
    const words = OPERATOR_WORDS[op]
    const startsValue = (tok: Token) => tok.t === 'string' || tok.t === '[' || (tok.t === 'word' && !isJoin(tok))
    switch (shapeOf(op)) {
      case 'none': {
        const t = this.peek()
        if (startsValue(t)) { this.next(); this.note(t, `${label} '${words}' takes no value.`) }
        return undefined
      }
      case 'list': {
        const open = this.peek()
        if (open.t !== '[') {
          if (startsValue(open)) { this.next(); this.note(open, `${label} '${words}' takes a list in brackets, like [a, b].`); return undefined }
          this.fail(open.t === 'end' ? this.toks[this.i - 1] : open, `${label} '${words}' needs a list of values in brackets, like [a, b].`)
        }
        this.next()
        const out: unknown[] = []
        let ok = true, counted = 0
        if (this.peek().t === ']') { this.next(); if (spec) this.note(open, MESSAGES.emptyList); return undefined }
        for (;;) {
          const t = this.peek()
          if (!(t.t === 'string' || t.t === 'word')) this.fail(t.t === 'end' ? open : t, t.t === 'end' ? 'This bracket is never closed.' : 'Put a value here.')
          if (++counted === LIMITS.values + 1 && spec) { this.note(t, MESSAGES.tooManyValues); ok = false }
          const v = this.scalar(spec, op, label)
          if (v === undefined) ok = false
          else out.push(v)
          const sep = this.next()
          if (sep.t === ']') break
          if (sep.t !== ',') this.fail(sep.t === 'end' ? open : sep, sep.t === 'end' ? 'This bracket is never closed.' : 'Separate the values with commas.')
          if (this.peek().t === ']') this.fail(sep, 'Add a value after this comma.')
        }
        if (!spec || !ok) return undefined
        const r = finishList(spec, out as string[])
        if (!r.ok) { this.note(open, r.message); return undefined }
        return r.value
      }
      case 'range': {
        const first = this.peek()
        const from = this.scalar(spec, op, label)
        const and = this.peek()
        if (!(and.t === 'word' && and.text === 'and')) this.fail(and.t === 'end' ? this.toks[this.i - 1] : and, `'between' takes two values: between 1 and 10.`)
        this.next()
        const to = this.scalar(spec, op, label)
        if (!spec || from === undefined || to === undefined) return undefined
        const r = finishRange(spec, from as string | number, to as string | number)
        if (!r.ok) { this.note({ t: 'word', at: first.at, length: this.toks[this.i - 1].at + this.toks[this.i - 1].length - first.at, text: '' }, r.message); return undefined }
        return r.value
      }
      default:
        return this.scalar(spec, op, label)
    }
  }

  /** One value. Strings, times and domains are quoted; numbers, IPs, ranges, durations and booleans are not. */
  scalar(spec: FieldSpec | undefined, op: Operator, label: string): string | number | boolean | undefined {
    const t = this.peek()
    if (!(t.t === 'string' || (t.t === 'word' && !isJoin(t)))) {
      const at = t.t === 'end' || t.t === ')' ? this.toks[this.i - 1] : t
      this.fail(at, `${label} '${OPERATOR_WORDS[op]}' needs a value here.`)
    }
    this.next()
    if (!spec) return undefined
    const raw = t.t === 'string' ? t.value : (t as { text: string }).text
    const bare = t.t === 'word'
    const quoted = spec.type === 'text' || spec.type === 'identifier' || spec.type === 'domain' || (spec.type === 'time' && shapeOf(op) !== 'duration')
    let v: string | number | boolean
    if (quoted) {
      if (bare) { this.note(t, `${label} takes its value in double quotes, like "${raw.length > 32 ? 'value' : raw}".`); return undefined }
      v = raw
    } else if (spec.type === 'enum') {
      if (bare && !BARE_ENUM.test(raw) && spec.values.some((x) => x.value === raw)) { this.note(t, `Put \`${raw}\` in double quotes: a bare value is only lower-case letters, digits, "-" and "_".`); return undefined }
      v = raw
    } else {
      if (!bare) { this.note(t, `Write ${label}'s value without quotes here.`); return undefined }
      if (spec.type === 'number') {
        if (!NUMBER.test(raw)) { this.note(t, `\`${raw.length > 32 ? `${raw.slice(0, 32)}…` : raw}\` is not a number. Write it like 10 or 2.5.`); return undefined }
        v = Number(raw)
      } else if (spec.type === 'boolean') {
        if (raw !== 'true' && raw !== 'false') { this.note(t, `\`${raw.length > 32 ? `${raw.slice(0, 32)}…` : raw}\` is not true or false.`); return undefined }
        v = raw === 'true'
      } else v = raw
    }
    const r = checkElement(spec, op, v)
    if (!r.ok) { this.note(t, r.message); return undefined }
    return r.value
  }
}

/** Parses the text form. Past a limit it returns a plain error, never a truncated query. */
export function parseQuery<F extends Fields>(text: string, fields: F): ParseResult<F> {
  if (typeof text !== 'string') return { ok: false, errors: [{ at: 0, length: 0, message: 'A query\'s text form is a string.' }] }
  if (text.length > LIMITS.characters) {
    const cps = codePoints(text)
    if (cps.length > LIMITS.characters) {
      const at = String.fromCodePoint(...cps.slice(0, LIMITS.characters)).length
      return { ok: false, errors: [{ at, length: text.length - at, message: MESSAGES.tooLong }] }
    }
  }
  const p = new Parser([], fields)
  let root: Group
  try {
    p.toks.push(...lex(text))
    root = p.group(1, null)
  } catch (e) {
    if (!(e instanceof Stop)) throw e
    return { ok: false, errors: [...p.errors, e.error].sort((a, b) => a.at - b.at) as [ParseError, ...ParseError[]] }
  }
  if (p.tooMany) return { ok: false, errors: [{ at: p.tooMany.at, length: p.tooMany.length, message: MESSAGES.tooManyConditions }] }
  if (p.errors.length) return { ok: false, errors: p.errors.sort((a, b) => a.at - b.at) as [ParseError, ...ParseError[]] }
  const query: Query = { grammar: 1, root }
  if (tooLongAsText(query, fields)) return { ok: false, errors: [{ at: 0, length: text.length, message: MESSAGES.tooLong }] }
  return { ok: true, query: seal(query, fields) } as unknown as ParseResult<F>
}

/** The canonical text form. `parseQuery(queryToText(normalise(q)))` gives back `normalise(q)`. */
export function queryToText<F extends Fields>(query: NoInfer<Query<F>>, fields: F): string {
  return textOf(canonical(query as Query<F>, fields, 'queryToText') as unknown as Query, fields)
}
