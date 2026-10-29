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
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'guidelines/components')
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version

// spec file → Figma component set name and source directory. `entry` is the source tree the
// component lives in: `components` (the core, `@omkarux/vela`) unless it says `headless`
// (`@omkarux/vela/headless` only — Checkbox and Radio Group have no core implementation).
// `node` is the component set's id in the library file (XO2rmeCcgOjyKe4oipgF4j), read by the Figma
// thread on 28 Oct 2026; null until the set exists. `export` is what an agent writes for an
// instance of the set — for Tab it is the trigger, because the set is one trigger, not the tablist;
// for Radio it is the radio inside its group.
const SETS = {
  'button.md': { set: 'Button', src: 'Button', node: '7:122', export: 'Button' },
  'toggle.md': { set: 'Toggle', src: 'Toggle', node: '8:49', export: 'Toggle' },
  'input.md': { set: 'Input', src: 'Input', node: '8:110', export: 'Input' },
  'contextual-alert.md': { set: 'Contextual Alert', src: 'ContextualAlert', node: '77:15', export: 'ContextualAlert' },
  'status-indicator.md': { set: 'Status Indicator', src: 'StatusIndicator', node: '8:32', export: 'StatusIndicator' },
  'risk-pill.md': { set: 'Risk Pill', src: 'RiskPill', node: null, export: 'RiskPill' },
  'tabs.md': { set: 'Tab', src: 'Tabs', node: '11:20', export: 'Tabs.Trigger' },
  'icon.md': { set: 'Icon', src: 'Icon', node: null, export: 'Icon' },
  'checkbox.md': { set: 'Checkbox', src: 'Checkbox', entry: 'headless', node: null, export: 'Checkbox' },
  'radio-group.md': { set: 'Radio', src: 'RadioGroup', entry: 'headless', node: null, export: 'RadioGroup.Radio' },
}
const FILE_KEY = 'XO2rmeCcgOjyKe4oipgF4j'

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

function parse(file) {
  const md = readFileSync(join(dir, file), 'utf8')
  const title = md.match(/^# (.+)$/m)[1]
  const intent = strip(md.split(/^# .+$/m)[1].trim().split(/\n\s*\n/)[0])
  const code = (md.match(/```tsx\n([\s\S]*?)```/) || [, ''])[1].trim()
  const page = (md.match(/page `([^`]+)`/) || [, SETS[file].set])[1]

  const rules = [...section(md, 'Hard constraints').matchAll(/^- \*\*(.+?)\*\*/gm)]
    .map((m) => strip(m[1]).replace(/[.:]$/, ''))

  const mapping = [...section(md, 'Figma mapping').matchAll(/^\| `([^`]+)`[^|]*\| (.+?) \|/gm)]
    .filter((m) => !/^Figma property/.test(m[1]))
    .map((m) => `${m[1]} → ${strip(m[2])}`)

  // A bold-led paragraph in the Figma mapping section ships to Figma verbatim; it may wrap.
  const notes = [...section(md, 'Figma mapping').matchAll(/^\*\*([\s\S]+?)\*\*/gm)].map((m) => strip(m[1]))

  // Motion table: | Moment | What moves | Timing | Why | → "Hover in — fast (120ms)"
  const motion = [...section(md, 'Motion').matchAll(/^\| ([^|]+) \| ([^|]+) \| ([^|]+) \| [^|]+ \|$/gm)]
    .filter((m) => !/^Moment/.test(m[1]) && !/^-+$/.test(m[1].trim()))
    .map((m) => `${strip(m[1])} — ${strip(m[3])}`)

  const body = [
    intent, '',
    'CODE', code, '',
    'FIGMA → PROP', mapping.join('  ·  '),
    ...(notes.length ? ['', ...notes] : []),
    '',
    'RULES  ' + rules.join('. ') + '.',
    ...(motion.length ? ['', 'MOTION  ' + motion.join('  ·  ')] : []),
    '',
    `src/${SETS[file].entry ?? 'components'}/${SETS[file].src}/${SETS[file].src}.tsx  ·  guidelines/components/${file}`,
    `@omkarux/vela ${version}`,
  ].join('\n')

  const map = {
    set: SETS[file].set,
    page,
    node: SETS[file].node,
    url: SETS[file].node
      ? `https://www.figma.com/design/${FILE_KEY}/Vela-Design-System?node-id=${SETS[file].node.replace(':', '-')}`
      : null,
    import: `import { ${SETS[file].export.split('.')[0]} } from '@omkarux/vela${SETS[file].entry === 'headless' ? '/headless' : ''}'`,
    write: SETS[file].export,
    figmaToProp: [...section(md, 'Figma mapping').matchAll(/^\| `([^`]+)`[^|]*\| (.+?) \|/gm)]
      .filter((m) => !/^Figma property/.test(m[1]))
      .map((m) => ({ figma: m[1], prop: strip(m[2]) })),
    example: code,
    spec: `guidelines/components/${file}`,
  }

  return { file, title, page, set: SETS[file].set, description: body, map }
}

const entries = readdirSync(dir).filter((f) => SETS[f]).map(parse)

if (process.argv.includes('--map')) {
  // guidelines/figma-map.json: what an agent writes for an instance of each library set. It does
  // the job Code Connect would do on an Organization plan, from the specs, on every plan.
  // Regenerate with `npm run figma:map`; src/styles/figma-map.test.ts fails when it is stale.
  const out = {
    $comment: 'Generated by scripts/sync-figma-descriptions.mjs --map from guidelines/components/*.md — do not edit. When a Figma node is an instance of a set below, write `write` with props from `figmaToProp`, imported as `import`; never reproduce Figma-generated markup.',
    fileKey: FILE_KEY,
    sets: entries.map((e) => e.map),
  }
  console.log(JSON.stringify(out, null, 2))
} else if (process.argv.includes('--json')) {
  console.log(JSON.stringify(entries, null, 2))
} else {
  process.stdout.write(`// Generated by scripts/sync-figma-descriptions.mjs from guidelines/components/*.md — do not edit.
const ENTRIES = ${JSON.stringify(entries.map(({ page, set, description }) => ({ page, set, description })))};
const done = [], missing = [];
for (const e of ENTRIES) {
  const page = figma.root.children.find(p => p.name === e.page);
  if (!page) { missing.push(e.set + ' (no page ' + e.page + ')'); continue; }
  await page.loadAsync();
  const set = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === e.set);
  if (!set) { missing.push(e.set); continue; }
  set.description = e.description;
  done.push({ set: e.set, chars: e.description.length });
}
return { updated: done, missing };
`)
}
