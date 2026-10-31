/**
 * Copy, with a failure you can see: a shell part of the Vela site, not a kit component, never
 * exported from the package. Spec: the playground spec, section 7 ("Copy failed"), and the build
 * pressure test, B3: two tries, then the failure message with the text left selected.
 *
 * Stands in for the icon thread's Copy control (`icons/09-copy-pattern-scope.md`), whose morph and
 * states replace this when the kit's part lands; this file fixes the silent failure only.
 *
 * - First try: the async Clipboard API. Second: select the text where it is shown and ask the
 *   browser to copy the selection. If both fail, the text stays selected and the status line says
 *   how to copy it on this platform; if the text can't be found, it says nothing was copied.
 * - The words are the Copy Button spec's (specs/copy-button.md, Words), as the icon thread asked.
 * - The button's visible word is "Copy"; its name says what it copies ("Copy install command").
 *   The outcome is a status line beside it, read politely, never a change to the button's name.
 */
import { useEffect, useRef, useState } from 'react'
import { Button, cn } from '../../src'
import './shell.css'

/**
 * The platform, decided once at load (specs/copy-button.md, Words): Apple platforms show ⌘C, a
 * device with no fine pointer gets the touch wording, everything else gets Ctrl+C.
 */
export type Platform = 'apple' | 'touch' | 'other'
export function platformOf(): Platform {
  if (typeof window === 'undefined') return 'other'
  if (window.matchMedia && !window.matchMedia('(any-pointer: fine)').matches) return 'touch'
  const p = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? ''
  return /mac|iphone|ipad|ipod/i.test(p) ? 'apple' : 'other'
}
const PLATFORM = platformOf()

/** The Copy Button spec's own strings, so nothing changes when the kit's control replaces this part. */
export const COPY_WORDS = {
  selected: {
    other: "Couldn't copy: your browser blocked the clipboard. The text is selected, so press Ctrl+C.",
    apple: "Couldn't copy: your browser blocked the clipboard. The text is selected, so press ⌘C.",
    touch: "Couldn't copy: your browser blocked the clipboard. The text is selected, so tap and hold it, then choose Copy.",
  },
  // Never claim a selection that didn't happen: when the text can't be found, nothing is selected.
  none: "Couldn't copy: your browser blocked the clipboard, so nothing was copied. Select the text and copy it yourself.",
} as const

function select(el: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/** How a copy ended: copied; refused, with the text left selected; or refused with nothing selected. */
export type CopyResult = 'copied' | 'selected' | 'none'

/** Copies `text`; `shown` is the element that shows exactly that text. */
export async function copyText(text: string, shown: HTMLElement | null): Promise<CopyResult> {
  try {
    if (!navigator.clipboard) throw new Error('no clipboard')
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch { /* the second try */ }
  if (!shown) return 'none'
  select(shown)
  let copied = false
  try { copied = document.execCommand('copy') } catch { copied = false }
  if (copied) { window.getSelection()?.removeAllRanges(); return 'copied' }
  select(shown)
  return 'selected'
}

export type CopyState = 'idle' | CopyResult

export function useCopy(text: string, shownId: string) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // A new text is a new copy: the last outcome no longer describes it.
  useEffect(() => setState('idle'), [text])
  const copy = async () => {
    window.clearTimeout(timer.current)
    const result = await copyText(text, document.getElementById(shownId))
    setState(result)
    if (result === 'copied') timer.current = window.setTimeout(() => setState('idle'), 2000)
  }
  return { state, copy }
}

/** "Copy", named for what it copies. */
export function CopyButton({ what, onCopy, className }: { what: string; onCopy: () => void; className?: string }) {
  return (
    <Button size="tiny" appearance="hollow" className={cn('shell-copy', className)} onClick={onCopy}>
      Copy<span className="vela-sr-only"> {what}</span>
    </Button>
  )
}

/**
 * The outcome, in a status region that is always present so a change is announced. Success names
 * what was copied ("Copied install command"), and never claims anything about the clipboard.
 */
export function CopyStatus({ state, what, className }: { state: CopyState; what: string; className?: string }) {
  const failed = state === 'selected' || state === 'none'
  return (
    <p role="status" className={cn('shell-copy-status', failed && 'is-failed', className)}>
      {state === 'copied' ? `Copied ${what}` : state === 'selected' ? COPY_WORDS.selected[PLATFORM] : state === 'none' ? COPY_WORDS.none : ''}
    </p>
  )
}
