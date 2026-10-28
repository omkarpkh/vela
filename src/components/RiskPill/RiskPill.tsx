import { cn } from '../../lib/cn'

/**
 * The three risk levels. Risk describes a SCORE — of a user, an asset, a
 * finding. It is NOT severity (six levels, describes events) and NOT status
 * (five states, the health dot); each has its own tokens. There is no
 * "critical" risk and no "unhealthy" risk; if you reach for one, you want a
 * different component. See guidelines/foundations/color.md.
 */
export type Risk = 'low' | 'medium' | 'high'

export interface RiskPillProps {
  risk: Risk
  /**
   * Visible text. Defaults to the level word ("Low", "Medium", "High"). A
   * custom label must still name the level — "High · 87", never a bare "87" —
   * or the colour becomes the only signal.
   */
  label?: string
  size?: 'regular' | 'small'
  className?: string
}

const LEVEL_LABEL: Record<Risk, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

/**
 * A risk score as a small, read-only pill. It is a label, not a control: no
 * hover, no focus, no click. Filtering by risk is a different component's job.
 */
export function RiskPill({ risk, label, size = 'regular', className }: RiskPillProps) {
  // The pill always renders text (WCAG 1.4.1): colour on its own is not a
  // signal, so with no label the level word is the label.
  return (
    <span className={cn('vela-risk', `vela-risk--${risk}`, `vela-risk--${size}`, className)}>
      {label ?? LEVEL_LABEL[risk]}
    </span>
  )
}
