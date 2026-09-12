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
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const doc = JSON.parse(readFileSync(join(root, 'tokens/vela.tokens.json'), 'utf8'))
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const all = {}
for (const [group, tokens] of Object.entries(doc)) {
  if (group.startsWith('$')) continue
  for (const [name, t] of Object.entries(tokens)) all[name] = { ...t, group }
}

const hex = (name, mode, seen = new Set()) => {
  const t = all[name]
  if (!t) throw new Error('unknown token ' + name)
  let v = t.$value
  if (mode === 'dark' && t.$extensions?.vela?.dark) v = t.$extensions.vela.dark
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) {
    const target = v.slice(1, -1)
    if (seen.has(target)) throw new Error('alias cycle at ' + name)
    seen.add(target)
    return hex(target, mode, seen)
  }
  if (!/^#[0-9a-f]{6}$/.test(v)) throw new Error(`${name} is not a colour token`)
  return v
}
const px = (name) => {
  const t = all[name]
  if (!t || t.$type !== 'dimension' || t.$value.unit !== 'px') throw new Error(`${name} is not a px dimension`)
  return t.$value.value
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
  'palette.error.main': 'signal-severity-major',
  'palette.error.light': 'border-severity-major',
  'palette.error.dark': 'btn-destructive-bg',
  'palette.error.contrastText': 'btn-destructive-text',
  'palette.warning.main': 'signal-severity-warning',
  'palette.warning.light': 'border-severity-warning',
  'palette.warning.dark': 'icon-severity-warning',
  'palette.info.main': 'signal-severity-info',
  'palette.info.light': 'border-severity-info',
  'palette.info.dark': 'icon-severity-info',
  'palette.success.main': 'signal-severity-success',
  'palette.success.light': 'border-severity-success',
  'palette.success.dark': 'icon-severity-success',
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
  // Alert (standard variant): Material darkens/lightens its guess; Vela has explicit tokens.
  'components.MuiAlert.styleOverrides.standardSuccess.backgroundColor': 'bg-severity-success',
  'components.MuiAlert.styleOverrides.standardSuccess.color': 'text-severity-success',
  'components.MuiAlert.styleOverrides.standardInfo.backgroundColor': 'bg-severity-info',
  'components.MuiAlert.styleOverrides.standardInfo.color': 'text-severity-info',
  'components.MuiAlert.styleOverrides.standardWarning.backgroundColor': 'bg-severity-warning',
  'components.MuiAlert.styleOverrides.standardWarning.color': 'text-severity-warning',
  'components.MuiAlert.styleOverrides.standardError.backgroundColor': 'bg-severity-major',
  'components.MuiAlert.styleOverrides.standardError.color': 'text-severity-major',
}

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

const set = (obj, path, value) => {
  const keys = path.split('.')
  let cur = obj
  for (const k of keys.slice(0, -1)) cur = cur[k] ??= {}
  cur[keys.at(-1)] = value
}

const theme = (mode) => {
  const t = { palette: { mode }, components: {} }
  for (const [path, token] of Object.entries(COLOR)) set(t, path, hex(token, mode))
  t.typography = {
    fontFamily: doc.typography['font-family-primary'].$value,
    fontWeightLight: num('font-weight-light'),
    fontWeightRegular: num('font-weight-regular'),
    fontWeightMedium: num('font-weight-semibold'),
    fontWeightBold: num('font-weight-semibold'),
  }
  for (const [variant, s] of Object.entries(TYPE)) t.typography[variant] = textStyle(s)
  t.typography.button.textTransform = 'none'
  t.shape = { borderRadius: px('radius-4') }
  t.components = {
    ...t.components,
    // Vela buttons are flat; Material's elevation would add a shadow no token defines.
    MuiButton: { defaultProps: { disableElevation: true } },
    // Material lightens dark-mode Paper with an elevation overlay; surfaces are tokens here.
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  }
  return t
}

const out = {
  $description: `Material UI ThemeOptions generated from tokens/vela.tokens.json by scripts/build-tokens-mui.mjs — do not edit. @omkarux/vela ${version}. Pass \`light\` or \`dark\` to createTheme().`,
  $sources: COLOR,
  $typeSources: TYPE,
  light: theme('light'),
  dark: theme('dark'),
}
mkdirSync(join(root, 'bridges'), { recursive: true })
writeFileSync(join(root, 'bridges/vela.mui-theme.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`build:tokens:mui  ${Object.keys(COLOR).length} colour roles + ${Object.keys(TYPE).length} type variants → bridges/vela.mui-theme.json`)
