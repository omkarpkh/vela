/**
 * SeverityTag: a shell part of the Vela site, not a kit component, never exported from the package.
 *
 * Stands in for: a small severity element. The kit has none. Contextual Alert is the only
 * component that shows all six severities, and it is a full-width inline message and a live
 * region (`role="alert"` for major and critical), so six of them on the Overview would be large,
 * and two would be announced. Not in the kit, so flagged rather than invented
 * (DESIGN.md, "Not in the kit").
 *
 * - It is the Contextual Alert's own look, cut to one line: the same four severity roles
 *   (`--vela-{bg,border,text,icon}-severity-*`) and the same glyph for each severity, so every
 *   colour pair it draws is one PAIRS already asserts ("Severity <s> text", "Severity <s> icon").
 * - The level word is always visible; the glyph is hidden from assistive technology, because the
 *   word says the same thing. Colour is never the only signal.
 * - Severity only. It never takes a risk level or a status (DESIGN.md, the three taxonomies): its
 *   prop is the kit's own `Severity` type, so a crossed value does not compile.
 */
import type { ComponentType, SVGProps } from 'react'
import type { Severity } from '../../src'
import { CheckCircleIcon, InfoCircleIcon, WarningTriangleIcon, CriticalOctagonIcon } from '../../src/lib/icons'
import './shell.css'

// The Contextual Alert's mapping (src/components/ContextualAlert/ContextualAlert.tsx, ICON).
const GLYPH: Record<Severity, ComponentType<SVGProps<SVGSVGElement>>> = {
  success: CheckCircleIcon,
  info: InfoCircleIcon,
  warning: WarningTriangleIcon,
  minor: WarningTriangleIcon,
  major: WarningTriangleIcon,
  critical: CriticalOctagonIcon,
}

/** The level word: the severity's own name, capitalised, as the All states page titles each alert. */
export const severityWord = (s: Severity) => s.charAt(0).toUpperCase() + s.slice(1)

export function SeverityTag({ severity }: { severity: Severity }) {
  const Glyph = GLYPH[severity]
  return (
    <span className={`shell-severity shell-severity--${severity}`} data-severity={severity}>
      <Glyph className="shell-severity__glyph" aria-hidden="true" />
      {severityWord(severity)}
    </span>
  )
}
