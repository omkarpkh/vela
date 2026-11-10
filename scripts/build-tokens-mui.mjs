/**
 * tokens/vela.tokens.json is THE source of truth.
 * This script emits bridges/vela.mui-theme.json: a Material UI ThemeOptions object per mode
 * with every colour resolved from the token source. It is the "adopt without rewrite" path —
 * a product already built on MUI takes the family look by passing this to createTheme(),
 * without touching a component. Plain JSON, so the package keeps zero runtime dependencies
 * and needs no MUI import; demo/Adopt.tsx is the reference consumer.
 *
 * `$sources` records which token produced each colour, so a test can re-resolve every one
 * against the JSON — the same "no raw hex" discipline the CSS is held to. The mapping itself
 * is a judgment call (Material's roles and Vela's semantics are different vocabularies) and
 * is kept in one table below so it can be argued with in one place.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadTokenSet, cssColor, pxOf, msOf, cubicBezierOf, fontFamilyCss } from './tokens-core.mjs'

/** The ThemeOptions document for a token set (`set` from scripts/tokens-core.mjs). */
export function generateMui(set, version) {
  const { all } = set

  // Colours resolve through the alias walk per mode — the dark values come from the overlay
  // through the resolver — and serialise as the hex the CSS ships (#rrggbbaa when translucent).
  const hex = (name, mode) => {
    const t = all[name]
    if (!t) throw new Error('unknown token ' + name)
    if (t.$type !== 'color') throw new Error(`${name} is not a colour token`)
    return cssColor(set.resolved(name, mode), name)
  }
  const px = (name) => {
    const t = all[name]
    if (!t || t.$type !== 'dimension') throw new Error(`${name} is not a px dimension`)
    return pxOf(t.$value, name)
  }
  const num = (name) => {
    const t = all[name]
    if (!t || t.$type !== 'number') throw new Error(`${name} is not a number token`)
    return t.$value
  }

  // ---------- colour roles: MUI path → Vela semantic ----------
  const COLOR = {
    'palette.primary.main': 'btn-primary-bg',
    'palette.primary.dark': 'btn-primary-hover-bg',
    'palette.primary.light': 'primary-tint',
    'palette.primary.contrastText': 'btn-primary-text',
    'palette.secondary.main': 'btn-standard-bg',
    'palette.secondary.dark': 'btn-standard-hover-bg',
    'palette.secondary.contrastText': 'btn-standard-text',
    // Severity roles. Material draws `main` in two ways: as a fill under `contrastText` (a contained
    // Button, a filled Chip, a Badge) and as text on the page (outlined and text variants). The
    // signal colours are graphics, not text: on white, info was 4.03:1, error 4.08:1, success
    // 2.97:1 and warning 1.69:1. The severity text colour passes both ways, with the page colour as
    // the fill's label: bg-global on text-severity-* is 5.8:1 or more in light and about 7.6:1 or
    // more in dark (PAIRS, scripts/contrast-core.mjs). `dark` (hover) is the same colour, since no
    // darker severity text exists; `light` stays the severity border. Error is Vela's major.
    'palette.error.main': 'text-severity-major',
    'palette.error.light': 'border-severity-major',
    'palette.error.dark': 'text-severity-major',
    'palette.error.contrastText': 'bg-global',
    'palette.warning.main': 'text-severity-warning',
    'palette.warning.light': 'border-severity-warning',
    'palette.warning.dark': 'text-severity-warning',
    'palette.warning.contrastText': 'bg-global',
    'palette.info.main': 'text-severity-info',
    'palette.info.light': 'border-severity-info',
    'palette.info.dark': 'text-severity-info',
    'palette.info.contrastText': 'bg-global',
    'palette.success.main': 'text-severity-success',
    'palette.success.light': 'border-severity-success',
    'palette.success.dark': 'text-severity-success',
    'palette.success.contrastText': 'bg-global',
    'palette.background.default': 'bg-global',
    'palette.background.paper': 'bg-raised',
    'palette.text.primary': 'text-default',
    'palette.text.secondary': 'text-de-emphasized',
    'palette.text.disabled': 'text-inactive',
    'palette.divider': 'border-subtle',
    'palette.action.hover': 'bg-hover',
    'palette.action.selected': 'bg-selected',
    'palette.action.disabled': 'btn-disabled-text',
    'palette.action.disabledBackground': 'btn-disabled-bg',
  }

  // ---------- Alert (standard variant): Vela's own alert colours ----------
  // Material darkens or lightens its guess from palette.*.light; Vela has explicit tokens, the ones
  // its Contextual Alert draws. Material UI 9 no longer reads the old per-severity slot keys
  // (styleOverrides.standardSuccess and the rest), which this bridge used until 0.16.1, so an Alert
  // silently fell back to Material's colours. Style variants matched on severity are the form it
  // reads; tests/e2e/adopt.spec.ts checks the colours an Alert actually paints.
  const ALERT = {
    success: 'success', info: 'info', warning: 'warning', error: 'major',
  }
  const alertVariants = (mode) => Object.entries(ALERT).map(([severity, sev]) => ({
    props: { variant: 'standard', severity },
    style: {
      backgroundColor: hex(`bg-severity-${sev}`, mode),
      color: hex(`text-severity-${sev}`, mode),
      border: `1px solid ${hex(`border-severity-${sev}`, mode)}`,
      '& .MuiAlert-icon': { color: hex(`icon-severity-${sev}`, mode) },
    },
  }))

  // ---------- type ramp: MUI variant → Vela text style, mapped by USAGE not by name ----------
  // Material's h1–h3 are display sizes (96–48px) that product screens do not use; its h4–h6 are
  // the page, section and card/app-bar titles — which is what Vela's h1–h3 are. Mapping by name
  // would shrink every title in an acquired product to 12–16px. body2 is what MUI tables and
  // secondary text use; it gets the body style, not meta, so a data-heavy screen does not shrink.
  // Button labels are Regular 400 at every size (Button.css), and Material's uppercase transform
  // is turned off — Vela labels are sentence case.
  const TYPE = {
    h1: 'h1', h2: 'h1', h3: 'h1',          // display sizes → the largest style Vela has
    h4: 'h1', h5: 'h2', h6: 'h3',          // page → section → card/app-bar title
    subtitle1: 'h4', subtitle2: 'h5',
    body1: 'body', body2: 'body', caption: 'meta', overline: 'meta', button: 'button-regular',
  }
  const weightOf = (s) => (all[`text-${s}-weight`] ? num(`text-${s}-weight`) : num('font-weight-regular'))
  const textStyle = (s) => {
    const out = {
      fontSize: `${px(`text-${s}-size`)}px`,
      lineHeight: px(`text-${s}-line-height`) / px(`text-${s}-size`),
      fontWeight: weightOf(s),
    }
    if (all[`text-${s}-tracking`]) out.letterSpacing = `${px(`text-${s}-tracking`)}px`
    return out
  }

  const ms = (name) => {
    const t = all[name]
    if (!t || t.$type !== 'duration') throw new Error(`${name} is not a duration token`)
    return msOf(t.$value, name)
  }
  const bezier = (name) => {
    const t = all[name]
    if (!t || t.$type !== 'cubicBezier') throw new Error(`${name} is not a cubicBezier token`)
    return `cubic-bezier(${cubicBezierOf(t.$value, name).join(', ')})`
  }

  const put = (obj, path, value) => {
    const keys = path.split('.')
    let cur = obj
    for (const k of keys.slice(0, -1)) cur = cur[k] ??= {}
    cur[keys.at(-1)] = value
  }

  const theme = (mode) => {
    const t = { palette: { mode }, components: {} }
    for (const [path, token] of Object.entries(COLOR)) put(t, path, hex(token, mode))
    t.typography = {
      fontFamily: fontFamilyCss(all['font-family-primary'].$value),
      fontWeightLight: num('font-weight-light'),
      fontWeightRegular: num('font-weight-regular'),
      fontWeightMedium: num('font-weight-semibold'),
      fontWeightBold: num('font-weight-semibold'),
    }
    for (const [variant, s] of Object.entries(TYPE)) t.typography[variant] = textStyle(s)
    t.typography.button.textTransform = 'none'
    t.shape = { borderRadius: px('radius-4') }
    // Timing travels with the tokens: three durations and one curve, mapped onto Material's slots
    // (pointer answers and exits at `fast`, anything that settles or enters at `base`). The KIND of
    // feedback does not travel: Material's ripple stays until the component is swapped for Vela's,
    // whose press is a 3% scale. That boundary is component behaviour, which is why shared
    // components are step two. Material's easeOut is its entering curve, so it carries
    // --vela-ease-out, as Vela's own overlays do since the motion pass, part 2 — the two never
    // disagree in one app. Every other slot is a thing moving on screen: --vela-ease-standard.
    t.transitions = {
      duration: {
        shortest: ms('duration-fast'), shorter: ms('duration-fast'), short: ms('duration-fast'),
        standard: ms('duration-base'), complex: ms('duration-base'), enteringScreen: ms('duration-base'),
        leavingScreen: ms('duration-fast'),
      },
      easing: { easeInOut: bezier('ease-standard'), easeOut: bezier('ease-out'), easeIn: bezier('ease-standard'), sharp: bezier('ease-standard') },
    }
    t.components = {
      ...t.components,
      // Vela buttons are flat; Material's elevation would add a shadow no token defines.
      MuiButton: { defaultProps: { disableElevation: true } },
      // Material lightens dark-mode Paper with an elevation overlay; surfaces are tokens here.
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiAlert: { styleOverrides: { root: { variants: alertVariants(mode) } } },
    }
    return t
  }

  return {
    $description: `Material UI ThemeOptions generated from tokens/vela.tokens.json by scripts/build-tokens-mui.mjs — do not edit. @omkarux/vela ${version}. Pass \`light\` or \`dark\` to createTheme().`,
    $sources: COLOR,
    $typeSources: TYPE,
    $alertSources: Object.fromEntries(Object.entries(ALERT).map(([severity, sev]) => [severity, ['bg', 'text', 'border', 'icon'].map((k) => `${k}-severity-${sev}`)])),
    light: theme('light'),
    dark: theme('dark'),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const set = loadTokenSet(root)
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const out = generateMui(set, version)
  mkdirSync(join(root, 'bridges'), { recursive: true })
  writeFileSync(join(root, 'bridges/vela.mui-theme.json'), JSON.stringify(out, null, 2) + '\n')
  console.log(`build:tokens:mui  ${Object.keys(out.$sources).length} colour roles + ${Object.keys(out.$typeSources).length} type variants → bridges/vela.mui-theme.json`)
}
