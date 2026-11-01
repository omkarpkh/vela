/**
 * Hidden characters (filter-grammar.md, `grammar-hidden-characters-visible`).
 *
 * The same sets as the Evidence Locker (guidelines/proposals/evidence-locker.md,
 * `locker-untrusted-inert`): the bidirectional controls U+202A–U+202E and U+2066–U+2069, and the
 * zero-width characters U+200B–U+200D, U+2060 and U+FEFF. The Locker is a proposal with no code
 * yet, so this is the one definition in `src/`; the Locker should import it when it is built.
 *
 * Every character here is made from its code point. None is ever typed into a file.
 */

/** The ranges, inclusive, as code points. */
export const HIDDEN_RANGES: readonly (readonly [number, number])[] = [
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0x200b, 0x200d],
  [0x2060, 0x2060],
  [0xfeff, 0xfeff],
]

export const isHidden = (cp: number) => HIDDEN_RANGES.some(([a, b]) => cp >= a && cp <= b)

const HIDDEN_CLASS = HIDDEN_RANGES.map(([a, b]) => (a === b ? `\\u{${a.toString(16)}}` : `\\u{${a.toString(16)}}-\\u{${b.toString(16)}}`)).join('')
const HIDDEN_ALL = new RegExp(`[${HIDDEN_CLASS}]`, 'gu')
const HIDDEN_ANY = new RegExp(`[${HIDDEN_CLASS}]`, 'u')

export const hasHidden = (s: string) => HIDDEN_ANY.test(s)

/** The visible form an `untrusted` field is matched on: the hidden characters removed. */
export const withoutHidden = (s: string) => s.replace(HIDDEN_ALL, '')

/**
 * Characters that are escaped wherever a value is shown, in the text form and the readback: the
 * hidden sets above, and the control and separator characters that would otherwise break a line
 * or vanish (C0, DEL, C1, U+2028, U+2029). A lone surrogate is escaped too, so the text form is
 * always well-formed and can be percent-encoded for a link.
 */
export const isEscaped = (cp: number) =>
  isHidden(cp) || cp < 0x20 || (cp >= 0x7f && cp <= 0x9f) || cp === 0x2028 || cp === 0x2029 || (cp >= 0xd800 && cp <= 0xdfff)

/** Code points of a string, lone surrogates included (`for…of` yields them as they are). */
export const codePoints = (s: string) => [...s].map((c) => c.codePointAt(0)!)

const hex = (cp: number) => cp.toString(16).toUpperCase().padStart(4, '0')

/** A value as people read it: each escaped character as ⟨U+200B⟩, as the Evidence Locker shows it. */
export function shown(s: string): string {
  let out = ''
  for (const c of s) {
    const cp = c.codePointAt(0)!
    out += isEscaped(cp) ? `⟨U+${hex(cp)}⟩` : c
  }
  return out
}

/** The same, cut to a length a message can carry. */
export const shownShort = (s: string, max = 48) => {
  const v = shown(s)
  return v.length > max ? `${v.slice(0, max)}…` : v
}

/** A quoted string in the text form: `\"`, `\\` and `\u{…}` for every escaped character. */
export function quote(s: string): string {
  let out = '"'
  for (const c of s) {
    const cp = c.codePointAt(0)!
    out += c === '"' ? '\\"' : c === '\\' ? '\\\\' : isEscaped(cp) ? `\\u{${hex(cp)}}` : c
  }
  return out + '"'
}
