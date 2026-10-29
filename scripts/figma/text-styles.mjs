/**
 * Figma text styles, compiled from the typography tokens.
 *
 * The component builders apply styles by name (Heading/H5, Body/Default, Tab/Count …) and refuse
 * to run if one is missing, but until now nothing in the repository created them — they were made
 * by hand, which is how Tab's count shipped with no style at all. This is their source.
 *
 * One style per size in the ramp, derived the way flutter/lib/vela_tokens.dart derives its
 * TextStyles: text-<s>-size + text-<s>-line-height + text-<s>-weight, with button and tab labels
 * falling back to font-weight-regular as Button.css and Tabs.css do. Then the styles that are a
 * ramp size at another weight (Body/Link, the two tab counts) or in another family (Mono/Meta),
 * declared in EXTRA.
 *
 *   npm run styles:figma > /tmp/styles.js    # a Plugin API script: creates-or-updates every style
 *
 * Each style's size, line height, weight and tracking are BOUND to the typography variables, so
 * a token change reaches the styles through tokens:figma; the literal values are set too, for
 * the plan tiers where a binding is read-only. Idempotent: styles are looked up by name.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { VENDOR, pxOf } from '../tokens-core.mjs'

export const FAMILY = 'Open Sans'
// --vela-font-family-mono is a system stack (ui-monospace, "SF Mono", … monospace) with no web
// font, and Figma has no system stack: a style names one family. Roboto Mono is the stack's
// Google-hosted member, so every Figma seat has it.
export const MONO_FAMILY = 'Roboto Mono'
export const WEIGHT_STYLE = { 300: 'Light', 400: 'Regular', 600: 'SemiBold' }

// Figma name for each ramp entry (the <s> in text-<s>-size).
const NAME = {
  h1: 'Heading/H1', h2: 'Heading/H2', h3: 'Heading/H3', h4: 'Heading/H4', h5: 'Heading/H5', h6: 'Heading/H6',
  body: 'Body/Default', meta: 'Body/Meta',
  'button-tiny': 'Button/Tiny', 'button-regular': 'Button/Regular', 'button-large': 'Button/Large', 'button-huge': 'Button/Huge',
  tab: 'Tab/Default', 'tab-large': 'Tab/Large',
}

// Styles that are not a ramp entry: a ramp size at a different weight, or in a different family.
const EXTRA = [
  { name: 'Body/Link', base: 'body', weight: 'font-weight-semibold',
    description: 'Inline link text: semibold body, no underline. Colour comes from text/link.' },
  { name: 'Tab/Count', base: 'tab', weight: 'font-weight-semibold',
    description: 'The count beside a tab label, e.g. "Proposals 9". Same size and line height as Tab/Default, semibold.' },
  { name: 'Tab/Count Large', base: 'tab-large', weight: 'font-weight-semibold',
    description: 'The count beside a large tab label. Same size and line height as Tab/Large, semibold.' },
  { name: 'Mono/Meta', base: 'meta', weight: 'text-meta-weight', family: MONO_FAMILY,
    description: 'Identifiers, hashes, IPs, timestamps and counts that must align: Body/Meta in a monospace family. Code binds --vela-font-family-mono.' },
]

// A dimension is { value, unit: "px" }; a weight is a plain number.
const px = (t, css) => (t.$type === 'dimension' ? pxOf(t.$value, css) : t.$value)

/** The style list, resolved against the token document (tokens/vela.tokens.json as parsed): names, values, and the variables to bind. */
export function textStyles(doc) {
  const typ = doc.typography
  const tok = (css) => {
    const t = typ[css]
    if (!t) throw new Error(`text-styles: no token ${css}`)
    return { css, figma: t.$extensions?.[VENDOR]?.figma, value: px(t, css) }
  }
  const compose = (name, s, weightCss, description = '', family = FAMILY) => {
    const size = tok(`text-${s}-size`), lineHeight = tok(`text-${s}-line-height`), weight = tok(weightCss)
    const tracking = typ[`text-${s}-tracking`] ? tok(`text-${s}-tracking`) : null
    const style = WEIGHT_STYLE[weight.value]
    if (!style) throw new Error(`text-styles: ${name}: no ${family} style for weight ${weight.value}`)
    return { name, size, lineHeight, weight, tracking, fontName: { family, style }, description }
  }
  const ramp = Object.keys(typ).filter((n) => /^text-.+-size$/.test(n)).map((n) => n.slice(5, -5))
  const out = ramp.map((s) => {
    if (!NAME[s]) throw new Error(`text-styles: ramp entry "${s}" has no Figma name — add it to NAME`)
    const weightCss = typ[`text-${s}-weight`] ? `text-${s}-weight` : /^(button|tab)/.test(s) ? 'font-weight-regular' : null
    if (!weightCss) throw new Error(`text-styles: ${s}: no weight token and no component rule to fall back on`)
    return compose(NAME[s], s, weightCss)
  })
  for (const e of EXTRA) out.push(compose(e.name, e.base, e.weight, e.description, e.family))
  return out
}

export function generate(doc) {
  const styles = textStyles(doc).map((s) => ({
    name: s.name, description: s.description, fontName: s.fontName,
    fontSize: s.size.value, lineHeight: s.lineHeight.value, letterSpacing: s.tracking ? s.tracking.value : null,
    bind: { fontSize: s.size.figma, lineHeight: s.lineHeight.figma, fontWeight: s.weight.figma, ...(s.tracking ? { letterSpacing: s.tracking.figma } : {}) },
  }))
  return `// Generated by scripts/figma/text-styles.mjs from tokens/vela.tokens.json — do not edit.
const STYLES = ${JSON.stringify(styles)};
const vars = Object.fromEntries((await figma.variables.getLocalVariablesAsync('FLOAT')).map(v => [v.name, v]));
const need = n => { if (!vars[n]) throw new Error('missing variable "' + n + '" — run tokens:figma first'); return vars[n]; };
const existing = Object.fromEntries((await figma.getLocalTextStylesAsync()).map(s => [s.name, s]));
let created = 0, updated = 0;
for (const e of STYLES) {
  await figma.loadFontAsync(e.fontName);
  let s = existing[e.name];
  if (!s) { s = figma.createTextStyle(); s.name = e.name; created++; } else updated++;
  s.fontName = e.fontName; s.fontSize = e.fontSize;
  s.lineHeight = { unit: 'PIXELS', value: e.lineHeight };
  s.letterSpacing = e.letterSpacing === null ? { unit: 'PERCENT', value: 0 } : { unit: 'PIXELS', value: e.letterSpacing };
  s.description = e.description;
  for (const [field, name] of Object.entries(e.bind)) s.setBoundVariable(field, need(name));
}
return { created, updated, total: STYLES.length };
`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const doc = JSON.parse(readFileSync(join(root, 'tokens/vela.tokens.json'), 'utf8'))
  if (process.argv.includes('--json')) console.log(JSON.stringify(textStyles(doc), null, 2))
  else process.stdout.write(generate(doc))
}
