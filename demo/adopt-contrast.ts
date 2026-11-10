/**
 * The measured contrast the Adopt page (#/adopt) prints beside each severity colour, on both sides:
 * stock Material UI and createTheme(vela). Nothing here is typed by hand. The colours are read from
 * the theme as Material UI resolves it (its own default palette on the left, the bridge on the
 * right), in the same places Material's components read them, and measured with the function
 * `npm test` asserts PAIRS with (scripts/contrast-math.mjs). tests/e2e/site.spec.ts checks each
 * label against the colours the browser actually painted.
 */
import { decomposeColor, type Theme } from '@mui/material/styles'
import { contrast, composite } from '../scripts/contrast-math.mjs'

/** The text minimum, WCAG 2.1 AA (THRESHOLD.text in scripts/contrast-core.mjs). */
export const TEXT_MIN = 4.5

const hexOf = (values: number[]) => '#' + values.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * A colour Material UI hands out (`#fff`, `#3d7fd6`, `rgb(98, 84, 52)`, `rgba(0, 0, 0, 0.87)`) as
 * the opaque hex that reaches the screen over `under`: a translucent colour is composited first,
 * the way the browser paints it.
 */
export function painted(colour: string, under?: string): string {
  const { type, values } = decomposeColor(colour)
  if (!type.startsWith('rgb')) throw new Error(`not an sRGB colour: ${colour}`)
  const hex = hexOf(values)
  const alpha = values[3] ?? 1
  if (alpha >= 1) return hex
  if (!under) throw new Error(`${colour} is translucent and has nothing under it`)
  return composite(hex, painted(under), alpha)
}

/** The contrast of `fg` drawn on `bg`, as painted. */
export function ratioOf(fg: string, bg: string): number {
  const under = painted(bg)
  return contrast(painted(fg, under), under)
}

/**
 * The words beside a colour: the ratio alone when it passes ("7.45:1"), and the failure said in
 * words when it does not ("4.03:1, below 4.5:1"), so the label never rests on colour. A ratio just
 * under the minimum is shown as 4.49, never rounded up to a passing-looking 4.50.
 */
export function ratioLabel(ratio: number): string {
  const shown = ratio < TEXT_MIN ? Math.min(Math.floor(ratio * 100) / 100, 4.49) : ratio
  const text = `${shown.toFixed(2)}:1`
  return ratio < TEXT_MIN ? `${text}, below ${TEXT_MIN}:1` : text
}

export type SeverityColour = 'success' | 'warning' | 'info' | 'error'

/**
 * Where each severity colour is drawn with text on the Adopt page, and from which theme values,
 * following Material UI's own style code (node_modules/@mui/material: Chip, Button, Alert):
 *
 * - a filled Chip: `palette[c].contrastText` on `palette[c].main`
 * - a text Button: `palette[c].main` on the Paper it sits on, `palette.background.paper`
 * - a standard Alert: when the theme gives it a style variant for that severity (the Vela bridge
 *   does since 0.16.1, with Vela's alert tokens), its `color` on its `backgroundColor`; otherwise
 *   Material derives both from `palette[c].light`, darkened 60% for the text and lightened 90% for
 *   the fill in light mode, the other way round in dark (stock Material UI). The browser test holds
 *   this to what is painted, so if Material's code changes, it fails.
 */
export const measure = {
  chip: (t: Theme, c: SeverityColour) => ratioOf(t.palette[c].contrastText, t.palette[c].main),
  textButton: (t: Theme, c: SeverityColour) => ratioOf(t.palette[c].main, t.palette.background.paper),
  alert: (t: Theme, c: SeverityColour) => {
    type Variant = { props?: { variant?: string; severity?: string }; style?: { color?: string; backgroundColor?: string } }
    const variants = ((t.components?.MuiAlert?.styleOverrides?.root as { variants?: Variant[] } | undefined)?.variants ?? [])
    const own = variants.find((v) => v.props?.severity === c && (v.props?.variant ?? 'standard') === 'standard')?.style
    if (own?.color && own.backgroundColor) return ratioOf(own.color, own.backgroundColor)
    const light = t.palette.mode === 'light'
    const fg = (light ? t.darken : t.lighten)(t.palette[c].light, 0.6)
    const bg = (light ? t.lighten : t.darken)(t.palette[c].light, 0.9)
    return ratioOf(fg, bg)
  },
}
