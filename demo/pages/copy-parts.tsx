import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import copyMd from '../../guidelines/patterns/copy.md?raw'
import { inline, Markdown } from '../playground/Markdown'
import { CopyMorph, type MorphPose } from '../shell/CopyMorph'
import { COPY_WORDS, PLATFORM, type CopyResult, type CopySimulation, type Platform } from '../shell/Copy'
import { useCopyMark, type MarkWord } from '../shell/CopyGroup'
import { readPattern, splitParagraph, tableOf, visible } from './copy-read'

// The Copy pattern page's shared parts (demo/pages/CopyPattern.tsx and copy-more.tsx): the words read
// from guidelines/patterns/copy.md, the example frame, the "don't" drawing, the announcer, and a value
// with its copy control and mark. Imported only by the page's own modules, so they stay in its chunk.

export const SECTIONS = readPattern(copyMd)
export const section = (n: number) => SECTIONS.find((s) => s.n === n)!

// ---------------------------------------------------------------------------- the words --

/**
 * The section's words: paragraphs (split between sentences when one is longer than the playground
 * allows), lists with their nested items, numbered lists, and tables, which Markdown renders.
 * `skip` leaves out blocks the page shows another way (the §2 list is the scrubber's caption).
 */
export function Words({ body, skip }: { body: string; skip?: (block: string) => boolean }): ReactNode {
  // A <details> block (section 13's decisions and sources) is a real disclosure, its words inside.
  const d = body.match(/<details>\s*<summary>(?:<b>)?([\s\S]*?)(?:<\/b>)?<\/summary>([\s\S]*?)<\/details>/)
  if (d) {
    const [whole, summary, inner] = d
    const at = body.indexOf(whole)
    return (
      <>
        <Words body={body.slice(0, at)} skip={skip} />
        <details className="copy-page__details">
          <summary>{summary.trim()}</summary>
          <Words body={inner} skip={skip} />
        </details>
        <Words body={body.slice(at + whole.length)} skip={skip} />
      </>
    )
  }
  const blocks = body.split(/\n\s*\n/).map((b) => b.replace(/\s+$/, '')).filter(Boolean)
  const out: ReactNode[] = []
  blocks.forEach((b, k) => {
    if (skip?.(b)) return
    const lines = b.split('\n')
    if (lines[0].startsWith('|')) { out.push(<Markdown key={k} source={b} />); return }
    if (/^\*[^*].*\*$/.test(b)) { out.push(<p key={k} className="pg-p copy-page__aside"><em>{b.slice(1, -1)}</em></p>); return }
    // A paragraph, then any list that follows it with no blank line between ("The page:" then "- …").
    const lead: string[] = []
    while (lines.length && !/^(- |\d+\. )/.test(lines[0])) lead.push(lines.shift()!)
    if (lead.length) splitParagraph(lead.join(' ')).forEach((p, i) => out.push(<p key={`${k}-${i}`} className="pg-p">{inline(p, i, true)}</p>))
    if (lines.length) out.push(<List key={`${k}-l`} lines={lines} />)
  })
  return <div className="copy-page__words">{out}</div>
}

/** A list, numbered or not, with items nested by indent. */
export function List({ lines }: { lines: string[] }) {
  type Item = { text: string; sub: string[] }
  const items: Item[] = []
  const ordered = /^\d+\. /.test(lines[0])
  for (const l of lines) {
    if (/^(- |\d+\. )/.test(l)) items.push({ text: l.replace(/^(- |\d+\. )/, ''), sub: [] })
    else if (/^\s+- /.test(l)) items[items.length - 1]?.sub.push(l.replace(/^\s+- /, ''))
    else if (items.length) {
      const it = items[items.length - 1]
      if (it.sub.length) it.sub[it.sub.length - 1] += ' ' + l.trim()
      else it.text += ' ' + l.trim()
    }
  }
  const L = ordered ? 'ol' : 'ul'
  return (
    <L className="pg-list copy-page__list">
      {items.map((it, i) => (
        <li key={i}>
          {inline(it.text, 0, true)}
          {it.sub.length > 0 && <ul className="pg-list">{it.sub.map((s, j) => <li key={j}>{inline(s, j, true)}</li>)}</ul>}
        </li>
      ))}
    </L>
  )
}

// --------------------------------------------------------------------- shared example parts --

/** One polite region for the page: each outcome is announced once, and focus never moves. */
export function useAnnouncer() {
  const [text, setText] = useState('')
  const frame = useRef(0)
  const announce = useCallback((msg: string) => {
    // Cleared first, so the same words said again (a second copy) are announced again.
    setText('')
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => setText(msg))
  }, [])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  const region = <p role="status" className="vela-sr-only copy-page__announcer">{text}</p>
  return { announce, region }
}

/** The frame every live example sits in, with its label and, while a switch is on, what it simulates. */
export function Example({ label, simulated, children }: { label: string; simulated?: string[]; children: ReactNode }) {
  const id = useId()
  return (
    <div className="copy-example" role="group" aria-labelledby={id}>
      <p id={id} className="vela-meta copy-example__label">
        <span className="site-tag">Experimental, not yet in the kit</span> {label}
      </p>
      {simulated && simulated.length > 0 && (
        <p className="vela-meta copy-example__simulated">Simulated: {simulated.join(' ')}</p>
      )}
      {children}
    </div>
  )
}

/** A "don't" drawing: a picture, not a control. It never takes focus and holds nothing that does. */
export function Drawing({ alt, children }: { alt: string; children: ReactNode }) {
  return <div className="copy-drawing" role="img" aria-label={alt}>{children}</div>
}

export const failureWords = (r: CopyResult, platform: Platform) =>
  r === 'selected' ? COPY_WORDS.selected[platform] : r === 'none' ? COPY_WORDS.none : ''

/**
 * The mark beside a value: the word "Copied", or "Changed since you copied" where the value can
 * change. Every word it can show keeps its place while it is hidden, so nothing beside or around it
 * moves when one arrives (a table column keeps its width). Hidden words are not read.
 */
export function MarkSlot({ word, changeable }: { word: MarkWord; changeable?: boolean }) {
  const words: Exclude<MarkWord, null>[] = changeable ? ['Copied', 'Changed since you copied'] : ['Copied']
  return (
    <span className="copy-mark">
      {words.map((w) => <span key={w} className={`copy-value__mark ${word === w ? 'is-on' : 'is-off'}`}>{w}</span>)}
    </span>
  )
}

/**
 * A value with its copy control, its mark and its failure words, which are also the control's
 * description. With a `copyId` it takes part in the page's one mark (CopyGroup): the mark follows the
 * value's identity, and says when the value changed since it was copied.
 */
export function CopyValue({ id, what, text, shown, copyId, markValue, kind = 'identifier', changeable, announce, platform = PLATFORM, simulate, box, pose, mono = true, copiedWords, keyboard, extra }: {
  id: string; what: string; text: string | (() => Promise<string>); shown?: ReactNode
  /** Joins the page's mark under this identity. */
  copyId?: string
  /** What identifies the content for "Changed since you copied": the value, or a secret's version. */
  markValue?: string
  kind?: 'identifier' | 'command' | 'secret' | 'text'
  changeable?: boolean
  announce: (m: string) => void
  platform?: Platform; simulate?: CopySimulation; box?: 'small' | 'regular'
  pose?: MorphPose; mono?: boolean
  /** The announcement for a copy, from what was written ("Copied API key · 22 characters"). */
  copiedWords?: (written: string) => string
  keyboard?: boolean
  extra?: ReactNode
}) {
  const [failure, setFailure] = useState('')
  const valueId = `${id}-value`
  const msgId = `${id}-msg`
  const identity = markValue ?? (typeof text === 'string' ? text : '')
  const mark = useCopyMark(copyId ?? id, identity, kind)
  const copiedAs = useRef(identity)
  return (
    <span className="copy-value">
      <span className="copy-value__row">
        <span id={valueId} className={mono ? 'copy-value__text' : undefined}>{shown ?? (typeof text === 'string' ? text : '')}</span>
        <CopyMorph
          what={what}
          text={text}
          shownId={typeof text === 'string' && !shown ? valueId : undefined}
          box={box}
          pose={pose}
          simulate={simulate}
          keyboard={keyboard}
          describedBy={failure ? msgId : undefined}
          onResult={(r, written) => {
            if (r === 'copied') {
              setFailure('')
              // One clipboard governs the page: a new copy takes the mark from wherever it was.
              if (copyId) { mark.clear(); copiedAs.current = identity }
              announce(copiedWords ? copiedWords(written ?? '') : `Copied ${what}`)
              return
            }
            const words = failureWords(r, platform)
            setFailure(words)
            announce(words)
          }}
          onHandBack={() => { if (copyId) mark.take(copiedAs.current) }}
        />
        {copyId && <MarkSlot word={failure ? null : mark.word} changeable={changeable} />}
        {extra}
      </span>
      {failure && <span id={msgId} className="copy-value__msg">{failure}</span>}
    </span>
  )
}

// ------------------------------------------------------------------------- shared values --

/** A sample secret in an invented format, made when it is fetched, never kept in the page. */
export const sampleSecret = (tail: string) => {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = 'vela_sample_'
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)]
  return s + tail
}
export const fetchSecret = (tail: string) => () => new Promise<string>((ok) => window.setTimeout(() => ok(sampleSecret(tail)), 400))

export const ch = String.fromCharCode
// Hidden characters are made here, at runtime, and never typed into the source.
export const ZWSP = ch(0x200b)
export const NBSP = ch(0x00a0)
export const LQ = ch(0x201c)
export const RQ = ch(0x201d)
/** Hidden characters shown as escapes, the way Copyable Value shows them (copy.md, section 6). */
export const HIDDEN = new RegExp(`[${[[0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2060], [0x2066, 0x2069], [0xfeff, 0xfeff]].map(([a, b]) => `${ch(a)}-${ch(b)}`).join('')}]`, 'g')
export const escapeHidden = (s: string) => s.replace(HIDDEN, (c) => `\\u${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`)

export const PLATFORMS = [
  { value: 'other', label: 'Ctrl+C' },
  { value: 'apple', label: '⌘C' },
  { value: 'touch', label: 'Touch' },
] as const
export const platformWord = (p: Platform) => PLATFORMS.find((x) => x.value === p)!.label

export interface WordsRow { moment: string; words: string; where: string; key: string }
/** The §3 table's rows. A moment that appears twice is told apart by its words. */
export function wordsRows(): WordsRow[] {
  const [, ...rows] = tableOf(section(3).body.split(/\n\s*\n/).find((b) => b.startsWith('| Moment')) ?? '')
  const twice = (m: string) => rows.filter((r) => r[0] === m).length > 1
  return rows.map(([moment, words, where]) => ({ moment, words, where, key: twice(moment) ? `${moment} · ${visible(words)}` : moment }))
}

/** The words a row shows, for this platform: the four failure strings are the Copy Button spec's own. */
export function wordsFor(row: WordsRow, platform: Platform): string {
  if (row.moment === 'Blocked, text selected') return COPY_WORDS.selected[platform]
  if (row.moment === 'Blocked, nothing selected') return COPY_WORDS.none
  const w = visible(row.words).replace(/\s*\((?:per platform|⌘C;[^)]*)\)\s*$/, '')
  if (row.moment === 'A secret shown to copy')
    return platform === 'touch' ? 'Selected. Tap and hold it, then choose Copy.' : platform === 'apple' ? w : w.replace('⌘C', 'Ctrl+C')
  return w
}
