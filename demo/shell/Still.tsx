/**
 * A component's still: a shell part of the Vela site, not a kit component, never exported from the
 * package. Slice 7 of the playground uplift.
 *
 * The real component, drawn at build time by npm run stills (scripts/stills/stills.mjs) into a small
 * image at its real size, never a hand drawing, never scaled, so its words stay 12px or more. It is
 * what the Next cards on a component's tabs and the "Where it sits" boxes on a proposal show, so a
 * card costs one small image, not a live component and its code.
 *
 * - `<picture>`: AVIF at 2× first, a PNG at 1× as the fallback, for the theme the page shows (the
 *   Appearance panel's choice, or the screen's under System), swapped when that changes.
 * - Empty alt text: the still sits inside a link whose words already name the component.
 * - Lazy: every still is below the first screen. Width and height are set, so nothing moves as it loads.
 * - Every built component has one (src/styles/site-stills.test.ts). A proposal is not built, so it
 *   has no still, and no placeholder in its place.
 */
import { useEffect, useState } from 'react'
import { CATALOG } from '../playground/catalog'
import './shell.css'

/** The still's size in CSS pixels: scripts/stills/still-key.mjs's STILL (the test holds the two equal). */
export const STILL_SIZE = { width: 200, height: 120 }

/** True for a built component, which has a still. */
export const hasStill = (id: string) => CATALOG.some((c) => c.id === id)

/** The theme the page shows: data-theme on the root, or the screen's when it says neither. */
function usePageTheme(): 'light' | 'dark' {
  const read = (): 'light' | 'dark' => {
    const set = document.documentElement.getAttribute('data-theme')
    if (set === 'light' || set === 'dark') return set
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  const [theme, setTheme] = useState(read)
  useEffect(() => {
    const on = () => setTheme(read())
    const mo = new MutationObserver(on)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
    mq?.addEventListener('change', on)
    return () => { mo.disconnect(); mq?.removeEventListener('change', on) }
  }, [])
  return theme
}

/** The two files of one still, under the site's base path. */
export const stillUrls = (id: string, theme: 'light' | 'dark') => {
  const base = `${import.meta.env.BASE_URL}stills/${id}-${theme}`
  return { avif: `${base}@2x.avif`, png: `${base}.png` }
}

export function Still({ id, className }: { id: string; className?: string }) {
  const theme = usePageTheme()
  if (!hasStill(id)) return null
  const { avif, png } = stillUrls(id, theme)
  return (
    <picture className={className ? `shell-still ${className}` : 'shell-still'}>
      <source type="image/avif" srcSet={`${avif} 2x`} />
      <img src={png} alt="" width={STILL_SIZE.width} height={STILL_SIZE.height} loading="lazy" decoding="async" />
    </picture>
  )
}
