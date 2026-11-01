import * as React from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../../components/Icon'
import { BrandMark } from '../../components/BrandMark'
import { ICON_NAMES, type IconName } from '../../icons/names'
import type { BrandMarkName } from '../../components/BrandMark'
import { Tooltip, type TooltipPlacement } from '../Tooltip'

/**
 * Icon Button on Vela's Tooltip — headless because the tooltip is Base UI's
 * (`guidelines/components/icon-button.md`); there is no core implementation.
 *
 * A button or a link drawn as one glyph. It is always named by `label`, and its tooltip, a label
 * tooltip (Tooltip `kind="label"`), shows that same name to sighted pointer and keyboard users
 * without a screen reader hearing it twice.
 */

/** Two boxes: 24px (`--vela-control-height-24`, which is `--vela-target-min`) and 35px. */
export type IconButtonSize = 'tiny' | 'regular'

/**
 * Exactly one glyph, from a closed set: one of Icon's fifty, GitHub's or Figma's own mark, or the
 * word "npm". Figma's mark is 20px only, so it has no `tiny` (whose glyph is 16px).
 */
type Glyph =
  | { icon: IconName; brandMark?: never; word?: never; size?: IconButtonSize }
  | { brandMark: Exclude<BrandMarkName, 'figma'>; icon?: never; word?: never; size?: IconButtonSize }
  | { brandMark: 'figma'; icon?: never; word?: never; size?: 'regular' }
  | { word: 'npm'; icon?: never; brandMark?: never; size?: IconButtonSize }

interface Naming {
  /** Required. The accessible name and the tooltip's words. */
  label: string
  /** The side the tooltip opens on: Tooltip's own four. */
  tooltipPlacement?: TooltipPlacement
  /** The name is `label` and nothing else: no node inside, no second name, no browser tooltip. */
  children?: never
  'aria-label'?: never
  'aria-labelledby'?: never
  title?: never
}

type NativeButton = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'aria-labelledby' | 'title' | 'type' | 'disabled' | 'onClick'>
type NativeLink = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'aria-label' | 'aria-labelledby' | 'title' | 'type' | 'href' | 'target' | 'rel' | 'onClick'>

/** The button form: an action. `onClick` is required; `href` and `opensInNewTab` don't exist here. */
export type IconButtonButtonProps = Glyph & Naming & NativeButton & {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit'
  /** Native. Rare: out of the tab order, no tooltip, no hover, no press. */
  disabled?: boolean
  href?: never
  opensInNewTab?: never
}

/** The link form: a destination, `<a href>`. No `onClick`, `type` or `disabled`. */
export type IconButtonLinkProps = Glyph & Naming & NativeLink & {
  href: string
  /** `target="_blank"`, `rel="noopener noreferrer"`, and ", opens in a new tab" on the name and the tooltip. */
  opensInNewTab?: boolean
  onClick?: never
  type?: never
  disabled?: never
}

export type IconButtonProps = IconButtonButtonProps | IconButtonLinkProps

const NEW_TAB = ', opens in a new tab'
const KNOWN: ReadonlySet<string> = new Set(ICON_NAMES)

export const IconButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, IconButtonProps>(
  function IconButton(props, ref) {
    const {
      label, icon, brandMark, word, size = 'regular', tooltipPlacement = 'top',
      href, opensInNewTab = false, onClick, type = 'button', disabled = false,
      className, onPointerDown, onPointerUp, onPointerCancel, onLostPointerCapture,
      ...rest
    } = props as Omit<IconButtonButtonProps, 'href' | 'opensInNewTab' | 'size' | 'icon' | 'brandMark' | 'word' | 'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture'> & {
      href?: string; opensInNewTab?: boolean; size?: IconButtonSize; icon?: IconName; brandMark?: BrandMarkName; word?: 'npm'
      onPointerDown?: React.PointerEventHandler<HTMLElement>; onPointerUp?: React.PointerEventHandler<HTMLElement>
      onPointerCancel?: React.PointerEventHandler<HTMLElement>; onLostPointerCapture?: React.PointerEventHandler<HTMLElement>
    }

    // The types reject all of these; this is for the JavaScript caller the types cannot reach.
    // A named error beats an unnamed control, or one with two glyphs.
    if (typeof label !== 'string' || label.trim() === '') throw new Error('<IconButton>: `label` is required. It is the accessible name and the tooltip\'s words (guidelines/components/icon-button.md).')
    const glyphs = [icon, brandMark, word].filter((g) => g !== undefined).length
    if (glyphs !== 1) throw new Error(`<IconButton label="${label}">: give exactly one of \`icon\`, \`brandMark\` or \`word\` (got ${glyphs}).`)
    if (icon !== undefined && !KNOWN.has(icon)) throw new Error(`<IconButton icon="${String(icon)}">: not in Vela's curated set. Use one of ICON_NAMES.`)
    if (word !== undefined && word !== 'npm') throw new Error(`<IconButton word="${String(word)}">: the only word is "npm".`)
    if (size !== 'tiny' && size !== 'regular') throw new Error(`<IconButton size="${String(size)}">: use "tiny" or "regular".`)
    if (brandMark === 'figma' && size === 'tiny') throw new Error('<IconButton brandMark="figma" size="tiny">: Figma\'s mark is 20px only, so it needs size "regular".')
    const isLink = typeof href === 'string'
    if (isLink === (typeof onClick === 'function')) throw new Error(`<IconButton label="${label}">: give \`href\` (a link) or \`onClick\` (a button), not both and not neither.`)

    // The name, said once: the label, and that a link leaves the page. The tooltip shows the same words.
    const name = isLink && opensInNewTab ? `${label}${NEW_TAB}` : label
    // A brand mark or the word is another company's, or stands beside one: no fill, no scale.
    const still = brandMark !== undefined || word !== undefined

    // The pointer press: a flag the stylesheet scales the glyph by, never the box. Pointer only,
    // so a keyboard press moves nothing. Captured, so the release always lands here.
    const press = (event: React.PointerEvent<HTMLElement>) => {
      const el = event.currentTarget
      el.setAttribute('data-vela-pressed', '')
      try { el.setPointerCapture(event.pointerId) } catch { /* capture is best-effort */ }
      onPointerDown?.(event)
    }
    const release = (event: React.PointerEvent<HTMLElement>, handler?: React.PointerEventHandler<HTMLElement>) => {
      event.currentTarget.removeAttribute('data-vela-pressed')
      handler?.(event)
    }
    const pointer = {
      onPointerDown: press,
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => release(e, onPointerUp),
      onPointerCancel: (e: React.PointerEvent<HTMLElement>) => release(e, onPointerCancel),
      onLostPointerCapture: (e: React.PointerEvent<HTMLElement>) => release(e, onLostPointerCapture),
    }

    const glyphSize = size === 'tiny' ? 'regular' : 'large'
    const glyph =
      icon !== undefined ? (
        <span className="vela-icon-button__glyph" aria-hidden="true">
          <Icon name={icon} size={glyphSize} tone="inherit" />
        </span>
      ) : brandMark !== undefined ? (
        // Icon Button tiny holds a 16px glyph, regular a 20px one: Brand Mark's regular and large.
        brandMark === 'figma' ? <BrandMark name="figma" size="large" decorative /> : <BrandMark name={brandMark} size={glyphSize} decorative />
      ) : (
        <span className="vela-icon-button__word" aria-hidden="true">{word}</span>
      )

    const classes = cn('vela-icon-button', `vela-icon-button--${size}`, still && 'vela-icon-button--still', className)

    const control = isLink ? (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        {...(rest as NativeLink)}
        href={href}
        {...(opensInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        aria-label={name}
        className={classes}
        {...pointer}
      >
        {glyph}
      </a>
    ) : (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        {...(rest as NativeButton)}
        type={type}
        disabled={disabled}
        aria-label={name}
        className={classes}
        onClick={onClick}
        {...pointer}
      >
        {glyph}
      </button>
    )

    // A disabled control can't be focused and, in most browsers, gets no pointer events, so its
    // tooltip is unreachable; it has none (Tooltip, tooltip-not-on-disabled).
    if (!isLink && disabled) return control
    return (
      <Tooltip kind="label" content={name} placement={tooltipPlacement}>
        {control}
      </Tooltip>
    )
  },
)
