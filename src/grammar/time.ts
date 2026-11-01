/**
 * Times and durations (filter-grammar.md, Field types and Lexical rules). A time is ISO 8601 with a
 * date, a time and an offset (`2026-10-31T19:45:00+05:30`, or `Z`); it is kept as written and
 * compared as an instant, to the millisecond. A duration is a whole number and m, h, d or w.
 * Parsed here, by hand, so no runtime reads a time without an offset in its own local zone.
 */
import { shownShort } from './hidden'

const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|([+-])(\d{2}):(\d{2}))$/

const daysIn = (y: number, m: number) => [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]

/** Milliseconds since the epoch, or `null` when the text is not a time with an offset. */
export function parseTime(s: string): number | null {
  const m = s.match(ISO)
  if (!m) return null
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4], m[5]].map(Number)
  const sec = m[6] ? Number(m[6]) : 0
  const ms = m[7] ? Number(m[7].padEnd(3, '0').slice(0, 3)) : 0
  if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo) || h > 23 || mi > 59 || sec > 59) return null
  let offset = 0
  if (m[8] !== 'Z') {
    const [oh, om] = [Number(m[10]), Number(m[11])]
    if (oh > 23 || om > 59) return null
    offset = (m[9] === '-' ? -1 : 1) * (oh * 60 + om)
  }
  // setUTCFullYear, not Date.UTC, which reads the years 0–99 as 1900–1999.
  const t = new Date(0)
  t.setUTCFullYear(y, mo - 1, d)
  t.setUTCHours(h, mi, sec, ms)
  return t.getTime() - offset * 60_000
}

export type TimeResult = { ok: true; value: string; at: number } | { ok: false; message: string }

export function normaliseTime(raw: string): TimeResult {
  const at = parseTime(raw)
  return at === null
    ? { ok: false, message: `\`${shownShort(raw)}\` is not a time with an offset. Write it like "2026-10-31T19:45:00+05:30".` }
    : { ok: true, value: raw, at }
}

export const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 } as const

export type DurationResult = { ok: true; value: string; amount: number; unit: keyof typeof UNIT_MS } | { ok: false; message: string }

export function normaliseDuration(raw: string): DurationResult {
  const m = raw.match(/^(\d+)(m|h|d|w)$/)
  const amount = m ? Number(m[1]) : NaN
  if (!m || !Number.isSafeInteger(amount)) return { ok: false, message: `\`${shownShort(raw)}\` is not a duration. Write a whole number and m, h, d or w, like 7d.` }
  // Leading zeros are dropped, so `07d` and `7d` are one value.
  return { ok: true, value: `${amount}${m[2]}`, amount, unit: m[2] as keyof typeof UNIT_MS }
}

export const durationMs = (d: string) => {
  const r = normaliseDuration(d)
  return r.ok ? r.amount * UNIT_MS[r.unit] : NaN
}
