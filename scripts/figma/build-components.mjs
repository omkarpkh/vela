/**
 * Figma component builders — the structural half of "the library is compiled
 * from the contract", kept in source control so the library is regenerable.
 *
 *   node scripts/figma/build-components.mjs button             # prints the Plugin API script
 *   node scripts/figma/build-components.mjs dropdown-list --extend
 *   node scripts/figma/build-components.mjs --list
 *
 * Run the printed script inside the library file (Figma MCP or Scripter). Each
 * builder CREATES a component set with every variant bound to the token
 * variables; it does not update an existing set — instances elsewhere would
 * detach if the set were replaced — so it refuses to run if the set already
 * exists.
 *
 * A change to a set the library has published is an EXTENSION, never an edit of the
 * builder: `components/<builder>.<id>.extend.figma.js`, declaring `// @extends <builder>`
 * and one `// @adds <node name>` for each node it creates (a new variant, a frame on the
 * page). Create mode (the default) runs the builder and then each of its extensions in
 * file-name order, so a fresh build and an extended file make the same tree. `--extend`
 * prints a script for a file that already has the sets: it runs only the extensions not
 * yet there, and checks that every node already in the sets kept its id, name, parent
 * and place, that no property or option went away, and that the default variant stayed.
 *
 * Prerequisite: the variables and text styles must exist — run tokens:figma and
 * styles:figma first. The builders look every token up by name and fail loudly if
 * one is missing, so a misspelled binding cannot silently become a hardcoded value.
 *
 * `generate(name)` returns the script as a string; check-components.mjs runs it
 * against a mock of the Plugin API to lint every builder in CI and to diff the
 * live library against what a rebuild would create.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'components')
const EXT = '.extend.figma.js'
// Builders only: an extension file (`<builder>.<id>.extend.figma.js`) is not a builder.
export const available = () => readdirSync(dir).filter((f) => f.endsWith('.figma.js') && !f.endsWith(EXT)).map((f) => f.replace('.figma.js', ''))

/**
 * The builder's `// @page`, `// @set` and `// @allow rule reason` annotations. A builder may
 * declare more than one `// @set` when the sets are one component's parts (Table: header cell,
 * cell, row); `set` is the first, `sets` all of them, and every one is linted, dumped and diffed.
 * `// @component <name>` declares a one-size component that is not a set (the Dropdown List popup,
 * made of item instances); it is listed in `sets` after the sets, and linted, dumped and diffed
 * the same way.
 */
export function meta(which) {
  return metaFromFile(join(dir, `${which}.figma.js`), which)
}
/** The same annotations, read from a builder file anywhere (a test fixture). */
export function metaFromFile(path, which = path) {
  const body = readFileSync(path, 'utf8')
  const page = (body.match(/^\/\/ @page\s+(.+)$/m) || [])[1]?.trim()
  const variantSets = [...body.matchAll(/^\/\/ @set\s+(.+)$/gm)].map((x) => x[1].trim())
  const components = [...body.matchAll(/^\/\/ @component\s+(.+)$/gm)].map((x) => x[1].trim())
  if (!page || !variantSets.length) throw new Error(`${which.endsWith('.figma.js') ? which : which + '.figma.js'} must declare // @page and // @set`)
  const allow = [...body.matchAll(/^\/\/ @allow\s+(\S+)\s+(.+)$/gm)].map((x) => ({ rule: x[1], reason: x[2].trim() }))
  // `// @uses <builder>`: this builder places instances of another builder's set (Dropdown List's
  // lock is an Icon instance), so that set must exist in the file first. The mock builds it first.
  const uses = [...body.matchAll(/^\/\/ @uses\s+(\S+)\s*$/gm)].map((x) => x[1])
  return { page, set: variantSets[0], sets: [...variantSets, ...components], components, allow, uses, body }
}

/**
 * An extension's annotations, from its file: `// @extends <builder>`, one `// @adds <node name>`
 * per node it creates (the nodes it places on the page or in a set; their children come with them),
 * and the usual `// @uses` and `// @allow`. The file is named `<builder>.<id>.extend.figma.js`.
 */
export function extensionMeta(path) {
  const file = basename(path)
  const named = file.match(/^([^.]+)\.([^.]+)\.extend\.figma\.js$/)
  if (!named) throw new Error(`${file}: an extension is named <builder>.<id>${EXT}`)
  const body = readFileSync(path, 'utf8')
  const builder = (body.match(/^\/\/ @extends\s+(\S+)\s*$/m) || [])[1]
  if (!builder) throw new Error(`${file} must declare // @extends <builder>`)
  if (builder !== named[1]) throw new Error(`${file} declares // @extends ${builder}, but its name says ${named[1]}`)
  const adds = [...body.matchAll(/^\/\/ @adds\s+(.+)$/gm)].map((x) => x[1].trim())
  if (!adds.length) throw new Error(`${file} must declare // @adds <node name> for each node it creates`)
  const twice = adds.filter((a, i) => adds.indexOf(a) !== i)
  if (twice.length) throw new Error(`${file} lists // @adds ${twice.join(', ')} more than once`)
  const allow = [...body.matchAll(/^\/\/ @allow\s+(\S+)\s+(.+)$/gm)].map((x) => ({ rule: x[1], reason: x[2].trim() }))
  const uses = [...body.matchAll(/^\/\/ @uses\s+(\S+)\s*$/gm)].map((x) => x[1])
  return { id: named[2], builder, file, adds, allow, uses, body }
}
/** Every extension file in components/, builder or not (the lint checks each names a real builder). */
export const allExtensions = () => readdirSync(dir).filter((f) => f.endsWith(EXT)).sort().map((f) => extensionMeta(join(dir, f)))
/** A builder's extensions, in file-name order: the order create mode runs them in. */
export const extensionsOf = (which) => allExtensions().filter((e) => e.builder === which)

export function generate(which, { extend = false } = {}) {
  if (!available().includes(which)) throw new Error(`unknown component "${which}". Available: ${available().join(', ')}`)
  const extensions = extensionsOf(which)
  if (extend && !extensions.length) throw new Error(`${which} has no extensions (components/${which}.<id>${EXT}); there is nothing to extend`)
  const from = [`components/${which}.figma.js`, ...extensions.map((e) => `components/${e.file}`)]
  return generateFrom(meta(which), extend ? from.slice(1).join(', ') : from.join(', '), { extensions, extend, which })
}

const strip = (body) => body.replace(/^\/\/ @\w+.*$/gm, '').trim()

/**
 * The Plugin API script for a builder's parsed annotations and body; `from` names its source in the header.
 * `extensions` are run after the body (create mode); with `extend`, the body is not run at all and the
 * script extends the sets already in the file instead.
 */
export function generateFrom({ page, set, sets = [set], body }, from, { extensions = [], extend = false, which = page } = {}) {
  const head = `// Generated by scripts/figma/build-components.mjs from ${from} — do not edit.
const PAGE = ${JSON.stringify(page)}, SET = ${JSON.stringify(set)}, SETS = ${JSON.stringify(sets)};
const page = figma.root.children.find(p => p.name === PAGE);
if (!page) throw new Error('No page named ' + PAGE + ' — create the page skeleton first.');
await page.loadAsync();
await figma.setCurrentPageAsync(page);
`
  const guard = extend
    ? `${SETS_OF}
const found = setsOf();
const absent = SETS.filter(s => !found[s]);
if (absent.length)
  throw new Error('Build ' + PAGE + ' first: ' + absent.join(', ') + (absent.length > 1 ? ' are' : ' is') + ' not on the ' + PAGE + ' page. --extend changes sets that already exist; run node scripts/figma/build-components.mjs ' + ${JSON.stringify(which)} + ' to create them, with every extension.');
`
    : `const existing = SETS.filter(s => page.findOne(n => (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && n.parent === page)) && n.name === s));
if (existing.length)
  return { skipped: true, reason: existing.join(', ') + ' already exists on ' + PAGE + '. Builders create; they do not update. To change a published set, write an extension (components/<builder>.<id>${EXT}) and run it with --extend.' };
`
  const helpers = HELPERS + (extensions.length ? (extend ? '' : SETS_OF) + EXT_HELPERS : '')
  // Each extension body runs in its own function, given `setsByName` and `set` (the first of them).
  const call = (e) => `await runExtension(${JSON.stringify(e.id)}, ${JSON.stringify(e.adds)}, async (setsByName, set) => {
${strip(e.body)}
})`
  if (extend) {
    const list = JSON.stringify(extensions.map((e) => ({ id: e.id, adds: e.adds })))
    return `${head}${guard}
${helpers}
${EXTEND_RUN(list)}
${extensions.map((e) => `if (todo.includes(${JSON.stringify(e.id)})) {
  const before = snapshot();
  ${call(e)};
  await stopIfChanged(${JSON.stringify(e.id)}, before, snapshot());
  extended.push(${JSON.stringify(e.id)});
}`).join('\n')}
return { extended, skipped, snapshot: 'unchanged' };
`
  }
  if (!extensions.length) return `${head}${guard}
${helpers}
${strip(body)}
`
  return `${head}${guard}
${helpers}
const built = await (async () => {
${strip(body)}
})();
const extensions = [];
${extensions.map((e) => `extensions.push({ id: ${JSON.stringify(e.id)}, ...(${call(e)}) });`).join('\n')}
return { ...built, extensions };
`
}

// The preamble every builder and extension runs with.
const HELPERS = `for (const s of ['Light', 'Regular', 'SemiBold']) await figma.loadFontAsync({ family: 'Open Sans', style: s });
const C = Object.fromEntries((await figma.variables.getLocalVariablesAsync('COLOR')).map(v => [v.name, v]));
const F = Object.fromEntries((await figma.variables.getLocalVariablesAsync('FLOAT')).map(v => [v.name, v]));
const S = Object.fromEntries((await figma.getLocalTextStylesAsync()).map(s => [s.name, s]));
const need = (map, n, kind) => { if (!map[n]) throw new Error('missing ' + kind + ' "' + n + '" — run tokens:figma and styles:figma first'); return map[n]; };
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', need(C, n, 'colour variable'));
const num = n => need(F, n, 'number variable');
const style = n => need(S, n, 'text style');
const bindRadius = (node, token) => { for (const r of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) node.setBoundVariable(r, num(token)); };
const parse = n => Object.fromEntries(n.split(', ').map(p => p.split('=')));
// An instance of a variant of a set on any page: Icon's lock in a Dropdown List row. It throws if the
// set has not been built, as a missing variable does.
const instanceOf = async (setName, variant) => {
  for (const p of figma.root.children) {
    await p.loadAsync();
    const s = p.findOne(n => n.type === 'COMPONENT_SET' && n.name === setName);
    if (!s) continue;
    const v = s.children.find(c => c.name === variant);
    if (!v) throw new Error('missing variant "' + variant + '" in "' + setName + '"');
    return v.createInstance();
  }
  throw new Error('missing component set "' + setName + '" — build it first');
};
const grid = (set, order, colW, rowH, pad) => {
  for (const v of set.children) { const [c, r] = order(parse(v.name)); v.x = pad + c * colW; v.y = pad + r * rowH; }
};
`

// The builder's sets and one-size components already on the page, by name.
const SETS_OF = `const setsOf = () => Object.fromEntries(SETS.map(s => [s, page.findOne(n => (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && n.parent === page)) && n.name === s)]).filter(([, n]) => n));
`

// What an extension body has besides the preamble: propKey, appendVariant, and the run that holds
// it to its // @adds list.
const EXT_HELPERS = `// The key of a set's component property whose name before '#' is \`label\`: TEXT, BOOLEAN and
// INSTANCE_SWAP keys carry a file-specific id after '#', so an extension looks them up by name.
const propKey = (set, label) => {
  const k = Object.keys(set.componentPropertyDefinitions || {}).find(k => k.replace(/#.*$/, '') === label);
  if (!k) throw new Error('no property "' + label + '" on "' + set.name + '"');
  return k;
};
// A new variant goes in free space: appended last, placed below the current extent (or to its right),
// and the set grows to hold it. Existing variants never move, so the default variant (the top-left
// one) stays where it was.
const appendVariant = (set, component, where = 'below') => {
  const kids = set.children.slice();
  set.appendChild(component);
  if (!kids.length) { component.x = 0; component.y = 0; return component; }
  const left = Math.min(...kids.map(k => k.x)), top = Math.min(...kids.map(k => k.y));
  const right = Math.max(...kids.map(k => k.x + k.width)), bottom = Math.max(...kids.map(k => k.y + k.height));
  const pad = left > 0 ? left : 32;
  if (where === 'right') { component.x = right + pad; component.y = top; }
  else { component.x = left; component.y = bottom + pad; }
  set.resize(Math.max(set.width, component.x + component.width + pad), Math.max(set.height, component.y + component.height + pad));
  return component;
};
// Runs one extension and holds it to its list: every node it leaves on the page (or in a set) must be
// named in its // @adds, and every name there must be one it made.
const runExtension = async (id, adds, fn) => {
  const had = new Set(page.findAll(() => true).map(n => n.id));
  const setsByName = setsOf();
  const value = await fn(setsByName, setsByName[SETS[0]]);
  const made = page.findAll(n => !had.has(n.id) && (n.parent === page || had.has(n.parent.id))).map(n => n.name);
  const unlisted = [...new Set(made.filter(n => !adds.includes(n)))], missing = adds.filter(a => !made.includes(a));
  if (unlisted.length || missing.length)
    throw new Error('Extension ' + id + ' made ' + (unlisted.length ? unlisted.map(n => '"' + n + '"').join(', ') + ', not in its // @adds' : '') + (unlisted.length && missing.length ? '; and ' : '') + (missing.length ? 'nothing named ' + missing.map(n => '"' + n + '"').join(', ') + ', which its // @adds lists' : '') + '.');
  return value && typeof value === 'object' ? value : {};
};
`

// Extend mode: skip what is already there, refuse a half-added extension, and around each run
// compare a snapshot of every node already in the builder's sets.
const EXTEND_RUN = (list) => `const EXTENSIONS = ${list};
const onPage = name => !!page.findOne(n => n.name === name);
const half = EXTENSIONS.map(e => ({ ...e, have: e.adds.filter(onPage) })).filter(e => e.have.length && e.have.length < e.adds.length);
if (half.length)
  throw new Error('Nothing was run: ' + half.map(e => e.id + ' is half there (' + e.have.join(', ') + ' on the page; ' + e.adds.filter(a => !e.have.includes(a)).join(', ') + ' not)').join('; ') + '. Finish or remove those nodes by hand, then run --extend again.');
const skipped = EXTENSIONS.filter(e => e.adds.every(onPage)).map(e => e.id);
const todo = EXTENSIONS.filter(e => !skipped.includes(e.id)).map(e => e.id);
const extended = [];
// Every node in the builder's sets and components: id, name, parent and place among its siblings;
// each set's properties (name, type, a variant's options), its default variant and its size.
// x and y are left out: placing a new variant may move nothing else, and the description is
// rewritten by guidelines:figma anyway.
const snapshot = () => {
  const nodes = {}, sets = {};
  const walk = (n, path) => {
    nodes[n.id] = { path, name: n.name, parent: n.parent ? n.parent.id : null, index: n.parent ? n.parent.children.indexOf(n) : -1 };
    if ('children' in n) for (const c of n.children) walk(c, path + ' › ' + c.name);
  };
  for (const [name, s] of Object.entries(setsOf())) {
    walk(s, name);
    const defs = {};
    for (const [k, d] of Object.entries(s.componentPropertyDefinitions || {})) defs[k] = { type: d.type, options: d.type === 'VARIANT' ? (d.variantOptions || []).slice() : null };
    sets[name] = { id: s.id, defs, dflt: s.type === 'COMPONENT_SET' && s.defaultVariant ? { id: s.defaultVariant.id, name: s.defaultVariant.name } : null, w: s.width, h: s.height };
  }
  return { nodes, sets };
};
const stopIfChanged = async (id, before, after) => {
  const out = [];
  for (const [nid, b] of Object.entries(before.nodes)) {
    const a = after.nodes[nid];
    if (!a) { out.push(b.path + (await figma.getNodeByIdAsync(nid) ? ': moved out of its set' : ': removed')); continue; }
    if (a.name !== b.name) out.push(b.path + ': renamed to "' + a.name + '"');
    if (a.parent !== b.parent) out.push(b.path + ': moved to another parent (' + a.path + ')');
    else if (a.index !== b.index) out.push(b.path + ': moved from place ' + b.index + ' to ' + a.index + ' among its siblings');
  }
  for (const [name, b] of Object.entries(before.sets)) {
    const a = after.sets[name];
    if (!a) continue; // its root is reported above
    const base = k => k.replace(/#.*$/, '');
    for (const [k, d] of Object.entries(b.defs)) {
      const e = a.defs[k];
      if (!e) { out.push(name + ': property "' + base(k) + '" removed or renamed'); continue; }
      if (e.type !== d.type) out.push(name + ': property "' + base(k) + '" changed type, ' + d.type + ' to ' + e.type);
      for (const o of d.options || []) if (!(e.options || []).includes(o)) out.push(name + ': option "' + o + '" of "' + base(k) + '" removed or renamed');
    }
    if (b.dflt && (!a.dflt || a.dflt.id !== b.dflt.id)) out.push(name + ': default variant changed from "' + b.dflt.name + '" to ' + (a.dflt ? '"' + a.dflt.name + '"' : 'none'));
    if (a.w < b.w - 0.01 || a.h < b.h - 0.01) out.push(name + ': shrank from ' + b.w + '×' + b.h + ' to ' + a.w + '×' + a.h);
  }
  if (out.length)
    throw new Error('Extend stopped at ' + id + ': it changed what the published ' + PAGE + ' sets already had, which instances depend on.\\n  - ' + out.join('\\n  - ') + '\\nFigma can\\'t undo a partial run: what ran is still in the file. Put each of these back by hand (or undo in the file) before publishing, then fix the extension.');
};
`

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const extend = args.includes('--extend')
  const which = args.filter((a) => a !== '--extend')[0]
  if (!which || which === '--list') { console.log(available().join('\n')); process.exit(which ? 0 : 1) }
  try { process.stdout.write(generate(which, { extend })) } catch (e) { console.error(e.message); process.exit(1) }
}
