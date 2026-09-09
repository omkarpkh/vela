import * as React from 'react'

/**
 * Inline 16px icons. Stroke-based, currentColor, no dependency.
 * A design system that pulls in an icon library forces that library on every
 * consumer; six paths cost less than that constraint.
 */
const base = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const CheckCircleIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="8" cy="8" r="6.25" /><path d="M5.5 8.2 7.2 9.9l3.3-3.6" /></svg>
)

export const InfoCircleIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="8" cy="8" r="6.25" /><path d="M8 7.4v3.4" /><circle cx="8" cy="5.2" r=".85" fill="currentColor" stroke="none" /></svg>
)

export const WarningTriangleIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M8 2.2 14.4 13.3H1.6z" /><path d="M8 6.4v3.1" /><circle cx="8" cy="11.4" r=".8" fill="currentColor" stroke="none" /></svg>
)

export const CriticalOctagonIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M5.3 1.8h5.4l3.5 3.5v5.4l-3.5 3.5H5.3l-3.5-3.5V5.3z" /><path d="M8 4.9v3.4" /><circle cx="8" cy="10.9" r=".8" fill="currentColor" stroke="none" /></svg>
)

export const CloseIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 4l8 8M12 4l-8 8" /></svg>
)

export const PlusIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M8 3.2v9.6M3.2 8h9.6" /></svg>
)
