/**
 * Filter Grammar — the public types (guidelines/contracts/filter-grammar.md, API).
 *
 * A host declares its fields once with `defineFields`; every type below is then read from that
 * declaration, so a literal field fixes its operators and its value's shape. A field held in a plain
 * `string` falls through to `validateQuery`, which runs the same checks at runtime.
 */

/** The closed set of 8 field types. */
export type FieldType = 'text' | 'identifier' | 'domain' | 'ip' | 'number' | 'time' | 'enum' | 'boolean'

/** Who could have set a field's values: the Evidence Locker's Content trust set. There is no default. */
export type FieldTrust =
  | { kind: 'system-record'; source: string }
  | { kind: 'agent-output'; writtenBy: string }
  | { kind: 'untrusted'; writtenBy: string }

/** One value of an `enum` field: the value the data holds, and the word people read. */
export type EnumValue = { value: string; label: string }

export type FieldSpec = { label: string; trust: FieldTrust; many?: true } & (
  | { type: 'text' | 'identifier' | 'domain' | 'ip' | 'boolean' | 'time' }
  | { type: 'number'; unit?: string }
  | { type: 'enum'; values: readonly EnumValue[] }
)

/** What `defineFields` takes: field keys, as the text form writes them, to their specs. */
export type FieldSchema = { readonly [key: string]: FieldSpec }

/** What `defineFields` returns: the schema, frozen. */
export type Fields<S extends FieldSchema = FieldSchema> = Readonly<S>

/** The union of a host's field keys. */
export type FieldName<F extends Fields = Fields> = Extract<keyof F, string>

/** A duration for `within-last`: a whole number and m, h, d or w (`7d`). */
export type DurationUnit = 'm' | 'h' | 'd' | 'w'
export type Duration = `${number}${DurationUnit}`

/** Both bounds of a `between`, inclusive. */
export type Range<T> = { from: T; to: T }

/** A non-empty list of values, for `is-one-of` and `is-none-of`. */
export type ValueList<T> = [T, ...T[]]

/** The seven negations. A negated condition matches when no element matches; missing is still unknown. */
export type NegatedOperator =
  | 'is-not' | 'is-none-of' | 'does-not-contain' | 'does-not-start-with' | 'does-not-end-with'
  | 'is-not-subdomain-of' | 'not-in-range'

/** Every operator id, as the text form writes it. */
export type Operator =
  | 'is' | 'is-one-of' | 'contains' | 'starts-with' | 'ends-with' | 'is-subdomain-of' | 'in-range'
  | 'greater-than' | 'at-least' | 'less-than' | 'at-most' | 'between' | 'before' | 'after' | 'within-last'
  | 'is-set' | 'is-not-set'
  | NegatedOperator

/** The operators a Positive Conjunction allows: everything but the negations and `is-not-set`. */
export type PositiveOperator = Exclude<Operator, NegatedOperator | 'is-not-set'>

type SetMatch = { operator: 'is-set' | 'is-not-set'; value?: never }

type TextMatch =
  | { operator: 'is' | 'is-not' | 'contains' | 'does-not-contain' | 'starts-with' | 'does-not-start-with' | 'ends-with' | 'does-not-end-with'; value: string }
  | { operator: 'is-one-of' | 'is-none-of'; value: ValueList<string> }
  | SetMatch

type IdentifierMatch =
  | { operator: 'is' | 'is-not' | 'starts-with' | 'does-not-start-with'; value: string }
  | { operator: 'is-one-of' | 'is-none-of'; value: ValueList<string> }
  | SetMatch

type DomainMatch =
  | { operator: 'is' | 'is-not' | 'is-subdomain-of' | 'is-not-subdomain-of'; value: string }
  | { operator: 'is-one-of' | 'is-none-of'; value: ValueList<string> }
  | SetMatch

type IpMatch =
  | { operator: 'is' | 'is-not'; value: string }
  | { operator: 'in-range' | 'not-in-range'; value: `${string}/${number}` }
  | { operator: 'is-one-of' | 'is-none-of'; value: ValueList<string> }
  | SetMatch

type NumberMatch =
  | { operator: 'is' | 'is-not' | 'greater-than' | 'at-least' | 'less-than' | 'at-most'; value: number }
  | { operator: 'between'; value: Range<number> }
  | SetMatch

type TimeMatch =
  | { operator: 'before' | 'after'; value: string }
  | { operator: 'between'; value: Range<string> }
  | { operator: 'within-last'; value: Duration }
  | SetMatch

type EnumMatch<V extends string> =
  | { operator: 'is' | 'is-not'; value: V }
  | { operator: 'is-one-of' | 'is-none-of'; value: ValueList<V> }
  | SetMatch

type BooleanMatch = { operator: 'is'; value: boolean } | SetMatch

type MatchByType = {
  text: TextMatch; identifier: IdentifierMatch; domain: DomainMatch; ip: IpMatch
  number: NumberMatch; time: TimeMatch; boolean: BooleanMatch
}

/** The operator and value a field's spec allows. */
export type MatchFor<S> =
  S extends { type: 'enum'; values: readonly { value: infer V extends string }[] } ? EnumMatch<V>
  : S extends { type: infer T extends keyof MatchByType } ? MatchByType[T]
  : never

/** One condition: a declared field, an operator of its type, and a value of that operator's shape. */
export type Condition<F extends Fields = Fields> =
  { [K in FieldName<F>]: { kind: 'condition'; field: K } & MatchFor<F[K]> }[FieldName<F>]

/** A group names its join and has at least one item. There is no implicit precedence. */
export type Group<F extends Fields = Fields> = { kind: 'group'; join: 'and' | 'or'; items: [Node<F>, ...Node<F>[]] }

export type Node<F extends Fields = Fields> = Condition<F> | Group<F>

/** A query: always a group at the root, never a bare list. */
export type Query<F extends Fields = Fields> = { grammar: 1; root: Group<F> }

// Each match narrowed to its positive operators: `{ operator: "is" | "is-not" }` keeps `"is"`.
type Positive<M> = M extends unknown ? M & { operator: PositiveOperator } : never

/** A condition with a positive operator. */
export type PositiveCondition<F extends Fields = Fields> =
  { [K in FieldName<F>]: { kind: 'condition'; field: K } & Positive<MatchFor<F[K]>> }[FieldName<F>]

/** For consumers that allow only "all of these, positively" (the Override & Teach Panel). */
export type PositiveConjunction<F extends Fields = Fields> = {
  grammar: 1
  root: { kind: 'group'; join: 'and'; items: [PositiveCondition<F>, ...PositiveCondition<F>[]] }
}

/**
 * An error with its place in the text: `at` is the offset of its first UTF-16 code unit and
 * `length` how many it covers. `validateQuery` has no text, so its errors are at 0 with length 0
 * and the message starts by saying where ("In condition 2: …").
 */
export type ParseError = { at: number; length: number; message: string }

export type ParseResult<F extends Fields = Fields> =
  | { ok: true; query: Query<F> }
  | { ok: false; errors: [ParseError, ...ParseError[]] }

/** One record for `evaluate`: field keys, exactly as declared, to values. */
export type FieldRecord = { readonly [key: string]: unknown }

export type Evaluation = 'match' | 'no-match' | 'unknown'

export type EvaluateOptions = { now?: Date }

export type LeftOutOptions = { now?: Date }

/** The readback's words. Every one has an English default; pass any of them to translate. */
export type ReadbackStrings = {
  /** The locale `Intl.DateTimeFormat` writes times in. */
  locale: string
  /** Each operator's words: "is one of", "is a subdomain of", "is at least". */
  operators: { [O in Operator]: string }
  /** A group's join words, and the word that ends a list of values. */
  and: string
  or: string
  /** The words that start a condition on a multi-valued field: "any Source IP", "no Tag". */
  any: string
  no: string
  /** "and 3 more", at the end of a short list. */
  more: (count: number) => string
  /** `is-subdomain-of` and its negation, around the domain as it is shown. */
  subdomainOf: (domain: string) => string
  notSubdomainOf: (domain: string) => string
  /** `between`, around both bounds as they are shown. */
  between: (from: string, to: string) => string
  /** `within-last`: the duration as words, and its anchor from `now` in `timeZone`. */
  withinLast: (duration: string, anchor: string) => string
  units: { [U in DurationUnit]: (count: number) => string }
  /** The values of a boolean field. */
  booleans: { true: string; false: string }
  /** With `markTrust`, after the label of a field that isn't a system record. */
  couldHaveBeenSetBy: (writer: string) => string
  /** With `full`, after a condition on an `untrusted` text, identifier or domain field. */
  ignoringHiddenCharacters: string
  /** With `full`, once, when the query has a condition on an `ip` field. */
  ipv4Mapped: string
}

/** Any of the readback's words, to replace the English defaults; the nested tables may be given in part. */
export type ReadbackStringsInput = Partial<Omit<ReadbackStrings, 'operators' | 'units' | 'booleans'>> & {
  operators?: Partial<ReadbackStrings['operators']>
  units?: Partial<ReadbackStrings['units']>
  booleans?: Partial<ReadbackStrings['booleans']>
}

export type ReadbackOptions = {
  now?: Date
  timeZone?: string
  strings?: ReadbackStringsInput
  markTrust?: boolean
  full?: boolean
}
