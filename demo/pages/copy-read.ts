// Reads guidelines/patterns/copy.md for the Copy pattern page (demo/pages/CopyPattern.tsx), so the
// page and the repository's text cannot drift. No rendering here: the page renders what this returns.

export interface PatternSection {
  /** The section's number, or 0 for the opening before section 1. */
  n: number
  title: string
  /** The section's lines, without the figure lines and the rules between sections. */
  body: string
}

/** The longest paragraph the playground shows (playground spec, section 12). */
export const PARAGRAPH_MAX = 240

/** What a reader sees of a line of markdown: no `**`, no backticks, a link as its words. */
export const visible = (md: string) => md.replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

/**
 * Splits the pattern into its opening and its numbered sections. A static figure line
 * (`![…](copy/fig-…svg)`) is dropped: the playground shows live examples, and the figures stay for
 * the repository's Markdown (copy.md, open question 3).
 */
export function readPattern(md: string): PatternSection[] {
  const out: PatternSection[] = []
  let cur: PatternSection = { n: 0, title: '', body: '' }
  const lines: string[] = []
  const close = () => { out.push({ ...cur, body: lines.join('\n').trim() }); lines.length = 0 }
  for (const line of md.split('\n')) {
    if (/^# /.test(line)) continue
    const h = line.match(/^## (?:(\d+) · )?(.+)$/)
    if (h) { close(); cur = { n: h[1] ? Number(h[1]) : -1, title: h[2].trim(), body: '' }; continue }
    if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line) || /^---\s*$/.test(line)) continue
    lines.push(line)
  }
  close()
  return out.filter((s) => s.n >= 0)
}

/**
 * A paragraph longer than the playground's limit is shown as several, split between sentences and
 * never inside bold or code, so the words are the repository's, unchanged. The split is the page's;
 * the long paragraph is reported to the pattern's owner, who decides whether copy.md changes.
 */
export function splitParagraph(md: string, max = PARAGRAPH_MAX): string[] {
  if (visible(md).length <= max) return [md]
  // Sentence ends outside bold and code: a full stop, question or exclamation mark, then a space.
  // A bold run that closes on one ("…17:45 IST.** ") ends its sentence after the closing marks.
  const cuts: number[] = []
  let bold = false, code = false
  for (let i = 0; i < md.length; i++) {
    if (md[i] === '`') { code = !code; continue }
    if (!code && md.startsWith('**', i)) {
      bold = !bold
      i++
      if (!bold && /[.?!]/.test(md[i - 2] ?? '') && md[i + 1] === ' ') cuts.push(i + 1)
      continue
    }
    if (!bold && !code && /[.?!]/.test(md[i]) && md[i + 1] === ' ') cuts.push(i + 1)
  }
  const parts: string[] = []
  let start = 0
  while (visible(md.slice(start)).length > max) {
    const fits = cuts.filter((c) => c > start && visible(md.slice(start, c)).length <= max)
    if (!fits.length) break
    const at = fits[fits.length - 1]
    parts.push(md.slice(start, at).trim())
    start = at
  }
  parts.push(md.slice(start).trim())
  return parts
}

/** A markdown table's rows, as cells: header first. */
export function tableOf(body: string): string[][] {
  return body.split('\n').filter((l) => l.startsWith('|'))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((r) => !r.every((c) => /^-+$/.test(c)))
}
