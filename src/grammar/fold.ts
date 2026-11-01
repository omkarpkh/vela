/**
 * Case-insensitive comparison for `text` fields (filter-grammar.md, Field types: "NFC, then Unicode
 * simple case folding").
 *
 * JavaScript has no case-folding function, and `toLowerCase` is not simple case folding. What this
 * does, and all it claims: `normalize('NFC')`, then `toLowerCase()`, then the simple-folding
 * mappings below that `toLowerCase` leaves apart, then NFC again. Each pair in `FOLDS` is asserted
 * in `grammar.test.ts`.
 *
 * Covered: ASCII and the cased scripts `toLowerCase` handles (Latin, Greek, Cyrillic, Armenian,
 * Georgian, Cherokee and the rest), the Kelvin and Ohm signs (lowered by `toLowerCase` already),
 * and the mappings in `FOLDS`: final sigma, the Greek symbol variants, long s, the micro sign and
 * the Greek prosgegrammeni.
 *
 * Not covered, honestly:
 * - U+0130 (capital I with dot above). Simple folding leaves it as it is; `toLowerCase` makes it
 *   "i" plus U+0307. It therefore equals "i" + U+0307 here, and never equals a plain "i" (which
 *   simple folding does not equate either).
 * - Full folding is not simple folding: "ß" and "ss" stay different, as simple folding keeps them.
 * - Cherokee folds to upper case and `toLowerCase` goes the other way. Equality is the same either
 *   way, so no comparison here gives a different answer.
 * - Any mapping a future Unicode version adds, until it is added to `FOLDS`.
 */
export const FOLDS: readonly (readonly [number, number])[] = [
  [0x03c2, 0x03c3], // ς final sigma → σ
  [0x03d0, 0x03b2], // ϐ → β
  [0x03d1, 0x03b8], // ϑ → θ
  [0x03d5, 0x03c6], // ϕ → φ
  [0x03d6, 0x03c0], // ϖ → π
  [0x03f0, 0x03ba], // ϰ → κ
  [0x03f1, 0x03c1], // ϱ → ρ
  [0x03f5, 0x03b5], // ϵ → ε
  [0x017f, 0x0073], // ſ long s → s
  [0x00b5, 0x03bc], // µ micro sign → μ
  [0x1fbe, 0x03b9], // ι prosgegrammeni → ι
  [0x1e9b, 0x1e61], // ẛ → ṡ
]

const MAP = new Map(FOLDS.map(([a, b]) => [String.fromCodePoint(a), String.fromCodePoint(b)]))
const CLASS = new RegExp(`[${FOLDS.map(([a]) => `\\u{${a.toString(16)}}`).join('')}]`, 'gu')

export const fold = (s: string) => s.normalize('NFC').toLowerCase().replace(CLASS, (c) => MAP.get(c)!).normalize('NFC')
