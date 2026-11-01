import type { ReactElement } from 'react'

/**
 * What a generated glyph component accepts. Deliberately narrow: the Icon component is the only
 * caller, and it passes the class that sizes and colours the glyph and, when the glyph carries
 * meaning, the accessible name. No event handlers and no style — an icon is never a control
 * (a clickable glyph is an Icon Button, which wraps an Icon) and never sized outside the three tokens.
 */
export interface GlyphProps {
  className?: string
  role?: 'img'
  'aria-label'?: string
  'aria-hidden'?: true
}

export type Glyph = (props: GlyphProps) => ReactElement
