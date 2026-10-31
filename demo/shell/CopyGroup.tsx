/**
 * Copy Group: a shell part of the Vela site, not a kit component. It is never exported from the
 * package, and it is deleted when the kit's part lands.
 *
 * Stands in for: `CopyGroup`, part of Copyable Value (`specs/copyable-value.md`, specified, not
 * built), for the Copy pattern page (`guidelines/patterns/copy.md`, sections 2 and 7).
 *
 * The contract it follows:
 * - One clipboard governs the page, so there is one mark on the page: the word "Copied" beside the
 *   last value taken, after its tick hands back. A provider holds it for every group on the page.
 * - The mark is keyed by the value's identity (`copyId`), never by a row's position, so it follows
 *   its value through a re-sort, and in a virtualised table it never lands on a reused row.
 * - It remembers the value as copied. For identifiers, commands and secrets, a value that changes
 *   while it carries the mark says "Changed since you copied"; for human text the mark clears.
 * - What clears it: another copy anywhere on the page, or the person's own copy or cut.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isOwnWrite } from './Copy'

export interface CopyMark { copyId: string; value: string }
interface Store { mark: CopyMark | null; take: (m: CopyMark) => void; clear: () => void }

const Ctx = createContext<Store | null>(null)

export function CopyGroupProvider({ children }: { children: ReactNode }) {
  const [mark, setMark] = useState<CopyMark | null>(null)
  const take = useCallback((m: CopyMark) => setMark(m), [])
  const clear = useCallback(() => setMark(null), [])
  // The person's own copy or cut replaces what this page put on the clipboard.
  useEffect(() => {
    const own = () => { if (!isOwnWrite()) setMark(null) }
    document.addEventListener('copy', own)
    document.addEventListener('cut', own)
    return () => { document.removeEventListener('copy', own); document.removeEventListener('cut', own) }
  }, [])
  const store = useMemo(() => ({ mark, take, clear }), [mark, take, clear])
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export type MarkWord = 'Copied' | 'Changed since you copied' | null

/**
 * The mark for one value. `value` is what identifies its content: the value itself, or for a secret,
 * which the page never holds, its version. `kind` decides what a changed value does: an identifier,
 * a command or a secret says so; human text clears.
 */
export function useCopyMark(copyId: string, value: string, kind: 'identifier' | 'command' | 'secret' | 'text' = 'identifier') {
  const store = useContext(Ctx)
  const mine = store?.mark?.copyId === copyId ? store.mark : null
  const changed = !!mine && mine.value !== value
  const word: MarkWord = !mine ? null : changed ? (kind === 'text' ? null : 'Changed since you copied') : 'Copied'
  return {
    word,
    /** Called once the tick has handed back. */
    take: (copied: string) => store?.take({ copyId, value: copied }),
    /** A new copy starts: the old mark goes, wherever it was. */
    clear: () => store?.clear(),
  }
}

/** The page's one mark, for a host that acts on the copied value (the Copy page's "Rotate key"). */
export function useCopyStore() {
  return useContext(Ctx)
}
