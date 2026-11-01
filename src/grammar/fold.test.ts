import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataVersion, render, sameVersion, simpleFolds } from '../../scripts/grammar/build-fold-table.mjs'
import { fold } from './fold'
import { FOLD_TABLE, UNICODE_VERSION } from './fold-table'

// Unicode simple case folding (filter-grammar.md, Case folding), checked against the vendored
// CaseFolding.txt, entry by entry. Characters are made from their code points; none is typed here.
const text = readFileSync(resolve(__dirname, '../../scripts/grammar/CaseFolding.txt'), 'utf8')
const folds = simpleFolds(text)
const ch = (cp: number) => String.fromCodePoint(cp)
const nfc = (s: string) => s.normalize('NFC')

describe('fold: Unicode simple case folding', () => {
  it('uses the CaseFolding.txt of the Unicode version this Node ships, and a table generated from it', () => {
    expect(dataVersion(text)).toBe(UNICODE_VERSION)
    expect(sameVersion(process.versions.unicode, UNICODE_VERSION), `Node has Unicode ${process.versions.unicode}, the file is ${UNICODE_VERSION}`).toBe(true)
    expect(readFileSync(resolve(__dirname, 'fold-table.ts'), 'utf8'), 'run node scripts/grammar/build-fold-table.mjs').toBe(render(text))
    expect(FOLD_TABLE.length).toBe(198)
  })

  it('folds every C and S entry of the file to its mapping', () => {
    expect(folds.length).toBe(1512)
    for (const [from, to] of folds) {
      // NFC comes first, so a code point NFC replaces (the Kelvin sign, U+1FBE) folds as its replacement.
      expect(fold(ch(from)), `U+${from.toString(16)}`).toBe(nfc(ch(to)))
      expect(fold(ch(to)), `U+${to.toString(16)}`).toBe(nfc(ch(to)))
    }
  })

  it('folds every other code point to itself', () => {
    const mapped = new Set(folds.map(([from]) => from))
    const wrong: string[] = []
    for (let cp = 0; cp <= 0x10ffff; cp++) {
      if ((cp >= 0xd800 && cp <= 0xdfff) || mapped.has(cp)) continue
      if (fold(ch(cp)) !== nfc(ch(cp))) wrong.push(`U+${cp.toString(16)}`)
    }
    expect(wrong).toEqual([])
  })

  it('agrees with the runtime\'s own simple folding, as a check on the vendored file', () => {
    // A regular expression with the `i` and `u` flags matches by simple case folding (ECMA-262, Canonicalize).
    for (const [from, to] of folds) expect(new RegExp(`^\\u{${from.toString(16)}}$`, 'iu').test(ch(to)), `U+${from.toString(16)}`).toBe(true)
  })

  it('keeps the cases simple folding keeps apart', () => {
    // U+0130 has no C or S mapping; toLowerCase would make it "i" and U+0307.
    expect(fold(ch(0x130))).toBe(ch(0x130))
    expect(fold(ch(0x130))).not.toBe(fold('i'))
    expect(fold(ch(0x130))).not.toBe(fold(`i${ch(0x307)}`))
    // "ß" is "ss" only in full folding. Capital sharp s folds to "ß".
    expect(fold(ch(0xdf))).not.toBe(fold('ss'))
    expect(fold(ch(0x1e9e))).toBe(ch(0xdf))
    // A final capital sigma folds to σ, as any capital sigma does; toLowerCase on the word gives ς.
    expect(fold(`${ch(0x39f)}${ch(0x3a3)}`)).toBe(`${ch(0x3bf)}${ch(0x3c3)}`)
    // Cherokee folds to the capital letters.
    expect(fold(ch(0xab70))).toBe(ch(0x13a0))
    expect(fold(ch(0x13a0))).toBe(ch(0x13a0))
  })

  it('normalises to NFC before and after', () => {
    expect(fold(`E${ch(0x301)}`)).toBe(ch(0xe9))
    expect(fold(ch(0xc9))).toBe(fold(`e${ch(0x301)}`))
    // NFC first joins Α and U+0345 into ᾼ (U+1FBC), whose simple fold is ᾳ (U+1FB3). Folded alone,
    // U+0345 is ι (U+03B9), a letter of its own, and NFC afterwards keeps it apart.
    expect(fold(`${ch(0x391)}${ch(0x345)}`)).toBe(ch(0x1fb3))
    expect(fold(ch(0x345))).toBe(ch(0x3b9))
    expect(fold('Plain ASCII, 123!')).toBe('plain ascii, 123!')
  })
})
