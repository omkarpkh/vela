#!/usr/bin/env node
/**
 * Component drift check — the component half of scripts/figma-drift.mjs.
 *
 * The builders in scripts/figma/components/ are the source of the library's component sets, but
 * they create and never update, and the live file is edited by hand. This script keeps the two
 * honest in both directions:
 *
 *   --lint [name]              build every builder (or one) in the mock Plugin API and apply the
 *                              rules below; exit 1 on an unwaived violation. Runs in `npm test`.
 *   --dump <name>              the tree a rebuild would create, as JSON (what the test asserts on)
 *   --read <name> [a:b]        print a read-only Plugin API script that dumps the LIVE set in the
 *                              same shape — variants a..b, because the MCP caps a return at 20 KB
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
 * A builder may waive a rule with `// @allow <rule> <why>`; the waiver is printed, never silent.
 * Glyph geometry inside a BOOLEAN_OPERATION and a main component's own canvas width are exempt.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createMockFigma } from './mock-figma.mjs'
import { available, meta, generate } from './build-components.mjs'
import { textStyles } from './text-styles.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const doc = JSON.parse(readFileSync(join(root, 'tokens/vela.tokens.json'), 'utf8'))
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

// ---------- the dump: one definition, run inside Figma and against the mock ----------
export const DUMP_SRC = `
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
  if ('layoutSizingHorizontal' in n && n.parent && 'layoutMode' in n.parent && n.parent.layoutMode !== 'NONE') o.ls = [n.layoutSizingHorizontal, n.layoutSizingVertical].join('/');
  if ('width' in n) { const w = await bv(n, 'width'), h = await bv(n, 'height'); o.wh = [Math.round(n.width * 10) / 10, Math.round(n.height * 10) / 10, w, h]; }
  if ('fills' in n && n.fills !== figma.mixed) o.fill = await paintName(n.fills);
  if ('strokes' in n) { o.stroke = await paintName(n.strokes); if (n.strokes.length) { o.sw = n.strokeWeight === figma.mixed ? 'mixed' : n.strokeWeight; o.swx = [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight]; o.sa = n.strokeAlign; } }
  if ('topLeftRadius' in n) o.rad = [n.topLeftRadius, await bv(n, 'topLeftRadius')];
  if (n.type === 'TEXT') {
    o.style = await sn(n.textStyleId === figma.mixed ? null : n.textStyleId);
    o.font = n.fontName === figma.mixed ? 'mixed' : (n.fontName.family + ' ' + n.fontName.style);
    o.fs = n.fontSize === figma.mixed ? 'mixed' : n.fontSize;
    o.lh = n.lineHeight === figma.mixed ? 'mixed' : (n.lineHeight.unit === 'PIXELS' ? n.lineHeight.value : n.lineHeight.unit);
    o.chars = clean(n.characters).slice(0, 40);
    o.tar = n.textAutoResize; o.ta = n.textAlignHorizontal;
  }
  if (n.type === 'POLYGON') o.pts = n.pointCount;
  if (n.type === 'BOOLEAN_OPERATION') o.op = n.booleanOperation;
  if (n.componentPropertyReferences && Object.keys(n.componentPropertyReferences).length) o.ref = n.componentPropertyReferences;
  if ('children' in n && depth < 5) { o.ch = []; for (const c of n.children) o.ch.push(await dump(c, depth + 1)); }
  return o;
}
async function dumpSet(set, a, b) {
  const defs = {}; for (const [k, d] of Object.entries(set.componentPropertyDefinitions)) defs[k] = d.type + '=' + JSON.stringify(d.defaultValue);
  const variants = []; const kids = set.children.slice(a || 0, b || set.children.length);
  for (const v of kids) variants.push(await dump(v, 0));
  return { set: set.name, count: set.children.length, defs, variants };
}`

// ---------- building a component in the mock ----------
function loadVariables() {
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
export async function build(which) {
  VARS ??= loadVariables()
  const m = meta(which)
  const figma = createMockFigma({ variables: VARS, styles: mockStyles(), pages: [m.page] })
  const result = await new AsyncFunction('figma', generate(which))(figma)
  const set = figma.root.children[0].findOne((n) => n.type === 'COMPONENT_SET' && n.name === m.set)
  if (!set) throw new Error(`${which}: the builder did not create the set "${m.set}" (${JSON.stringify(result)})`)
  return { figma, set, meta: m }
}
export async function dumpTree(figma, set, a, b) {
  return new AsyncFunction('figma', 'set', 'a', 'b', DUMP_SRC + '\nreturn await dumpSet(set, a, b);')(figma, set, a, b)
}

// ---------- the rules ----------
const DEFAULT_NAMES = /^(Frame|Component|Text|Rectangle|Ellipse|Polygon|Union|Vector|Group|Line|Star|Instance)( \d+)?$/
export function lint(set, allow = []) {
  const problems = []
  const waived = new Set(allow.map((a) => a.rule))
  const hit = (rule, node, what) => problems.push({ rule, node: node.name, what, waived: waived.has(rule) })
  const walk = (n, inBool, isRoot) => {
    const bound = (f) => !!(n.boundVariables && n.boundVariables[f])
    if (n.type !== 'COMPONENT_SET') {
      if (/placeholder/i.test(n.name) || DEFAULT_NAMES.test(n.name)) hit('bad-name', n, `"${n.name}"`)
      for (const p of [...(n.fills || []), ...(n.strokes || [])]) if (!(p.boundVariables && p.boundVariables.color)) hit('raw-colour', n, p.type)
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
  walk(set, false, false)
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
    for (const k of ['hidden', 'lm', 'ax', 'sz', 'gap', 'pad', 'ls', 'fill', 'stroke', 'sw', 'swx', 'sa', 'rad', 'style', 'font', 'fs', 'lh', 'chars', 'tar', 'ta', 'pts', 'op']) {
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
      const names = argv[1] ? [argv[1]] : available()
      const report = {}
      let failed = false
      for (const which of names) {
        const { set, figma, meta: m } = await build(which)
        // the rules need variable names synchronously: resolve through the mock's table
        const vars = await figma.variables.getLocalVariablesAsync()
        const nameOf = Object.fromEntries(vars.map((v) => [v.id, v.name]))
        set._figma_varname = (id) => nameOf[id]
        const problems = lint(set, m.allow)
        report[which] = { problems, allow: m.allow }
        if (problems.some((p) => !p.waived)) failed = true
      }
      if (json) { console.log(JSON.stringify(report)); process.exit(failed ? 1 : 0) }
      for (const [which, r] of Object.entries(report)) {
        const bad = r.problems.filter((p) => !p.waived), ok = r.problems.filter((p) => p.waived)
        console.log(`${which}: ${bad.length ? bad.length + ' violation(s)' : 'clean'}${ok.length ? `, ${ok.length} waived` : ''}`)
        for (const p of bad) console.log(`  ✗ ${p.rule}  ${p.node}: ${p.what}`)
        for (const a of r.allow) console.log(`  · waived ${a.rule} — ${a.reason}`)
      }
      process.exit(failed ? 1 : 0)
    }
    if (argv[0] === '--dump') {
      const { figma, set } = await build(argv[1])
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
      const [a, b] = (argv[2] || ':').split(':').map((x) => (x === '' ? undefined : Number(x)))
      process.stdout.write(`// Generated by scripts/figma/check-components.mjs — reads the live "${m.set}" set. Do not edit.
const page = figma.root.children.find(p => p.name === ${JSON.stringify(m.page)});
if (!page) return { error: 'no page ' + ${JSON.stringify(m.page)} };
await figma.setCurrentPageAsync(page);
const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === ${JSON.stringify(m.set)});
if (!set) return { error: 'no set ' + ${JSON.stringify(m.set)} };
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
    const files = argv.slice(1)
    if (!which || !files.length) { console.error('usage: check-components.mjs --lint [name] | --dump <name> | --read <name> [a:b] | --read styles | <name> <live.json>... | styles <live.json>'); process.exit(2) }
    const { figma, set } = await build(which)
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
