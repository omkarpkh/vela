#!/usr/bin/env node
/**
 * Component drift check — the component half of scripts/figma-drift.mjs.
 *
 * The builders in scripts/figma/components/ are the source of the library's component sets, but
 * they create and never update, and the live file is edited by hand. This script keeps the two
 * honest in both directions:
 *
 *   --lint [name|path]         build every builder (or one, or a builder file at a path ending in
 *                              .figma.js — a test fixture) in the mock Plugin API and apply the
 *                              rules below; exit 1 on an unwaived violation. Runs in `npm test`.
 *                              Every extension (<builder>.<id>.extend.figma.js, or one at a path)
 *                              is linted too: see "extensions" below.
 *   --dump <name>              the tree a rebuild would create, as JSON (what the test asserts on)
 *   --read <name> [a:b]        print a read-only Plugin API script that dumps the LIVE set in the
 *                              same shape — variants a..b, because the MCP caps a return at 20 KB
 *   --set=<set>                with --dump, --read or a diff: which set of a builder that declares
 *                              several (`// @set` more than once, Table); default the first
 *   --read styles              print a script that dumps the local text styles
 *   <name> <live.json> [...]   diff the live dump(s) against the rebuild; exit 1 on any difference
 *   styles <live.json>         diff the live styles against scripts/figma/text-styles.mjs
 *
 * Rules (the review a design-system reviewer runs on the file, made mechanical):
 *   raw-spacing        auto-layout gap or padding that is not 0 and not bound to a space/* variable
 *   unstyled-text      a text layer without a text style
 *   bad-name           a layer still called Placeholder, or left with Figma's default name
 *   absolute-children  a frame that holds children without auto layout
 *   raw-size           a fixed-size box whose width or height is not bound to a variable
 *   raw-colour         a fill or stroke that is not bound to a colour variable
 *   raw-radius         a corner radius that is not 0 and not bound
 *   text-property-collapse  a TEXT component property bound in variants whose texts differ: the
 *                      property holds one default for the whole set, so Figma shows the last word
 *                      written in every variant (Risk Pill, 29 Oct 2026: Low/Medium/High → High)
 *   component-on-doc-page  (doc pages, check-pages.mjs) a component, set or instance on a doc page
 * A builder may waive a rule with `// @allow <rule> <why>`; the waiver is printed, never silent.
 * Glyph geometry inside a BOOLEAN_OPERATION and a main component's own canvas width are exempt.
 * raw-colour allows one unbound paint: an alpha mask, a node with isMask whose paint is a gradient
 * with every stop black ({r:0,g:0,b:0}, any alpha). Only the alpha of a mask is drawn.
 *
 * Extensions — a change to a published set (build-components.mjs). For each one the lint
 *   - reads its body: no `.remove(`, no `combineAsVariants(`, and `.name =` only on a node it made
 *     (extend-forbidden);
 *   - builds the base in the mock, runs the --extend script, and runs it again: the first run must
 *     extend with the snapshot unchanged, the second must skip everything (extend-run, extend-twice);
 *   - applies the rules above to each node its // @adds names.
 * None of the extend-* rules can be waived.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createMockFigma } from './mock-figma.mjs'
import { available, meta, generate, metaFromFile, generateFrom, extensionMeta, extensionsOf, allExtensions } from './build-components.mjs'
import { textStyles } from './text-styles.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const doc = JSON.parse(readFileSync(join(root, 'tokens/vela.tokens.json'), 'utf8'))
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

// ---------- the dump: one definition, run inside Figma and against the mock ----------
// `fullText` keeps every character instead of the first 40 (the doc pages carry sentences; the
// component read script stays short because the MCP caps a return at 20 KB); `links` records a
// text node's hyperlink and list type; `colours` records each fill's resolved colour as hex (`rgb`),
// which is how a black reused frame shows. check-pages.mjs asks for all three; the component paths use the defaults.
export const dumpSource = ({ fullText = false, links = false, colours = false } = {}) => `
const LS = String.fromCharCode(8232), PS = String.fromCharCode(8233);
const clean = (s) => typeof s === 'string' ? s.split(LS).join(' ').split(PS).join(' ') : s;
const vcache = {}, scache = {};
const vn = async (id) => { if (!id) return null; if (!vcache[id]) { const v = await figma.variables.getVariableByIdAsync(id); vcache[id] = v ? v.name : '?'; } return vcache[id]; };
const sn = async (id) => { if (!id) return null; if (!scache[id]) { const s = await figma.getStyleByIdAsync(id); scache[id] = s ? s.name : '?'; } return scache[id]; };
const bv = async (node, prop) => { const b = node.boundVariables && node.boundVariables[prop]; return b ? await vn(b.id) : null; };
const paintName = async (paints) => { if (!Array.isArray(paints) || !paints.length) return []; const out = []; for (const p of paints) { const b = p.boundVariables && p.boundVariables.color; out.push(b ? await vn(b.id) : (p.type === 'SOLID' ? 'RAW' : p.type)); } return out; };
async function dump(n, depth) {
  const o = { t: n.type, n: clean(n.name) };
  if (n.visible === false) o.hidden = true;
  if ('layoutMode' in n) {
    o.lm = n.layoutMode;
    if (n.layoutMode !== 'NONE') {
      o.ax = [n.primaryAxisAlignItems, n.counterAxisAlignItems].join('/');
      o.sz = [n.primaryAxisSizingMode, n.counterAxisSizingMode].join('/');
      o.gap = [n.itemSpacing, await bv(n, 'itemSpacing')];
      o.pad = [[n.paddingTop, await bv(n, 'paddingTop')], [n.paddingRight, await bv(n, 'paddingRight')], [n.paddingBottom, await bv(n, 'paddingBottom')], [n.paddingLeft, await bv(n, 'paddingLeft')]];
    }
  }
  // An absolute child of an auto-layout frame (the Tabs Seed) is placed by its constraints, not the layout.
  if (n.layoutPositioning === 'ABSOLUTE') { o.abs = true; o.con = [n.constraints.horizontal, n.constraints.vertical].join('/'); }
  if (n.isMask === true) o.mask = true;
  // A bound opacity is its variable (Figma reads a percent variable back as a fraction); an unbound one, its value.
  if ('opacity' in n) { const b = await bv(n, 'opacity'); if (b || n.opacity !== 1) o.opa = b ?? Math.round(n.opacity * 100) / 100; }
  if ('minWidth' in n && n.minWidth != null) o.minw = [n.minWidth, await bv(n, 'minWidth')];
  if ('layoutSizingHorizontal' in n && n.parent && 'layoutMode' in n.parent && n.parent.layoutMode !== 'NONE') o.ls = [n.layoutSizingHorizontal, n.layoutSizingVertical].join('/');
  if ('width' in n) { const w = await bv(n, 'width'), h = await bv(n, 'height'); o.wh = [Math.round(n.width * 10) / 10, Math.round(n.height * 10) / 10, w, h]; }
  if ('fills' in n && n.fills !== figma.mixed) o.fill = await paintName(n.fills);${colours ? `
  if ('fills' in n && Array.isArray(n.fills) && n.fills.length) o.rgb = n.fills.map(p => p.type === 'SOLID' && p.color ? '#' + ['r', 'g', 'b'].map(k => Math.round(p.color[k] * 255).toString(16).padStart(2, '0')).join('') : null);` : ''}
  if ('strokes' in n) { o.stroke = await paintName(n.strokes); if (n.strokes.length) { o.sw = n.strokeWeight === figma.mixed ? 'mixed' : Math.round(n.strokeWeight * 100) / 100; o.swx = [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight]; o.sa = n.strokeAlign; } }
  if ('topLeftRadius' in n) o.rad = [n.topLeftRadius, await bv(n, 'topLeftRadius')];
  if (n.type === 'TEXT') {
    o.style = await sn(n.textStyleId === figma.mixed ? null : n.textStyleId);
    o.font = n.fontName === figma.mixed ? 'mixed' : (n.fontName.family + ' ' + n.fontName.style);
    o.fs = n.fontSize === figma.mixed ? 'mixed' : n.fontSize;
    o.lh = n.lineHeight === figma.mixed ? 'mixed' : (n.lineHeight.unit === 'PIXELS' ? n.lineHeight.value : n.lineHeight.unit);
    o.chars = clean(n.characters)${fullText ? '' : '.slice(0, 40)'};
    o.tar = n.textAutoResize; o.ta = n.textAlignHorizontal;${links ? `
    if (n.hyperlink && n.hyperlink !== figma.mixed && n.hyperlink.type === 'URL') o.link = n.hyperlink.value;
    if (n.characters.length) { const l = n.getRangeListOptions(0, n.characters.length); if (l && l !== figma.mixed && l.type !== 'NONE') o.list = l.type; }` : ''}
  }
  if (n.type === 'POLYGON') o.pts = n.pointCount;
  if (n.type === 'BOOLEAN_OPERATION') o.op = n.booleanOperation;
  if (n.componentPropertyReferences && Object.keys(n.componentPropertyReferences).length) o.ref = n.componentPropertyReferences;
  if (n.type === 'INSTANCE') {
    const main = await n.getMainComponentAsync();
    o.main = main ? clean(main.name) : null;
    const props = {}; for (const [k, p] of Object.entries(n.componentProperties || {}).sort(([a], [b]) => a.localeCompare(b))) props[k.replace(/#.*$/, '')] = p.value;
    o.props = props;
  }
  if ('children' in n && depth < 5) { o.ch = []; for (const c of n.children) o.ch.push(await dump(c, depth + 1)); }
  return o;
}
async function dumpSet(set, a, b) {
  const defs = {}; for (const [k, d] of Object.entries(set.componentPropertyDefinitions || {})) defs[k] = d.type + '=' + JSON.stringify(d.defaultValue);
  // A one-size component (\`// @component\`) is dumped as a set of one: itself.
  if (set.type === 'COMPONENT') return { set: set.name, count: 1, defs, variants: [await dump(set, 0)] };
  const variants = []; const kids = set.children.slice(a || 0, b || set.children.length);
  for (const v of kids) variants.push(await dump(v, 0));
  return { set: set.name, count: set.children.length, defs, variants };
}`
export const DUMP_SRC = dumpSource()

// ---------- building a component in the mock ----------
/** The library's variables as the mock wants them, resolved to light-mode values — from scripts/sync-figma.mjs ENTRIES. */
export function loadVariables() {
  const script = execFileSync('node', [join(root, 'scripts/sync-figma.mjs')], { encoding: 'utf8' })
  const entries = JSON.parse(script.match(/const ENTRIES = (\[.*?\]);\n/s)[1])
  const byKey = Object.fromEntries(entries.map((e) => [e.collection + '|' + e.name, e]))
  const value = (e, seen = 0) => {
    const v = e.light
    if (v && typeof v === 'object' && v.alias) { const t = byKey[v.collection + '|' + v.alias]; return t && seen < 10 ? value(t, seen + 1) : v }
    return v
  }
  return entries.map((e) => ({ name: e.name, resolvedType: e.type, collection: e.collection, value: value(e) }))
}
export function mockStyles() {
  return textStyles(doc).map((s) => ({
    name: s.name, fontName: s.fontName, fontSize: s.size.value, lineHeight: { unit: 'PIXELS', value: s.lineHeight.value },
    letterSpacing: s.tracking ? { unit: 'PIXELS', value: s.tracking.value } : { unit: 'PERCENT', value: 0 }, description: s.description,
  }))
}
let VARS
/** A fresh mock with the pages and the sets a builder and its extensions `// @use` already built. */
async function mockFor(m, uses) {
  VARS ??= loadVariables()
  // A builder that places another set's instances (`// @uses icon`) needs that set in the file:
  // build it first, on its own page, in the same mock.
  const deps = [...new Set(uses)].map((u) => ({ name: u, meta: meta(u) }))
  const figma = createMockFigma({ variables: VARS, styles: mockStyles(), pages: [...deps.map((d) => d.meta.page), m.page] })
  for (const d of deps) await new AsyncFunction('figma', generate(d.name))(figma)
  return figma
}
/**
 * Build a builder in the mock, in create mode — the builder, then its extensions: by name
 * (components/<name>.figma.js), or by a path ending in .figma.js (a fixture, with no extensions).
 */
export async function build(which) {
  const isFile = /\.figma\.js$/.test(which)
  const m = isFile ? metaFromFile(which) : meta(which)
  const exts = isFile ? [] : extensionsOf(which)
  const figma = await mockFor(m, [...(m.uses || []), ...exts.flatMap((e) => e.uses)])
  const result = await new AsyncFunction('figma', isFile ? generateFrom(m, which) : generate(which))(figma)
  const page = figma.root.children.find((p) => p.name === m.page)
  const sets = m.sets.map((name) => {
    const one = (m.components || []).includes(name)
    const set = one ? page.children.find((n) => n.type === 'COMPONENT' && n.name === name) : page.findOne((n) => n.type === 'COMPONENT_SET' && n.name === name)
    if (!set) throw new Error(`${which}: the builder did not create the ${one ? 'component' : 'set'} "${name}" (${JSON.stringify(result)})`)
    return set
  })
  return { figma, set: sets[0], sets, meta: m, result }
}
/**
 * Extend in the mock: build the base alone, then run the --extend script for `exts` twice. Returns both
 * results, or the error a run threw (`first.error`, `second.error`), and the page after the first run.
 */
/** The builder alone, without its extensions: the file as it was before they were written. */
export async function buildBase(builder, exts = []) {
  const m = meta(builder)
  const figma = await mockFor(m, [...(m.uses || []), ...exts.flatMap((e) => e.uses)])
  await new AsyncFunction('figma', generateFrom(m, `components/${builder}.figma.js`))(figma)
  return { figma, page: figma.root.children.find((p) => p.name === m.page), meta: m }
}
export async function extendInMock(builder, exts) {
  const { figma, meta: m } = await buildBase(builder, exts)
  const script = generateFrom(m, exts.map((e) => e.file).join(', '), { extensions: exts, extend: true, which: builder })
  const run = async () => { try { return await new AsyncFunction('figma', script)(figma) } catch (e) { return { error: e.message } } }
  const first = await run()
  const page = figma.root.children.find((p) => p.name === m.page)
  // what the first run added, before the second can touch anything
  const added = first.error ? [] : exts.flatMap((e) => e.adds.flatMap((a) => page.findAll((n) => n.name === a)))
  const second = first.error ? null : await run()
  return { figma, first, second, page, added, meta: m }
}

/** An extension's body may not remove, recombine, or rename a node it did not make. */
export function forbidden(body) {
  const code = body.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
  const out = []
  if (/\.remove\(/.test(code)) out.push('calls .remove(: an extension never removes a node')
  if (/combineAsVariants\(/.test(code)) out.push('calls combineAsVariants(: an extension appends to a set, it never makes one')
  const made = new Set()
  for (const [, name, init] of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)/g)) {
    if (/^(?:await\s+)?figma\.(?:create\w*|union|subtract|intersect|exclude|flatten|group)\(|\.(?:createInstance|clone)\(\)\s*$|^(?:await\s+)?instanceOf\(/.test(init.trim())) made.add(name)
  }
  for (const [, , head, chain] of code.matchAll(/(^|[^\w$.\])])([A-Za-z_$][\w$]*)((?:\s*(?:\.[\w$]+|\[[^\]]*\]|\([^()]*\)))*)\.name\s*\+?=(?!=)/gm)) {
    if (chain || !made.has(head)) out.push(`sets .name on ${head}${chain}, a node it did not make: an extension never renames what the set has`)
  }
  return out
}

/** The lint for one extension: its body, two runs in the mock, and the reviewer rules on what it adds. */
export async function lintExtension(ext) {
  const problems = []
  const hit = (rule, node, what) => problems.push({ rule, node, what, waived: false })
  if (!available().includes(ext.builder)) { hit('extend-orphan', ext.file, `extends "${ext.builder}", which is not a builder`); return { problems, allow: ext.allow } }
  for (const f of forbidden(ext.body)) hit('extend-forbidden', ext.file, f)
  const { figma, first, second, added } = await extendInMock(ext.builder, [ext])
  if (first.error) hit('extend-run', ext.file, first.error)
  else {
    if (JSON.stringify(first.extended) !== JSON.stringify([ext.id]) || first.snapshot !== 'unchanged') hit('extend-run', ext.file, `the first run should extend ${ext.id} with the snapshot unchanged; it returned ${JSON.stringify(first)}`)
    if (second.error) hit('extend-twice', ext.file, second.error)
    else if (second.extended.length || JSON.stringify(second.skipped) !== JSON.stringify([ext.id])) hit('extend-twice', ext.file, `a second run should skip ${ext.id} and change nothing; it returned ${JSON.stringify(second)}`)
  }
  const vars = await figma.variables.getLocalVariablesAsync()
  const nameOf = Object.fromEntries(vars.map((v) => [v.id, v.name]))
  for (const node of new Set(added)) {
    node._figma_varname = (id) => nameOf[id]
    problems.push(...lint(node, ext.allow).map((p) => ({ ...p, node: `${node.name} › ${p.node}` })))
  }
  return { problems, allow: ext.allow, extend: { first, second } }
}

/** `--set=<name>` picks one of a multi-set builder's sets for --dump, --read and the diff; default the first. */
const pickSet = (m, argv) => {
  const flag = argv.find((a) => a.startsWith('--set='))
  const name = flag ? flag.slice(6) : m.set
  if (!m.sets.includes(name)) throw new Error(`no set "${name}" in this builder (${m.sets.join(', ')})`)
  return name
}
export async function dumpTree(figma, set, a, b) {
  return new AsyncFunction('figma', 'set', 'a', 'b', DUMP_SRC + '\nreturn await dumpSet(set, a, b);')(figma, set, a, b)
}

// ---------- the rules ----------
// A mask draws only its alpha: a gradient on an isMask node whose stops are all black is a fade, not a colour.
const alphaMask = (n, p) => n.isMask === true && /^GRADIENT_/.test(p.type) && Array.isArray(p.gradientStops) && p.gradientStops.length > 0 &&
  p.gradientStops.every((g) => g.color && g.color.r === 0 && g.color.g === 0 && g.color.b === 0)
const DEFAULT_NAMES = /^(Frame|Component|Text|Rectangle|Ellipse|Polygon|Union|Vector|Group|Line|Star|Instance)( \d+)?$/
/**
 * @param set    the component set — or, for a doc page, its page frame
 * @param allow  the builder's waivers
 * @param skip   nodes left to another file's lint: an extension's nodes in its builder's set, linted
 *               under the extension with the extension's waivers
 * @param docPage  true for a doc page: its frame's canvas width is exempt (as a set's variants' are),
 *                 and the `component-on-doc-page` rule applies — a doc page holds no components or instances
 */
export function lint(set, allow = [], { docPage = false, skip = new Set() } = {}) {
  const problems = []
  const waived = new Set(allow.map((a) => a.rule))
  const hit = (rule, node, what) => problems.push({ rule, node: node.name, what, waived: waived.has(rule) })
  const walk = (n, inBool, isRoot) => {
    if (skip.has(n)) return
    const bound = (f) => !!(n.boundVariables && n.boundVariables[f])
    if (docPage && /^(COMPONENT|COMPONENT_SET|INSTANCE)$/.test(n.type)) hit('component-on-doc-page', n, n.type)
    if (n.type !== 'COMPONENT_SET') {
      if (/placeholder/i.test(n.name) || DEFAULT_NAMES.test(n.name)) hit('bad-name', n, `"${n.name}"`)
      // An instance must say which variant it is; the main component's own tree is linted on the set.
      if (n.type === 'INSTANCE' && !(n.mainComponent && n.mainComponent.parent)) hit('bad-name', n, 'an instance with no main component')
      for (const p of [...(n.fills || []), ...(n.strokes || [])]) if (!(p.boundVariables && p.boundVariables.color) && !alphaMask(n, p)) hit('raw-colour', n, p.type)
      if (!inBool && 'topLeftRadius' in n) for (const f of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) if (n[f] && !bound(f)) hit('raw-radius', n, `${f}=${n[f]}`)
      if ('layoutMode' in n && n.layoutMode !== 'NONE') {
        for (const f of ['itemSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) {
          if (n[f] === 0 && !bound(f)) continue
          const b = n.boundVariables && n.boundVariables[f]
          const name = b ? set._figma_varname(b.id) : null
          if (!name || !/^space\//.test(name)) hit('raw-spacing', n, `${f}=${n[f]}${name ? ' → ' + name : ''}`)
        }
      }
      if ('layoutMode' in n && n.layoutMode === 'NONE' && n.children && n.children.length && !inBool) hit('absolute-children', n, `${n.children.length} children, no auto layout`)
      if (n.type === 'TEXT' && !n.textStyleId) hit('unstyled-text', n, `"${n.characters}"`)
      if (!inBool && !isRoot && n.type !== 'TEXT' && n.type !== 'BOOLEAN_OPERATION') {
        if (n.layoutSizingHorizontal === 'FIXED' && !bound('width')) hit('raw-size', n, `width=${n.width}`)
        if (n.layoutSizingVertical === 'FIXED' && !bound('height')) hit('raw-size', n, `height=${n.height}`)
      }
    }
    for (const c of n.children || []) walk(c, inBool || n.type === 'BOOLEAN_OPERATION', n.type === 'COMPONENT_SET')
  }
  // A one-size component's own canvas width is exempt, as a set's variants' are.
  walk(set, false, docPage || set.type === 'COMPONENT')
  // A TEXT property is one set-wide default. Layers bound to it that the builder wrote differently
  // would all show the last word written — per-variant text belongs in an unbound layer.
  const byProp = {}
  for (const t of set.findAll ? set.findAll((n) => n.type === 'TEXT' && n.componentPropertyReferences && n.componentPropertyReferences.characters) : []) {
    const key = t.componentPropertyReferences.characters
    ;(byProp[key] ??= []).push(t._authored ?? t.characters)
  }
  for (const [key, texts] of Object.entries(byProp)) {
    const distinct = [...new Set(texts)]
    if (distinct.length > 1) hit('text-property-collapse', { name: key.replace(/#.*$/, '') }, `bound in ${texts.length} layers written ${distinct.map((t) => `"${t}"`).join(', ')}; Figma keeps one default, so every variant shows "${texts[texts.length - 1]}"`)
  }
  return problems
}

// ---------- the diff ----------
const base = (k) => k.replace(/#.*$/, '')
const decode = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
export function diff(expected, live) {
  const out = []
  const cmp = (path, e, l, root) => {
    if (e.t !== l.t || e.n !== l.n) { out.push(`${path}: expected ${e.t} "${e.n}", live ${l.t} "${l.n}"`); return }
    const fixedH = (e.ls || '').startsWith('FIXED') || e.t === 'ELLIPSE' || e.t === 'POLYGON' || e.t === 'RECTANGLE' || e.t === 'BOOLEAN_OPERATION'
    const fixedV = (e.ls || '').endsWith('FIXED') || e.t === 'ELLIPSE' || e.t === 'POLYGON' || e.t === 'RECTANGLE' || e.t === 'BOOLEAN_OPERATION'
    for (const k of ['hidden', 'abs', 'con', 'mask', 'opa', 'minw', 'lm', 'ax', 'sz', 'gap', 'pad', 'ls', 'fill', 'stroke', 'sw', 'swx', 'sa', 'rad', 'style', 'font', 'fs', 'lh', 'chars', 'tar', 'ta', 'pts', 'op', 'main', 'props']) {
      if (k === 'ls' && root) continue
      const a = JSON.stringify(e[k] ?? null), b = JSON.stringify(l[k] ?? null)
      if (a !== b) out.push(`${path}: ${k} expected ${a}, live ${b}`)
    }
    if (e.wh || l.wh) {
      const ew = e.wh || [], lw = l.wh || []
      if (ew[2] !== lw[2]) out.push(`${path}: width binding expected ${ew[2]}, live ${lw[2]}`)
      if (ew[3] !== lw[3]) out.push(`${path}: height binding expected ${ew[3]}, live ${lw[3]}`)
      if (fixedH && !root && ew[0] !== lw[0]) out.push(`${path}: width expected ${ew[0]}, live ${lw[0]}`)
      if (fixedV && !root && ew[1] !== lw[1]) out.push(`${path}: height expected ${ew[1]}, live ${lw[1]}`)
    }
    const er = Object.fromEntries(Object.entries(e.ref || {}).map(([k, v]) => [k, base(v)])), lr = Object.fromEntries(Object.entries(l.ref || {}).map(([k, v]) => [k, base(v)]))
    if (JSON.stringify(er) !== JSON.stringify(lr)) out.push(`${path}: property references expected ${JSON.stringify(er)}, live ${JSON.stringify(lr)}`)
    const ec = e.ch || [], lc = l.ch || []
    if (ec.length !== lc.length) out.push(`${path}: ${ec.length} children expected, live ${lc.length} (${lc.map((c) => c.n).join(', ')})`)
    for (let i = 0; i < Math.min(ec.length, lc.length); i++) cmp(`${path} › ${ec[i].n}`, ec[i], lc[i], false)
  }
  // property definitions: by name, order-free (the key carries a file-specific id after '#')
  const sorted = (d) => Object.fromEntries(Object.entries(d || {}).map(([k, v]) => [base(k), v]).sort(([a], [b]) => a.localeCompare(b)))
  const ed = sorted(expected.defs), ld = sorted(live.defs)
  if (JSON.stringify(ed) !== JSON.stringify(ld)) out.push(`properties: expected ${JSON.stringify(ed)}, live ${JSON.stringify(ld)}`)
  if (live.count !== undefined && live.count !== expected.variants.length) out.push(`variant count: expected ${expected.variants.length}, live ${live.count}`)
  const byName = Object.fromEntries(live.variants.map((v) => [v.n, v]))
  for (const v of expected.variants) {
    const l = byName[v.n]
    if (!l) { if (live.variants.length === expected.variants.length) out.push(`${v.n}: not in the live set`); continue }
    cmp(v.n, v, l, true)
  }
  return out
}
export function diffStyles(live) {
  const out = []
  const byName = Object.fromEntries(live.map((s) => [s.name, s]))
  for (const s of textStyles(doc)) {
    const l = byName[s.name]
    if (!l) { out.push(`${s.name}: missing`); continue }
    const want = { font: `${s.fontName.family} ${s.fontName.style}`, fs: s.size.value, lh: s.lineHeight.value, tracking: s.tracking ? s.tracking.value : 0 }
    if (l.font !== want.font) out.push(`${s.name}: font expected ${want.font}, live ${l.font}`)
    if (l.fs !== want.fs) out.push(`${s.name}: size expected ${want.fs}, live ${l.fs}`)
    if (l.lh !== want.lh) out.push(`${s.name}: line height expected ${want.lh}, live ${l.lh}`)
    if (Math.abs((l.tracking ?? 0) - want.tracking) > 0.001) out.push(`${s.name}: tracking expected ${want.tracking}, live ${l.tracking}`)
    const bind = { fontSize: s.size.figma, lineHeight: s.lineHeight.figma, fontWeight: s.weight.figma, ...(s.tracking ? { letterSpacing: s.tracking.figma } : {}) }
    for (const [f, name] of Object.entries(bind)) if ((l.bv || {})[f] !== name) out.push(`${s.name}: ${f} bound to ${(l.bv || {})[f] ?? 'nothing'}, expected ${name}`)
    if (decode(l.desc || '') !== s.description) out.push(`${s.name}: description differs`)
  }
  for (const l of live) if (!textStyles(doc).some((s) => s.name === l.name)) out.push(`${l.name}: in the file, not in text-styles.mjs`)
  return out
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const json = args.includes('--json')
  const argv = args.filter((a) => a !== '--json')
  const run = async () => {
    if (argv[0] === '--lint') {
      const one = argv[1]
      const isExt = one && one.endsWith('.extend.figma.js')
      const names = isExt ? [] : one ? [one] : available()
      // Extensions are reported under their file's stem, `<builder>.<id>`, after the builders.
      const exts = isExt ? [extensionMeta(one)] : one ? (/\.figma\.js$/.test(one) ? [] : extensionsOf(one)) : allExtensions()
      const report = {}
      let failed = false
      for (const which of names) {
        const { sets, figma, meta: m } = await build(which)
        // the rules need variable names synchronously: resolve through the mock's table
        const vars = await figma.variables.getLocalVariablesAsync()
        const nameOf = Object.fromEntries(vars.map((v) => [v.id, v.name]))
        const problems = []
        // What the builder's extensions add is linted under each extension, with its own waivers.
        const page = figma.root.children.find((p) => p.name === m.page)
        const skip = new Set(extensionsOf(which).flatMap((e) => e.adds.flatMap((a) => page.findAll((n) => n.name === a))))
        for (const set of sets) {
          set._figma_varname = (id) => nameOf[id]
          // a multi-set builder's findings name their set, so a reader knows which one to open
          problems.push(...lint(set, m.allow, { skip }).map((p) => (sets.length > 1 ? { ...p, node: `${set.name} › ${p.node}` } : p)))
        }
        report[which] = { problems, allow: m.allow }
        if (problems.some((p) => !p.waived)) failed = true
      }
      for (const ext of exts) {
        const key = isExt ? one : `${ext.builder}.${ext.id}`
        report[key] = await lintExtension(ext)
        if (report[key].problems.some((p) => !p.waived)) failed = true
      }
      if (json) { console.log(JSON.stringify(report)); process.exit(failed ? 1 : 0) }
      for (const [which, r] of Object.entries(report)) {
        const bad = r.problems.filter((p) => !p.waived), ok = r.problems.filter((p) => p.waived)
        console.log(`${which}: ${bad.length ? bad.length + ' violation(s)' : 'clean'}${ok.length ? `, ${ok.length} waived` : ''}`)
        for (const p of bad) console.log(`  ✗ ${p.rule}  ${p.node}: ${p.what}`)
        if (r.extend && !r.extend.first.error) console.log(`  · --extend, run twice: ${JSON.stringify(r.extend.first)}, then ${JSON.stringify(r.extend.second)}`)
        for (const a of r.allow) console.log(`  · waived ${a.rule} — ${a.reason}`)
      }
      process.exit(failed ? 1 : 0)
    }
    if (argv[0] === '--dump') {
      const { figma, sets, meta: m } = await build(argv[1])
      const set = sets[m.sets.indexOf(pickSet(m, argv))]
      console.log(JSON.stringify(await dumpTree(figma, set), null, json ? 0 : 2)); return
    }
    if (argv[0] === '--read') {
      if (argv[1] === 'styles') {
        process.stdout.write(`// Generated by scripts/figma/check-components.mjs — reads every local text style. Do not edit.
const vcache = {};
const vn = async (id) => { if (!id) return null; if (!vcache[id]) { const v = await figma.variables.getVariableByIdAsync(id); vcache[id] = v ? v.name : '?'; } return vcache[id]; };
const out = [];
for (const s of await figma.getLocalTextStylesAsync()) {
  const bv = {}; for (const [k, b] of Object.entries(s.boundVariables || {})) bv[k] = await vn(b && b.id);
  out.push({ name: s.name, font: s.fontName.family + ' ' + s.fontName.style, fs: s.fontSize, lh: s.lineHeight.unit === 'PIXELS' ? s.lineHeight.value : s.lineHeight.unit, tracking: s.letterSpacing.unit === 'PIXELS' ? s.letterSpacing.value : 0, desc: s.description, bv });
}
return out;
`); return
      }
      const m = meta(argv[1])
      const setName = pickSet(m, argv)
      const range = argv.slice(2).find((x) => !x.startsWith('--'))
      const [a, b] = (range || ':').split(':').map((x) => (x === '' ? undefined : Number(x)))
      process.stdout.write(`// Generated by scripts/figma/check-components.mjs — reads the live "${setName}" set. Do not edit.
const page = figma.root.children.find(p => p.name === ${JSON.stringify(m.page)});
if (!page) return { error: 'no page ' + ${JSON.stringify(m.page)} };
await figma.setCurrentPageAsync(page);
const set = page.findOne(n => (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && n.parent === page)) && n.name === ${JSON.stringify(setName)});
if (!set) return { error: 'no set ' + ${JSON.stringify(setName)} };
${DUMP_SRC}
return await dumpSet(set, ${a ?? 0}, ${b ?? 'undefined'});
`); return
    }
    if (argv[0] === 'styles') {
      const live = JSON.parse(readFileSync(argv[1], 'utf8'))
      const problems = diffStyles(live)
      if (json) { console.log(JSON.stringify(problems)); process.exit(problems.length ? 1 : 0) }
      console.log(problems.length ? problems.map((p) => '  ' + p).join('\n') : '  No drift. The text styles match scripts/figma/text-styles.mjs.')
      process.exit(problems.length ? 1 : 0)
    }
    const which = argv[0]
    const files = argv.slice(1).filter((a) => !a.startsWith('--'))
    if (!which || !files.length) { console.error('usage: check-components.mjs --lint [name] | --dump <name> [--set=<set>] | --read <name> [a:b] [--set=<set>] | --read styles | <name> <live.json>... [--set=<set>] | styles <live.json>'); process.exit(2) }
    const { figma, sets, meta: m } = await build(which)
    const set = sets[m.sets.indexOf(pickSet(m, argv))]
    const expected = await dumpTree(figma, set)
    const parts = files.map((f) => JSON.parse(readFileSync(f, 'utf8')))
    const live = { ...parts[0], variants: parts.flatMap((p) => p.variants) }
    if (live.error) { console.error(live.error); process.exit(2) }
    const problems = diff(expected, live)
    if (json) { console.log(JSON.stringify(problems)); process.exit(problems.length ? 1 : 0) }
    console.log(problems.length ? problems.map((p) => '  ' + p).join('\n') : `  No drift. The live "${set.name}" set matches what the builder would create.`)
    process.exit(problems.length ? 1 : 0)
  }
  run().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
}
