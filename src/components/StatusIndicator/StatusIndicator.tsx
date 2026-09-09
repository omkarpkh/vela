import { cn } from '../../lib/cn'

/**
 * The five health states. This is NOT severity and NOT risk — those are
 * separate taxonomies with their own tokens. There is no "critical" status
 * and no "high" status; if you reach for one, you want a different component.
 */
export type Status = 'unknown' | 'healthy' | 'warning' | 'medium' | 'unhealthy'

export interface StatusIndicatorProps {
  status: Status
  /** Visible text. Strongly preferred — see the aria-label fallback below. */
  label?: string
  size?: 'small' | 'regular'
  className?: string
}

const FALLBACK_LABEL: Record<Status, string> = {
  unknown: 'Status unknown',
  healthy: 'Healthy',
  warning: 'Warning',
  medium: 'Degraded',
  unhealthy: 'Unhealthy',
}

export function StatusIndicator({
  status,
  label,
  size = 'regular',
  className,
}: StatusIndicatorProps) {
  // Colour alone is not an accessible signal (WCAG 1.4.1). With no visible
  // label the dot still carries a text alternative.
  return (
    <span
      className={cn('vela-status', `vela-status--${status}`, `vela-status--${size}`, className)}
      role="img"
      aria-label={label ? undefined : FALLBACK_LABEL[status]}
    >
      <span className="vela-status__dot" aria-hidden="true" />
      {label && <span className="vela-status__label">{label}</span>}
    </span>
  )
}
