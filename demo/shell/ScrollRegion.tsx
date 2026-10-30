/**
 * ScrollRegion: a shell part of the Vela site, not a kit component, never exported from the
 * package. Spec: the playground spec, section 5 ("Stage") and section 8 of the P1 request: a scroll
 * region is named, and focusable when it scrolls.
 *
 * A box with overflow that holds no focusable content of its own (a code block, a wide table, the
 * stage) cannot be scrolled from the keyboard unless the box itself takes focus. So while it
 * actually scrolls, and only then, it becomes a named region in the tab order ("Stage,
 * scrollable"); when its content fits, it is a plain element again and Tab passes it by. The check
 * reruns whenever the box or its content changes size, and whenever its content changes.
 */
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'

export function useScrolls<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [scrolls, setScrolls] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setScrolls(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check)
    const watch = () => {
      if (!ro) return
      ro.disconnect()
      ro.observe(el)
      for (const child of Array.from(el.children)) ro.observe(child)
    }
    watch()
    const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => { watch(); check() })
    mo?.observe(el, { childList: true, subtree: true, characterData: true })
    window.addEventListener('resize', check)
    return () => { ro?.disconnect(); mo?.disconnect(); window.removeEventListener('resize', check) }
  }, [])
  return [ref, scrolls] as const
}

type Props = Omit<HTMLAttributes<HTMLElement>, 'role' | 'tabIndex' | 'aria-label'> & {
  /** The region's name while it scrolls, e.g. "Stage, scrollable". */
  label: string
  as?: 'div' | 'pre'
  children: ReactNode
}

export function ScrollRegion({ label, as = 'div', children, ...rest }: Props) {
  const [ref, scrolls] = useScrolls<HTMLDivElement & HTMLPreElement>()
  const Tag = as
  const region = scrolls ? { role: 'region', 'aria-label': label, tabIndex: 0 } : {}
  return (
    <Tag ref={ref} {...rest} {...region} data-scrolls={scrolls ? 'true' : undefined}>
      {children}
    </Tag>
  )
}
