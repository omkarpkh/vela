/**
 * The arrival: a shell behaviour of the Vela site (slice 1 of the playground uplift; the storyboard
 * in s5-tabs, section 6). How a page lands, part by part, the one sequence every page uses.
 *
 * - Once per arrival on a page, from the nav, Search or a link. Never on a tab switch: a switch
 *   happens hundreds of times a day, so only its press feedback moves.
 * - First screen only. Below it nothing fades: it is simply there.
 * - Opacity only, never a slide. The header, the nav, the title and the page tabs never animate:
 *   they say where you are.
 * - A part opts in with `data-arrive="1" | "2" | "3"`. Step 1, the lead, fades in over
 *   --vela-duration-base on --vela-ease-out; each later step starts one --vela-duration-fast after the
 *   last, so the third is done by 2 × fast + base (420ms with today's tokens).
 * - Off under reduced motion, and off when the address asks for a section: the reader is going
 *   straight there.
 */
import { useEffect } from 'react'

const ms = (name: string, fallback: number) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = parseFloat(v)
  return Number.isFinite(n) ? (v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n) : fallback
}

/** How long the sequence takes, from the motion tokens: two fast steps, then the base fade. */
export const arrivalMs = () => 2 * ms('--vela-duration-fast', 120) + ms('--vela-duration-base', 180)

/** Plays the arrival in the page's main region once, when the calling page mounts. */
export function useArrival() {
  useEffect(() => {
    const root = document.getElementById('main')
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (/[?&]section=/.test(window.location.hash)) return
    const fold = window.innerHeight
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-arrive]')))
      if (el.getBoundingClientRect().top >= fold) el.setAttribute('data-arrive-below', '')
    root.setAttribute('data-arriving', '')
    const t = window.setTimeout(() => root.removeAttribute('data-arriving'), arrivalMs())
    return () => { window.clearTimeout(t); root.removeAttribute('data-arriving') }
  }, [])
}
