/**
 * ProductMark: a shell part of the Vela site, not a kit component, never exported from the package.
 *
 * Stand-in for Product Mark (spec draft, not in the kit): the spec thread's draft of 1 Nov 2026,
 * whose logo states Omkar approved at 09:34 IST; it is not in this repository yet, and it has not
 * been approved as a kit component, so it lives here and not in `src/`. It draws Vela's own logo,
 * the Pulse mark (`brand/README.md`). It sits outside `src/`, so the kit never binds the two pulse
 * tokens (`src/styles/brand.test.ts`), and it is deleted if the kit ever takes the part.
 *
 * - **Closed props, held by the compiler.** `size` is required. `label` (named, `role="img"`) or
 *   `decorative` (`aria-hidden`), never both. `on` and `animate` only on `hero`, and `on` is
 *   required there. `replay` only on a `hero` with `animate="once"`, and only with `decorative`:
 *   the button is named by `replay.label`, so the mark inside must not be named too. No `tile`,
 *   `color`, `className`, `style` or numeric size. The cases are in
 *   `src/styles/site-product-mark.types.test.tsx`.
 * - **The masters, unmodified.** Each size renders its own file from `brand/`, imported as text and
 *   parsed here, never redrawn: small is the favicon (core-16 in its squircle tile), regular is
 *   core-24, large is core-32, and hero is hero-96plus (`on="dark"`, white, with the ramp and the
 *   glow) or hero-96plus-light (`on="light"`, primary-500 only). The parse only wraps what is there:
 *   the hero's inner ring (its fill path, and on dark its ramp path) in `.pm-ring--inner`, the
 *   outer ring's `<g opacity=".75">` in `.pm-ring--outer`, and the dot in `.pm-dot`. A unit test
 *   holds every `d` to the file it came from. Gradient and filter ids get a per-instance prefix
 *   (`useId`), so two heroes, or a hero beside the app icon, never share a `url(#…)`.
 * - **The pulse plays once per visit.** `animate="once"` plays on the first render of the hero in a
 *   page session: module state below, never storage, so a route change back to the Overview does
 *   not replay it and a full reload does. Each ring scales from 0.82 and fades in from 0, about its
 *   own centre in the master's user space (the centres are read from the path data), over
 *   `--vela-duration-brand-pulse`, the outer ring `--vela-delay-brand-pulse-outer` later. After
 *   that, only a press of `replay` plays it, once, and a press while it plays is ignored.
 * - **Reduced motion.** Under `prefers-reduced-motion: reduce` nothing plays on arrival, and a
 *   press fades the rings in over `--vela-duration-base`, opacity only. The site has no Reduced
 *   motion setting of its own (the playground and the Copy page have switches for their own
 *   stages, which do not reach the Overview), so the media query is the one source.
 * - **States of `replay`:** at rest the outer ring is at 75%; on hover and focus it is at 100%, over
 *   `--vela-duration-fast`, and the kit's headless Tooltip (`src/headless`, the label kind, which
 *   leaves the button named by its own `aria-label`) shows `replay.label`; held, the mark's solid
 *   parts turn primary-600 (on light) or primary-300 (on dark), at once. While it plays, presses are
 *   ignored and the held colour is not shown.
 * - **Colour.** The teal ramp only, no drop shadow. Brand assets are the one place primitives are
 *   named (DESIGN.md), so the held colours are named here, as primitives, and reach the stylesheet
 *   through `--pm-held`; the stylesheet itself binds no primitive. In forced colours the solid
 *   parts take `CanvasText`, and the ramp and the glow, which are finish, are dropped.
 *
 * - **The core marks follow the theme, in their own colours only.** `regular` and `large` are drawn
 *   in currentColor, and their masters set it to primary-500 on the root. A master in the page takes
 *   the colour rule the master's own comment gives: primary-500 on light, primary-300 on dark. So the
 *   two are named here, as primitives (see Colour), and reach the stylesheet as `--pm-ink-light` and
 *   `--pm-ink-dark`; `.pm--core` picks between them with `light-dark()`, which follows the page's
 *   `color-scheme` (the token files set it), so it is right under the OS setting, the Appearance
 *   panel and a themed subtree alike. A browser without `light-dark()` keeps primary-500. `small` is the
 *   favicon, whose tile sets its own colours.
 *
 * The site header's logo is `<ProductMark size="regular" decorative />` inside the header's link
 * (demo/App.tsx): never `hero`, so it never pulses, and named by the link, never by the mark. The
 * header imports it from demo/shell/product-mark-core.tsx, which holds the core sizes and what every
 * size shares; this module adds the hero and its two drawings, and only the Overview imports it, so
 * the drawings load with the Overview's chunk and never with the first one (slice 7, page weight).
 */
import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { cn } from '../../src'
import { Tooltip } from '../../src/headless'
import heroDark from '../../brand/vela-hero-96plus.svg?raw'
import heroLight from '../../brand/vela-hero-96plus-light.svg?raw'
import './shell.css'
import { parseSvg, pathData, draw, styleObject, CORE_INK, CORE_MASTERS, type Named, type CoreProps, type Master } from './product-mark-core'

export { parseSvg, pathData, CORE_INK, type SvgNode } from './product-mark-core'

// ---------------------------------------------------------------------------------------- props --

/** `hero` with no `replay`: named or decorative, `on` required, `animate="once"` optional. */
type HeroProps = { size: 'hero'; on: 'light' | 'dark'; animate?: 'once'; replay?: never } & Named
/** `hero` with `replay`: always `animate="once"`, always `decorative`, the button named by `replay.label`. */
type HeroReplayProps = {
  size: 'hero'
  on: 'light' | 'dark'
  animate: 'once'
  replay: { label: string }
  decorative: true
  label?: never
}

export type ProductMarkProps = CoreProps | HeroProps | HeroReplayProps
export type ProductMarkSize = ProductMarkProps['size']

// -------------------------------------------------------------------------------------- masters --

/**
 * A ring's centre, from its master's path data. Each ring is a closed curve through points sampled
 * at even angles from +x, written as cubic Béziers, so the first subpath's on-curve points include
 * the four on the axes through the centre: (cx + r, cy) first, then (cx, cy + r) a quarter of the
 * way round, (cx − r, cy) halfway and (cx, cy − r) at three quarters. The centre is read from those,
 * and they must agree, or this throws.
 */
export function ringCentre(d: string): { cx: number; cy: number } {
  const first = d.split(/(?=M)/)[0]
  const n = (first.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  const points: [number, number][] = [[n[0], n[1]]]
  for (let i = 2; i + 5 < n.length; i += 6) points.push([n[i + 4], n[i + 5]])
  const segments = points.length - 1
  if (segments < 4 || segments % 4 !== 0) throw new Error(`ringCentre: ${segments} segments is not a multiple of four`)
  const at = (k: number) => points[(k * segments) / 4]
  const [cx, cy] = [at(1)[0], at(0)[1]]
  if (Math.abs(at(2)[1] - cy) > 1e-9 || Math.abs(at(3)[0] - cx) > 1e-9) throw new Error('ringCentre: the axis points do not share a centre')
  return { cx, cy }
}


/**
 * A hero master: `<svg><g>` holding, in order, any `<defs>` and the glow (static), the inner ring's
 * paths, the outer ring's `<g opacity=".75">`, and the dot. Throws if the file is shaped otherwise.
 */
function heroMaster(source: string): Master {
  const svg = parseSvg(source)
  const group = svg.children.length === 1 && svg.children[0].tag === 'g' ? svg.children[0] : null
  if (!group) throw new Error('heroMaster: expected one <g> inside <svg>')
  const kids = group.children
  const outerAt = kids.findIndex((k) => k.tag === 'g' && k.attrs.opacity === '.75')
  const firstPath = kids.findIndex((k) => k.tag === 'path')
  const dot = kids[kids.length - 1]
  if (outerAt < 0 || firstPath < 0 || firstPath > outerAt || dot.tag !== 'circle' || outerAt !== kids.length - 2) {
    throw new Error('heroMaster: expected the inner ring, then <g opacity=".75">, then the dot')
  }
  const inner = kids.slice(firstPath, outerAt)
  if (!inner.every((k) => k.tag === 'path')) throw new Error('heroMaster: the inner ring is not paths only')
  const outer = kids[outerAt]
  return {
    viewBox: svg.attrs.viewBox,
    parts: [
      { part: 'static', nodes: kids.slice(0, firstPath) },
      { part: 'inner', nodes: inner },
      { part: 'outer', nodes: [outer] },
      { part: 'dot', nodes: [dot] },
    ],
    centres: { inner: ringCentre(inner[0].attrs.d), outer: ringCentre(pathData(outer)[0]) },
  }
}

/** The source of each master, by size (and, for the hero, by what it sits on). Exported for the test. */
export const MASTER_FILES = {
  small: 'brand/vela-favicon-16.svg',
  regular: 'brand/vela-mark-core-24.svg',
  large: 'brand/vela-mark-core-32.svg',
  'hero-dark': 'brand/vela-hero-96plus.svg',
  'hero-light': 'brand/vela-hero-96plus-light.svg',
} as const
type MasterKey = keyof typeof MASTER_FILES

const MASTERS: Record<MasterKey, Master> = {
  ...CORE_MASTERS,
  'hero-dark': heroMaster(heroDark),
  'hero-light': heroMaster(heroLight),
}

/** The colour a held `replay` turns the mark's solid parts (the spec's Motion table). Primitives: see the header. */
const HELD: Record<'light' | 'dark', string> = { light: 'var(--vela-primary-600)', dark: 'var(--vela-primary-300)' }



// ------------------------------------------------------------------------------------ the pulse --

/**
 * Whether the arrival pulse has had its turn in this page session. Module state, so it lasts as
 * long as the page does: a route change back to the Overview finds it set, and a full reload starts
 * again. Never storage: a new visit is a new page session.
 */
let arrived = false

/** The system setting. The site has no Reduced motion setting of its own (see the header). */
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** `pulse`: scale and fade, ring by ring. `fade`: opacity only, under reduced motion. */
type Playing = 'pulse' | 'fade' | null

// ------------------------------------------------------------------------------------ component --

export function ProductMark(props: ProductMarkProps) {
  const hero = props.size === 'hero' ? props : null
  const key: MasterKey = hero ? `hero-${hero.on}` : (props.size as Exclude<ProductMarkSize, 'hero'>)
  const master = MASTERS[key]
  const prefix = `pm${useId().replace(/[^a-zA-Z0-9]/g, '')}-`
  const svgRef = useRef<SVGSVGElement>(null)

  const once = hero?.animate === 'once'
  // The first render of a hero that pulses on arrival uses up this visit's arrival, played or not
  // (under reduced motion it is not played, and it does not wait for the setting to change).
  const [playing, setPlaying] = useState<Playing>(() => (once && !arrived && !reducedMotion() ? 'pulse' : null))
  useEffect(() => { if (once) arrived = true }, [once])

  // The outer ring starts last and ends last: when its animation ends, or is cancelled, the pulse
  // is over and a press may play it again. (React has no prop for animationcancel.)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const done = (e: Event) => { if ((e.target as Element).classList.contains('pm-ring--outer')) setPlaying(null) }
    svg.addEventListener('animationend', done)
    svg.addEventListener('animationcancel', done)
    return () => { svg.removeEventListener('animationend', done); svg.removeEventListener('animationcancel', done) }
  }, [])

  const replay = hero?.replay
  const press = () => {
    if (playing) return // a press while it plays is ignored
    setPlaying(reducedMotion() ? 'fade' : 'pulse')
  }

  // A core mark's root colour is the master's primary-500; in the page it is the colour rule's pair
  // instead, through --pm-ink-light and --pm-ink-dark (see the header). Nothing else in the style moves.
  const core = props.size === 'regular' || props.size === 'large'
  const rootStyle = master.rootStyle ? styleObject(master.rootStyle) : undefined
  const style = core ? { ...rootStyle, color: undefined, ...CORE_INK } as CSSProperties : rootStyle

  const named = replay || props.decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': props.label }
  const svg = (
    <svg
      ref={svgRef}
      className={cn('pm', `pm--${props.size}`, core && 'pm--core', hero && `pm--on-${hero.on}`)}
      viewBox={master.viewBox}
      style={style}
      focusable="false"
      data-playing={playing ?? undefined}
      {...named}
    >
      {master.parts.map(({ part, nodes }, i) => {
        const drawn = nodes.map((n, j) => draw(n, prefix, j, !!hero))
        if (part === 'static') return <Fragment key={i}>{drawn}</Fragment>
        const centre = part === 'inner' || part === 'outer' ? master.centres[part] : undefined
        return (
          <g
            key={i}
            className={part === 'dot' ? 'pm-dot' : `pm-ring pm-ring--${part}`}
            // Each ring scales about its own centre, in the master's user space (transform-box: view-box).
            style={centre ? { transformOrigin: `${centre.cx}px ${centre.cy}px` } : undefined}
          >
            {drawn}
          </g>
        )
      })}
    </svg>
  )

  if (!replay || !hero) return svg
  return (
    <Tooltip content={replay.label}>
      <button
        type="button"
        className="pm-replay"
        aria-label={replay.label}
        data-playing={playing ?? undefined}
        style={{ '--pm-held': HELD[hero.on] } as CSSProperties}
        onClick={press}
      >
        {svg}
      </button>
    </Tooltip>
  )
}
