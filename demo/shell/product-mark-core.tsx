/**
 * The Product Mark's core sizes, and the parts every size shares: a shell part of the Vela site, not
 * a kit component, never exported from the package. The full part, with the hero, is
 * demo/shell/ProductMark.tsx; its header holds the rules for both.
 *
 * Split out of ProductMark.tsx in slice 7, for page weight: the site header draws the regular mark on
 * every page, so it is in the first chunk, and the two hero drawings (brand/vela-hero-96plus*.svg)
 * are not. The hero lives in ProductMark.tsx, which only the Overview imports, so the drawings load
 * with the Overview's own chunk, when it is opened (src/styles/site-chunks.test.ts holds this).
 *
 * `ProductMark` here takes the core sizes only, with the same closed props as the full part:
 * `small`, `regular` or `large`, named or decorative, and nothing else.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../../src'
import favicon16 from '../../brand/vela-favicon-16.svg?raw'
import core24 from '../../brand/vela-mark-core-24.svg?raw'
import core32 from '../../brand/vela-mark-core-32.svg?raw'
import './shell.css'

// ---------------------------------------------------------------------------------------- props --

export type Named = { label: string; decorative?: never } | { decorative: true; label?: never }
export type NoHero = { animate?: never; on?: never; replay?: never }

/** `small`, `regular`, `large`: 16, 24 and 32px. No `on`, no `animate`, no `replay`. */
export type CoreProps = { size: 'small' | 'regular' | 'large' } & NoHero & Named

// -------------------------------------------------------------------------------------- masters --

/** One element of a master, as the file writes it. */
export interface SvgNode { tag: string; attrs: Record<string, string>; children: SvgNode[] }

/**
 * The masters are small, hand-written SVG: elements and attributes, no text, no entities. This reads
 * exactly that and throws on anything else, so a changed file fails loudly instead of drawing wrong.
 */
export function parseSvg(source: string): SvgNode {
  const root: SvgNode = { tag: '#root', attrs: {}, children: [] }
  const stack = [root]
  const token = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g
  for (const m of source.matchAll(token)) {
    if (m[0].startsWith('<!--')) continue
    if (m[5] !== undefined) {
      if (m[5].trim()) throw new Error(`parseSvg: unexpected text "${m[5].trim().slice(0, 20)}"`)
      continue
    }
    const [, closing, tag, rawAttrs, selfClosing] = m
    if (closing) {
      const open = stack.pop()
      if (open?.tag !== tag) throw new Error(`parseSvg: </${tag}> closes <${open?.tag}>`)
      continue
    }
    const attrs = Object.fromEntries([...rawAttrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]))
    const node: SvgNode = { tag, attrs, children: [] }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing) stack.push(node)
  }
  if (stack.length !== 1) throw new Error('parseSvg: an element is never closed')
  const svg = root.children.find((n) => n.tag === 'svg')
  if (!svg) throw new Error('parseSvg: no <svg>')
  return svg
}

/** Every `d` in a tree, in document order: what the unit test holds to the brand file. */
export const pathData = (node: SvgNode): string[] =>
  [...(node.tag === 'path' && node.attrs.d ? [node.attrs.d] : []), ...node.children.flatMap(pathData)]


export type Part = 'static' | 'inner' | 'outer' | 'dot'

/** A master ready to draw: its viewBox and its top-level parts, each tagged with what it is. */
export interface Master { viewBox: string; rootStyle?: string; parts: { part: Part; nodes: SvgNode[] }[]; centres: Partial<Record<'inner' | 'outer', { cx: number; cy: number }>> }

/** A core or tiled master: drawn whole, nothing in it moves. */
export function staticMaster(source: string): Master {
  const svg = parseSvg(source)
  // The core marks draw in currentColor and set it on their root (`style="color:#0a6c7d"`); that
  // colour comes with them. The favicon sets its own colours inside.
  return { viewBox: svg.attrs.viewBox, rootStyle: svg.attrs.style, parts: [{ part: 'static', nodes: svg.children }], centres: {} }
}

/** The core masters, by size: the favicon (core-16 in its squircle tile), core-24 and core-32. */
export const CORE_MASTERS: Record<CoreProps['size'], Master> = {
  small: staticMaster(favicon16),
  regular: staticMaster(core24),
  large: staticMaster(core32),
}

/** The core marks' colour rule (brand/README.md, Colours; each master's comment). Primitives: see the header. */
export const CORE_INK = { '--pm-ink-light': 'var(--vela-primary-500)', '--pm-ink-dark': 'var(--vela-primary-300)' } as const

// ------------------------------------------------------------------------------------ rendering --

export const camel = (name: string) => (/^(aria|data)-/.test(name) ? name : name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))
export const styleObject = (css: string): CSSProperties =>
  Object.fromEntries(css.split(';').map((d) => d.split(':').map((s) => s.trim())).filter(([k, v]) => k && v).map(([k, v]) => [camel(k), v]))

/**
 * What a hero element is to the stylesheet: `pm-ink` for a solid fill (the held colour and forced
 * colours repaint it), `pm-finish` for a gradient fill (the ramp and the glow, dropped in forced
 * colours). The core marks draw in currentColor and take neither.
 */
const roleOf = (attrs: Record<string, string>) =>
  !attrs.fill || attrs.fill === 'none' ? undefined : attrs.fill.startsWith('url(') ? 'pm-finish' : 'pm-ink'

/** One master element as React, its ids and `url(#…)` references prefixed for this instance. */
export function draw(node: SvgNode, prefix: string, key: number, hero: boolean): ReactNode {
  const props: Record<string, unknown> = {}
  for (const [name, raw] of Object.entries(node.attrs)) {
    const value = name === 'id' ? `${prefix}${raw}` : raw.replace(/url\(#([\w-]+)\)/g, (_, id: string) => `url(#${prefix}${id})`)
    if (name === 'style') props.style = styleObject(value)
    else if (name === 'class') props.className = value
    else props[camel(name)] = value
  }
  if (hero) props.className = cn(props.className as string | undefined, roleOf(node.attrs))
  const Tag = node.tag as 'g'
  return <Tag key={key} {...(props as object)}>{node.children.map((c, i) => draw(c, prefix, i, hero))}</Tag>
}

// ------------------------------------------------------------------------------------ component --

/** The `className`, style and naming a static master's `<svg>` takes, for any size but the hero. */
export function coreSvgProps(size: CoreProps['size'], master: Master, named: { label?: string; decorative?: true }) {
  // A core mark's root colour is the master's primary-500; in the page it is the colour rule's pair
  // instead, through --pm-ink-light and --pm-ink-dark (see ProductMark.tsx). Nothing else moves.
  const core = size === 'regular' || size === 'large'
  const rootStyle = master.rootStyle ? styleObject(master.rootStyle) : undefined
  const style = core ? { ...rootStyle, color: undefined, ...CORE_INK } as CSSProperties : rootStyle
  return {
    className: cn('pm', `pm--${size}`, core && 'pm--core'),
    style,
    ...(named.decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': named.label }),
  }
}

/** Product Mark at a core size: `small`, `regular` or `large`. Nothing in it moves. */
export function ProductMark(props: CoreProps) {
  const master = CORE_MASTERS[props.size]
  const prefix = `pm${useId().replace(/[^a-zA-Z0-9]/g, '')}-`
  return (
    <svg viewBox={master.viewBox} focusable="false" {...coreSvgProps(props.size, master, props)}>
      {master.parts.flatMap(({ nodes }) => nodes).map((n, j) => draw(n, prefix, j, false))}
    </svg>
  )
}
