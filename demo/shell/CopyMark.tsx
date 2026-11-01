/**
 * Copy mark: a shell part of the Vela site, not a kit component, never exported from the package.
 * Slice 2 of the playground uplift (s5-tabs: the import line, every token, the Figma code line).
 *
 * The copy control itself is Copy Morph (demo/shell/CopyMorph.tsx), the site's stand-in for Copy
 * Button, at its small box: 24 by 24, always visible, so touch has it too (sweep T56, T57). This part
 * adds what a page around it owes the reader (the Copy pattern, guidelines/patterns/copy.md):
 * - "Copied" beside the mark while the tick holds, and "Copied <what>" said once, politely;
 * - when the clipboard is refused, the pattern's own words under the value, which is left selected.
 * One announcer serves a whole tab (`Announcer`), so a table of thirty marks is one live region.
 */
import { createContext, useCallback, useContext, useId, useState, type ReactNode } from 'react'
import { cn } from '../../src'
import { CopyMorph } from './CopyMorph'
import { COPY_WORDS, PLATFORM } from './Copy'
import './shell.css'

const Say = createContext<(words: string) => void>(() => {})

/** One polite live region for every copy mark inside it. */
export function Announcer({ children }: { children: ReactNode }) {
  const [words, setWords] = useState('')
  // A repeat of the same words is still said: clear, then set.
  const say = useCallback((w: string) => { setWords(''); window.setTimeout(() => setWords(w), 30) }, [])
  return (
    <Say.Provider value={say}>
      {children}
      <p className="vela-sr-only" role="status">{words}</p>
    </Say.Provider>
  )
}

export function useSay() { return useContext(Say) }

export interface CopyMarkProps {
  /** What it copies, in words: the name is "Copy " + this. */
  what: string
  text: string
  /** The element that shows the text: a refusal leaves it selected. */
  shownId: string
  className?: string
}

/** The mark, its "Copied", and its failure words. Place it after the value it copies. */
export function CopyMark({ what, text, shownId, className }: CopyMarkProps) {
  const say = useSay()
  const failId = useId()
  const [state, setState] = useState<'idle' | 'copied' | 'selected' | 'none'>('idle')
  return (
    <>
      <span className={cn('shell-copymark', className)}>
        <CopyMorph
          what={what}
          text={text}
          shownId={shownId}
          describedBy={state === 'selected' || state === 'none' ? failId : undefined}
          onResult={(r) => {
            setState(r)
            say(r === 'copied' ? `Copied ${what}` : r === 'selected' ? COPY_WORDS.selected[PLATFORM] : COPY_WORDS.none)
          }}
          onHandBack={() => setState((s) => (s === 'copied' ? 'idle' : s))}
        />
        {state === 'copied' && <span className="shell-copymark__done" aria-hidden="true">Copied</span>}
      </span>
      {(state === 'selected' || state === 'none') && (
        <span id={failId} className="shell-copymark__fail">{state === 'selected' ? COPY_WORDS.selected[PLATFORM] : COPY_WORDS.none}</span>
      )}
    </>
  )
}
