import * as React from 'react'

/**
 * Identifiers break only before their separators (DESIGN.md, "Identifiers").
 *
 * A host name, an asset name, an id, a path or an email address is one name. Browsers break a
 * line after a hyphen or a slash, which leaves "vpn-edge-" on one line and "east" on the next: two
 * names. Typesetting practice for addresses is the opposite: never add a hyphen, and break before
 * the punctuation so it starts the next line and reads as a continuation.
 *
 * This turns the value into text the browser can only break that way:
 *   - a break opportunity (`<wbr>`) before each run of separators (`.` `-` `_` `/`);
 *   - the run and the character after it in one no-wrap span, so the browser's own opportunity
 *     after the separator is gone ("vpn" <wbr> "-e" "dge" <wbr> "-e" "ast").
 * Inside a segment the text is untouched, so a segment wider than its whole line can still break
 * inside itself (the stylesheet's `overflow-wrap: break-word`); nothing is ever cut.
 *
 * Nothing is inserted into the text: no zero-width space, no soft hyphen, no swapped character.
 * `<wbr>` has no text, so `textContent`, a selection and a copy give exactly the original value.
 *
 * Internal; not exported. One helper for every part that shows an identifier (Table.Cell today).
 */

/** The separators an identifier may break before. Closed: `@` and `:` are not on it. */
export const IDENTIFIER_SEPARATORS = ['.', '-', '_', '/'] as const

const SEGMENTS = /[._/-]*[^._/-]*/g
const LEADING = /^([._/-]+)([^._/-]?)([\s\S]*)$/

/** The value split before each run of separators: "vpn-edge-east" → ["vpn", "-edge", "-east"]. */
export function identifierSegments(value: string): string[] {
  return (value.match(SEGMENTS) ?? []).filter((s) => s !== '')
}

/** The class on the span that keeps a separator run with the character after it. */
export const IDENTIFIER_JOIN_CLASS = 'vela-identifier-join'

export function breakIdentifier(value: string): React.ReactNode {
  const segments = identifierSegments(value)
  if (segments.length < 2 && !LEADING.test(value)) return value
  return segments.map((segment, i) => {
    const m = LEADING.exec(segment)
    return (
      <React.Fragment key={i}>
        {i > 0 && <wbr />}
        {m ? (
          <>
            <span className={IDENTIFIER_JOIN_CLASS}>{m[1] + m[2]}</span>
            {m[3]}
          </>
        ) : (
          segment
        )}
      </React.Fragment>
    )
  })
}
