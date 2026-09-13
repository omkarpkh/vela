import { REGISTRY } from './playground/registry'
import colorMd from '../guidelines/foundations/color.md?raw'
import typographyMd from '../guidelines/foundations/typography.md?raw'
import spacingMd from '../guidelines/foundations/spacing.md?raw'
import sizingMd from '../guidelines/foundations/sizing.md?raw'
import radiusMd from '../guidelines/foundations/radius.md?raw'
import motionMd from '../guidelines/foundations/motion.md?raw'

// The navigation is built from the same sources as the pages: the foundation docs and the
// component registry. Adding a component to the registry adds it here; nothing is listed twice.
const titleOf = (md: string, fallback: string) => (md.match(/^# (?:Foundation: )?(.+)$/m)?.[1] ?? fallback).trim()

export const FOUNDATIONS = [
  { id: 'color', md: colorMd },
  { id: 'typography', md: typographyMd },
  { id: 'spacing', md: spacingMd },
  { id: 'sizing', md: sizingMd },
  { id: 'radius', md: radiusMd },
  { id: 'motion', md: motionMd },
].map((f) => ({ ...f, title: titleOf(f.md, f.id) }))

export const COMPONENTS = REGISTRY.map((e) => ({ id: e.id, title: e.name }))
