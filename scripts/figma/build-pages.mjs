/**
 * Figma page builders — the library's Changelog and Status pages, compiled from the repository
 * so they are rebuilt on each release instead of kept by hand.
 *
 *   npm run figma:build:pages                        # every page: its size, and the command that prints it
 *   npm run figma:build:pages -- status              # prints the Plugin API script for one page
 *   npm run figma:build:pages -- changelog --published 0.2.0,0.3.0   # say what is on npm instead of published.json
 *   npm run figma:build:pages -- changelog --npm     # ask the registry instead (fails when it cannot be reached)
 *   npm run figma:build:pages -- --check-npm         # exit 1 when the registry and pages/published.json disagree
 *   npm run figma:build:pages -- --out <dir>         # also write every script to <dir>
 *   npm run figma:build:pages -- --json <page>       # the data a page is compiled from
 *
 * Run a printed script inside the library file (Figma MCP `use_figma` or Scripter). Unlike the
 * component builders these UPDATE, because a doc page holds no components and nothing links to
 * its insides: the script finds the page's frame by name ("Changelog", "Status"), empties it and
 * redraws its children in place — the frame and its id survive, so links to it keep working —
 * and creates the frame only when it is absent. Re-running never duplicates.
 *
 * The prelude is the Figma thread's helper header from its hand-run pages (28 Oct 2026) — need,
 * paint, num, bind, box, txt, pageFrame — with pageFrame made idempotent. The data (CHANGELOG.md,
 * the specs, GOVERNANCE.md, the registry, pages/published.json) is compiled in as DATA at build
 * time, and every page ends with a stamp saying which commit it was read from.
 * check-pages.mjs runs the result against the mock Plugin API to lint it in `npm test`.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { changelogData, statusData, publishedFile, registryVersions, longDate, PUBLISHED_FILE } from './page-data.mjs'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'pages')
export const available = () => readdirSync(dir).filter((f) => f.endsWith('.figma.js')).map((f) => f.replace('.figma.js', '')).sort()
export const LIMIT_KB = 50

/** The builder's `// @page` and `// @allow rule reason` annotations, and its body. */
export function meta(which) {
  const body = readFileSync(join(dir, `${which}.figma.js`), 'utf8')
  const page = (body.match(/^\/\/ @page\s+(.+)$/m) || [])[1]?.trim()
  if (!page) throw new Error(`${which}.figma.js must declare // @page`)
  const allow = [...body.matchAll(/^\/\/ @allow\s+(\S+)\s+(.+)$/gm)].map((x) => ({ rule: x[1], reason: x[2].trim() }))
  return { page, allow, body }
}

/** Where the changelog's "on npm" comes from: a `--published` list, the registry (`npm: true`), or pages/published.json. */
export function published(opts = {}) {
  if (opts.published) return { versions: opts.published, source: 'a --published list given at build time' }
  if (opts.npm) {
    try { return { versions: registryVersions(), source: `the npm registry, read ${longDate(new Date().toISOString().slice(0, 10))}` } }
    catch (e) { throw new Error(`could not read the npm registry (${(e.message || '').split('\n')[0]}). Drop --npm to use ${PUBLISHED_FILE}.`) }
  }
  const f = publishedFile()
  return { versions: f.versions, source: `${PUBLISHED_FILE}, checked against the registry ${longDate(f.checked)}` }
}

export function data(which, opts = {}) {
  if (which === 'changelog') { const p = published(opts); return changelogData({ published: p.versions, publishedSource: p.source }) }
  if (which === 'status') return statusData()
  throw new Error(`no data source for page "${which}"`)
}

// The Figma thread's helper header. Additions, each for idempotence or for the real API's
// documented behaviour: the page is found or created and loaded; box() names its frame (the
// Plugin API's createAutoLayout takes only a direction) and skips the gap binding for gap 0;
// txt() resizes before it sets HEIGHT auto-resize; pageFrame() reuses a frame of that name.
const PRELUDE = `
let page = figma.root.children.find(p => p.name === PAGE);
if (!page) { page = figma.createPage(); page.name = PAGE; }
await page.loadAsync();
await figma.setCurrentPageAsync(page);
for (const s of ['Light','Regular','SemiBold']) await figma.loadFontAsync({family:'Open Sans',style:s});
const C=Object.fromEntries((await figma.variables.getLocalVariablesAsync('COLOR')).map(v=>[v.name,v]));
const F=Object.fromEntries((await figma.variables.getLocalVariablesAsync('FLOAT')).map(v=>[v.name,v]));
const S=Object.fromEntries((await figma.getLocalTextStylesAsync()).map(s=>[s.name,s]));
const need=(m,n,k)=>{if(!m[n])throw new Error('missing '+k+' "'+n+'" — run tokens:figma and styles:figma first');return m[n];};
const paint=n=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',need(C,n,'colour variable'));
const num=n=>need(F,n,'number variable');
const bind=(f,props,n)=>{for(const p of props)f.setBoundVariable(p,num(n));};
const PAD=['paddingTop','paddingRight','paddingBottom','paddingLeft'],RAD=['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'];
const box=(parent,name,o={})=>{const f=figma.createAutoLayout(o.dir||'VERTICAL');f.name=name;f.fills=o.fill?[paint(o.fill)]:[];if(o.stroke){f.strokes=[paint(o.stroke)];f.strokeWeight=1;}if(o.gap!==0)bind(f,['itemSpacing'],o.gap||'space/10');if(o.padY)bind(f,['paddingTop','paddingBottom'],o.padY);if(o.padX)bind(f,['paddingLeft','paddingRight'],o.padX);if(o.r)bind(f,RAD,o.r);if(parent){parent.appendChild(f);if(o.fillW!==false)f.layoutSizingHorizontal='FILL';}return f;};
const txt=async(parent,chars,style,color,o={})=>{const t=figma.createText();await t.setTextStyleIdAsync(need(S,style,'text style').id);t.characters=chars;t.fills=[paint(color)];parent.appendChild(t);if(o.w){t.resize(o.w,t.height);t.textAutoResize='HEIGHT';t.layoutSizingHorizontal='FIXED';}else if(o.hug){t.textAutoResize='WIDTH_AND_HEIGHT';}else{t.layoutSizingHorizontal='FILL';t.textAutoResize='HEIGHT';}if(o.link)t.setRangeHyperlink(0,chars.length,{type:'URL',value:o.link});if(o.list)t.setRangeListOptions(0,chars.length,{type:'UNORDERED'});return t;};
// Idempotent: the frame of this name on the page is emptied and redrawn in place (its id and
// position survive); it is created at 0,0 only when there is none. A reused frame's fills are
// cleared before the paint is set again: re-assigning an identically bound paint leaves the base
// colour at the placeholder {0,0,0} in the real file (a black page, 29 Oct 2026). It is the only
// node a page builder reuses; every other node is created fresh, so its first paint is a new binding.
let REUSED=false;
const pageFrame=(name)=>{let f=figma.currentPage.children.find(n=>n.type==='FRAME'&&n.name===name);REUSED=!!f;
  if(f){for(const c of [...f.children])c.remove();f.layoutMode='VERTICAL';}else{f=figma.createAutoLayout('VERTICAL');f.name=name;figma.currentPage.appendChild(f);f.x=0;f.y=0;}
  f.resize(1080,f.height);f.layoutSizingHorizontal='FIXED';f.layoutSizingVertical='HUG';if(REUSED)f.fills=[];f.fills=[paint('surface/global')];f.strokes=[];bind(f,PAD,'space/60');bind(f,['itemSpacing'],'space/30');return f;};
`

export function generate(which, opts = {}) {
  if (!available().includes(which)) throw new Error(`unknown page "${which}". Available: ${available().join(', ')}`)
  const { page, body } = meta(which)
  const d = opts.data ?? data(which, opts)
  if (d.page !== page) throw new Error(`${which}: the data says page "${d.page}", the builder says "${page}"`)
  return `// Generated by scripts/figma/build-pages.mjs from pages/${which}.figma.js and the repository — do not edit.
// Idempotent: finds the "${page}" frame on the "${page}" page and rebuilds its children in place (its id survives); creates it only if absent.
const PAGE = ${JSON.stringify(page)};
const DATA = ${JSON.stringify(d)};
${PRELUDE.trim()}

${body.replace(/^\/\/ @\w+.*\n/gm, '').trim()}
`
}

const kb = (s) => Buffer.byteLength(s, 'utf8') / 1024

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
  const valued = ['--published', '--out', '--json']
  const positional = args.filter((a, i) => !a.startsWith('--') && !valued.includes(args[i - 1]))
  const opts = { npm: args.includes('--npm') }
  if (flag('--published') !== undefined) opts.published = flag('--published').split(',').map((s) => s.trim()).filter(Boolean)
  try {
    if (args.includes('--list')) { console.log(available().join('\n')); process.exit(0) }
    if (args.includes('--check-npm')) {
      const file = publishedFile().versions, live = registryVersions()
      const missing = live.filter((v) => !file.includes(v)), extra = file.filter((v) => !live.includes(v))
      if (!missing.length && !extra.length) { console.log(`${PUBLISHED_FILE} matches the registry: ${live.length} versions.`); process.exit(0) }
      if (missing.length) console.log(`On npm, not in ${PUBLISHED_FILE}: ${missing.join(', ')}`)
      if (extra.length) console.log(`In ${PUBLISHED_FILE}, not on npm: ${extra.join(', ')}`)
      process.exit(1)
    }
    if (flag('--json')) { console.log(JSON.stringify(data(flag('--json'), opts), null, 2)); process.exit(0) }
    if (positional[0]) { process.stdout.write(generate(positional[0], opts)); process.exit(0) }
    const out = flag('--out')
    if (out) mkdirSync(out, { recursive: true })
    let over = false
    for (const which of available()) {
      const script = generate(which, opts)
      const size = kb(script)
      if (size >= LIMIT_KB) over = true
      const where = out ? join(out, `${which}.figma.js`) : null
      if (where) writeFileSync(where, script)
      console.log(`${(which + '.figma.js').padEnd(18)} ${size.toFixed(1).padStart(5)} KB  ${size >= LIMIT_KB ? `OVER the ${LIMIT_KB} KB limit` : `under ${LIMIT_KB} KB`}  ${where ? `→ ${where}` : `→ npm run -s figma:build:pages -- ${which}`}`)
    }
    if (!opts.published && !opts.npm) console.log(`On npm: per ${published().source}.`)
    console.log('Run each script inside the library file (Figma MCP use_figma or Scripter); it rebuilds its page frame in place.')
    process.exit(over ? 1 : 0)
  } catch (e) { console.error(e.message); process.exit(1) }
}
