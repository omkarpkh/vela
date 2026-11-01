/**
 * Guideline → Figma description sync.
 *
 * Each component spec in guidelines/components/*.md is the contract. This
 * compiles the parts a designer needs at the point of use — intent, the real
 * code call, the Figma-property→prop mapping, the hard rules, the paths — into
 * the component set's `description`, which Figma surfaces in Inspect and the
 * Assets panel on every plan.
 *
 * Like the token sync, it emits a Plugin API script rather than calling the
 * REST API (Figma gates writes behind Enterprise). Run the output inside the
 * library file via the Figma MCP or the Scripter plugin:
 *
 *   npm run guidelines:figma > /tmp/descriptions.js
 *
 * Idempotent: it finds each set by page + name and overwrites the description.
 * What it does NOT do: change variants or properties. A spec change that adds a
 * prop is design work in Figma and code both — see the Figma mapping section
 * of each spec for what has no Figma expression at all.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'guidelines/components')
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version

// spec file → Figma component set name and source directory. `entry` is the source tree the
// component lives in: `components` (the core, `@omkarux/vela`) unless it says `headless`
// (`@omkarux/vela/headless` only — Checkbox, Radio Group, Popover, Tooltip, Icon Button, Dialog, Toast and Dropdown List have no core
// implementation).
// `state` is a closed set: 'published' (the set is in the published library, `node` is its id),
// 'built' (the set exists in the file but is not published; `node` is its id once the Figma
// thread has posted it), 'none' (no set yet, `node` null). `node` is the component set's id in the
// library file (XO2rmeCcgOjyKe4oipgF4j), read back by the Figma thread on 29 Oct 2026 at main
// 60d80ef (requests R13). `export` is what an agent writes for an instance of the set — for Tab it
// is the trigger, because the set is one trigger, not the tablist; for Radio it is the radio inside
// its group. `imports`, when given, lists every name the import line must bring in, because the
// description's example uses more than `export` (Toast: the provider and the hook, R14).
export const STATES = ['published', 'built', 'none']
export const SETS = {
  'button.md': { set: 'Button', src: 'Button', state: 'published', node: '7:122', export: 'Button' },
  'toggle.md': { set: 'Toggle', src: 'Toggle', state: 'published', node: '8:49', export: 'Toggle' },
  'input.md': { set: 'Input', src: 'Input', state: 'published', node: '8:110', export: 'Input' },
  'text-area.md': { set: 'Text Area', src: 'TextArea', state: 'published', node: '127:102', export: 'TextArea' },
  'contextual-alert.md': { set: 'Contextual Alert', src: 'ContextualAlert', state: 'published', node: '77:15', export: 'ContextualAlert' },
  'status-indicator.md': { set: 'Status Indicator', src: 'StatusIndicator', state: 'published', node: '8:32', export: 'StatusIndicator' },
  'risk-pill.md': { set: 'Risk Pill', src: 'RiskPill', state: 'published', node: '127:14', export: 'RiskPill' },
  'tabs.md': { set: 'Tab', src: 'Tabs', state: 'published', node: '11:20', export: 'Tabs.Trigger' },
  'icon.md': { set: 'Icon', src: 'Icon', state: 'published', node: '131:324', export: 'Icon' },
  // No set yet (1 Nov 2026): scripts/figma/components/brand-mark.figma.js is written and has not been run.
  'brand-mark.md': { set: 'Brand Mark', src: 'BrandMark', state: 'none', node: null, export: 'BrandMark' },
  'checkbox.md': { set: 'Checkbox', src: 'Checkbox', entry: 'headless', state: 'published', node: '128:50', export: 'Checkbox' },
  'radio-group.md': { set: 'Radio', src: 'RadioGroup', entry: 'headless', state: 'published', node: '128:64', export: 'RadioGroup.Radio' },
  // A component built from several sets (scripts/figma/components/table.figma.js declares three)
  // names the first as `set` / `export` and the rest under `also`, each with its own export and
  // node; the entry's `state` covers every set (Table's are built together). Each set gets the
  // same description except the line naming its part, and the map lists each one.
  'table.md': {
    set: 'Table Header Cell', src: 'Table', state: 'published', node: '130:82', export: 'Table.HeaderCell',
    also: [{ set: 'Table Cell', node: '130:91', export: 'Table.Cell' }, { set: 'Table Row', node: '130:148', export: 'Table.Row' }],
  },
  'popover.md': { set: 'Popover', src: 'Popover', entry: 'headless', state: 'published', node: '127:109', export: 'Popover' },
  'tooltip.md': { set: 'Tooltip', src: 'Tooltip', entry: 'headless', state: 'published', node: '127:114', export: 'Tooltip' },
  // No set yet (1 Nov 2026): scripts/figma/components/icon-button.figma.js is written and has not been run.
  'icon-button.md': { set: 'Icon Button', src: 'IconButton', entry: 'headless', state: 'none', node: null, export: 'IconButton' },
  'dialog.md': { set: 'Dialog', src: 'Dialog', entry: 'headless', state: 'published', node: '129:54', export: 'Dialog' },
  // A toast is raised with `toast.add(...)` from `useToast()`, inside the app's one ToastProvider.
  'toast.md': { set: 'Toast', src: 'Toast', entry: 'headless', state: 'published', node: '129:94', export: 'useToast', imports: ['ToastProvider', 'useToast'] },
  // Built by the Figma thread for 0.14.0 (R20) and published with the library on 31 Oct 2026 (R21):
  // the item set is 164:85 (Highlighted × Current × Disabled, 8 variants) on its own page; the popup
  // that holds four item instances is the component 164:86, which carries no description of its own.
  'dropdown-list.md': { set: 'Dropdown List item', src: 'DropdownList', entry: 'headless', state: 'published', node: '164:85', export: 'DropdownList' },
}
export const FILE_KEY = 'XO2rmeCcgOjyKe4oipgF4j'

/** The import an agent writes for an instance of the set — the same string in the description's CODE block and in figma-map.json. */
export const importOf = (e) => `import { ${(e.imports ?? [e.export.split('.')[0]]).join(', ')} } from '@omkarux/vela${e.entry === 'headless' ? '/headless' : ''}'`
/** For a set that is one part of a compound component, the line that says which part. */
const partOf = (e) => (e.export.includes('.') ? [`This set is one ${e.export}.`] : [])

// `[[rule: id | enforcement]]` is metadata for scripts/check-rules.mjs, not prose: it is stripped
// here so it never reaches a Figma component description, and in demo/playground/Markdown.tsx so
// it never reaches the playground.
const strip = (s) =>
  s.replace(/\s*\[\[rule:[^\]]*\]\]/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\s+/g, ' ').trim()

const section = (md, heading) => {
  const m = md.match(new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## |\\Z)`, 'm'))
  return m ? m[1] : ''
}

for (const [f, e] of Object.entries(SETS)) {
  if (!STATES.includes(e.state)) throw new Error(`SETS['${f}'].state is "${e.state}"; it is one of ${STATES.join(', ')}`)
  if (e.state === 'published' && !e.node) throw new Error(`SETS['${f}'] is published but has no node`)
  if (e.state === 'none' && e.node) throw new Error(`SETS['${f}'] has no set but names node ${e.node}`)
  for (const a of e.also ?? []) {
    if (e.state === 'published' && !a.node) throw new Error(`SETS['${f}'].also '${a.set}' is published but has no node`)
    if (e.state === 'none' && a.node) throw new Error(`SETS['${f}'].also '${a.set}' has no set but names node ${a.node}`)
  }
}

function parse(file) {
  const md = readFileSync(join(dir, file), 'utf8')
  const title = md.match(/^# (.+)$/m)[1]
  const intent = strip(md.split(/^# .+$/m)[1].trim().split(/\n\s*\n/)[0])
  const code = (md.match(/```tsx\n([\s\S]*?)```/) || [, ''])[1].trim()
  const page = (md.match(/page `([^`]+)`/) || [, SETS[file].set])[1]

  const rules = [...section(md, 'Hard constraints').matchAll(/^- \*\*(.+?)\*\*/gm)]
    .map((m) => strip(m[1]).replace(/[.:]$/, ''))

  // A qualifier after the property name — "(boolean)", "(text layer, override on the instance)" — is kept.
  const mapping = [...section(md, 'Figma mapping').matchAll(/^\| `([^`]+)`([^|]*)\| (.+?) \|/gm)]
    .filter((m) => !/^Figma property/.test(m[1]))
    .map((m) => `${m[1]}${m[2].trim() ? ' ' + strip(m[2]) : ''} → ${strip(m[3])}`)

  // A bold-led paragraph in the Figma mapping section ships to Figma verbatim; it may wrap.
  const notes = [...section(md, 'Figma mapping').matchAll(/^\*\*([\s\S]+?)\*\*/gm)].map((m) => strip(m[1]))

  // Motion table: | Moment | What moves | Timing | Why | → "Hover in — fast (120ms)"
  const motion = [...section(md, 'Motion').matchAll(/^\| ([^|]+) \| ([^|]+) \| ([^|]+) \| [^|]+ \|$/gm)]
    .filter((m) => !/^Moment/.test(m[1]) && !/^-+$/.test(m[1].trim()))
    .map((m) => `${strip(m[1])} — ${strip(m[3])}`)

  // One description per set: the same text, except the line that says which part the set is.
  const describe = (part) => [
    intent, '',
    'Use the library component; do not rebuild it from this frame.',
    'CODE', importOf(SETS[file]), ...partOf(part), code, '',
    'FIGMA → PROP', mapping.join('  ·  '),
    ...(notes.length ? ['', ...notes] : []),
    '',
    'RULES  ' + rules.join('. ') + '.',
    ...(motion.length ? ['', 'MOTION  ' + motion.join('  ·  ')] : []),
    '',
    `src/${SETS[file].entry ?? 'components'}/${SETS[file].src}/${SETS[file].src}.tsx  ·  guidelines/components/${file}`,
    `@omkarux/vela ${version}`,
  ].join('\n')
  const body = describe(SETS[file])

  const map = {
    set: SETS[file].set,
    page,
    state: SETS[file].state,
    node: SETS[file].node,
    url: SETS[file].node
      ? `https://www.figma.com/design/${FILE_KEY}/Vela-Design-System?node-id=${SETS[file].node.replace(':', '-')}`
      : null,
    import: importOf(SETS[file]),
    write: SETS[file].export,
    figmaToProp: [...section(md, 'Figma mapping').matchAll(/^\| `([^`]+)`[^|]*\| (.+?) \|/gm)]
      .filter((m) => !/^Figma property/.test(m[1]))
      .map((m) => ({ figma: m[1], prop: strip(m[2]) })),
    example: code,
    spec: `guidelines/components/${file}`,
  }
  const nodeUrl = (node) => (node ? `https://www.figma.com/design/${FILE_KEY}/Vela-Design-System?node-id=${node.replace(':', '-')}` : null)
  if (SETS[file].also) {
    map.also = SETS[file].also.map((a) => ({ set: a.set, state: SETS[file].state, node: a.node, url: nodeUrl(a.node), import: importOf({ ...SETS[file], ...a }), write: a.export }))
  }

  const sets = [
    { name: SETS[file].set, description: body },
    ...(SETS[file].also ?? []).map((a) => ({ name: a.set, description: describe({ ...SETS[file], ...a }) })),
  ]
  return { file, title, page, set: SETS[file].set, sets, description: body, map }
}

export const entries = () => readdirSync(dir).filter((f) => SETS[f]).map(parse)

// Imported (scripts/figma/page-data.mjs reads SETS), it prints nothing.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain && process.argv.includes('--map')) {
  // guidelines/figma-map.json: what an agent writes for an instance of each library set. It does
  // the job Code Connect would do on an Organization plan, from the specs, on every plan.
  // Regenerate with `npm run figma:map`; src/styles/figma-map.test.ts fails when it is stale.
  const out = {
    $comment: 'Generated by scripts/sync-figma-descriptions.mjs --map from guidelines/components/*.md — do not edit. When a Figma node is an instance of a set below, write `write` with props from `figmaToProp`, imported as `import`; never reproduce Figma-generated markup. `state` is published (in the library, with its node), built (in the file, not published; node null until known) or none (no set yet).',
    fileKey: FILE_KEY,
    sets: entries().map((e) => e.map),
  }
  console.log(JSON.stringify(out, null, 2))
} else if (isMain && process.argv.includes('--json')) {
  console.log(JSON.stringify(entries(), null, 2))
} else if (isMain) {
  process.stdout.write(`// Generated by scripts/sync-figma-descriptions.mjs from guidelines/components/*.md — do not edit.
const ENTRIES = ${JSON.stringify(entries().map(({ page, sets }) => ({ page, sets })))};
const done = [], missing = [];
for (const e of ENTRIES) {
  const page = figma.root.children.find(p => p.name === e.page);
  if (!page) { missing.push(e.sets.map(s => s.name).join(', ') + ' (no page ' + e.page + ')'); continue; }
  await page.loadAsync();
  for (const { name, description } of e.sets) {
    const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === name);
    if (!set) { missing.push(name); continue; }
    set.description = description;
    done.push({ set: name, chars: description.length });
  }
}
return { updated: done, missing };
`)
}
