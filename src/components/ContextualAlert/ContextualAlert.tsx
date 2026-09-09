import * as React from 'react'
import { cn } from '../../lib/cn'
import {
  CheckCircleIcon,
  InfoCircleIcon,
  WarningTriangleIcon,
  CriticalOctagonIcon,
  CloseIcon,
} from '../../lib/icons'

/**
 * The six severity levels. Describes events and alerts.
 * There is no "high severity" — that is the Risk taxonomy, and the two are
 * kept apart on purpose. See guidelines/foundations/color.md.
 */
export type Severity = 'success' | 'info' | 'warning' | 'minor' | 'major' | 'critical'

export interface ContextualAlertProps {
  severity: Severity
  /** Optional bold lead-in. The body is always required. */
  title?: string
  children: React.ReactNode
  /** Renders a dismiss control. Omit for alerts the user must not clear. */
  onDismiss?: () => void
  dismissLabel?: string
  className?: string
}

const ICON: Record<Severity, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  success: CheckCircleIcon,
  info: InfoCircleIcon,
  warning: WarningTriangleIcon,
  minor: WarningTriangleIcon,
  major: WarningTriangleIcon,
  critical: CriticalOctagonIcon,
}

/** major and critical interrupt; everything else waits its turn. */
const ASSERTIVE: ReadonlySet<Severity> = new Set<Severity>(['major', 'critical'])

export function ContextualAlert({
  severity,
  title,
  children,
  onDismiss,
  dismissLabel = 'Dismiss',
  className,
}: ContextualAlertProps) {
  const Icon = ICON[severity]
  const assertive = ASSERTIVE.has(severity)

  return (
    <div
      className={cn('vela-alert', `vela-alert--${severity}`, className)}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
    >
      <Icon className="vela-alert__icon" />
      <div className="vela-alert__body">
        {title && <strong className="vela-alert__title">{title}</strong>}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          className="vela-alert__dismiss"
          onClick={onDismiss}
          aria-label={dismissLabel}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}
