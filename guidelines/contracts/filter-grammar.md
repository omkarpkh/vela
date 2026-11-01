# Filter Grammar

One way to say "these records, and not the others", shared by every surface that filters. A host declares its fields once, with each field's type and who could have set its values. Every condition is then checked against that declaration, whoever wrote it: a person, a typed query line, a saved link or an agent. Each query has one text form and one readback sentence.

**Status:** Experimental — specced and approved by Omkar on 1 Nov 2026, and built in the core entry (`src/grammar/`); the API may still change while the Filter Bar and Query Builder are specced on top of it. It is a contract, not a control, so it has no UI and no Figma set. See `GOVERNANCE.md`.
**Dependencies:** none (core). No UI, so no Base UI.

## Intent

A console filters the same records in several places: the filter bar over a table, an advanced query builder, a saved view, a link someone pastes, an agent's suggested filter, and a lesson's scope in the Override & Teach Panel. When each place has its own syntax:
- the chips and the text drift, and a query typed in one place can't be opened in another;
- an agent emits a field the console has never heard of;
- "domain ends with northwind.com" quietly matches `evilnorthwind.com`.

**Where it comes from:**
- The case-study research behind Vela's agent patterns:
  - F1, one grammar under chips, a typed line and a saved view, serialising to one object, "so an agent emits the same object a human builds";
  - F2, the next valid step, and a readback sentence always rendered;
  - B4, condition pills (field, operator, value), AND/OR, bracketed groups, validation, and the open problem that a nested query can't round-trip to basic pills;
  - acceptance rules 12 and 14 (validate on input and read back as a sentence; basic and advanced never silently drop a query).
- The Override & Teach Panel (`guidelines/proposals/override-and-teach-panel.md`): conditions that are ANDed and positive, and each condition marked by who could have set its value (`fieldTrust`). That trust set is the Evidence Locker's.
- The Evidence Locker's hidden-character and punycode rules (`locker-untrusted-inert`, `guidelines/proposals/evidence-locker.md`), applied to values here.

**Limits:**
- It says what to match. It doesn't fetch, index or count records. `evaluate` checks one record at a time, for tests, previews and small lists. A host's own backend runs real queries from the same object.
- No free-text search across all fields, no regular expressions, no joins, no aggregations. Those are a search box, a rule language or a report, not a filter.
- English keywords in the text form. The readback is localisable through `strings`; the text form is not (*Open questions*).

## When to use Filter Grammar

- **Anything that narrows records by conditions:** a filter bar, a query builder, a saved view, a filter an agent proposes, a lesson's scope, a rule's match → **Filter Grammar**, through the surface that shows it.
- **Finding one item by name** → a search box. Not a filter.
- **A detection or policy rule language** (counts over windows, joins, sequences) → out of scope. A Rule Builder may use the grammar for its match part only.
- **Sorting** → the Table's own sort. Order is not a condition.

## API

```ts
import { defineFields, parseQuery, queryToText, readback, validateQuery, evaluate } from "@omkarux/vela"

const fields = defineFields({
  "sender.domain": { label: "Authenticated sender domain", type: "domain",
                     trust: { kind: "system-record", source: "Mail gateway (DMARC-aligned From)" } },
  "subject":       { label: "Subject", type: "text",
                     trust: { kind: "untrusted", writtenBy: "the email's sender" } },
  "vendor.listed": { label: "Payment account on the vendor list", type: "boolean",
                     trust: { kind: "system-record", source: "Vendor master" } },
  "severity":      { label: "Severity", type: "enum", values: SEVERITY_VALUES,
                     trust: { kind: "system-record", source: "Detection pipeline" } },
  "first_seen":    { label: "First seen", type: "time",
                     trust: { kind: "system-record", source: "Sensor clock" } },
  "source.ip":     { label: "Source IP", type: "ip",
                     trust: { kind: "system-record", source: "Firewall log" } },
})

const q = parseQuery('sender.domain is "northwind.example" and subject contains "Invoice"', fields)
// { ok: true, query } | { ok: false, errors: [{ at: number, length: number, message: string }, ...] }
```

| Export | Signature | Notes |
|---|---|---|
| `defineFields` | `(schema) => Fields<S>` | Freezes the schema and derives the `FieldName` union from its keys. Called once per data source. Throws a `TypeError` on a schema the types would reject, for a schema that arrives from JavaScript. |
| `parseQuery` | `(text, fields) => ParseResult` | From the typed line or a link. Never guesses: an unknown field, operator or value is an error with its position. |
| `validateQuery` | `(unknownObject, fields) => ParseResult` | For anything not built by typed code: an agent's emitted object, a stored saved view, a value from the URL. The same errors as `parseQuery`, plus unknown keys. Returns the canonical object. |
| `normalise` | `(query, fields) => Query` | The canonical form: domains lower-case, punycode and without a trailing dot; IPv4-mapped IPv6 written as IPv4; `is-one-of` lists de-duplicated and sorted. Idempotent. |
| `queryToText` | `(query, fields) => string` | The canonical text form. `parseQuery(queryToText(normalise(q)))` gives back `normalise(q)`. |
| `readback` | `(query, fields, { now?, timeZone?, locale?, strings?, markTrust?, full? }) => string` | The sentence people and screen readers get. `full: true` is the complete sentence a ledger and an accessible description use. Without it, the short form for chips and summaries. `now` and `timeZone` are required when the query has a `within-last`. `locale` (BCP 47, default `"en-GB"`) is the locale times are written in. |
| `evaluate` | `(query, record, fields, { now? }) => "match" \| "no-match" \| "unknown"` | One record. `unknown` when the result depends on a field the record lacks. `now` is required when the query has a `within-last`. |
| `leftOutQuery` | `(query, fields, { now? }) => Query` | A query that matches exactly the records where `query` is `unknown`, so any backend that runs the grammar can count what was left out. `now` is required when a `within-last` sits inside an `or`. Throws `LeftOutNotExpressible` when the grammar has no words for the negation it needs (*Details the build settled*). |
| `LeftOutNotExpressible` | `class extends Error`, with `field` and `operator` | What `leftOutQuery` throws for a query that is valid but whose left-out set the grammar can't write. A host catches it by class. |

`normalise`, `queryToText`, `readback`, `evaluate` and `leftOutQuery` take a query typed code built, or one `parseQuery` or `validateQuery` returned. Given one that isn't valid, they throw a `TypeError` carrying the first error's words; they never work on a guess.

**Field types** (a closed set of 8), and their operators:

| Type | Values | Operators | Case |
|---|---|---|---|
| `text` | a string | `is`, `is-one-of`, `contains`, `starts-with`, `ends-with`, and their negations | case-insensitive: NFC, then Unicode simple case folding, before comparing |
| `identifier` | a string: an id, a hash, an account | `is`, `is-one-of`, `starts-with`, and their negations | **case-sensitive** |
| `domain` | a host name | `is`, `is-one-of`, `is-subdomain-of`, and their negations. **No `contains` or `ends-with`** | case-insensitive; stored lower-case, as punycode, without a trailing dot |
| `ip` | IPv4 or IPv6 | `is`, `is-one-of`, `in-range` (CIDR), and their negations | — |
| `number` | a number, with an optional `unit` in the schema | `is`, `is-not`, `greater-than`, `at-least`, `less-than`, `at-most`, `between` | — |
| `time` | ISO 8601 with an offset | `before`, `after`, `between`, `within-last` (a duration in m, h, d or w; needs `now`) | — |
| `enum` | one of the schema's `values` | `is`, `is-one-of`, and their negations | by value |
| `boolean` | `true` or `false` | `is` | — |

**Every type also takes `is-set` and `is-not-set`:** "has a value" and "has none". Missing is never treated as empty or zero.

**Multi-valued fields.** Any field spec can add `many: true`, for a host's several IPs or an alert's tags, users and hashes.
- A positive condition matches when **any** element matches.
- A negated condition matches when **no** element matches.
- An empty list is `unknown`, like a missing value.
- The readback says "any": "any Source IP is in 10.0.0.0/8", "no Tag is "test"".

**The negations** are `is-not`, `is-none-of`, `does-not-contain`, `does-not-start-with`, `does-not-end-with`, `is-not-subdomain-of` and `not-in-range`.

```ts
type FieldTrust =                                          // the Evidence Locker's Content trust set
  | { kind: "system-record"; source: string }
  | { kind: "agent-output"; writtenBy: string }
  | { kind: "untrusted"; writtenBy: string }

type FieldSpec = { label: string; trust: FieldTrust; many?: true } & (
  | { type: "text" | "identifier" | "domain" | "ip" | "boolean" | "time" }
  | { type: "number"; unit?: string }
  | { type: "enum"; values: readonly { value: string; label: string }[] }
)
// There is no default trust in defineFields: a default is how "because it's ours" comes back.

type Query<F> = { grammar: 1; root: Group<F> }
type Group<F> = { kind: "group"; join: "and" | "or"; items: [Node<F>, ...Node<F>[]] }
type Node<F> = Condition<F> | Group<F>
type Condition<F> = { [K in FieldName<F>]: { kind: "condition"; field: K } & MatchFor<F[K]> }[FieldName<F>]
// A mapped type, so a literal field fixes its operators and value. A field held in a `string` falls through to validateQuery.

// For consumers that allow only "all of these, positively" (the Override & Teach Panel):
type PositiveConjunction<F> = { grammar: 1; root: { kind: "group"; join: "and"; items: [PositiveCondition<F>, ...PositiveCondition<F>[]] } }
```

**A condition's value**, by its operator's shape: one value (`value: "northwind.example"`, `value: 3`, `value: true`); a non-empty list for `is-one-of` and `is-none-of` (`value: ["major", "critical"]`); a range for `between`, both bounds inclusive (`value: { from: 1, to: 10 }`); a CIDR string for `in-range` (`value: "10.0.0.0/8"`); a duration string for `within-last` (`value: "7d"`); and no `value` at all for `is-set` and `is-not-set`.

**The text form:**

```
sender.domain is "northwind.example" and subject contains "Invoice"
severity is-one-of [major, critical] and (first_seen within-last 7d or source.ip in-range 10.0.0.0/8)
recipients between 1 and 10
```

- Field keys as declared.
- Operators as their ids.
- Strings quoted, and lists in brackets.
- `between` takes its two values joined by `and`: `between 1 and 10`.
- **One join per group. Mixing `and` and `or` without brackets is an error, not a precedence rule.**

**Lexical rules:**
- field keys `[a-z][a-z0-9_.]*`;
- enum values unquoted only when `[a-z0-9_-]+`, quoted otherwise;
- numbers `-?\d+(\.\d+)?`, with no exponents;
- durations `\d+(m|h|d|w)`;
- times ISO 8601 with an offset, quoted;
- inside a quoted string: `\"`, `\\` and `\u{…}`. Hidden characters are written as `\u{…}`, so a value with a bidi control round-trips.

**The URL form** is the text form, percent-encoded, in one parameter: `q=`. There is no third format.

**Limits on untrusted input** (labelled defaults, assumptions to measure): text up to 10,000 characters; up to 200 conditions; up to 1,000 values in one `is-one-of`. Past a limit, `parseQuery` and `validateQuery` return a plain error, never a truncated query.

## Hard constraints

- **Closed types, operators and values.**
  - `type` is one of the 8.
  - An operator must belong to its field's type, and the value must have the operator's shape: one value, a non-empty list, a range, a CIDR, or a duration.
  - `contains` or `ends-with` on a `domain`, `between` on an `enum`, or a list for `is` doesn't compile.
  [[rule: grammar-types-closed | compiler]]
- **Only declared fields.**
  - `field` is a key of the host's `defineFields` schema.
  - An undeclared field (`"sender_domain"` when the schema says `"sender.domain"`) doesn't compile in typed code.
  - The same check runs at runtime in `validateQuery` (below).
  [[rule: grammar-fields-declared | compiler]]
- **Every field says who could have set it.** Each field declares `trust`: a `system-record` needs `source`, the other two need `writtenBy`. There is no `"unknown"` trust. A field without trust doesn't compile. [[rule: grammar-trust-declared | compiler]]
- **Groups are explicit.** Every group names its `join` and has at least one item. There is no implicit precedence, and no top-level list without a group. [[rule: grammar-groups-explicit | compiler]]
- **Untyped input is checked, never guessed.**
  - `parseQuery` and `validateQuery` reject:
    - an undeclared field;
    - an operator outside its type;
    - a value of the wrong shape, an enum value not in `values`, or a malformed IP, CIDR, time or duration;
    - mixed joins without brackets;
    - groups nested more than 3 deep;
    - an unknown key on any object (`{ field, operator, value, boost: 2 }` is an error, not a silent drop);
    - input past a limit.
  - Each error gives its position and plain words, for example "`sender_domain` is not a field here. Did you mean Authenticated sender domain?". The suggestion is shown, never applied.
  - Agent-emitted objects and stored saved views go through the same check.
  [[rule: grammar-untyped-input-checked | runtime]]
- **It round-trips, from one canonical form.**
  - `normalise` is idempotent: `normalise(normalise(q))` equals `normalise(q)`.
  - For every valid query, `parseQuery(queryToText(normalise(q)))` equals `normalise(q)`, and so does the URL form.
  - The property test uses a small seeded generator inside the test, not a new dependency, so CI is reproducible.
  [[rule: grammar-round-trips | runtime]]
- **The readback says all of it.**
  - It names every condition by the field's `label`.
  - It joins with the group's word, puts brackets around every inner group, and quotes string values.
  - **With `full: true`, it lists every value.** The ledger, the Approval Queue's record and every `aria-describedby` use the full form.
  - **The short form** lists up to 5 values of `is-one-of`, then always ends "and *n* more". It is for chips and summaries only.
  - Relative times give their anchor from `now` in `timeZone`: "within the last 7 days (to 31 Oct 2026, 19:45 IST)", with `timeZone: "Asia/Kolkata"` and `locale: "en-IN"`. Without `now`, a query with `within-last` is an error, so a ledger line and a test are reproducible.
  - `is-subdomain-of` reads "is northwind.example or one of its subdomains", so nobody reading the ledger thinks the apex was left out.
  - A multi-valued field reads "any …" or "no …".
  - With `markTrust`, a field that isn't a system record carries its writer: 'Subject (could have been set by the email's sender) contains "Invoice"'.
  - It never says "or" unless the query does.
  [[rule: grammar-readback-complete | runtime]]
- **Missing is not a match.**
  - A condition on a field the record lacks gives `unknown`, whether the operator is positive or negated. "Severity is not Major" doesn't match a record with no severity.
  - `and` with an `unknown` gives `unknown` unless another item is `no-match`. `or` gives `unknown` unless another item is `match`.
  - Surfaces that filter show how many records were left out as unknown, never fold them into "no match" silently.
  - `is-set` and `is-not-set` are how a person asks for missing values on purpose.
  - **`leftOutQuery(q)`** matches exactly the records where `q` is `unknown`. It is built from `is-not-set` and the original conditions:
    - for a condition, the field is not set;
    - for `and`, every item is match-or-unknown, and some item is unknown;
    - for `or`, no item matches, and some item is unknown.
  - **For backend adapters.** SQL already behaves this way (a `NULL` severity makes `severity <> 'Major'` unknown). Elasticsearch and OpenSearch don't: `must_not` keeps documents that lack the field. An adapter must add an `exists` to every negated condition. This is the mistake a host will make, so the guideline names it.
  [[rule: grammar-missing-is-unknown | runtime]]
- **Domains match on label boundaries.**
  - `is-subdomain-of "northwind.example"` matches `northwind.example` and `mail.northwind.example`, never `evilnorthwind.example`.
  - Values are normalised: lower-case, punycode, and a trailing dot removed (`northwind.example.` is the same host). An empty label, or a label over 63 octets, is an error.
  - The readback shows the Unicode form beside the punycode when the two differ, as the Evidence Locker does.
  - **IPv4-mapped IPv6** (`::ffff:10.0.0.5`) is normalised to IPv4 before matching, so it is in `10.0.0.0/8`. The readback says so once: "IPv4-mapped addresses are matched as IPv4".
  [[rule: grammar-domain-boundary | runtime]]
- **Hidden characters are made visible.**
  - Bidirectional controls (U+202A–U+202E, U+2066–U+2069) and zero-width characters (U+200B–U+200D, U+2060, U+FEFF) in a value are shown as visible escapes in the readback and in the text form.
  - The value itself is kept exactly.
  - **On `untrusted` fields, matching uses the visible form:** the listed invisible characters are removed before comparing, so `Inv\u{200B}oice` still contains "Invoice". The sender chose those characters, and a filter that catches things must not be evaded by them. The readback says "ignoring hidden characters". On other fields, matching is exact.
  - Confusable letters (a Cyrillic о) stay out of scope, as in the Evidence Locker.
  - The same character sets as the Evidence Locker.
  [[rule: grammar-hidden-characters-visible | runtime]]
- **Ranges are real ranges.**
  - `in-range` takes a valid IPv4 or IPv6 CIDR, normalised to its network address. `10.0.0.5/8` is an error that names `10.0.0.0/8`.
  - `between` needs a lower bound no greater than its upper bound. Both bounds are inclusive, and the readback says so: "between 1 and 10, inclusive".
  [[rule: grammar-ranges-valid | runtime]]
- **One grammar.** Every filtering surface in Vela uses this grammar and nothing else: the filter bar, the query builder, saved views, agent-proposed filters, lesson scopes and a rule's match. A second syntax, even "just for this page", is a spec change. A reviewer checks this. [[rule: grammar-one-grammar | convention]]
- **Labels are people's words.** A field's `label` is what an analyst would say ("Authenticated sender domain"), never the storage key (`sender.domain`). The key appears only in the text form. A reviewer checks this. [[rule: grammar-labels-are-words | convention]]

**Proof count:** 4 compiler (4 fixtures), 7 runtime (7 unit tests, one of them a property test), 0 browser (no UI), 2 convention — **13 rules, 11 with proofs.** The compiler fixtures are in `scripts/verify-pack.mjs`, run against the packed package; the unit tests are `src/grammar/grammar.test.ts` and, for the property test, `src/grammar/round-trip.test.ts`.

## Words

| Moment | Default | Where |
|---|---|---|
| Readback, simple | "Authenticated sender domain is "northwind.example" and Subject contains "Invoice"" | `readback` |
| Readback, a group | "Severity is one of Major and Critical, and (First seen is within the last 7 days (to 31 Oct 2026, 19:45 IST) or any Source IP is in 10.0.0.0/8)" | `readback`, with `locale: "en-IN"` |
| Readback, a subdomain | "Authenticated sender domain is northwind.example or one of its subdomains" | `readback` |
| Readback, hidden characters | "Subject contains \"Invoice\", ignoring hidden characters" | `readback`, `untrusted` fields |
| Too large | "This query has more than 200 conditions. Split it, or save it as a view." | parse error |
| Unknown key | "`boost` isn't part of a condition here." | parse error |
| Readback, missing | "Severity is not set" | `readback` |
| Unknown field | "`sender_domain` is not a field here. Did you mean Authenticated sender domain?" | parse error |
| Wrong operator | "Authenticated sender domain can't use 'contains'. Use 'is', 'is one of' or 'is a subdomain of'." | parse error |
| Mixed joins | "Add brackets to say which comes first: 'and' and 'or' are mixed here." | parse error |
| Too deep | "Groups can be nested 3 deep at most." | parse error |
| Left out as unknown | "12 records have no Severity, so they were left out" | for surfaces |

The operator words in the readback ("is one of", "is a subdomain of", "is at least") come from `strings`, so they can be translated. The ids in the text form can't.

How the words above appear in practice:
- **"IST" comes from the locale, and the examples that show it assume `locale: "en-IN"`.** The `locale` option defaults to British English (`en-GB`), and `Intl.DateTimeFormat` names India's zone by its offset there: "(to 31 Oct 2026, 19:45 GMT+5:30)". With `locale: "en-IN"` it prints "IST", the sentence in the table. Zone names come from the runtime's ICU data, so a host that needs one exact name tests the runtime it ships on.
- **The "Readback, hidden characters" note, and the IPv4-mapped note, are in the full form.** The short form for chips leaves them out, as it leaves out values past the fifth. That is why "Readback, simple" has none, though Subject is `untrusted`.
- **`validateQuery` errors say where they are in words**, because an object has no text: "In condition 1: `boost` isn't part of a condition here." Conditions are numbered as they read, from 1; groups likewise, the root being group 1. An error about the whole query ("This query has more than 200 conditions. …") has no prefix. The position is 0 with length 0.
- **"Left out as unknown"** is a surface's sentence, with its count from running `leftOutQuery`. The core counts nothing, so it has no function that writes it.

## Details the build settled

The approved spec is silent on these. Each is the least surprising choice, written down here so it is a decision and not an accident.

- **Records are read by the key as declared**: `record["sender.domain"]`, never `record.sender.domain`. A field's values are those of its type: a missing key, `null`, a value of another type (a string in a `number` field, an enum value not in `values`) or an empty list all count as no value. So they are `unknown`, and `is-not-set` matches them, and `leftOutQuery` stays exact. A `many` field read as one value is a list of one; a field without `many` given a list has no value. A `time` in a record is an ISO 8601 string with an offset, or a `Date`.
- **Depth counts the root.** The root group is 1 deep, so the text form has at most two levels of brackets.
- **A group of one is written with `and`.** `normalise` sets its join to `and`, because the text form of one item has no join to say.
- **List order.** `is-one-of` and `is-none-of` lists keep an enum's values in the schema's order (so `[major, critical]` stays as the Words example reads), IP addresses by address (IPv4 first), and everything else by code unit.
- **Positive operators** for a Positive Conjunction are every operator but the seven negations and `is-not-set`.
- **The readback**:
  - values are quoted for `text`, `identifier` and `domain`, except in the `is-subdomain-of` sentence, which reads as the Words table does; IPs, numbers, times, enum labels and booleans are not quoted;
  - a hidden character in a value is shown as `⟨U+200B⟩`, as the Evidence Locker shows it; the text form writes `\u{200B}`. Control characters, line separators and lone surrogates are escaped the same way, so a value can't break a line or a link;
  - a comma comes before a group's join when one of its items has its own "and" or comma: an inner group, a list of two or more values, a `between`, or a note. "Severity is one of Major and Critical, and (…)";
  - the short form shortens `is-none-of` lists as it does `is-one-of`;
  - `is-not-subdomain-of` reads "is neither northwind.example nor one of its subdomains";
  - a sentence that starts on a multi-valued field gets its capital: "Any Source IP is in 10.0.0.0/8";
  - an absolute time is read in `timeZone`, or in UTC without one;
  - a number with a `unit` carries it after each value: "between 1 MB and 10 MB, inclusive";
  - the IPv4-mapped note ends the full sentence once, after a semicolon, whenever the query has a condition on an `ip` field;
  - **`locale` is an option of its own** (BCP 47, default `"en-GB"`), beside `timeZone`, and not one of the `strings`: the strings are words a host translates, and the locale is how times and capitals are written. It is the locale `Intl.DateTimeFormat` writes times in, and the one a sentence's first capital is made in. Translated `strings` keep the default locale unless `locale` is passed too.
- **The text form**: IPs, ranges, numbers, durations and booleans are bare; text, identifiers, domains and times are quoted. An enum value spelt `and` or `or` is quoted, since those are the joins. A number is written in full, never with an exponent: `1e-7` is `0.0000001`.
- **The limits.** A query `validateQuery` would accept but whose text form runs past 10,000 characters is rejected, so every valid query can be typed back. Characters are counted as code points.
- **Domains.** A host name is at most 253 characters, its labels letters, digits, `-` and `_` once in punycode, and it is never an IPv4 address. A hidden character in a domain value is an error, not a character to drop.
- **Errors**: positions are offsets in UTF-16 code units, as a text field's selection counts them. `parseQuery` reports every value error it finds, and stops at the first syntax error.
- **`leftOutQuery`.** "No item matches" needs each item's negation. A number or a time negates through the operators either side of it ("not `before` t" is "`after` t, or `between` t and t"). Two cases have no negation in the grammar, and inside an `or` the function throws rather than return a wrong query: an ordering, `between` or `within-last` on a `many` field, and `is` on a `many` boolean. It throws a **`LeftOutNotExpressible`**, an `Error` exported from the package root, carrying the `field` and `operator` it couldn't negate, so a host can tell "the grammar can't say this count" from a mistake in its own call. A `within-last` inside an `or` is negated against a fixed time, so it needs `now`; without it the error is a `TypeError`, as for any missing option. The result can be deeper or longer than the limits on untrusted input, which are for input; a query that can never be unknown leaves nothing out, written as "is set and is not set" on its first field.
- **Case folding is exact simple folding, for the Unicode version the repo's Node ships** (17.0.0). A table generated from Unicode's `CaseFolding.txt`, of the 198 code points where `toLowerCase` differs from it, replaces the 12 mappings first chosen by hand. Twelve code points now compare differently: U+0130 no longer equals "i" plus U+0307, and U+0345, the Cyrillic variants U+1C80–U+1C88 and the "ſt" ligature now fold where they didn't (*Case folding*).

## Case folding

`text` compares after NFC and Unicode simple case folding: the C and S mappings of Unicode's `CaseFolding.txt`. A code point with neither folds to itself. JavaScript has no case-folding function, so `src/grammar/fold.ts` does `normalize("NFC")`, then folds each code point on its own, then NFC again. A code point's fold is `toLowerCase` of it alone, unless a generated table says otherwise.

- **The table** (`src/grammar/fold-table.ts`) lists every code point where `toLowerCase` differs from the C and S mappings: 198 for Unicode 17.0.0. 172 are Cherokee, which folds to its capital letters while `toLowerCase` goes the other way. The other 26 are the micro sign, U+0130, long s and long s with dot above, the two Greek iota subscripts, the Greek symbol variants, final sigma, the Cyrillic small letter variants (U+1C80–U+1C88), and three S mappings (two Greek letters with dialytika and oxia, and the "ſt" ligature).
- **It is generated, never written by hand.** `scripts/grammar/build-fold-table.mjs` reads `scripts/grammar/CaseFolding.txt`, vendored unchanged with its licence header, for the Unicode version the repo's Node ships. The script refuses to run when `process.versions.unicode` is another version, since `toLowerCase` comes from that Node. `--check` fails on a stale table.
- **The tests** (`src/grammar/fold.test.ts`) run every C and S entry of the file through the fold, check every other code point folds to itself, check that the file and Node have the same Unicode version and that the committed table is what the script writes, and check the file against the runtime's own simple folding (a regular expression with the `i` and `u` flags).
- **One code point at a time,** because `toLowerCase` on a whole string reads context: it lowers a capital sigma at the end of a word to "ς". Simple folding doesn't, so "ΟΔΟΣ" folds to "οδοσ".
- **U+0130** (capital I with dot above) has no C or S mapping, so it folds to itself. `toLowerCase` gives "i" plus U+0307; the table covers that, so "İ" equals neither "i" nor "i" plus U+0307.
- **Simple, not full:** "ß" and "ss" stay different. Capital "ẞ" folds to "ß".
- **NFC before and after.** NFC first can join letters into one that folds differently: "Α" and U+0345 become "ᾼ", which folds to "ᾳ".
- **A new Node with a new Unicode version** means a new `CaseFolding.txt` and a new table, in the same change; the tests fail until both are in.

## Token bindings, Sizes, States, Motion

None. The grammar has no UI. The surfaces that show it own all four.

## Responsive behaviour

**Minimum width: none — no UI.** **Full layout from:** none. The readback is plain text and wraps wherever it is shown.

## Accessibility

- **The readback is the accessible form of any query.** Every surface that shows a query exposes it, as the query builder's description or the filter bar's summary, so a screen reader gets the same sentence a sighted person reads in chips.
- **Errors are words with a position.** Surfaces show them next to the text, and announce them politely.
- **No colour, and no glyph without words.** Not applicable here; the surfaces carry this.

## Built from

- The Evidence Locker's trust set (`system-record`, `agent-output`, `untrusted`) and its hidden-character and punycode rules. Its proposal has no code yet, so the hidden-character sets are defined once, in `src/grammar/hidden.ts`, for the Locker to import when it is built.
- **Used by:**
  - the **Override & Teach Panel**, for a lesson's conditions (*Changes to other specs*);
  - the **Filter Bar** and **Query Builder**, and the **Saved View**, when they are specced;
  - the **Rule Builder**, for its match part.

## Implementations

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela` | **core:** `src/grammar/`, exported from the package root: the eight functions, the `LeftOutNotExpressible` error and the types | none | Experimental |

**Core, and UI-free,** so a backend in Node can import the same parser and readback the console uses. It imports no React, no DOM and no Node-only module. Root export: it has no dependencies and tree-shakes, and a subpath would add an exports entry, a second `.d.ts` and a second pack-gate check for nothing. `check-rules.mjs` reads `guidelines/contracts/` as it reads `guidelines/components/`, and the site lists this page under Foundations.

## Figma mapping

None: it has no UI. The Filter Bar and Query Builder sets will draw its chips and readback.

## Anti-patterns

- ❌ `field: string` in a component's props → a `FieldName` from the host's `defineFields`.
- ❌ "Domain ends with northwind.example" → `is-subdomain-of`; `ends-with` matches `evilnorthwind.example` (will not compile).
- ❌ Counting a missing value as "no" → `unknown`, shown as "left out", and `is-not-set` to ask for it.
- ❌ Auto-correcting `sender_domain` to the nearest field → an error with a suggestion the person accepts.
- ❌ `a and b or c` → brackets; there is no precedence rule.
- ❌ A per-page filter syntax → this grammar (one grammar).
- ❌ A field without trust "because it's ours" → `system-record` with its `source`; saying so is the point.
- ❌ Showing `sender.domain` to people → its `label`.

## Changes to other specs

**Override & Teach Panel** (`guidelines/proposals/override-and-teach-panel.md`). This amendment is **breaking** for the proposal, and follows in its own pull request:
1. `appliesTo.conditions` becomes a `PositiveConjunction<F>` over the host's `Fields`. It is AND-only and positive, and the type enforces that.
2. A condition loses `fieldTrust`, `source` and `writtenBy`. They come from the field's declared `trust`, so one condition can no longer mark a field as more trusted than its declaration. `fromItem` stays.
3. `teach-lenient-needs-system-record` reads the trust from the schema: a lenient lesson needs at least one condition on a `system-record` field with `is` or `is-one-of`.
4. The readback uses `readback(…, { markTrust: true })`, so "could have been set by …" is worded in one place.
5. The panel's operator list becomes the grammar's positive operators for each field's type. On a `domain` field, `ends-with` is replaced by `is-subdomain-of`. That closes a gap: the panel allowed `ends-with` on any field.

The panel's rule count is unchanged. Its open question 6 closes for good.

## Open questions

**All four confirmed by Omkar, 31 Oct 2026 (19:45 IST), as proposed.**

1. **Localised text form.** *Decided:* English keywords everywhere; the readback is translated.
2. **A free-text term.** *Decided:* not in the grammar. A host that needs it declares a `text` field labelled "Any field" and maps it itself.
3. **Depth 3.** *Decided:* 3, as a labelled assumption to measure once the Query Builder is tested with people.
4. **Grammar versions.** *Decided:* a later version only adds operators, and `validateQuery` accepts every earlier version, so saved views and links never break.
