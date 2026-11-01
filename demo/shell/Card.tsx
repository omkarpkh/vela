/**
 * Card with thumbnail, and the Next card: shell parts of the Vela site, not kit components, never
 * exported from the package. Built in slice 1 of the playground uplift (s5-tabs, s5-proposal).
 * Vela has no Card yet ("Card List" is not specced, DESIGN.md "Not in the kit"); these are the
 * site's stand-ins, flagged, not a kit part.
 *
 * - Each card is one link. Its thumbnail is a picture of where it goes: the real component, scaled,
 *   never a hand drawing. The thumbnail is inert and hidden from assistive technology, so its buttons
 *   are never heard as actions or reached by Tab; its words are 12px or more (the type ramp's floor).
 * - Pointer on a card: its edge darkens and its title is underlined. Pressed: the edge turns the
 *   active colour at pointer down, in --vela-duration-instant. Nothing moves.
 * - The Next card ends a tab or a page: where to go on from here, so a page never dead-ends.
 */
import type { MouseEvent, ReactNode } from 'react'
import { cn, Icon } from '../../src'
import './shell.css'

export interface CardProps {
  href: string
  title: ReactNode
  /** One line under the title. */
  line?: ReactNode
  /** The picture. Rendered inert and hidden from assistive technology. */
  thumbnail: ReactNode
  /** The title as a heading, when the cards sit under a section heading. */
  level?: 2 | 3 | 4
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  className?: string
}

function Thumb({ children, className }: { children: ReactNode; className: string }) {
  // `inert` keeps the picture's controls out of the tab order and away from the pointer.
  return <span className={className} aria-hidden="true" inert>{children}</span>
}

export function Card({ href, title, line, thumbnail, level, onClick, className }: CardProps) {
  const H = level ? (`h${level}` as const) : 'span'
  return (
    <a className={cn('shell-card', className)} href={href} onClick={onClick}>
      <Thumb className="shell-card__thumb">{thumbnail}</Thumb>
      <H className="shell-card__title">{title}</H>
      {line && <span className="shell-card__line">{line}</span>}
    </a>
  )
}

export interface NextCardProps {
  href: string
  title: ReactNode
  line?: ReactNode
  /** The small words above the title: "Next on this page", "Next proposal". */
  eyebrow?: string
  thumbnail?: ReactNode
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  className?: string
}

export function NextCard({ href, title, line, eyebrow = 'Next on this page', thumbnail, onClick, className }: NextCardProps) {
  return (
    <a className={cn('shell-next', className)} href={href} onClick={onClick}>
      {thumbnail && <Thumb className="shell-next__thumb">{thumbnail}</Thumb>}
      <span className="shell-next__text">
        <span className="shell-next__eyebrow">{eyebrow}</span>
        <span className="shell-next__title">{title}</span>
        {line && <span className="shell-next__line">{line}</span>}
      </span>
      <Icon name="arrow-right" className="shell-next__arrow" />
    </a>
  )
}
