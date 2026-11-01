import { GITHUB_MARK } from '../../brand-marks/github/mark'
import { FIGMA_MARK } from '../../brand-marks/figma/mark'

/**
 * Another company's own logo, drawn as its owner drew it, used only to link to that company's
 * service. A closed set of two, kept apart from Icon: an icon means a thing or an action in Vela;
 * a brand mark means "go to that service". It never moves, and it is always the interface's icon
 * grey, --vela-brand-mark, set by its stylesheet and by no prop.
 */
export type BrandMarkName = 'github' | 'figma'

/** Two boxes, bound to --vela-icon-size (16) and --vela-icon-size-large (20). Figma's mark is large only. */
export type BrandMarkSize = 'regular' | 'large'

/** GitHub at either size; Figma at `large` only, because its line drawing is too fine at 16px. */
type Sizing =
  | { name: 'github'; size?: 'regular' | 'large' }
  | { name: 'figma'; size?: 'large' }

/**
 * Named once, or not at all. `label` when the mark stands alone (a caption needs a name);
 * `decorative` inside a control that already carries the name ("Vela on GitHub").
 */
type Naming =
  | { label: string; decorative?: never }
  | { decorative: true; label?: never }

/** No tone, colour, className, style or title: the owners forbid restyling their marks. */
export type BrandMarkProps = Sizing & Naming

const MARKS: Record<BrandMarkName, { viewBox: string; d: string; fillRule?: 'evenodd' }> = {
  github: GITHUB_MARK,
  figma: FIGMA_MARK,
}

export function BrandMark(props: BrandMarkProps) {
  const { name, size = 'large', label, decorative } = props as { name: BrandMarkName; size?: BrandMarkSize; label?: string; decorative?: true }
  // The types reject all of these; this is for the JavaScript caller the types cannot reach.
  // A named error beats a mark that is silently unnamed, or named twice.
  const mark = Object.prototype.hasOwnProperty.call(MARKS, name) ? MARKS[name] : undefined
  if (!mark) throw new Error(`<BrandMark name="${String(name)}">: not a brand mark. Use "github" or "figma" (guidelines/components/brand-mark.md).`)
  if (size !== 'regular' && size !== 'large') throw new Error(`<BrandMark size="${String(size)}">: use "regular" or "large".`)
  if (name === 'figma' && size === 'regular') throw new Error('<BrandMark name="figma" size="regular">: Figma\'s mark is large only.')
  const named = typeof label === 'string' && label.trim() !== ''
  if (named === (decorative === true))
    throw new Error('<BrandMark>: give exactly one of `label` (standing alone) or `decorative` (inside a named control).')

  // No <title>: a title is a second name, and some readers announce both.
  return (
    <svg
      className={`vela-brand-mark vela-brand-mark--${size}`}
      viewBox={mark.viewBox}
      fill="currentColor"
      focusable="false"
      {...(named ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <path d={mark.d} fillRule={mark.fillRule} />
    </svg>
  )
}
