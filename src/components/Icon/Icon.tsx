import { cn } from '../../lib/cn'
import { GLYPHS } from '../../icons/generated'
import { ICON_NAMES, type IconName } from '../../icons/names'

/** Three boxes, bound to --vela-icon-size-small / --vela-icon-size / --vela-icon-size-large (12, 16, 20). */
export type IconSize = 'regular' | 'small' | 'large'

/**
 * Two neutral colours and a pass-through. There is no severity, risk or status tone: a glyph in a
 * taxonomy's colour belongs to the component that owns that taxonomy (Contextual Alert, Risk Pill,
 * Status Indicator), and `inherit` takes the colour of the text it sits in.
 */
export type IconTone = 'default' | 'muted' | 'inherit'

export interface IconProps {
  /** One of the curated glyphs, ICON_NAMES. Required: there is no default glyph. */
  name: IconName
  size?: IconSize
  tone?: IconTone
  /**
   * The accessible name, when the glyph carries meaning nothing beside it states. With a label the
   * glyph is `role="img"`; without one it is `aria-hidden` and assistive technology skips it.
   */
  label?: string
  className?: string
}

const KNOWN: ReadonlySet<string> = new Set(ICON_NAMES)

export function Icon({ name, size = 'regular', tone = 'default', label, className }: IconProps) {
  // The type rejects an unknown name; this is for the JavaScript caller the type cannot reach.
  // A named error beats React's "element type is invalid" three frames further down.
  if (!KNOWN.has(name))
    throw new Error(`<Icon name="${String(name)}">: not in Vela's curated set. Use one of ICON_NAMES (guidelines/components/icon.md, Glyphs).`)
  const Glyph = GLYPHS[name]
  const classes = cn('vela-icon', `vela-icon--${size}`, tone !== 'inherit' && `vela-icon--${tone}`, className)
  return label
    ? <Glyph className={classes} role="img" aria-label={label} aria-hidden={undefined} />
    : <Glyph className={classes} />
}
