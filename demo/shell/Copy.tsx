/**
 * Copy, with a failure you can see: a shell part of the Vela site, not a kit component, never
 * exported from the package. Spec: the playground spec, section 7 ("Copy failed"), and the build
 * pressure test, B3: two tries, then the failure message with the text left selected.
 *
 * Stands in for the icon thread's Copy control (`icons/09-copy-pattern-scope.md`), whose morph and
 * states replace this when the kit's part lands; this file fixes the silent failure only.
 *
 * - First try: the async Clipboard API. Second: select the text where it is shown and ask the
 *   browser to copy the selection. If both fail, the text stays selected, so Ctrl+C or ⌘C copies
 *   it, and the status line says so.
 * - The button's visible word is "Copy"; its name says what it copies ("Copy install command").
 *   The outcome is a status line beside it, read politely, never a change to the button's name.
 */
import { useEffect, useRef, useState } from 'react'
import { Button, cn } from '../../src'
import './shell.css'

export const COPY_FAILED = "Couldn't copy. The text is selected: press Ctrl+C (⌘C on a Mac) to copy it."

function select(el: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/** Copies `text`; `shown` is the element that shows exactly that text. True when it was copied. */
export async function copyText(text: string, shown: HTMLElement | null): Promise<boolean> {
  try {
    if (!navigator.clipboard) throw new Error('no clipboard')
    await navigator.clipboard.writeText(text)
    return true
  } catch { /* the second try */ }
  if (!shown) return false
  select(shown)
  let copied = false
  try { copied = document.execCommand('copy') } catch { copied = false }
  if (copied) window.getSelection()?.removeAllRanges()
  else select(shown)
  return copied
}

export type CopyState = 'idle' | 'copied' | 'failed'

export function useCopy(text: string, shownId: string) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // A new text is a new copy: the last outcome no longer describes it.
  useEffect(() => setState('idle'), [text])
  const copy = async () => {
    window.clearTimeout(timer.current)
    const ok = await copyText(text, document.getElementById(shownId))
    setState(ok ? 'copied' : 'failed')
    if (ok) timer.current = window.setTimeout(() => setState('idle'), 2000)
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

/** The outcome, in a status region that is always present so a change is announced. */
export function CopyStatus({ state, className }: { state: CopyState; className?: string }) {
  return (
    <p role="status" className={cn('shell-copy-status', state === 'failed' && 'is-failed', className)}>
      {state === 'copied' ? 'Copied.' : state === 'failed' ? COPY_FAILED : ''}
    </p>
  )
}
