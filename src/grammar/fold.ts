/**
 * Case-insensitive comparison for `text` fields (filter-grammar.md, Field types and Case folding:
 * "NFC, then Unicode simple case folding").
 *
 * JavaScript has no case-folding function, and `toLowerCase` is not simple case folding. So: NFC,
 * then each code point folded on its own, then NFC again. A code point's fold is `toLowerCase` of
 * it alone, unless `FOLD_TABLE` lists it. The table is generated from Unicode's CaseFolding.txt by
 * `scripts/grammar/build-fold-table.mjs`, and lists every code point where the two differ, so the
 * fold is exact for the Unicode version the file and Node share. `fold.test.ts` runs every C and S
 * entry of the file through it.
 *
 * One code point at a time, because `toLowerCase` on a whole string reads context: it lowers a
 * capital sigma at the end of a word to "ς", which simple folding does not.
 *
 * What the table covers, among others:
 * - U+0130 (capital I with dot above) has no C or S mapping, so it folds to itself. `toLowerCase`
 *   gives "i" plus U+0307. It therefore never equals "i", nor "i" plus U+0307.
 * - Cherokee folds to the capital letters, and `toLowerCase` goes the other way.
 * - Final sigma, the Greek symbol variants, long s, the micro sign, the Greek iota subscripts, and
 *   the Cyrillic and Latin variants that `toLowerCase` leaves apart.
 *
 * Simple folding, not full: "ß" and "ss" stay different.
 */
import { FOLD_TABLE } from './fold-table'

const MAP = new Map(FOLD_TABLE.map(([a, b]) => [String.fromCodePoint(a), String.fromCodePoint(b)]))

/** A–Z, and every code point outside ASCII. Other ASCII characters fold to themselves. */
const CASED = /[A-Z]|[^\0-\x7f]/gu

const one = (c: string) => MAP.get(c) ?? c.toLowerCase()

export const fold = (s: string) => s.normalize('NFC').replace(CASED, one).normalize('NFC')
