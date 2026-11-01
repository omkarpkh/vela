/**
 * Stage: a shell part of the Vela site, not a kit component, never exported from the package.
 * Built in slice 1 of the playground uplift (s5-tabs, level 4, "Live demo").
 *
 * The real component, exactly as it ships, only ever sits inside a stage, so the frame tells it apart
 * from the page, never a restyle:
 * - a plate (--vela-bg-container, --vela-radius-8) with an edge that forced colours repaint to
 *   CanvasText, because the plate's fill is dropped there;
 * - a slab on the page surface that holds the component;
 * - a caption that says "Live" and the props it is showing, as code;
 * - a region named "Live demo", so a demo's own landmarks and lists ("Views") are heard inside it and
 *   never taken for the page's own.
 * Nothing of the page goes into the slab, and nothing of the demo comes out. The stage's own
 * controls (reduced motion, width) go in `tools`, in the caption, never on the slab.
 */
import type { ReactNode } from 'react'
import { cn } from '../../src'
import './shell.css'

export interface StageProps {
  /** The props on show, written as the code that renders them: `<Tabs size="regular">`. */
  props?: string
  /** The caption's word. "Live" unless the stage shows several states at once ("Live, every state"). */
  caption?: string
  /** The stage's own controls, at the caption's end. */
  tools?: ReactNode
  /** The region's name. */
  label?: string
  className?: string
  children: ReactNode
}

export function Stage({ props, caption = 'Live', tools, label = 'Live demo', className, children }: StageProps) {
  return (
    <section className={cn('shell-stage', className)} aria-label={label}>
      <div className="shell-stage__caption">
        <span className="shell-stage__live">{caption}</span>
        {props && <code className="shell-stage__props">{props}</code>}
        {tools && <div className="shell-stage__tools">{tools}</div>}
      </div>
      <div className="shell-stage__slab">{children}</div>
    </section>
  )
}
