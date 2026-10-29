/**
 * Figma sync — the other half of "one edit, both targets".
 *
 * Figma's REST API only lets Enterprise plans WRITE variables, so this does not
 * call the REST API. Instead it compiles tokens/vela.tokens.json into a Plugin
 * API script and prints it. Run that script inside the Vela Design System file
 * (via the Figma MCP `use_figma` tool, or the Scripter plugin) and every
 * variable is created-or-updated in place: value per mode, alias per mode,
 * scopes, description, and the `var(--vela-*)` code syntax. A variable whose
 * Figma type changed is removed and recreated under the same name, because a
 * resolved type cannot be edited.
 *
 *   npm run tokens:figma            # prints the script to stdout
 *   npm run tokens:figma > /tmp/sync.js
 *
 * Idempotent: it looks variables up by collection + name and updates them, so
 * re-running never duplicates. The mapping from token name → Figma name lives
 * in each token's $extensions["com.omkarux.vela"].figma, extracted from the live
 * file, so the names here match the library exactly. The Dark mode values come
 * from tokens/vela.dark.tokens.json through the resolver (scripts/tokens-core.mjs).
 */
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTokenSet, isAlias, aliasPath, hexOf, alphaOf, pxOf, msOf, cubicBezierOf, deprecationNote } from './tokens-core.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const set = loadTokenSet(root)

const SCOPES = {
  primitive: [],
  surface: ['FRAME_FILL', 'SHAPE_FILL'], bg: ['FRAME_FILL', 'SHAPE_FILL'], signal: ['FRAME_FILL', 'SHAPE_FILL'],
  border: ['STROKE_COLOR'], indicator: ['STROKE_COLOR'], text: ['TEXT_FILL'],
  icon: ['SHAPE_FILL', 'STROKE_COLOR'],
  space: ['WIDTH_HEIGHT', 'GAP'], 'control-height': ['WIDTH_HEIGHT'], iconSize: ['WIDTH_HEIGHT'],
  radius: ['CORNER_RADIUS'], size: ['FONT_SIZE'], 'line-height': ['LINE_HEIGHT'], weight: ['FONT_WEIGHT'],
  // Scopes decide which property picker offers a variable. Stroke weights (the focus ring, stroke/2)
  // belong in the stroke-weight picker, not width/height; a gap in the gap picker; letter-spacing in
  // its own; a motion-group float (the materialise blur) in the effect picker. The live library had
  // three of these right by hand before the sync carried them — figma.test.ts pins them now.
  stroke: ['STROKE_FLOAT'], focusSize: ['STROKE_FLOAT'], field: ['GAP'],
  tracking: ['LETTER_SPACING'], effect: ['EFFECT_FLOAT'],
}
const scopesFor = (group, figmaName, cssName, type) => {
  if (group === 'primitives') return SCOPES.primitive
  const head = figmaName.split('/')[0], last = figmaName.split('/').pop()
  if (group === 'color') {
    if (/^(severity|risk)$/.test(head)) return SCOPES[last] ?? SCOPES.bg
    if (head === 'status') return SCOPES.signal
    if (head === 'focus') return SCOPES.border
    if (head === 'button' || head === 'control') {
      if (/text|placeholder/.test(cssName)) return SCOPES.text
      if (/border/.test(cssName)) return SCOPES.border
      return SCOPES.bg
    }
    return SCOPES[head] ?? SCOPES.bg
  }
  if (group === 'sizing') {
    if (head === 'icon') return SCOPES.iconSize
    if (head === 'focus') return SCOPES.focusSize
    return SCOPES[head] ?? ['WIDTH_HEIGHT']
  }
  // TIMING and EASING variables have no scopes — setting any throws — the type decides where Figma
  // offers them. A FLOAT in the motion group (a dimension such as the blur) does take scopes.
  if (group === 'motion') return type === 'FLOAT' ? SCOPES.effect : null
  return SCOPES[head] ?? []
}

const collectionOf = { primitives: 'Primitives', color: 'Color', sizing: 'Sizing', typography: 'Typography', motion: 'Motion' }
// `--only <Collection>` limits the printed script to one collection (the MCP script cap is 50 KB).
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null
const entries = []
for (const [group, tokens] of Object.entries(set.base)) {
  if (group.startsWith('$')) continue
  for (const css of Object.keys(tokens)) {
    if (css.startsWith('$')) continue // a group's own $type / $description / $deprecated
    const t = set.all[css]
    const figma = set.vendor(t).figma
    if (!figma) continue
    // Colours become COLOR variables and numbers FLOAT. The motion tokens use Figma's own motion
    // types (Figma Motion, June 2026): a duration is a TIMING variable — Figma keeps timing in
    // seconds, so 120ms is stored as 0.12 — and the curve an EASING variable holding the bezier.
    // A Figma Motion timeline can bind them; a prototype transition still cannot (foundations/motion.md).
    if (t.$type === 'fontFamily') continue
    const type = t.$type === 'color' ? 'COLOR' : t.$type === 'duration' ? 'TIMING' : t.$type === 'cubicBezier' ? 'EASING' : 'FLOAT'
    // An alias stays a `{path}` string here and becomes a VARIABLE_ALIAS below; a colour object
    // becomes the hex the Plugin API script turns into RGB.
    const value = (v) => {
      if (isAlias(v)) return v
      if (t.$type === 'color') {
        if (alphaOf(v, css) < 1) throw new Error(`sync-figma: ${css} has alpha ${v.alpha}; the Figma sync carries opaque colours only`)
        return hexOf(v, css)
      }
      if (t.$type === 'dimension') return pxOf(v, css)
      if (t.$type === 'duration') return msOf(v, css) / 1000
      if (t.$type === 'cubicBezier') { const [x1, y1, x2, y2] = cubicBezierOf(v, css); return { type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1, y1, x2, y2 } } }
      return v
    }
    const note = deprecationNote(t)
    entries.push({
      collection: collectionOf[group], name: figma, css,
      type,
      light: value(set.valueOf(css, 'light')),
      dark: t.$type === 'color' ? value(set.valueOf(css, 'dark')) : undefined,
      scopes: scopesFor(group, figma, css, type),
      description: note ? `${note[0].toUpperCase()}${note.slice(1)}.${t.$description ? ' ' + t.$description : ''}` : (t.$description ?? ''),
    })
  }
}

// `{path}` aliases refer to other tokens by full path → resolve to Figma names. Resolved over EVERY
// token before `--only` narrows the output: a Color alias points into Primitives, and a lookup built
// from the filtered list once turned every such value into `{}`.
const figmaNameOf = Object.fromEntries(entries.map((e) => [e.css, e.name]))
const collOf = Object.fromEntries(entries.map((e) => [e.css, e.collection]))
for (const e of entries) {
  for (const k of ['light', 'dark']) {
    const v = e[k]
    if (isAlias(v)) {
      const target = set.byPath[aliasPath(v)].name
      if (!figmaNameOf[target]) throw new Error(`sync-figma: ${e.css} aliases {${aliasPath(v)}}, which has no Figma name`)
      e[k] = { alias: figmaNameOf[target], collection: collOf[target] }
    }
  }
}
const emitted = only ? entries.filter((e) => e.collection === only) : entries
if (only && emitted.length === 0) throw new Error(`sync-figma: no tokens in collection "${only}"`)

const script = `// Generated by scripts/sync-figma.mjs from tokens/vela.tokens.json — do not edit.
const ENTRIES = ${JSON.stringify(emitted)};
const colls = await figma.variables.getLocalVariableCollectionsAsync();
const byName = Object.fromEntries(colls.map(c => [c.name, c]));
for (const n of ['Primitives','Color','Sizing','Typography','Motion']) {
  if (!byName[n]) { const c = figma.variables.createVariableCollection(n); c.renameMode(c.modes[0].modeId, n === 'Color' ? 'Light' : 'Value'); if (n === 'Color') c.addMode('Dark'); byName[n] = c; }
}
const mode = (c, m) => c.modes.find(x => x.name === m).modeId;
const all = await figma.variables.getLocalVariablesAsync();
const lookup = {};
for (const v of all) lookup[v.variableCollectionId + '|' + v.name] = v;
const hex = h => { const n = parseInt(h.slice(1), 16); return { r: ((n>>16)&255)/255, g: ((n>>8)&255)/255, b: (n&255)/255 }; };
// an alias → VARIABLE_ALIAS; a hex string → RGB; TIMING seconds and the EASING object pass through as they are
const val = (x, type) => (x && typeof x === 'object' && x.alias) ? { type: 'VARIABLE_ALIAS', id: lookup[byName[x.collection].id + '|' + x.alias].id } : (type === 'COLOR' && typeof x === 'string' ? hex(x) : x);
let created = 0, updated = 0, retyped = 0;
// two passes so aliases always resolve: primitives first, then everything else
for (const pass of [e => e.collection === 'Primitives', e => e.collection !== 'Primitives']) {
  for (const e of ENTRIES.filter(pass)) {
    const c = byName[e.collection]; const key = c.id + '|' + e.name;
    let v = lookup[key];
    // a resolved type cannot be edited: a token whose Figma type changed is removed and recreated under its name
    if (v && v.resolvedType !== e.type) { v.remove(); v = null; retyped++; }
    if (!v) { v = figma.variables.createVariable(e.name, c, e.type); lookup[key] = v; created++; } else updated++;
    if (e.collection === 'Color') { v.setValueForMode(mode(c,'Light'), val(e.light, e.type)); v.setValueForMode(mode(c,'Dark'), val(e.dark, e.type)); }
    else v.setValueForMode(c.modes[0].modeId, val(e.light, e.type));
    if (e.scopes) v.scopes = e.scopes; v.description = e.description;
    v.setVariableCodeSyntax('WEB', 'var(--vela-' + e.css + ')');
  }
}
return { created, updated, retyped, total: ENTRIES.length };
`
process.stdout.write(script)
